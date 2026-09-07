import { describe, it, expect } from 'vitest';
import { EnemyState } from '../../src/core/Enemy';
import type { EnemyData } from '../../src/core/Enemy';

const baseData: EnemyData = {
  id: 'wolf',
  name: '妖狼',
  tier: 'normal',
  maxHp: 28,
  intents: [
    { type: 'attack', value: 6 },
    { type: 'defend', value: 5 },
  ],
  aiPattern: 'sequence',
  description: '山中凶兽，爪利牙尖',
};

describe('EnemyState', () => {
  it('constructor initializes fields from EnemyData', () => {
    const e = new EnemyState(baseData);
    expect(e.id).toBe('wolf');
    expect(e.name).toBe('妖狼');
    expect(e.tier).toBe('normal');
    expect(e.maxHp).toBe(28);
    expect(e.hp).toBe(28);
    expect(e.block).toBe(0);
    expect(e.currentIntentIndex).toBe(0);
    expect(e.data).toBe(baseData);
    expect(e.statuses).toEqual([]);
  });

  it('initializes an empty BuffSystem', () => {
    const e = new EnemyState(baseData);
    expect(e.buffs).toBeDefined();
    expect(e.buffs.all()).toHaveLength(0);
  });

  it('isAlive returns true when hp > 0', () => {
    const e = new EnemyState(baseData);
    expect(e.isAlive()).toBe(true);
  });

  it('isAlive returns false when hp <= 0', () => {
    const e = new EnemyState(baseData);
    e.hp = 0;
    expect(e.isAlive()).toBe(false);
  });

  it('getCurrentIntent returns the intent at currentIntentIndex', () => {
    const e = new EnemyState(baseData);
    expect(e.getCurrentIntent()).toEqual({ type: 'attack', value: 6 });
  });

  it('getCurrentIntent reflects advances', () => {
    const e = new EnemyState(baseData);
    e.advanceIntent();
    expect(e.getCurrentIntent()).toEqual({ type: 'defend', value: 5 });
  });

  it('advanceIntent cycles through intents back to 0', () => {
    const e = new EnemyState(baseData);
    e.advanceIntent(); // index -> 1
    e.advanceIntent(); // index -> 0 (cycle)
    expect(e.currentIntentIndex).toBe(0);
    expect(e.getCurrentIntent()).toEqual({ type: 'attack', value: 6 });
  });

  it('reset restores initial state', () => {
    const e = new EnemyState(baseData);
    e.hp = 5;
    e.block = 3;
    e.advanceIntent();
    e.buffs.apply({ type: 'strength', stacks: 2, source: 'enemy' });
    e.statuses.push({ type: 'test', stacks: 1 });

    e.reset();

    expect(e.hp).toBe(e.maxHp);
    expect(e.block).toBe(0);
    expect(e.currentIntentIndex).toBe(0);
    expect(e.buffs.all()).toHaveLength(0);
    expect(e.statuses).toEqual([]);
  });
});