import Fastify, { type FastifyReply } from 'fastify';
import formbody from '@fastify/formbody';
import websocket from '@fastify/websocket';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { RealtimeSession } from '@openai/agents/realtime';
import { TwilioRealtimeTransportLayer } from '@openai/agents-extensions';
import { z } from 'zod';

import { env } from './config.js';
import { scenarioDefinitionSchema } from './scenario.js';
import { buildCallAgent } from './agent/build-call-agent.js';
import { CallSessionState } from './services/call-session.js';
import { GeminiLiveSession } from './services/gemini-live-session.js';
import { SubscriptionStore } from './services/subscription-store.js';
import type { AgentProvider, ScenarioDefinition } from './types.js';

interface BrowserSessionRecord {
  sessionId: string;
  provider: AgentProvider;
  providerSessionId?: string;
  callState: CallSessionState;
  close: () => Promise<void> | void;
}

const openAiBrowserSessionSchema = z.object({
  offerSdp: z.string().min(1),
  model: z.string().min(1).optional(),
  prompt: z.string().optional(),
  scenario: scenarioDefinitionSchema.optional(),
});

const geminiStartSchema = z.object({
  model: z.string().min(1).optional(),
  prompt: z.string().optional(),
  scenario: scenarioDefinitionSchema.optional(),
});

const geminiAudioChunkSchema = z.object({
  data: z.string().min(1),
  mimeType: z.string().optional(),
});

const store = new SubscriptionStore(env.DATA_FILE);
await store.initialize();

const browserSessions = new Map<string, BrowserSessionRecord>();

const app = Fastify({
  logger: {
    level: 'info',
  },
});

app.addContentTypeParser(
  'application/sdp',
  { parseAs: 'string' },
  (_request, payload, done) => {
    done(null, payload);
  },
);

await app.register(formbody);
await app.register(websocket);

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;');
}

function resolvePublicWebSocketUrl(hostHeader?: string) {
  if (env.PUBLIC_URL) {
    return `${env.PUBLIC_URL.replace(/^http/, 'ws').replace(/\/$/, '')}/twilio/media-stream`;
  }

  if (!hostHeader) {
    throw new Error('PUBLIC_URL is required when Host header is unavailable.');
  }

  return `wss://${hostHeader}/twilio/media-stream`;
}

async function sendPublicFile(
  reply: FastifyReply,
  fileName: string,
  contentType: string,
) {
  const filePath = resolve(process.cwd(), 'public', fileName);
  const content = await readFile(filePath, 'utf8');
  reply.type(contentType).send(content);
}

function parseScenario(
  input: ScenarioDefinition | undefined,
): ScenarioDefinition | undefined {
  if (!input) {
    return undefined;
  }

  return scenarioDefinitionSchema.parse(input);
}

function getBrowserSessionState(record: BrowserSessionRecord) {
  const currentScenarioNode = record.callState.getCurrentScenarioNode();

  return {
    sessionId: record.sessionId,
    provider: record.provider,
    providerSessionId: record.providerSessionId ?? null,
    verifiedCustomerId: record.callState.verifiedCustomerId ?? null,
    pendingActionSummary: record.callState.pendingAction?.summary ?? null,
    escalationReason: record.callState.escalationReason ?? null,
    scenario: record.callState.scenario
      ? {
          startNodeId: record.callState.scenario.startNodeId,
          currentNodeId: record.callState.currentScenarioNodeId ?? null,
          currentNodeTitle: currentScenarioNode?.title ?? null,
          history: record.callState.scenarioHistory,
        }
      : null,
  };
}

function safeSendSocketJson(
  send: (payload: string) => void,
  payload: Record<string, unknown>,
) {
  try {
    send(JSON.stringify(payload));
  } catch {
    return;
  }
}

async function createOpenAiBrowserSession(input: {
  offerSdp: string;
  model?: string;
  prompt?: string;
  scenario?: ScenarioDefinition;
}) {
  const model = input.model ?? env.OPENAI_REALTIME_MODEL;
  const scenario = parseScenario(input.scenario);

  const openAiResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/sdp',
    },
    body: input.offerSdp,
  });

  if (!openAiResponse.ok) {
    const errorText = await openAiResponse.text();
    app.log.error(
      { status: openAiResponse.status, errorText },
      'Failed to create browser realtime call',
    );
    throw new Error('Failed to create browser realtime call.');
  }

  const callId = openAiResponse.headers.get('Location')?.split('/').pop();
  if (!callId) {
    throw new Error('Realtime call ID was not returned.');
  }

  const answerSdp = await openAiResponse.text();
  const callState = new CallSessionState();
  callState.callSid = callId;
  if (scenario) {
    callState.setScenario(scenario);
  }

  const agent = buildCallAgent(store, callState, {
    confirmDigit: env.CONFIRM_DIGIT,
    cancelDigit: env.CANCEL_DIGIT,
    customPrompt: input.prompt,
    scenario,
  });

  const session = new RealtimeSession(agent, {
    transport: 'websocket',
    model,
    config: {
      audio: {
        output: {
          voice: env.OPENAI_VOICE,
        },
      },
    },
  });

  session.on('error', (error: unknown) => {
    app.log.error({ error, callId }, 'Browser sideband session error');
  });

  await session.connect({
    apiKey: env.OPENAI_API_KEY,
    model,
    callId,
  });

  browserSessions.set(callState.sessionId, {
    sessionId: callState.sessionId,
    provider: 'openai',
    providerSessionId: callId,
    callState,
    close: () => {
      session.close();
    },
  });

  return {
    answerSdp,
    sessionId: callState.sessionId,
    providerSessionId: callId,
  };
}

