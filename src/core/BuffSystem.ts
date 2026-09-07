// src/core/BuffSystem.ts

export type BuffType =
  | 'strength'        // +X damage on attacks
  | 'dexterity'       // +X block on block cards
  | 'vulnerable'      // +50% damage taken
  | 'weak'            // -25% damage dealt
  | 'frail'           // -25% block gained
  | 'poison'          // X damage per turn
  | 'regeneration'    // X HP per turn
  | 'mark'            // Talisman cultivator mechanic (stacks trigger bonus)
  | 'combo'           // Sword cultivator mechanic (counter)
  | 'intangible'      // Reduce damage to 1
  | 'thorns'          // Deal X damage when hit
  | 'stun'            // Skip enemy action on next turn
  | 'qi'            // +X qi at turn start
  | 'energy';         // +X energy at turn start (power)

export type BuffSource = 'player' | 'enemy' | 'artifact' | 'system';

export interface Buff {
  id: string;             // unique within buff list (e.g. 'strength-player-1')
  type: BuffType;
  stacks: number;         // how many stacks; buffs with stacks=0 are removed
  duration?: number;      // if undefined, persists entire battle; otherwise decrements at turn end
  source: BuffSource;
  appliedAt: number;      // monotonic counter for deterministic ordering
}

/**
 * Buff types that REPLACE existing stacks instead of accumulating.
 * - intangible: only the freshest effect matters (e.g. "next attack hits 1")
 * - thorns:    single value per source (a relic granting 5 thorns shouldn't
 *              be re-applied as 8 by an enemy card)
 */
const REPLACE_TYPES: ReadonlySet<BuffType> = new Set(['intangible', 'thorns']);

export class BuffSystem {
  /** Keyed by `${type}-${source}-${duration ?? 'permanent'}` for O(1) stacking lookup. */
  private buffs: Map<string, Buff> = new Map();
  /** Monotonic counter used for deterministic `appliedAt` ordering. */
  private orderCounter: number = 0;

  /**
   * Add or stack a buff.
   * - If a buff with the same type+source+duration already exists:
   *   - REPLACE types (intangible, thorns): stacks are set to the new value
   *   - STACK types: stacks are added
   *   - Duration: new duration (if defined) overrides; otherwise existing kept
   * - Otherwise create a new entry with a generated id.
   */
  apply(buff: Omit<Buff, 'id' | 'appliedAt'> & { id?: string }): Buff {
    const key = this.stackKey(buff.type, buff.source, buff.duration);
    const existing = this.buffs.get(key);

    if (existing) {
      if (REPLACE_TYPES.has(buff.type)) {
        existing.stacks = buff.stacks;
      } else {
        existing.stacks += buff.stacks;
      }
      if (buff.duration !== undefined) {
        existing.duration = buff.duration;
      }
      // else: keep existing.duration (older is more binding)
      return existing;
    }

    this.orderCounter += 1;
    const sameTypeSourceCount = this.countByTypeAndSource(buff.type, buff.source);
    const generatedId = `${buff.type}-${buff.source}-${sameTypeSourceCount + 1}`;

    const newBuff: Buff = {
      id: buff.id ?? generatedId,
      type: buff.type,
      stacks: buff.stacks,
      duration: buff.duration,
      source: buff.source,
      appliedAt: this.orderCounter,
    };

    this.buffs.set(key, newBuff);
    return newBuff;
  }

  /** Remove a buff by id. Returns true if removed, false if not found. */
  remove(id: string): boolean {
    for (const [key, buff] of this.buffs) {
      if (buff.id === id) {
        this.buffs.delete(key);
        return true;
      }
    }
    return false;
  }

  /**
   * Decrement duration of every timed buff by 1; remove any whose duration
   * reaches 0 (or below). Permanent buffs (duration === undefined) are
   * untouched. Returns snapshots of removed buffs for logging.
   */
  tickTurnEnd(): Buff[] {
    const removed: Buff[] = [];
    for (const [key, buff] of this.buffs) {
      if (buff.duration === undefined) continue;
      buff.duration -= 1;
      if (buff.duration <= 0) {
        removed.push({ ...buff });
        this.buffs.delete(key);
      }
    }
    return removed;
  }

  /** Get all buffs of a given type (across all sources). */
  getByType(type: BuffType): Buff[] {
    const result: Buff[] = [];
    for (const buff of this.buffs.values()) {
      if (buff.type === type) result.push(buff);
    }
    return result;
  }

  /** Sum stacks of all buffs of a type, across all sources. */
  totalStacks(type: BuffType): number {
    let total = 0;
    for (const buff of this.buffs.values()) {
      if (buff.type === type) total += buff.stacks;
    }
    return total;
  }

  /** Snapshot of all current buffs (insertion-ordered). */
  all(): ReadonlyArray<Buff> {
    return Array.from(this.buffs.values());
  }

  /** Remove all buffs matching predicate. Returns count removed. */
  removeWhere(predicate: (b: Buff) => boolean): number {
    const keysToRemove: string[] = [];
    for (const [key, buff] of this.buffs) {
      if (predicate(buff)) keysToRemove.push(key);
    }
    let count = 0;
    for (const key of keysToRemove) {
      if (this.buffs.delete(key)) count += 1;
    }
    return count;
  }

  /** Remove all buffs (call on battle start/end). */
  clear(): void {
    this.buffs.clear();
    this.orderCounter = 0;
  }

  private stackKey(type: BuffType, source: BuffSource, duration: number | undefined): string {
    return `${type}-${source}-${duration ?? 'permanent'}`;
  }

  private countByTypeAndSource(type: BuffType, source: BuffSource): number {
    let count = 0;
    for (const buff of this.buffs.values()) {
      if (buff.type === type && buff.source === source) count += 1;
    }
    return count;
  }
}
