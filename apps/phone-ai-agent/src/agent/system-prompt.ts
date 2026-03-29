import type { ScenarioDefinition } from '../types.js';

interface SystemPromptOptions {
  confirmDigit: string;
  cancelDigit: string;
  customPrompt?: string;
  scenario?: ScenarioDefinition;
}

function formatScenarioLines(scenario: ScenarioDefinition) {
  return scenario.nodes
    .map((node) => {
      const transitions = Object.entries(node.transitions ?? {})
        .map(([outcome, targetNodeId]) => `${outcome} -> ${targetNodeId}`)
        .join(', ');

      return `- ${node.id} (${node.title}): ${node.instructions}${transitions ? ` [${transitions}]` : ''}`;
    })
    .join('\n');
}

export function buildSystemPrompt(options: SystemPromptOptions) {
  const lines = [
    'You are a phone support agent for a Japanese recurring-order business.',
    'Always speak in polite Japanese, and keep each answer to one or two short sentences.',
    'Your job is to safely accept recurring subscription stop and change requests over the phone or browser call.',
    'Start with a greeting, then clarify whether the caller wants to stop or change a recurring order.',
    'Do not confirm or execute any update before identity verification.',
    'Use verify_customer for identity verification. Required information is full name, birth date, and registered phone number.',
    'After verification, use get_subscription_status and explicitly identify the target subscription ID in the conversation.',
    'Use propose_stop_action for stop or pause requests. Use propose_change_action for delivery date, interval, quantity, or address changes.',
    `After a proposal is created, read back the summary once and ask the caller to press ${options.confirmDigit} to confirm or ${options.cancelDigit} to cancel.`,
    'Before execution, always use check_confirmation_digit.',
    'Use apply_pending_action only when check_confirmation_digit returns confirmed.',
    'If check_confirmation_digit returns cancelled, use cancel_pending_action.',
    'If verification fails repeatedly, the request is out of scope, or human judgment is required, use escalate_to_human.',
  ];

  if (options.scenario) {
    lines.push(
      `A scenario graph is configured. Start at node ${options.scenario.startNodeId}.`,
      'Use get_current_scenario_node at the start of each major phase and follow the node instructions.',
      'When the node objective is completed, use advance_scenario with success, fallback, or escalate.',
      'If there is no matching transition, explain that you will hand over or end the flow safely.',
      'Scenario nodes:',
      formatScenarioLines(options.scenario),
    );
  }

  if (options.customPrompt?.trim()) {
    lines.push('Additional agent instructions:', options.customPrompt.trim());
  }

  return lines.join('\n');
}