app.get('/healthz', async () => ({ ok: true }));

app.get('/browser-demo', async (_request, reply) => {
  await sendPublicFile(reply, 'browser-demo.html', 'text/html; charset=utf-8');
});

app.get('/browser-demo.js', async (_request, reply) => {
  await sendPublicFile(reply, 'browser-demo.js', 'text/javascript; charset=utf-8');
});

app.get('/browser-demo.css', async (_request, reply) => {
  await sendPublicFile(reply, 'browser-demo.css', 'text/css; charset=utf-8');
});

app.get('/browser/config', async () => ({
  defaultModels: {
    openai: env.OPENAI_REALTIME_MODEL,
    gemini: env.GEMINI_LIVE_MODEL,
  },
  confirmDigit: env.CONFIRM_DIGIT,
  cancelDigit: env.CANCEL_DIGIT,
  geminiEnabled: Boolean(env.GEMINI_API_KEY),
}));

app.all('/twilio/voice', async (request, reply) => {
  const body = (request.body ?? {}) as Record<string, string | undefined>;
  const callSid = body.CallSid ?? '';
  const from = body.From ?? '';
  const streamUrl = resolvePublicWebSocketUrl(request.headers.host);
  const twiml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Response>' +
    '<Connect>' +
    `<Stream url="${escapeXml(streamUrl)}">` +
    `<Parameter name="call_sid" value="${escapeXml(callSid)}" />` +
    `<Parameter name="caller_number" value="${escapeXml(from)}" />` +
    '</Stream>' +
    '</Connect>' +
    '</Response>';

  reply.type('text/xml').send(twiml);
});

app.post('/browser/session', async (request, reply) => {
  const offerSdp = request.body as string;
  if (!offerSdp || typeof offerSdp !== 'string') {
    reply.code(400).send({ error: 'SDP offer is required.' });
    return;
  }

  try {
    const session = await createOpenAiBrowserSession({ offerSdp });
    reply
      .header('X-Realtime-Call-Id', session.providerSessionId)
      .header('X-Browser-Session-Id', session.sessionId)
      .type('application/sdp')
      .send(session.answerSdp);
  } catch (error) {
    reply.code(502).send({
      error: error instanceof Error ? error.message : 'Browser session failed.',
    });
  }
});

app.post('/browser/openai/session', async (request, reply) => {
  const parsed = openAiBrowserSessionSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400).send({
      error: 'Invalid browser session payload.',
      issues: parsed.error.issues,
    });
    return;
  }

  try {
    const session = await createOpenAiBrowserSession(parsed.data);
    reply.send({
      provider: 'openai',
      sessionId: session.sessionId,
      providerSessionId: session.providerSessionId,
      answerSdp: session.answerSdp,
    });
  } catch (error) {
    app.log.error({ error }, 'Failed to create OpenAI browser session');
    reply.code(502).send({
      error: error instanceof Error ? error.message : 'Browser session failed.',
    });
  }
});

app.get('/browser/session/:sessionId/state', async (request, reply) => {
  const { sessionId } = request.params as { sessionId: string };
  const record = browserSessions.get(sessionId);

  if (!record) {
    reply.code(404).send({ error: 'Browser session was not found.' });
    return;
  }

  reply.send(getBrowserSessionState(record));
});

app.delete('/browser/session/:sessionId', async (request, reply) => {
  const { sessionId } = request.params as { sessionId: string };
  const record = browserSessions.get(sessionId);

  if (!record) {
    reply.code(204).send();
    return;
  }

  await Promise.resolve(record.close());
  browserSessions.delete(sessionId);
  reply.code(204).send();
});

app.post('/browser/session/:sessionId/digit', async (request, reply) => {
  const { sessionId } = request.params as { sessionId: string };
  const { digit } = (request.body ?? {}) as { digit?: string };
  const record = browserSessions.get(sessionId);

  if (!record) {
    reply.code(404).send({ error: 'Browser session was not found.' });
    return;
  }

  if (!digit || digit.length !== 1) {
    reply.code(400).send({ error: 'A single DTMF digit is required.' });
    return;
  }

  record.callState.registerDtmf(digit);
  await store.recordDtmf(
    record.callState.verifiedCustomerId,
    digit,
    record.callState.sessionId,
    record.callState.callSid,
  );

  reply.send({ ok: true });
});

