// src/core/ComboTracker.ts

/**
 * State of the sword cultivator's combo counter.
 * - `count`    : current combo (resets to 0 on `reset()` or `clear()`).
 * - `peak`     : highest combo reached this battle (preserved by `reset()`).
 * - `multiplier`: precomputed damage multiplier (1 + count*0.1, capped at 3.0).
 */
export interface ComboState {
  count: number;
  peak: number;
  multiplier: number;
}

/** Multiplier formula: 1 + count * 0.1, capped at 3.0 (reached at count=20). */
const computeMultiplier = (count: number): number =>
  Math.min(1.0 + count * 0.1, 3.0);

/**
 * Standalone tracker for the sword cultivator's combo mechanic.
 * Each attack card played calls `addCombo()` (typically +1), and damage-scaling
 * cards (e.g. 万剑归宗) read the current multiplier via `getState()` or call
 * `applyToDamage(baseDamage)` directly.
 */
export class ComboTracker {
  private state: ComboState = { count: 0, peak: 0, multiplier: 1.0 };

  /** Increment combo by `gain` (typically 1 per attack). Returns new count. */
  addCombo(gain: number = 1): number {
    this.state.count += gain;
    if (this.state.count > this.state.peak) {
      this.state.peak = this.state.count;
    }
    this.state.multiplier = computeMultiplier(this.state.count);
    return this.state.count;
  }

  /** Reset combo to 0 (called on end-of-turn or specific cards). Keeps `peak`. */
  reset(): void {
    this.state.count = 0;
    this.state.multiplier = 1.0;
  }

  /** Get current combo state. */
  getState(): ComboState {
    return { ...this.state };
  }

  /** Compute damage bonus from combo: base * (multiplier - 1). e.g. multiplier=1.5 -> +50%. */
  damageBonus(base: number): number {
    return base * (this.state.multiplier - 1.0);
  }

  /** Apply combo to a damage value: returns the boosted damage (floored). */
  applyToDamage(baseDamage: number): number {
    return Math.floor(baseDamage * this.state.multiplier);
  }

  /** Reset state (for new battle). */
  clear(): void {
    this.state = { count: 0, peak: 0, multiplier: 1.0 };
  }
}