// src/levels/MapGenerator.ts
// Generates a layered DAG of nodes for each floor. The boss always sits at the
// final layer, and node ids are produced from the seeded RNG so the layout is
// fully deterministic.

import type { SeededRandom } from '../utils/rng';
import type { MapNode, MapState } from '../core/types';
import type { NodeType } from './nodes';
import { NODE_TYPE_WEIGHTS } from './nodes';

export interface FloorConfig {
  floor: number;
  name: string;
  background: string;
  boss: string;
}

/**
 * Target total node counts per floor. Floor 6 is the single-node finale.
 */
const FLOOR_NODE_COUNTS: Record<number, number> = {
  1: 10,
  2: 11,
  3: 12,
  4: 13,
  5: 13,
  6: 1, // final boss is single-node
};

export class MapGenerator {
  constructor(private rng: SeededRandom) {}

  /**
   * Generate a floor's map: layered DAG with the boss at the end.
   * Layers: 0 (start) -> 1..N-2 (mid) -> N-1 (boss).
   * Mid layers have 2-3 nodes each.
   */
  generate(floor: number): MapState {
    const totalNodes =
      FLOOR_NODE_COUNTS[floor] ?? (10 + Math.floor((floor - 1) * 0.5));

    if (floor === 6) {
      // Final boss is a single node
      const bossNode: MapNode = {
        id: `boss_${floor}_0_${this.rng.nextInt(100000, 999999)}`,
        type: 'boss',
        x: 0,
        y: 0,
        connections: [],
        visited: false,
        available: true,
      };
      return {
        floor,
        nodes: [[bossNode]],
        currentNodeId: bossNode.id,
      };
    }

    const layers: MapNode[][] = [];

    // Layer 0: 1 starting battle node
    layers.push([this.createNode('battle', 0, 0)]);

    // Mid layers (1 to totalNodes - 2): each has 2-3 nodes
    for (let i = 1; i <= totalNodes - 2; i++) {
      const layerSize = this.rng.nextInt(2, 3);
      const layer: MapNode[] = [];
      for (let j = 0; j < layerSize; j++) {
        const nodeType = this.pickNodeType(i, totalNodes);
        layer.push(this.createNode(nodeType, i, j));
      }
      layers.push(layer);
    }

    // Last layer (totalNodes - 1): boss
    layers.push([this.createNode('boss', totalNodes - 1, 0)]);

    // Build DAG connections: each node connects to 1-2 nodes in the next layer
    for (let i = 0; i < layers.length - 1; i++) {
      const currentLayer = layers[i];
      const nextLayer = layers[i + 1];
      for (const node of currentLayer) {
        const connectionCount = Math.min(
          nextLayer.length,
          this.rng.nextInt(1, 2),
        );
        const targets = this.pickDistinct(nextLayer, connectionCount);
        for (const target of targets) {
          node.connections.push(target.id);
        }
      }
    }

    return {
      floor,
      nodes: layers,
      currentNodeId: layers[0][0].id,
    };
  }

  /**
   * Pick the node type for a given layer.
   * Per-node selection: weighted random among battle/shop/event/rest.
   * Elite is intentionally not picked here (kept as a future hook).
   */
  private pickNodeType(layer: number, totalLayers: number): NodeType {
    // Note: layer / totalLayers are kept in the signature for future use
    // (e.g., forcing an elite before the boss layer).
    void layer;
    void totalLayers;
    const r = this.rng.next();
    if (r < NODE_TYPE_WEIGHTS.battle) return 'battle';
    if (
      r <
      NODE_TYPE_WEIGHTS.battle + NODE_TYPE_WEIGHTS.shop
    )
      return 'shop';
    if (
      r <
      NODE_TYPE_WEIGHTS.battle +
        NODE_TYPE_WEIGHTS.shop +
        NODE_TYPE_WEIGHTS.event
    )
      return 'event';
    return 'rest';
  }

  /**
   * Pick `count` distinct random nodes from a layer.
   */
  private pickDistinct(layer: MapNode[], count: number): MapNode[] {
    if (count >= layer.length) return [...layer];
    const copy = [...layer];
    const picks: MapNode[] = [];
    for (let i = 0; i < count; i++) {
      const idx = this.rng.nextInt(0, copy.length - 1);
      picks.push(copy.splice(idx, 1)[0]);
    }
    return picks;
  }

  private createNode(
    type: NodeType,
    layer: number,
    position: number,
  ): MapNode {
    return {
      id: `${type}_${layer}_${position}_${this.rng.nextInt(100000, 999999)}`,
      type,
      x: 0,
      y: 0,
      connections: [],
      visited: false,
      available: layer === 0,
    };
  }

  /**
   * Returns the children of the given node (resolved from ids).
   */
  getChildren(nodeId: string, state: MapState): MapNode[] {
    const node = this.findNode(nodeId, state);
    if (!node) return [];
    const nextLayerIdx = this.findLayerIndex(nodeId, state) + 1;
    const nextLayer = state.nodes[nextLayerIdx] ?? [];
    return nextLayer.filter((n) => node.connections.includes(n.id));
  }

  /**
   * Mark a node as visited and unlock its children.
   */
  visitNode(nodeId: string, state: MapState): boolean {
    const node = this.findNode(nodeId, state);
    if (!node) return false;
    node.visited = true;
    const childIds = node.connections;
    for (const layer of state.nodes) {
      for (const n of layer) {
        if (childIds.includes(n.id)) n.available = true;
      }
    }
    return true;
  }

  private findNode(id: string, state: MapState): MapNode | undefined {
    for (const layer of state.nodes) {
      for (const n of layer) {
        if (n.id === id) return n;
      }
    }
    return undefined;
  }

  private findLayerIndex(id: string, state: MapState): number {
    for (let i = 0; i < state.nodes.length; i++) {
      if (state.nodes[i].some((n) => n.id === id)) return i;
    }
    return -1;
  }
}