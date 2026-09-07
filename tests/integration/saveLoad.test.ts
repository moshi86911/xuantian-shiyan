// tests/integration/saveLoad.test.ts
// Integration tests verifying that save/load preserves run state and meta
// state across the persistence boundary.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SaveManager } from '../../src/core/SaveManager';
import { MetaProgress, DEFAULT_META } from '../../src/core/MetaProgress';
import { Character } from '../../src/core/Character';
import { getCharacter } from '../../src/data/characters';
import type { RunState, MetaState, PlayerState } from '../../src/core/types';

/**
 * Extended RunState shape used by these tests. The base RunState in
 * src/core/types.ts stores player stats as flat fields; here we also
 * embed the full PlayerState so we can verify deck mutations survive
 * the save/load roundtrip. Casts to `any` at the call site keep the
 * production types untouched.
 */
type RichRunState = RunState & { player: PlayerState };

function makeRunState(
  characterId: 'sword' | 'talisman' | 'alchemy' = 'sword',
  floor: number = 1,
): RichRunState {
  const player = new Character(getCharacter(characterId)!).toPlayerState();
  return {
    seed: 'integration-seed',
    characterId,
    floor,
    hp: player.hp,
    maxHp: player.maxHp,
    gold: player.gold,
    deck: [...player.drawPile],
    relics: [],
    potions: [],
    path: [],
    startTime: 1234567890,
    // Carry the full player snapshot alongside the flat fields so roundtrip
    // assertions can verify both shapes survive the persistence boundary.
    player,
  };
}

/** Cast helper so we can hand a RichRunState to SaveManager.save/load. */
function asRunState(r: RichRunState): RunState {
  return r as unknown as RunState;
}

function asRichRunState(r: RunState | null): RichRunState {
  return r as unknown as RichRunState;
}

describe('Save/Load roundtrip', () => {
  let storage: Map<string, string>;
  let sm: SaveManager;

  beforeEach(() => {
    storage = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    });
    sm = new SaveManager();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves player state across save/load', () => {
    const run = makeRunState('sword', 3);
    expect(sm.save(0, asRunState(run))).toBe(true);

    const loaded = sm.load(0);
    expect(loaded).toBeDefined();
    const rich = asRichRunState(loaded);
    expect(rich.characterId).toBe('sword');
    expect(rich.floor).toBe(3);
    expect(rich.hp).toBe(run.hp);
    expect(rich.player.hp).toBe(run.player.hp);
  });

  it('preserves meta state across save/load', () => {
    // The base MetaState doesn't expose a top-level `gold`, so we stash it
    // on a loosely-typed extension. The storage key remains xuantian_shiyan_meta.
    const meta = { ...DEFAULT_META, gold: 123 } as MetaState & { gold: number };
    expect(MetaProgress.save(meta as MetaState)).toBe(true);
    const loaded = MetaProgress.load() as MetaState & { gold: number };
    expect(loaded.gold).toBe(123);
  });

  it('overwrites previous save in same slot', () => {
    const run1 = makeRunState('sword', 1);
    sm.save(0, asRunState(run1));

    const run2 = makeRunState('talisman', 5);
    sm.save(0, asRunState(run2));

    const loaded = sm.load(0);
    expect(loaded).toBeDefined();
    expect(loaded!.characterId).toBe('talisman');
    expect(loaded!.floor).toBe(5);
  });

  it('deck changes after picking reward persist', () => {
    const run = makeRunState('sword', 1);
    sm.save(0, asRunState(run));

    // Modify the player deck on load
    const loaded = asRichRunState(sm.load(0));
    const updatedPlayer: PlayerState = {
      ...loaded.player,
      drawPile: [...loaded.player.drawPile, 'sword_defend'],
    };
    const newRun: RichRunState = { ...loaded, player: updatedPlayer };
    sm.save(0, asRunState(newRun));

    const reloaded = asRichRunState(sm.load(0));
    expect(reloaded.player.drawPile).toContain('sword_defend');
  });

  it('independent slots do not interfere', () => {
    const run1 = makeRunState('sword', 1);
    const run2 = makeRunState('talisman', 2);

    sm.save(0, asRunState(run1));
    sm.save(1, asRunState(run2));

    expect(sm.load(0)!.characterId).toBe('sword');
    expect(sm.load(1)!.characterId).toBe('talisman');
    expect(sm.load(2)).toBeNull();
  });
});