import { tool } from '@openai/agents';
import { RealtimeAgent } from '@openai/agents/realtime';
import { z } from 'zod';

import type { SubscriptionStore } from '../services/subscription-store.js';
import type { CallSessionState } from '../services/call-session.js';
import type { ScenarioDefinition } from '../types.js';
import { buildSystemPrompt } from './system-prompt.js';

interface JsonSchema {
  additionalProperties?: boolean;
  properties: Record<string, unknown>;
  required?: string[];
  type: 'object';
}

interface CallAgentOptions {
  confirmDigit: string;
  cancelDigit: string;
  customPrompt?: string;
  scenario?: ScenarioDefinition;
}

interface AgentToolDefinition {
  name: string;
  description: string;
  jsonSchema: JsonSchema;
  parameters: z.ZodTypeAny;
  execute: (input: any) => Promise<unknown>;
}

function createRuntimeTools(
  store: SubscriptionStore,
  callState: CallSessionState,
  options: CallAgentOptions,
) {
  const requireVerifiedCustomer = () => {
    if (!callState.verifiedCustomerId) {
      throw new Error('Identity verification must be completed first.');
    }

    return callState.verifiedCustomerId;
  };

  if (options.scenario) {
    callState.setScenario(options.scenario);
  }

  const toolDefinitions: AgentToolDefinition[] = [];

  if (callState.hasScenario()) {
    toolDefinitions.push(
      {
        name: 'get_current_scenario_node',
        description:
          'Get the current scenario node, including instructions and outgoing transitions.',
        jsonSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        parameters: z.object({}),
        execute: async () => {
          const currentNode = callState.getCurrentScenarioNode();
          if (!currentNode) {
            return {
              message: 'No scenario is configured.',
              status: 'not_configured',
            };
          }

          return {
            message: `Current scenario node is ${currentNode.id}.`,
            node: currentNode,
            history: callState.scenarioHistory,
          };
        },
      },
      {
        name: 'advance_scenario',
        description:
          'Move the scenario graph forward using success, fallback, or escalate.',
        jsonSchema: {
          type: 'object',
          properties: {
            outcome: {
              type: 'string',
              enum: ['success', 'fallback', 'escalate'],
            },
            reason: {
              type: 'string',
            },
          },
          required: ['outcome'],
          additionalProperties: false,
        },
        parameters: z.object({
          outcome: z.enum(['success', 'fallback', 'escalate']),
          reason: z.string().optional(),
        }),
        execute: async ({ outcome, reason }) => {
          const result = callState.advanceScenario(outcome, reason);
          return {
            ...result,
            history: callState.scenarioHistory,
          };
        },
      },
    );
  }

  toolDefinitions.push(
    {
      name: 'verify_customer',
      description:
        'Verify the caller using full name, birth date, and registered phone number. If the incoming phone number is already available, phoneNumber may be omitted.',
      jsonSchema: {
        type: 'object',
        properties: {
          fullName: {
            type: 'string',
          },
          birthDate: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          },
          phoneNumber: {
            type: 'string',
          },
        },
        required: ['fullName', 'birthDate'],
        additionalProperties: false,
      },
      parameters: z.object({
        fullName: z.string().min(1),
        birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        phoneNumber: z.string().optional(),
      }),
      execute: async ({ fullName, birthDate, phoneNumber }) => {
        const verified = await store.verifyCustomer(
          { fullName, birthDate, phoneNumber },
          callState.sessionId,
          callState.callerNumber,
          callState.callSid,
        );

        callState.verifiedCustomerId = verified.customerId;

        return {
          message: `Verified customer ${verified.fullName}.`,
          verified,
        };
      },
    },
    {
      name: 'get_subscription_status',
      description:
        'Fetch the current recurring-order summary for the verified customer.',
      jsonSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      parameters: z.object({}),
      execute: async () => {
        const customerId = requireVerifiedCustomer();
        const subscriptions = await store.getSubscriptionSummaries(customerId);
        return {
          message: subscriptions.join(' / '),
          subscriptions,
        };
      },
    },
    {
      name: 'propose_stop_action',
      description:
        'Create a stop or pause proposal. After using this tool, read the proposal back once and ask the caller to confirm with DTMF.',
      jsonSchema: {
        type: 'object',
        properties: {
          subscriptionId: {
            type: 'string',
          },
          mode: {
            type: 'string',
            enum: ['skip_next', 'pause_until', 'cancel'],
          },
          resumeDate: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          },
          reason: {
            type: 'string',
          },
        },
        required: ['subscriptionId', 'mode'],
        additionalProperties: false,
      },
      parameters: z.object({
        subscriptionId: z.string().min(1),
        mode: z.enum(['skip_next', 'pause_until', 'cancel']),
        resumeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        reason: z.string().optional(),
      }),
      execute: async ({ subscriptionId, mode, resumeDate, reason }) => {
        const customerId = requireVerifiedCustomer();
        const action = await store.previewStopAction(customerId, {
          subscriptionId,
          mode,
          resumeDate,
          reason,
        });

        callState.registerPendingAction(action);
        await store.recordProposal(
          customerId,
          action,
          callState.sessionId,
          callState.callSid,
        );

        return {
          message: `${action.summary} Ask the caller to press ${options.confirmDigit} to confirm or ${options.cancelDigit} to cancel.`,
          action,
        };
      },
    },
    {
      name: 'propose_change_action',
      description:
        'Create a change proposal for delivery date, interval, quantity, or shipping address. After using this tool, read the proposal back once and ask for DTMF confirmation.',
      jsonSchema: {
        type: 'object',
        properties: {
          subscriptionId: {
            type: 'string',
          },
          changeType: {
            type: 'string',
            enum: [
              'next_ship_date',
              'interval_days',
              'quantity',
              'shipping_address',
            ],
          },
          newValue: {
            type: 'string',
          },
        },
        required: ['subscriptionId', 'changeType', 'newValue'],
        additionalProperties: false,
      },
      parameters: z.object({
        subscriptionId: z.string().min(1),
        changeType: z.enum([
          'next_ship_date',
          'interval_days',
          'quantity',
          'shipping_address',
        ]),
        newValue: z.string().min(1),
      }),
      execute: async ({ subscriptionId, changeType, newValue }) => {
        const customerId = requireVerifiedCustomer();
        const action = await store.previewChangeAction(customerId, {
          subscriptionId,
          changeType,
          newValue,
        });

        callState.registerPendingAction(action);
        await store.recordProposal(
          customerId,
          action,
          callState.sessionId,
          callState.callSid,
        );

        return {
          message: `${action.summary} Ask the caller to press ${options.confirmDigit} to confirm or ${options.cancelDigit} to cancel.`,
          action,
        };
      },
    },
    {
      name: 'check_confirmation_digit',
      description:
        'Check the latest DTMF confirmation state. Returns confirmed, cancelled, or pending.',
      jsonSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      parameters: z.object({}),
      execute: async () => {
        if (!callState.pendingAction) {
          return {
            status: 'pending',
            message: 'No pending action exists.',
          };
        }

        const status = callState.getConfirmationStatus(
          options.confirmDigit,
          options.cancelDigit,
        );
        return {
          status,
          lastDigit: callState.lastDtmfDigit ?? null,
          summary: callState.pendingAction.summary,
        };
      },
    },
    {
      name: 'apply_pending_action',
      description:
        'Execute the pending stop or change request. Use this only after check_confirmation_digit returns confirmed.',
      jsonSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      parameters: z.object({}),
      execute: async () => {
        const customerId = requireVerifiedCustomer();
        if (!callState.pendingAction) {
          throw new Error('No pending action exists.');
        }

        const status = callState.getConfirmationStatus(
          options.confirmDigit,
          options.cancelDigit,
        );
        if (status !== 'confirmed') {
          throw new Error('The caller has not confirmed the request yet.');
        }

        const message = await store.applyPendingAction(
          customerId,
          callState.pendingAction,
          callState.sessionId,
          callState.callSid,
        );

        callState.clearPendingAction();
        return {
          message,
          status: 'applied',
        };
      },
    },
    {
      name: 'cancel_pending_action',
      description: 'Cancel the current pending action.',
      jsonSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      parameters: z.object({}),
      execute: async () => {
        await store.recordCancelled(
          callState.verifiedCustomerId,
          callState.pendingAction,
          callState.sessionId,
          callState.callSid,
        );
        callState.clearPendingAction();
        return {
          message: 'The pending request has been cancelled.',
          status: 'cancelled',
        };
      },
    },
    {
      name: 'escalate_to_human',
      description:
        'Escalate the call to a human operator. Use this for unsupported requests or cases that need human judgment.',
      jsonSchema: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
          },
        },
        required: ['reason'],
        additionalProperties: false,
      },
      parameters: z.object({
        reason: z.string().min(3),
      }),
      execute: async ({ reason }) => {
        callState.escalationReason = reason;
        await store.recordEscalation(
          callState.verifiedCustomerId,
          reason,
          callState.sessionId,
          callState.callSid,
        );
        return {
          message: `Escalation requested. Reason: ${reason}.`,
          status: 'escalated',
        };
      },
    },
  );

  return toolDefinitions;
}

