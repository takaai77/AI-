import { mkdtemp, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { SubscriptionStore } from '../src/services/subscription-store.js';

async function createStore() {
  const tempDir = await mkdtemp(join(tmpdir(), 'phone-ai-agent-'));
  const dataFile = join(tempDir, 'subscriptions.json');
  const store = new SubscriptionStore(dataFile);
  await store.initialize();
  return { store, dataFile };
}

test('verifies customer and returns subscription list', async () => {
  const { store } = await createStore();

  const verified = await store.verifyCustomer(
    {
      fullName: '山田花子',
      birthDate: '1988-04-16',
      phoneNumber: '09012345678',
    },
    'call-session-1',
  );

  assert.equal(verified.customerId, 'cust_001');
  assert.equal(verified.subscriptions.length, 1);
});

test('applies skip-next stop action', async () => {
  const { store } = await createStore();

  const action = await store.previewStopAction('cust_001', {
    subscriptionId: 'sub_1001',
    mode: 'skip_next',
  });

  const message = await store.applyPendingAction(
    'cust_001',
    action,
    'call-session-2',
    'CA123',
  );

  assert.match(message, /Skip the next shipment/);
  const summaries = await store.getSubscriptionSummaries('cust_001');
  assert.ok(summaries[0]);
  assert.match(summaries[0], /2026-05-12/);
});

test('applies quantity change action', async () => {
  const { store, dataFile } = await createStore();

  const action = await store.previewChangeAction('cust_002', {
    subscriptionId: 'sub_2001',
    changeType: 'quantity',
    newValue: '3',
  });

  await store.applyPendingAction('cust_002', action, 'call-session-3');

  const raw = await readFile(dataFile, 'utf8');
  assert.match(raw, /"quantity": 3/);
});
