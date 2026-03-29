import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeScenarioDefinition } from '../src/scenario.js';
import { CallSessionState } from '../src/services/call-session.js';

test('initializes and advances scenario nodes', () => {
  const scenario = normalizeScenarioDefinition({
    startNodeId: 'greeting',
    nodes: [
      {
        id: 'greeting',
        title: 'Greeting',
        instructions: 'Greet the caller.',
        transitions: {
          success: 'verification',
        },
      },
      {
        id: 'verification',
        title: 'Verification',
        instructions: 'Verify the caller.',
        transitions: {
          success: 'closing',
          fallback: 'verification',
        },
      },
      {
        id: 'closing',
        title: 'Closing',
        instructions: 'End the call.',
      },
    ],
  });

  const callState = new CallSessionState();
  callState.setScenario(scenario);

  assert.equal(callState.getCurrentScenarioNode()?.id, 'greeting');

  const firstStep = callState.advanceScenario('success', 'Greeting complete');
  assert.equal(firstStep.status, 'advanced');
  assert.equal(callState.getCurrentScenarioNode()?.id, 'verification');

  const secondStep = callState.advanceScenario('success', 'Verified');
  assert.equal(secondStep.status, 'advanced');
  assert.equal(callState.getCurrentScenarioNode()?.id, 'closing');
  assert.equal(callState.scenarioHistory.length, 3);
});

test('rejects scenarios with missing transition targets', () => {
  assert.throws(() => {
    normalizeScenarioDefinition({
      startNodeId: 'greeting',
      nodes: [
        {
          id: 'greeting',
          title: 'Greeting',
          instructions: 'Greet the caller.',
          transitions: {
            success: 'missing',
          },
        },
      ],
    });
  }, /does not exist/);
});