export function createCallAgentRuntime(
  store: SubscriptionStore,
  callState: CallSessionState,
  options: CallAgentOptions,
) {
  const toolDefinitions = createRuntimeTools(store, callState, options);
  const toolByName = new Map(toolDefinitions.map((definition) => [definition.name, definition]));

  return {
    instructions: buildSystemPrompt(options),
    toolDefinitions,
    getGeminiFunctionDeclarations() {
      return [
        {
          functionDeclarations: toolDefinitions.map((definition) => ({
            name: definition.name,
            description: definition.description,
            parametersJsonSchema: definition.jsonSchema,
          })),
        },
      ];
    },
    getOpenAiTools() {
      return toolDefinitions.map((definition) =>
        tool({
          name: definition.name,
          description: definition.description,
          parameters: definition.parameters as any,
          execute: definition.execute,
        }),
      );
    },
    async executeTool(name: string, input: unknown) {
      const definition = toolByName.get(name);
      if (!definition) {
        throw new Error(`Tool "${name}" is not registered.`);
      }

      const parsedInput = definition.parameters.parse(input ?? {});
      return definition.execute(parsedInput);
    },
  };
}

export function buildCallAgent(
  store: SubscriptionStore,
  callState: CallSessionState,
  options: CallAgentOptions,
) {
  const runtime = createCallAgentRuntime(store, callState, options);

  return new RealtimeAgent({
    name: 'RecurringSubscriptionPhoneAgent',
    instructions: runtime.instructions,
    tools: runtime.getOpenAiTools(),
  });
}
