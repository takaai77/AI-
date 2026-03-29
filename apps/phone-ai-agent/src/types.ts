export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';
export type AgentProvider = 'openai' | 'gemini';

export interface Subscription {
  id: string;
  productName: string;
  cadenceDays: number;
  quantity: number;
  nextShipDate: string;
  shippingAddress: string;
  status: SubscriptionStatus;
  pausedUntil?: string;
}

export interface Customer {
  id: string;
  fullName: string;
  phoneNumber: string;
  birthDate: string;
  postalCode: string;
  subscriptions: Subscription[];
}

export interface AuditLog {
  id: string;
  at: string;
  callSessionId: string;
  callSid?: string;
  eventType:
    | 'verified'
    | 'proposal_created'
    | 'action_applied'
    | 'action_cancelled'
    | 'human_escalation'
    | 'dtmf';
  customerId?: string;
  subscriptionId?: string;
  message: string;
}

export interface Database {
  customers: Customer[];
  auditLogs: AuditLog[];
}

export type StopMode = 'skip_next' | 'pause_until' | 'cancel';
export type ChangeType =
  | 'next_ship_date'
  | 'interval_days'
  | 'quantity'
  | 'shipping_address';

export interface StopProposal {
  subscriptionId: string;
  mode: StopMode;
  resumeDate?: string;
  reason?: string;
}

export interface ChangeProposal {
  subscriptionId: string;
  changeType: ChangeType;
  newValue: string;
}

export interface PendingAction {
  id: string;
  kind: 'stop' | 'change';
  createdAt: string;
  subscriptionId: string;
  summary: string;
  payload: StopProposal | ChangeProposal;
}

export interface VerificationInput {
  fullName: string;
  birthDate: string;
  phoneNumber?: string;
}

export interface VerifiedCustomer {
  customerId: string;
  fullName: string;
  maskedPhoneNumber: string;
  subscriptions: Array<{
    id: string;
    productName: string;
    nextShipDate: string;
    status: SubscriptionStatus;
  }>;
}

export type ScenarioTransitionType = 'success' | 'fallback' | 'escalate';

export interface ScenarioNode {
  id: string;
  title: string;
  instructions: string;
  transitions?: Partial<Record<ScenarioTransitionType, string>>;
}

export interface ScenarioDefinition {
  startNodeId: string;
  nodes: ScenarioNode[];
}
