// tests/core/MetaProgress.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetaProgress, DEFAULT_META } from '../../src/core/MetaProgress';
import type { MetaState } from '../../src/core/types';

describe('MetaProgress', () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('DEFAULT_META', () => {
    it('has sword unlocked by default', () => {
      expect(DEFAULT_META.unlockedCharacters).toContain('sword');
    });

    it('starts with zero stats', () => {
      expect(DEFAULT_META.stats.totalRuns).toBe(0);
      expect(DEFAULT_META.stats.totalWins).toBe(0);
      expect(DEFAULT_META.stats.bestFloor).toBe(0);
    });
  });

  describe('load', () => {
    it('returns DEFAULT_META when nothing stored', () => {
      const meta = MetaProgress.load();
      expect(meta.unlockedCharacters).toContain('sword');
    });

    it('returns stored data', () => {
      const stored: MetaState = {
        unlockedCharacters: ['sword', 'talisman'],
        completedCharacters: ['sword'],
        unlockedCards: ['strike'],
        achievements: [],
        stats: { totalRuns: 3, totalWins: 1, bestFloor: 2, fastestWin: 0 },
      };
      storage.set('xuantian_shiyan_meta', JSON.stringify(stored));
      const meta = MetaProgress.load();
      expect(meta.unlockedCharacters).toContain('talisman');
      expect(meta.stats.totalRuns).toBe(3);
      expect(meta.stats.bestFloor).toBe(2);
    });

    it('returns default on parse error', () => {
      storage.set('xuantian_shiyan_meta', 'NOT VALID JSON {');
      const meta = MetaProgress.load();
      expect(meta.unlockedCharacters).toContain('sword');
    });
  });

  describe('save', () => {
    it('persists meta state', () => {
      const meta = MetaProgress.load();
      expect(MetaProgress.save(meta)).toBe(true);
      expect(storage.has('xuantian_shiyan_meta')).toBe(true);
    });
  });

  describe('reset', () => {
    it('removes stored meta', () => {
      storage.set('xuantian_shiyan_meta', '{}');
      expect(MetaProgress.reset()).toBe(true);
      expect(storage.has('xuantian_shiyan_meta')).toBe(false);
    });
  });

  describe('recordRun', () => {
    it('increments totalRuns', () => {
      const before = MetaProgress.load();
      const after = MetaProgress.recordRun(before, false, 1);
      expect(after.stats.totalRuns).toBe(before.stats.totalRuns + 1);
    });

    it('increments totalWins when won', () => {
      const before = MetaProgress.load();
      const after = MetaProgress.recordRun(before, true, 5);
      expect(after.stats.totalWins).toBe(before.stats.totalWins + 1);
    });

    it('does not increment totalWins when lost', () => {
      const before = MetaProgress.load();
      const after = MetaProgress.recordRun(before, false, 5);
      expect(after.stats.totalWins).toBe(before.stats.totalWins);
    });

    it('updates bestFloor if higher', () => {
      const before = MetaProgress.load();
      const after = MetaProgress.recordRun(before, false, 5);
      expect(after.stats.bestFloor).toBe(5);
    });

    it('does not lower bestFloor', () => {
      const before: MetaState = {
        ...MetaProgress.load(),
        stats: { totalRuns: 0, totalWins: 0, bestFloor: 10, fastestWin: 0 },
      };
      const after = MetaProgress.recordRun(before, false, 3);
      expect(after.stats.bestFloor).toBe(10);
    });
  });

  describe('unlockCharacter', () => {
    it('adds to unlockedCharacters', () => {
      const before = MetaProgress.load();
      const after = MetaProgress.unlockCharacter(before, 'talisman');
      expect(after.unlockedCharacters).toContain('talisman');
    });

    it('does not duplicate', () => {
      const before = MetaProgress.load();
      const after = MetaProgress.unlockCharacter(before, 'sword');
      expect(after.unlockedCharacters.filter(c => c === 'sword')).toHaveLength(1);
    });
  });

  describe('completeCharacter', () => {
    it('adds to completedCharacters', () => {
      const before = MetaProgress.load();
      const after = MetaProgress.completeCharacter(before, 'sword');
      expect(after.completedCharacters).toContain('sword');
    });

    it('does not duplicate', () => {
      const before = MetaProgress.load();
      const after = MetaProgress.completeCharacter(before, 'sword');
      const after2 = MetaProgress.completeCharacter(after, 'sword');
      expect(after2.completedCharacters.filter(c => c === 'sword')).toHaveLength(1);
    });
  });

  describe('winRate', () => {
    it('returns 0 when no runs', () => {
      const meta = MetaProgress.load();
      expect(MetaProgress.winRate(meta)).toBe(0);
    });

    it('computes fraction', () => {
      const meta: MetaState = {
        ...MetaProgress.load(),
        stats: { totalRuns: 4, totalWins: 1, bestFloor: 1, fastestWin: 0 },
      };
      expect(MetaProgress.winRate(meta)).toBe(0.25);
    });
  });
});