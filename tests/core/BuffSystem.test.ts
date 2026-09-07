import { describe, it, expect, beforeEach } from 'vitest';
import { BuffSystem } from '../../src/core/BuffSystem';

describe('BuffSystem', () => {
  let sys: BuffSystem;

  beforeEach(() => {
    sys = new BuffSystem();
  });

  it('starts empty', () => {
    expect(sys.all()).toHaveLength(0);
  });

  it('applies a new buff', () => {
    const b = sys.apply({ type: 'strength', stacks: 1, source: 'player' });
    expect(sys.all()).toHaveLength(1);
    expect(b.type).toBe('strength');
  });

  it('stacks existing buff of same type and source', () => {
    sys.apply({ type: 'strength', stacks: 1, source: 'player' });
    sys.apply({ type: 'strength', stacks: 1, source: 'player' });
    expect(sys.totalStacks('strength')).toBe(2);
  });

  it('treats same type from different sources as separate', () => {
    sys.apply({ type: 'strength', stacks: 1, source: 'player' });
    sys.apply({ type: 'strength', stacks: 1, source: 'artifact' });
    expect(sys.all()).toHaveLength(2);
    expect(sys.totalStacks('strength')).toBe(2);
  });

  it('removes a buff by id', () => {
    const b = sys.apply({ type: 'strength', stacks: 1, source: 'player' });
    expect(sys.remove(b.id)).toBe(true);
    expect(sys.all()).toHaveLength(0);
  });

  it('returns false when removing non-existent buff', () => {
    expect(sys.remove('nonexistent')).toBe(false);
  });

  it('decrements duration and removes expired buffs', () => {
    sys.apply({ type: 'strength', stacks: 1, source: 'player', duration: 2 });
    sys.apply({ type: 'strength', stacks: 1, source: 'player', duration: 1 });
    const removed = sys.tickTurnEnd();
    expect(sys.all()).toHaveLength(1);  // the 2-duration one remains
    expect(removed).toHaveLength(1);
  });

  it('keeps permanent buffs (no duration) through tickTurnEnd', () => {
    sys.apply({ type: 'strength', stacks: 1, source: 'player' });
    sys.tickTurnEnd();
    expect(sys.all()).toHaveLength(1);
  });

  it('getByType filters correctly', () => {
    sys.apply({ type: 'strength', stacks: 1, source: 'player' });
    sys.apply({ type: 'weak', stacks: 1, source: 'enemy' });
    expect(sys.getByType('weak')).toHaveLength(1);
  });

  it('totalStacks sums all sources of same type', () => {
    sys.apply({ type: 'strength', stacks: 2, source: 'player' });
    sys.apply({ type: 'strength', stacks: 3, source: 'artifact' });
    expect(sys.totalStacks('strength')).toBe(5);
  });

  it('removeWhere removes by predicate', () => {
    sys.apply({ type: 'strength', stacks: 1, source: 'player' });
    sys.apply({ type: 'weak', stacks: 1, source: 'enemy' });
    const removed = sys.removeWhere((b) => b.source === 'enemy');
    expect(removed).toBe(1);
    expect(sys.all()).toHaveLength(1);
  });

  it('clear removes all buffs', () => {
    sys.apply({ type: 'strength', stacks: 1, source: 'player' });
    sys.clear();
    expect(sys.all()).toHaveLength(0);
  });
});