app.get('/browser/gemini/live', { websocket: true }, (connection) => {
  let liveSession: GeminiLiveSession | undefined;
  let browserSessionId: string | undefined;

  const socketSend = (payload: Record<string, unknown>) => {
    safeSendSocketJson(
      (serialized) => {
        if (connection.readyState === 1) {
          connection.send(serialized);
        }
      },
      payload,
    );
  };

  connection.on('message', async (raw: unknown) => {
    let message: Record<string, unknown>;
    try {
      const serialized = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
      message = JSON.parse(serialized) as Record<string, unknown>;
    } catch {
      socketSend({
        type: 'error',
        message: 'Gemini websocket message must be valid JSON.',
      });
      return;
    }

    const type = message.type;
    if (type === 'start') {
      if (liveSession) {
        socketSend({
          type: 'error',
          message: 'Gemini session is already started.',
        });
        return;
      }

      const parsed = geminiStartSchema.safeParse(message.payload ?? {});
      if (!parsed.success) {
        socketSend({
          type: 'error',
          message: 'Gemini start payload is invalid.',
          issues: parsed.error.issues,
        });
        return;
      }

      try {
        const callState = new CallSessionState();
        browserSessionId = callState.sessionId;

        liveSession = new GeminiLiveSession({
          logger: app.log,
          store,
          callState,
          confirmDigit: env.CONFIRM_DIGIT,
          cancelDigit: env.CANCEL_DIGIT,
          model: parsed.data.model ?? env.GEMINI_LIVE_MODEL,
          customPrompt: parsed.data.prompt,
          scenario: parsed.data.scenario,
          onEvent: (event) => {
            if (event.type === 'provider_session') {
              const providerSessionId = event.providerSessionId;
              const record = browserSessionId
                ? browserSessions.get(browserSessionId)
                : undefined;
              if (record && typeof providerSessionId === 'string') {
                record.providerSessionId = providerSessionId;
              }
            }

            socketSend(event);
          },
        });

        browserSessions.set(callState.sessionId, {
          sessionId: callState.sessionId,
          provider: 'gemini',
          callState,
          close: async () => {
            await liveSession?.close();
            try {
              connection.close();
            } catch {
              return;
            }
          },
        });

        await liveSession.connect();
      } catch (error) {
        if (browserSessionId) {
          browserSessions.delete(browserSessionId);
        }

        socketSend({
          type: 'error',
          message:
            error instanceof Error ? error.message : 'Failed to start Gemini session.',
        });
      }
      return;
    }

    if (!liveSession) {
      socketSend({
        type: 'error',
        message: 'Start the Gemini session before sending audio.',
      });
      return;
    }

    if (type === 'audio_chunk') {
      const parsed = geminiAudioChunkSchema.safeParse(message.payload);
      if (!parsed.success) {
        socketSend({
          type: 'error',
          message: 'Gemini audio payload is invalid.',
        });
        return;
      }

      liveSession.sendAudioChunk(parsed.data.data, parsed.data.mimeType);
      return;
    }

    if (type === 'audio_end') {
      liveSession.sendAudioStreamEnd();
      return;
    }

    socketSend({
      type: 'error',
      message: `Unsupported Gemini websocket message type: ${String(type)}`,
    });
  });

  connection.on('close', () => {
    if (browserSessionId) {
      browserSessions.delete(browserSessionId);
    }

    void liveSession?.close();
  });
});

app.get('/twilio/media-stream', { websocket: true }, (connection) => {
  const callState = new CallSessionState();
  const agent = buildCallAgent(store, callState, {
    confirmDigit: env.CONFIRM_DIGIT,
    cancelDigit: env.CANCEL_DIGIT,
  });

  const transport = new TwilioRealtimeTransportLayer({
    twilioWebSocket: connection,
  });

  const session = new RealtimeSession(agent, {
    transport,
    model: env.OPENAI_REALTIME_MODEL,
    config: {
      audio: {
        output: {
          voice: env.OPENAI_VOICE,
        },
      },
    },
  });

  session.on('transport_event', async (event: unknown) => {
    const payload = event as {
      type?: string;
      message?: {
        event?: string;
        dtmf?: { digit?: string };
        start?: {
          customParameters?: Record<string, string | undefined>;
        };
      };
    };

    if (payload.type !== 'twilio_message' || !payload.message) {
      return;
    }

    if (payload.message.event === 'start') {
      const params = payload.message.start?.customParameters;
      callState.setCallerContext(params?.call_sid, params?.caller_number);
    }

    if (payload.message.event === 'dtmf' && payload.message.dtmf?.digit) {
      callState.registerDtmf(payload.message.dtmf.digit);
      await store.recordDtmf(
        callState.verifiedCustomerId,
        payload.message.dtmf.digit,
        callState.sessionId,
        callState.callSid,
      );
    }
  });

  session.on('error', (error: unknown) => {
    app.log.error(error, 'Realtime session error');
  });

  session
    .connect({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_REALTIME_MODEL,
    })
    .catch((error: unknown) => {
      app.log.error(error, 'Failed to connect realtime session');
    });
});

await app.listen({
  port: env.PORT,
  host: '0.0.0.0',
});
