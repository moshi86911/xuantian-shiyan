import { describe, it, expect } from 'vitest';
import { SeededRandom, createRng } from '../../src/utils/rng';

describe('SeededRandom', () => {
  it('produces deterministic sequence with same seed', () => {
    const a = createRng('test');
    const b = createRng('test');
    for (let i = 0; i < 10; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('produces different sequences with different seeds', () => {
    const a = createRng('test1');
    const b = createRng('test2');
    const aValues = Array.from({length: 5}, () => a.next());
    const bValues = Array.from({length: 5}, () => b.next());
    expect(aValues).not.toEqual(bValues);
  });

  it('nextInt produces values in range', () => {
    const rng = createRng('test');
    for (let i = 0; i < 100; i++) {
      const v = rng.nextInt(1, 10);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('pick selects element from array', () => {
    const rng = createRng('test');
    const arr = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 100; i++) {
      expect(arr).toContain(rng.pick(arr));
    }
  });

  it('shuffle returns array of same length', () => {
    const rng = createRng('test');
    const arr = [1, 2, 3, 4, 5];
    const shuffled = rng.shuffle(arr);
    expect(shuffled).toHaveLength(arr.length);
    expect([...shuffled].sort()).toEqual([...arr].sort());
  });

  it('accepts numeric seed', () => {
    const rng = new SeededRandom(12345);
    expect(rng.next()).toBeGreaterThanOrEqual(0);
    expect(rng.next()).toBeLessThan(1);
  });
});
