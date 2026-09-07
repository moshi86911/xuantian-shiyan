import { describe, it, expect } from 'vitest';
import { Unlocks } from '../../src/core/Unlocks';
import type { MetaState } from '../../src/core/types';

function makeMeta(unlocked: string[] = [], completed: string[] = []): MetaState {
  return {
    unlockedCharacters: unlocked as any,
    completedCharacters: completed as any,
    unlockedCards: [],
    achievements: [],
    stats: { totalRuns: 0, totalWins: 0, bestFloor: 0, fastestWin: 0 },
  } as any;
}

describe('Unlocks', () => {
  it('sword is unlocked by default', () => {
    expect(Unlocks.isUnlocked('sword', makeMeta(['sword']))).toBe(true);
  });

  it('talisman is not unlocked by default', () => {
    expect(Unlocks.isUnlocked('talisman', makeMeta(['sword']))).toBe(false);
  });

  it('talisman can be unlocked after sword is completed', () => {
    expect(Unlocks.canUnlock('talisman', makeMeta(['sword'], ['sword']))).toBe(true);
  });

  it('talisman cannot be unlocked before sword is completed', () => {
    expect(Unlocks.canUnlock('talisman', makeMeta(['sword'], []))).toBe(false);
  });

  it('alchemy can be unlocked after talisman is completed', () => {
    expect(Unlocks.canUnlock('alchemy', makeMeta(['sword', 'talisman'], ['sword', 'talisman']))).toBe(true);
  });

  it('cannot unlock already-unlocked character', () => {
    expect(Unlocks.canUnlock('sword', makeMeta(['sword'], []))).toBe(false);
  });

  it('unlock returns new array', () => {
    const meta = makeMeta(['sword']);
    const next = Unlocks.unlock('talisman', meta);
    expect(next).toContain('talisman');
    expect(meta.unlockedCharacters).not.toContain('talisman'); // not mutated
  });

  it('markCompleted appends to completed list', () => {
    const meta = makeMeta(['sword']);
    const next = Unlocks.markCompleted('sword', meta);
    expect(next).toContain('sword');
    expect(meta.completedCharacters).not.toContain('sword'); // not mutated
  });

  it('listVisible returns unlocked characters', () => {
    const meta = makeMeta(['sword']);
    expect(Unlocks.listVisible(meta)).toEqual(['sword']);
  });
});