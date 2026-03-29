import {
  GoogleGenAI,
  Modality,
  type FunctionCall,
  type LiveServerMessage,
  type Session,
} from '@google/genai';

import type { FastifyBaseLogger } from 'fastify';

import { env } from '../config.js';
import { createCallAgentRuntime } from '../agent/build-call-agent.js';
import type { CallSessionState } from './call-session.js';
import type { SubscriptionStore } from './subscription-store.js';
import type { ScenarioDefinition } from '../types.js';

interface GeminiLiveSessionOptions {
  logger: FastifyBaseLogger;
  store: SubscriptionStore;
  callState: CallSessionState;
  confirmDigit: string;
  cancelDigit: string;
  model: string;
  customPrompt?: string;
  scenario?: ScenarioDefinition;
  onEvent: (event: Record<string, unknown>) => void;
}

export class GeminiLiveSession {
  private readonly logger: FastifyBaseLogger;
  private readonly onEvent: GeminiLiveSessionOptions['onEvent'];
  private readonly runtime;
  private readonly model: string;
  private readonly ai: GoogleGenAI;
  private session?: Session;
  private closed = false;

  constructor(
    private readonly options: GeminiLiveSessionOptions,
  ) {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required for Gemini browser calls.');
    }

    this.logger = options.logger;
    this.onEvent = options.onEvent;
    this.model = options.model;
    this.runtime = createCallAgentRuntime(options.store, options.callState, {
      confirmDigit: options.confirmDigit,
      cancelDigit: options.cancelDigit,
      customPrompt: options.customPrompt,
      scenario: options.scenario,
    });
    this.ai = new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
      httpOptions: {
        apiVersion: 'v1alpha',
      },
    });
  }

  async connect() {
    this.session = await this.ai.live.connect({
      model: this.model,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: this.runtime.instructions,
        tools: this.runtime.getGeminiFunctionDeclarations(),
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onmessage: (event) => {
          void this.handleServerMessage(event);
        },
        onerror: (event) => {
          this.logger.error({ event }, 'Gemini live session error');
          this.emit({
            type: 'error',
            message: event.error?.message ?? 'Gemini live session error.',
          });
        },
        onclose: () => {
          this.emit({
            type: 'status',
            message: 'Gemini live session closed.',
          });
        },
      },
    });

    this.emit({
      type: 'ready',
      sessionId: this.options.callState.sessionId,
      provider: 'gemini',
    });
  }

  sendAudioChunk(data: string, mimeType = 'audio/pcm;rate=16000') {
    if (!this.session || this.closed) {
      return;
    }

    this.session.sendRealtimeInput({
      audio: {
        data,
        mimeType,
      },
    });
  }

  sendAudioStreamEnd() {
    if (!this.session || this.closed) {
      return;
    }

    this.session.sendRealtimeInput({
      audioStreamEnd: true,
    });
  }

  async close() {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.session?.close();
  }

  private emit(event: Record<string, unknown>) {
    if (this.closed) {
      return;
    }

    this.onEvent(event);
  }

  private async handleServerMessage(event: LiveServerMessage) {
    if (event.setupComplete?.sessionId) {
      this.options.callState.callSid = event.setupComplete.sessionId;
      this.emit({
        type: 'provider_session',
        providerSessionId: event.setupComplete.sessionId,
      });
    }

    if (event.toolCall?.functionCalls?.length) {
      await this.handleToolCalls(event.toolCall.functionCalls);
    }

    const serverContent = event.serverContent;
    if (!serverContent) {
      return;
    }

    if (serverContent.inputTranscription?.text) {
      this.emit({
        type: 'input_transcript',
        text: serverContent.inputTranscription.text,
        finished: serverContent.inputTranscription.finished ?? false,
      });
    }

    if (serverContent.outputTranscription?.text) {
      this.emit({
        type: 'output_transcript',
        text: serverContent.outputTranscription.text,
        finished: serverContent.outputTranscription.finished ?? false,
      });
    }

    for (const part of serverContent.modelTurn?.parts ?? []) {
      if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/pcm')) {
        this.emit({
          type: 'audio',
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType,
        });
      }

      if (part.text) {
        this.emit({
          type: 'output_text',
          text: part.text,
        });
      }
    }

    if (serverContent.turnComplete) {
      this.emit({
        type: 'turn_complete',
      });
    }
  }

  private async handleToolCalls(functionCalls: FunctionCall[]) {
    if (!this.session) {
      return;
    }

    const functionResponses = await Promise.all(
      functionCalls.map(async (functionCall) => {
        const name = functionCall.name;
        if (!name) {
          throw new Error('Gemini function call name is missing.');
        }

        try {
          const output = await this.runtime.executeTool(name, functionCall.args ?? {});
          return {
            id: functionCall.id,
            name,
            response: {
              output,
            },
          };
        } catch (error) {
          this.logger.error(
            { error, functionCall },
            'Gemini tool execution failed',
          );

          return {
            id: functionCall.id,
            name,
            response: {
              error:
                error instanceof Error ? error.message : 'Tool execution failed.',
            },
          };
        }
      }),
    );

    this.session.sendToolResponse({
      functionResponses,
    });
  }
}
