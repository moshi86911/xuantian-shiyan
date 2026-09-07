// src/core/SaveManager.ts
// Save/load manager for run state with 3 slots and a meta state slot.

import type { RunState } from './types';

export const SLOT_COUNT = 3;
const SAVE_KEY_PREFIX = 'xuantian_shiyan_save_slot_';
const META_KEY = 'xuantian_shiyan_meta';

export interface SlotInfo {
  slot: number;
  occupied: boolean;
  characterId?: string;
  floor?: number;
  savedAt?: number;
  playtimeSeconds?: number;
}

export interface AutoSaveOptions {
  slot: number;
  throttleMs?: number; // minimum interval between saves (default 1000)
}

export class SaveManager {
  /** Save a run to a slot. Returns true on success. */
  save(slot: number, runState: RunState): boolean {
    if (slot < 0 || slot >= SLOT_COUNT) return false;
    try {
      const key = SAVE_KEY_PREFIX + slot;
      localStorage.setItem(key, JSON.stringify(runState));
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Load a run from a slot. Returns null if no save exists. */
  load(slot: number): RunState | null {
    if (slot < 0 || slot >= SLOT_COUNT) return null;
    try {
      const key = SAVE_KEY_PREFIX + slot;
      const data = localStorage.getItem(key);
      return data ? (JSON.parse(data) as RunState) : null;
    } catch (e) {
      return null;
    }
  }

  /** Returns all 3 slots (null for empty slots). */
  listSlots(): (RunState | null)[] {
    const result: (RunState | null)[] = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
      result.push(this.load(i));
    }
    return result;
  }

  /** Delete a save slot. */
  delete(slot: number): boolean {
    if (slot < 0 || slot >= SLOT_COUNT) return false;
    try {
      localStorage.removeItem(SAVE_KEY_PREFIX + slot);
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Returns true if slot has a save. */
  hasSave(slot: number): boolean {
    if (slot < 0 || slot >= SLOT_COUNT) return false;
    try {
      const key = SAVE_KEY_PREFIX + slot;
      return localStorage.getItem(key) !== null;
    } catch (e) {
      return false;
    }
  }

  /** Save metadata (permanent progress). */
  saveMeta<T>(meta: T): boolean {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(meta));
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Load metadata. */
  loadMeta<T>(): T | null {
    try {
      const data = localStorage.getItem(META_KEY);
      return data ? (JSON.parse(data) as T) : null;
    } catch (e) {
      return null;
    }
  }
}

/**
 * Auto-save wrapper that throttles saves to avoid hammering localStorage.
 * The controller is responsible for calling trySave() at sensible checkpoints.
 */
export class AutoSaver {
  private lastSaveTime = 0;

  constructor(
    private saveManager: SaveManager,
    private options: AutoSaveOptions
  ) {}

  /** Try to save; respects throttle. Returns true if a save happened. */
  trySave(runState: RunState, now: number = Date.now()): boolean {
    const throttle = this.options.throttleMs ?? 1000;
    if (now - this.lastSaveTime < throttle) return false;
    if (this.saveManager.save(this.options.slot, runState)) {
      this.lastSaveTime = now;
      return true;
    }
    return false;
  }
}

/**
 * Returns slot metadata for UI display.
 * Pulls optional fields from the RunState shape (characterId, floor, startTime).
 */
export function describeSlots(saveManager: SaveManager): SlotInfo[] {
  const slots = saveManager.listSlots();
  return slots.map((state, slot) => {
    if (!state) return { slot, occupied: false };
    const playtimeSeconds =
      typeof state.startTime === 'number'
        ? Math.max(0, Math.floor((Date.now() - state.startTime) / 1000))
        : undefined;
    return {
      slot,
      occupied: true,
      characterId: state.characterId,
      floor: state.floor,
      savedAt: state.startTime,
      playtimeSeconds,
    };
  });
}