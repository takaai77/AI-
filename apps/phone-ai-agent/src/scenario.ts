import { z } from 'zod';

import type { ScenarioDefinition, ScenarioNode } from './types.js';

const transitionSchema = z
  .object({
    success: z.string().min(1).optional(),
    fallback: z.string().min(1).optional(),
    escalate: z.string().min(1).optional(),
  })
  .partial()
  .optional();

const nodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  instructions: z.string().min(1),
  transitions: transitionSchema,
});

export const scenarioDefinitionSchema = z
  .object({
    startNodeId: z.string().min(1),
    nodes: z.array(nodeSchema).min(1),
  })
  .transform((value) => normalizeScenarioDefinition(value));

export function normalizeScenarioDefinition(
  definition: ScenarioDefinition,
): ScenarioDefinition {
  const nodes = definition.nodes.map((node) => ({
    ...node,
    id: node.id.trim(),
    title: node.title.trim(),
    instructions: node.instructions.trim(),
    transitions: node.transitions
      ? Object.fromEntries(
          Object.entries(node.transitions).filter(
            (entry): entry is [string, string] =>
              Boolean(entry[1] && entry[1].trim()),
          ),
        )
      : undefined,
  })) satisfies ScenarioNode[];

  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      throw new Error(`Scenario node ID "${node.id}" is duplicated.`);
    }
    nodeIds.add(node.id);
  }

  if (!nodeIds.has(definition.startNodeId.trim())) {
    throw new Error('Scenario start node does not exist.');
  }

  for (const node of nodes) {
    for (const targetNodeId of Object.values(node.transitions ?? {})) {
      if (!nodeIds.has(targetNodeId)) {
        throw new Error(
          `Scenario transition target "${targetNodeId}" does not exist.`,
        );
      }
    }
  }

  return {
    startNodeId: definition.startNodeId.trim(),
    nodes,
  };
}
