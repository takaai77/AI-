import { randomUUID } from 'node:crypto';

import type {
  PendingAction,
  ScenarioDefinition,
  ScenarioNode,
  ScenarioTransitionType,
} from '../types.js';

interface ScenarioHistoryEntry {
  at: string;
  fromNodeId?: string;
  toNodeId?: string;
  outcome?: ScenarioTransitionType;
  reason?: string;
}

export class CallSessionState {
  readonly sessionId = randomUUID();
  callSid?: string;
  callerNumber?: string;
  verifiedCustomerId?: string;
  pendingAction?: PendingAction;
  lastDtmfDigit?: string;
  lastDtmfAt?: string;
  escalationReason?: string;
  scenario?: ScenarioDefinition;
  currentScenarioNodeId?: string;
  scenarioHistory: ScenarioHistoryEntry[] = [];

  setCallerContext(callSid: string | undefined, callerNumber: string | undefined) {
    if (callSid) {
      this.callSid = callSid;
    }

    if (callerNumber) {
      this.callerNumber = callerNumber;
    }
  }

  registerPendingAction(action: PendingAction) {
    this.pendingAction = action;
    this.lastDtmfDigit = undefined;
    this.lastDtmfAt = undefined;
  }

  setScenario(scenario: ScenarioDefinition | undefined) {
    this.scenario = scenario;
    this.currentScenarioNodeId = scenario?.startNodeId;
    this.scenarioHistory = scenario
      ? [
          {
            at: new Date().toISOString(),
            toNodeId: scenario.startNodeId,
            reason: 'Scenario initialized.',
          },
        ]
      : [];
  }

  hasScenario() {
    return Boolean(this.scenario && this.currentScenarioNodeId);
  }

  getCurrentScenarioNode(): ScenarioNode | undefined {
    if (!this.scenario || !this.currentScenarioNodeId) {
      return undefined;
    }

    return this.scenario.nodes.find((node) => node.id === this.currentScenarioNodeId);
  }

  advanceScenario(outcome: ScenarioTransitionType, reason?: string) {
    const currentNode = this.getCurrentScenarioNode();
    if (!currentNode) {
      return {
        status: 'not_configured',
        message: 'No scenario is configured.',
      } as const;
    }

    const nextNodeId = currentNode.transitions?.[outcome];
    const at = new Date().toISOString();

    if (!nextNodeId) {
      this.scenarioHistory.push({
        at,
        fromNodeId: currentNode.id,
        outcome,
        reason,
      });

      return {
        status: 'terminal',
        message: `No "${outcome}" transition is configured for node ${currentNode.id}.`,
        currentNode,
      } as const;
    }

    this.currentScenarioNodeId = nextNodeId;
    const nextNode = this.getCurrentScenarioNode();
    this.scenarioHistory.push({
      at,
      fromNodeId: currentNode.id,
      toNodeId: nextNodeId,
      outcome,
      reason,
    });

    return {
      status: 'advanced',
      message: `Moved from ${currentNode.id} to ${nextNodeId}.`,
      currentNode: nextNode,
    } as const;
  }

  registerDtmf(digit: string) {
    this.lastDtmfDigit = digit;
    this.lastDtmfAt = new Date().toISOString();
  }

  getConfirmationStatus(confirmDigit: string, cancelDigit: string) {
    if (!this.pendingAction || !this.lastDtmfDigit || !this.lastDtmfAt) {
      return 'pending';
    }

    if (this.lastDtmfAt <= this.pendingAction.createdAt) {
      return 'pending';
    }

    if (this.lastDtmfDigit === confirmDigit) {
      return 'confirmed';
    }

    if (this.lastDtmfDigit === cancelDigit) {
      return 'cancelled';
    }

    return 'pending';
  }

  clearPendingAction() {
    this.pendingAction = undefined;
    this.lastDtmfDigit = undefined;
    this.lastDtmfAt = undefined;
  }
}
