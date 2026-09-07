// tests/levels/MapGenerator.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MapGenerator } from '../../src/levels/MapGenerator';
import { createRng } from '../../src/utils/rng';
import { getFloorConfig } from '../../src/data/levels';

describe('MapGenerator', () => {
  let gen: MapGenerator;

  beforeEach(() => {
    gen = new MapGenerator(createRng('test-seed'));
  });

  describe('generate floor 1', () => {
    let map: ReturnType<MapGenerator['generate']>;

    beforeEach(() => {
      map = gen.generate(1);
    });

    it('returns a map with floor=1', () => {
      expect(map.floor).toBe(1);
    });

    it('starts with a single battle node in layer 0', () => {
      expect(map.nodes[0]).toHaveLength(1);
      expect(map.nodes[0][0].type).toBe('battle');
      expect(map.nodes[0][0].available).toBe(true);
    });

    it('ends with a boss node', () => {
      const last = map.nodes[map.nodes.length - 1];
      expect(last).toHaveLength(1);
      expect(last[0].type).toBe('boss');
    });

    it('mid-layers have 2-3 nodes each', () => {
      for (let i = 1; i < map.nodes.length - 1; i++) {
        expect(map.nodes[i].length).toBeGreaterThanOrEqual(2);
        expect(map.nodes[i].length).toBeLessThanOrEqual(3);
      }
    });

    it('every node in non-start layers is unavailable initially', () => {
      for (let i = 1; i < map.nodes.length; i++) {
        for (const node of map.nodes[i]) {
          expect(node.available).toBe(false);
        }
      }
    });

    it('mid-layer nodes are not boss', () => {
      for (let i = 1; i < map.nodes.length - 1; i++) {
        for (const node of map.nodes[i]) {
          expect(node.type).not.toBe('boss');
        }
      }
    });

    it('all node ids are unique', () => {
      const ids = map.nodes.flat().map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('forms a connected DAG (every node eventually reaches boss)', () => {
      const bossId = map.nodes[map.nodes.length - 1][0].id;
      const visited = new Set<string>();
      const queue: string[] = [map.nodes[0][0].id];
      while (queue.length) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        const node = map.nodes.flat().find((n) => n.id === id)!;
        for (const cid of node.connections) queue.push(cid);
      }
      expect(visited.has(bossId)).toBe(true);
    });
  });

  describe('generate different floors', () => {
    it('floor 2 has more nodes than floor 1', () => {
      const m1 = gen.generate(1);
      const m2 = gen.generate(2);
      expect(m2.nodes.flat().length).toBeGreaterThanOrEqual(m1.nodes.flat().length);
    });

    it('floor 6 has exactly 1 boss node', () => {
      const m = gen.generate(6);
      expect(m.nodes).toHaveLength(1);
      expect(m.nodes[0]).toHaveLength(1);
      expect(m.nodes[0][0].type).toBe('boss');
    });
  });

  describe('visitNode', () => {
    it('marks node as visited', () => {
      const map = gen.generate(1);
      const nodeId = map.nodes[0][0].id;
      gen.visitNode(nodeId, map);
      const node = map.nodes.flat().find((n) => n.id === nodeId)!;
      expect(node.visited).toBe(true);
    });

    it('unlocks children of visited node', () => {
      const map = gen.generate(1);
      const startId = map.nodes[0][0].id;
      gen.visitNode(startId, map);
      const startNode = map.nodes.flat().find((n) => n.id === startId)!;
      for (const cid of startNode.connections) {
        const child = map.nodes.flat().find((n) => n.id === cid)!;
        expect(child.available).toBe(true);
      }
    });

    it('returns false for non-existent node', () => {
      const map = gen.generate(1);
      expect(gen.visitNode('does_not_exist', map)).toBe(false);
    });
  });

  describe('getChildren', () => {
    it('returns empty array for non-existent node', () => {
      const map = gen.generate(1);
      expect(gen.getChildren('does_not_exist', map)).toEqual([]);
    });

    it('returns children for valid node', () => {
      const map = gen.generate(1);
      const startId = map.nodes[0][0].id;
      const children = gen.getChildren(startId, map);
      // 1-2 children
      expect(children.length).toBeGreaterThanOrEqual(1);
      expect(children.length).toBeLessThanOrEqual(2);
    });
  });

  describe('deterministic generation', () => {
    it('produces same map with same seed', () => {
      const g1 = new MapGenerator(createRng('same-seed'));
      const g2 = new MapGenerator(createRng('same-seed'));
      const m1 = g1.generate(1);
      const m2 = g2.generate(1);
      // Compare node count and structure (ids may differ if Date.now used; ours uses rng)
      expect(m1.nodes.length).toBe(m2.nodes.length);
      for (let i = 0; i < m1.nodes.length; i++) {
        expect(m1.nodes[i].length).toBe(m2.nodes[i].length);
      }
    });
  });
});

describe('Floor Configs', () => {
  it('floor 1 is "外门试炼"', () => {
    const c = getFloorConfig(1);
    expect(c?.name).toBe('外门试炼');
  });

  it('floor 6 is "通天"', () => {
    const c = getFloorConfig(6);
    expect(c?.name).toBe('通天');
  });

  it('returns undefined for unknown floor', () => {
    expect(getFloorConfig(99)).toBeUndefined();
  });

  it('defines configs for floors 1-6', () => {
    for (let f = 1; f <= 6; f++) {
      expect(getFloorConfig(f)).toBeDefined();
    }
  });
});