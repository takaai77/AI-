import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

import type {
  AuditLog,
  ChangeProposal,
  Customer,
  Database,
  PendingAction,
  StopProposal,
  Subscription,
  VerificationInput,
  VerifiedCustomer,
} from '../types.js';

function normalizeName(value: string) {
  return value.replace(/\s+/g, '').trim();
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, '');
}

function phonesMatch(expected: string, actual: string) {
  const left = normalizePhone(expected).replace(/^\+81/, '0');
  const right = normalizePhone(actual).replace(/^\+81/, '0');
  return left === right || left.endsWith(right) || right.endsWith(left);
}

function parseIsoDate(dateText: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    throw new Error('Date must use YYYY-MM-DD format.');
  }

  const parts = dateText.split('-');
  const year = Number.parseInt(parts[0]!, 10);
  const month = Number.parseInt(parts[1]!, 10);
  const day = Number.parseInt(parts[2]!, 10);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.valueOf()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('Date must use YYYY-MM-DD format.');
  }

  return date;
}

function addDays(dateText: string, days: number) {
  const date = parseIsoDate(dateText);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function assertDate(dateText: string) {
  return parseIsoDate(dateText).toISOString().slice(0, 10);
}

function maskPhoneNumber(phoneNumber: string) {
  const digits = normalizePhone(phoneNumber).replace(/^\+81/, '0');
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

function formatSubscriptionSummary(subscription: Subscription) {
  const pausedUntil = subscription.pausedUntil
    ? `, resume ${subscription.pausedUntil}`
    : '';

  return `${subscription.id}: ${subscription.productName}, status ${subscription.status}, next ${subscription.nextShipDate}, quantity ${subscription.quantity}${pausedUntil}`;
}

export class SubscriptionStore {
  private readonly dataFilePath: string;
  private readonly seedFilePath: string;
  private writeQueue = Promise.resolve();

  constructor(dataFilePath: string) {
    this.dataFilePath = resolve(dataFilePath);
    this.seedFilePath = resolve(process.cwd(), 'data', 'subscriptions.sample.json');
  }

  async initialize() {
    await mkdir(dirname(this.dataFilePath), { recursive: true });

    try {
      await readFile(this.dataFilePath, 'utf8');
    } catch {
      await copyFile(this.seedFilePath, this.dataFilePath);
    }
  }

  async verifyCustomer(
    input: VerificationInput,
    callSessionId: string,
    callerNumber?: string,
    callSid?: string,
  ): Promise<VerifiedCustomer> {
    const db = await this.readDb();
    const customer = db.customers.find((candidate) => {
      const nameMatch =
        normalizeName(candidate.fullName) === normalizeName(input.fullName);
      const birthDateMatch = candidate.birthDate === input.birthDate;
      const phoneToMatch = input.phoneNumber ?? callerNumber;
      const phoneMatch = phoneToMatch
        ? phonesMatch(candidate.phoneNumber, phoneToMatch)
        : false;

      return nameMatch && birthDateMatch && phoneMatch;
    });

    if (!customer) {
      throw new Error('Identity verification failed.');
    }

    await this.recordAudit({
      id: randomUUID(),
      at: new Date().toISOString(),
      callSessionId,
      callSid,
      eventType: 'verified',
      customerId: customer.id,
      message: `Verified ${customer.fullName}`,
    });

    return {
      customerId: customer.id,
      fullName: customer.fullName,
      maskedPhoneNumber: maskPhoneNumber(customer.phoneNumber),
      subscriptions: customer.subscriptions.map((subscription) => ({
        id: subscription.id,
        productName: subscription.productName,
        nextShipDate: subscription.nextShipDate,
        status: subscription.status,
      })),
    };
  }

  async getSubscriptionSummaries(customerId: string) {
    const customer = await this.requireCustomer(customerId);
    return customer.subscriptions.map(formatSubscriptionSummary);
  }

  async previewStopAction(
    customerId: string,
    proposal: StopProposal,
  ): Promise<PendingAction> {
    const customer = await this.requireCustomer(customerId);
    const subscription = this.requireSubscription(customer, proposal.subscriptionId);

    let summary = '';

    if (proposal.mode === 'skip_next') {
      const newShipDate = addDays(subscription.nextShipDate, subscription.cadenceDays);
      summary = `Skip the next shipment for ${subscription.productName}. New next shipment date will be ${newShipDate}.`;
    }

    if (proposal.mode === 'pause_until') {
      if (!proposal.resumeDate) {
        throw new Error('resumeDate is required when mode is pause_until.');
      }

      const resumeDate = assertDate(proposal.resumeDate);
      summary = `Pause ${subscription.productName} until ${resumeDate}. Next shipment date will be ${resumeDate}.`;
    }

    if (proposal.mode === 'cancel') {
      summary = `Cancel the recurring shipment for ${subscription.productName}.`;
    }

    return {
      id: randomUUID(),
      kind: 'stop',
      createdAt: new Date().toISOString(),
      subscriptionId: subscription.id,
      summary,
      payload: proposal,
    };
  }

  async previewChangeAction(
    customerId: string,
    proposal: ChangeProposal,
  ): Promise<PendingAction> {
    const customer = await this.requireCustomer(customerId);
    const subscription = this.requireSubscription(customer, proposal.subscriptionId);

    let summary = '';

    if (proposal.changeType === 'next_ship_date') {
      const shipDate = assertDate(proposal.newValue);
      summary = `Change the next shipment date for ${subscription.productName} to ${shipDate}.`;
    }

    if (proposal.changeType === 'interval_days') {
      const intervalDays = Number.parseInt(proposal.newValue, 10);
      if (!Number.isInteger(intervalDays) || intervalDays < 7 || intervalDays > 90) {
        throw new Error('Interval days must be an integer between 7 and 90.');
      }

      summary = `Change the delivery interval for ${subscription.productName} to ${intervalDays} days.`;
    }

    if (proposal.changeType === 'quantity') {
      const quantity = Number.parseInt(proposal.newValue, 10);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        throw new Error('Quantity must be an integer between 1 and 10.');
      }

      summary = `Change the quantity for ${subscription.productName} to ${quantity}.`;
    }

    if (proposal.changeType === 'shipping_address') {
      if (proposal.newValue.trim().length < 6) {
        throw new Error('Shipping address must be provided in full.');
      }

      summary = `Change the shipping address for ${subscription.productName} to ${proposal.newValue.trim()}.`;
    }

    return {
      id: randomUUID(),
      kind: 'change',
      createdAt: new Date().toISOString(),
      subscriptionId: subscription.id,
      summary,
      payload: proposal,
    };
  }

  async applyPendingAction(
    customerId: string,
    action: PendingAction,
    callSessionId: string,
    callSid?: string,
  ) {
    const result = await this.withWriteLock(async (db) => {
      const customer = db.customers.find((item) => item.id === customerId);
      if (!customer) {
        throw new Error('Customer was not found.');
      }

      const subscription = customer.subscriptions.find(
        (item) => item.id === action.subscriptionId,
      );
      if (!subscription) {
        throw new Error('Subscription was not found.');
      }

      if (action.kind === 'stop') {
        const payload = action.payload as StopProposal;

        if (payload.mode === 'skip_next') {
          subscription.nextShipDate = addDays(
            subscription.nextShipDate,
            subscription.cadenceDays,
          );
          subscription.status = 'active';
          subscription.pausedUntil = undefined;
        }

        if (payload.mode === 'pause_until') {
          if (!payload.resumeDate) {
            throw new Error('resumeDate is missing.');
          }

          subscription.nextShipDate = assertDate(payload.resumeDate);
          subscription.status = 'paused';
          subscription.pausedUntil = payload.resumeDate;
        }

        if (payload.mode === 'cancel') {
          subscription.status = 'cancelled';
          subscription.pausedUntil = undefined;
        }
      }

      if (action.kind === 'change') {
        const payload = action.payload as ChangeProposal;

        if (payload.changeType === 'next_ship_date') {
          subscription.nextShipDate = assertDate(payload.newValue);
        }

        if (payload.changeType === 'interval_days') {
          subscription.cadenceDays = Number.parseInt(payload.newValue, 10);
        }

        if (payload.changeType === 'quantity') {
          subscription.quantity = Number.parseInt(payload.newValue, 10);
        }

        if (payload.changeType === 'shipping_address') {
          subscription.shippingAddress = payload.newValue.trim();
        }
      }

      const message = `${action.summary} Updated subscription: ${formatSubscriptionSummary(subscription)}`;

      db.auditLogs.unshift({
        id: randomUUID(),
        at: new Date().toISOString(),
        callSessionId,
        callSid,
        eventType: 'action_applied',
        customerId,
        subscriptionId: subscription.id,
        message,
      });

      return message;
    });

    return result;
  }

  async recordProposal(
    customerId: string,
    action: PendingAction,
    callSessionId: string,
    callSid?: string,
  ) {
    await this.recordAudit({
      id: randomUUID(),
      at: new Date().toISOString(),
      callSessionId,
      callSid,
      eventType: 'proposal_created',
      customerId,
      subscriptionId: action.subscriptionId,
      message: action.summary,
    });
  }

  async recordCancelled(
    customerId: string | undefined,
    action: PendingAction | undefined,
    callSessionId: string,
    callSid?: string,
  ) {
    await this.recordAudit({
      id: randomUUID(),
      at: new Date().toISOString(),
      callSessionId,
      callSid,
      eventType: 'action_cancelled',
      customerId,
      subscriptionId: action?.subscriptionId,
      message: action?.summary ?? 'Pending action cancelled.',
    });
  }

  async recordEscalation(
    customerId: string | undefined,
    reason: string,
    callSessionId: string,
    callSid?: string,
  ) {
    await this.recordAudit({
      id: randomUUID(),
      at: new Date().toISOString(),
      callSessionId,
      callSid,
      eventType: 'human_escalation',
      customerId,
      message: reason,
    });
  }

  async recordDtmf(
    customerId: string | undefined,
    digit: string,
    callSessionId: string,
    callSid?: string,
  ) {
    await this.recordAudit({
      id: randomUUID(),
      at: new Date().toISOString(),
      callSessionId,
      callSid,
      eventType: 'dtmf',
      customerId,
      message: `DTMF ${digit}`,
    });
  }

  private async recordAudit(entry: AuditLog) {
    await this.withWriteLock(async (db) => {
      db.auditLogs.unshift(entry);
      return undefined;
    });
  }

  private async requireCustomer(customerId: string) {
    const db = await this.readDb();
    const customer = db.customers.find((item) => item.id === customerId);
    if (!customer) {
      throw new Error('Customer was not found.');
    }

    return customer;
  }

  private requireSubscription(customer: Customer, subscriptionId: string) {
    const subscription = customer.subscriptions.find((item) => item.id === subscriptionId);
    if (!subscription) {
      throw new Error('Subscription was not found.');
    }

    return subscription;
  }

  private async readDb() {
    const raw = await readFile(this.dataFilePath, 'utf8');
    return JSON.parse(raw) as Database;
  }

  private async writeDb(db: Database) {
    await writeFile(this.dataFilePath, `${JSON.stringify(db, null, 2)}\n`, 'utf8');
  }

  private async withWriteLock<T>(operation: (db: Database) => Promise<T> | T): Promise<T> {
    const execute = async () => {
      const db = await this.readDb();
      const result = await operation(db);
      await this.writeDb(db);
      return result;
    };

    const pending = this.writeQueue.then(execute, execute);
    this.writeQueue = pending.then(
      () => undefined,
      () => undefined,
    );

    return pending;
  }
}
