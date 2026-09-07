// src/levels/nodes.ts
// Node type definitions and helpers for the map system.

export type NodeType = 'battle' | 'elite' | 'shop' | 'event' | 'rest' | 'boss';

export interface NodeData {
  id: string;
  type: NodeType;
  weight: number; // for distribution tuning
  layer: number;
  position: number;
  connections: string[]; // ids of nodes in the next layer
  visited: boolean;
  available: boolean; // unlocked for selection
}

/**
 * Per-node-type selection weight. Note: 'elite' and 'boss' are forced by the
 * generator, so their weights are 0 in the random roll.
 */
export const NODE_TYPE_WEIGHTS: Record<NodeType, number> = {
  battle: 0.70,
  elite: 0,
  shop: 0.15,
  event: 0.10,
  rest: 0.05,
  boss: 0,
};

/** Returns true if a node type counts as "combat" (affects reward calculation). */
export function isCombatType(type: NodeType): boolean {
  return type === 'battle' || type === 'elite' || type === 'boss';
}