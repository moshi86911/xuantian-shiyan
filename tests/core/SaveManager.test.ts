// tests/core/SaveManager.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SaveManager, AutoSaver, describeSlots, SLOT_COUNT } from '../../src/core/SaveManager';
import type { RunState } from '../../src/core/types';

function makeRunState(): RunState {
  return {
    seed: 'test-seed',
    characterId: 'sword',
    floor: 2,
    hp: 60,
    maxHp: 70,
    gold: 50,
    deck: ['strike', 'strike', 'defend'],
    relics: [],
    potions: [],
    path: [],
    startTime: Date.now(),
  };
}

describe('SaveManager', () => {
  let sm: SaveManager;
  let storage: Map<string, string>;

  beforeEach(() => {
    // Mock localStorage
    storage = new Map();
    const mock: any = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
      clear: () => storage.clear(),
    };
    vi.stubGlobal('localStorage', mock);
    sm = new SaveManager();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('save and load', () => {
    it('saves to slot 0', () => {
      expect(sm.save(0, makeRunState())).toBe(true);
    });

    it('loads from slot 0 after save', () => {
      const state = makeRunState();
      sm.save(0, state);
      const loaded = sm.load(0);
      expect(loaded).toBeDefined();
      expect(loaded?.characterId).toBe('sword');
    });

    it('returns null when loading empty slot', () => {
      expect(sm.load(0)).toBeNull();
    });

    it('returns false when saving to invalid slot', () => {
      expect(sm.save(-1, makeRunState())).toBe(false);
      expect(sm.save(99, makeRunState())).toBe(false);
    });

    it('returns null when loading invalid slot', () => {
      expect(sm.load(-1)).toBeNull();
      expect(sm.load(99)).toBeNull();
    });

    it('persists state across save manager instances', () => {
      const state = makeRunState();
      sm.save(1, state);
      const sm2 = new SaveManager();
      const loaded = sm2.load(1);
      expect(loaded?.seed).toBe('test-seed');
      expect(loaded?.floor).toBe(2);
    });

    it('overwrites existing slot save', () => {
      sm.save(0, makeRunState());
      const updated: RunState = { ...makeRunState(), floor: 99 };
      sm.save(0, updated);
      expect(sm.load(0)?.floor).toBe(99);
    });
  });

  describe('listSlots', () => {
    it('returns 3 entries', () => {
      const slots = sm.listSlots();
      expect(slots).toHaveLength(SLOT_COUNT);
    });

    it('returns null for empty slots', () => {
      expect(sm.listSlots()[0]).toBeNull();
    });

    it('returns state for occupied slots', () => {
      sm.save(1, makeRunState());
      const slots = sm.listSlots();
      expect(slots[0]).toBeNull();
      expect(slots[1]).not.toBeNull();
      expect(slots[2]).toBeNull();
    });
  });

  describe('delete', () => {
    it('removes a save', () => {
      sm.save(0, makeRunState());
      expect(sm.delete(0)).toBe(true);
      expect(sm.load(0)).toBeNull();
    });

    it('returns false for invalid slot', () => {
      expect(sm.delete(-1)).toBe(false);
      expect(sm.delete(99)).toBe(false);
    });

    it('returns true even if slot was empty', () => {
      expect(sm.delete(0)).toBe(true);
    });
  });

  describe('hasSave', () => {
    it('returns false for empty slot', () => {
      expect(sm.hasSave(0)).toBe(false);
    });

    it('returns true after save', () => {
      sm.save(0, makeRunState());
      expect(sm.hasSave(0)).toBe(true);
    });

    it('returns false for invalid slot', () => {
      expect(sm.hasSave(-1)).toBe(false);
      expect(sm.hasSave(99)).toBe(false);
    });
  });

  describe('saveMeta and loadMeta', () => {
    it('persists meta state', () => {
      const meta = { totalRuns: 5, totalWins: 3 };
      expect(sm.saveMeta(meta)).toBe(true);
      const loaded = sm.loadMeta<typeof meta>();
      expect(loaded).toEqual(meta);
    });

    it('returns null when no meta', () => {
      expect(sm.loadMeta()).toBeNull();
    });
  });
});

describe('AutoSaver', () => {
  let sm: SaveManager;
  let auto: AutoSaver;
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    });
    sm = new SaveManager();
    auto = new AutoSaver(sm, { slot: 0, throttleMs: 100 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves first call', () => {
    expect(auto.trySave(makeRunState(), 1000)).toBe(true);
  });

  it('throttles subsequent calls', () => {
    expect(auto.trySave(makeRunState(), 1000)).toBe(true);
    expect(auto.trySave(makeRunState(), 1050)).toBe(false);  // 50 < 100
    expect(auto.trySave(makeRunState(), 1200)).toBe(true);  // 200 >= 100
  });

  it('uses default throttle when not specified', () => {
    const a = new AutoSaver(sm, { slot: 1 });
    expect(a.trySave(makeRunState(), 1000)).toBe(true);
    expect(a.trySave(makeRunState(), 1500)).toBe(false);  // 500 < 1000
    expect(a.trySave(makeRunState(), 2500)).toBe(true);  // 1500 >= 1000
  });
});

describe('describeSlots', () => {
  let sm: SaveManager;
  let storage: Map<string, string>;

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

  it('returns 3 slot infos', () => {
    const infos = describeSlots(sm);
    expect(infos).toHaveLength(3);
  });

  it('marks empty slots', () => {
    const infos = describeSlots(sm);
    for (const info of infos) {
      expect(info.occupied).toBe(false);
    }
  });

  it('describes occupied slot', () => {
    sm.save(0, makeRunState());
    const infos = describeSlots(sm);
    expect(infos[0].occupied).toBe(true);
    expect(infos[0].characterId).toBe('sword');
    expect(infos[0].floor).toBe(2);
  });

  it('each info has slot number', () => {
    const infos = describeSlots(sm);
    expect(infos[0].slot).toBe(0);
    expect(infos[1].slot).toBe(1);
    expect(infos[2].slot).toBe(2);
  });
});