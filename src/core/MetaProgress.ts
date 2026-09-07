// src/core/MetaProgress.ts
// Permanent progress: unlocks, achievements, stats. Survives across runs and slots.

import type { MetaState, CharacterId } from './types';

export const DEFAULT_META: MetaState = {
  unlockedCharacters: ['sword'],
  completedCharacters: [],
  unlockedCards: [],
  achievements: [],
  stats: {
    totalRuns: 0,
    totalWins: 0,
    bestFloor: 0,
    fastestWin: 0,
  },
};

export class MetaProgress {
  private static storageKey = 'xuantian_shiyan_meta';

  /** Get current meta state (from localStorage or default). */
  static load(): MetaState {
    try {
      const data = localStorage.getItem(MetaProgress.storageKey);
      if (!data) return { ...DEFAULT_META };
      const parsed = JSON.parse(data) as Partial<MetaState>;
      return { ...DEFAULT_META, ...parsed };
    } catch (e) {
      return { ...DEFAULT_META };
    }
  }

  /** Persist meta state to localStorage. */
  static save(meta: MetaState): boolean {
    try {
      localStorage.setItem(MetaProgress.storageKey, JSON.stringify(meta));
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Reset meta to defaults (clears all progress). */
  static reset(): boolean {
    try {
      localStorage.removeItem(MetaProgress.storageKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Record a run completion and update stats. Returns updated meta. */
  static recordRun(meta: MetaState, won: boolean, maxFloorReached: number): MetaState {
    return {
      ...meta,
      stats: {
        ...meta.stats,
        totalRuns: meta.stats.totalRuns + 1,
        totalWins: meta.stats.totalWins + (won ? 1 : 0),
        bestFloor: Math.max(meta.stats.bestFloor ?? 0, maxFloorReached),
      },
    };
  }

  /** Unlock a character. Returns updated meta. */
  static unlockCharacter(meta: MetaState, characterId: CharacterId): MetaState {
    if (meta.unlockedCharacters.includes(characterId)) return meta;
    return {
      ...meta,
      unlockedCharacters: [...meta.unlockedCharacters, characterId],
    };
  }

  /** Mark a character run as completed. Returns updated meta. */
  static completeCharacter(meta: MetaState, characterId: CharacterId): MetaState {
    if (meta.completedCharacters.includes(characterId)) return meta;
    return {
      ...meta,
      completedCharacters: [...meta.completedCharacters, characterId],
    };
  }

  /** Compute win rate as a fraction (0-1). */
  static winRate(meta: MetaState): number {
    if (meta.stats.totalRuns === 0) return 0;
    return meta.stats.totalWins / meta.stats.totalRuns;
  }
}