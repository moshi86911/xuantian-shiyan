// src/core/CardExecutor.ts

import type { Card, CardEffect, PlayerState, EnemyState } from './types';
import { CardEffectExecutor } from './CardEffect';
import { BuffSystem } from './BuffSystem';

/**
 * Return the highest `appliedAt` value currently in the buff system, or 0
 * if it has no buffs. Used to snapshot a "watermark" so callers can diff
 * which buffs were applied after a given operation.
 */
function maxAppliedAt(system: BuffSystem): number {
  let max = 0;
  for (const b of system.all()) {
    if (b.appliedAt > max) max = b.appliedAt;
  }
  return max;
}

export interface CardPlayResult {
  cardId: string;
  playedAt: number;
  targetIds: string[];
  energySpent: number;
  qiSpent: number;
  buffsApplied: { buffId: string; type: string; stacks: number }[];
  discarded: boolean;
  exhausted: boolean;
}

/**
 * A scaling flag is an `add_status` effect that precedes a `damage` effect
 * and modifies its value or behavior. The list of recognized flags is
 * closed — any other `add_status` id is dispatched by status handlers.
 */
const SCALING_FLAG_IDS = new Set([
  'damage_per_combo',
  'damage_per_mark',
  'consume_mark_damage',
  'bypass_block',
]);

interface ScaledEffect {
  effect: CardEffect;
  bypassBlock: boolean;
  consumeMarks: boolean;
}

export interface CardExecutorOptions {
  /**
   * Optional callback that returns the player's current combo count.
   * Used by `damage_per_combo`. Defaults to reading the `combo` buff
   * stacks from the playerBuffs BuffSystem.
   */
  getComboCount?: () => number;
}

/**
 * Walk a card's effect list looking for `add_status` flags that scale the
 * value or behavior of the immediately-following `damage` effect. Returns
 * a parallel list of `ScaledEffect` values with the resolved damage value
 * and flags attached.
 *
 * Flag semantics:
 *   damage_per_combo:    damage.value += flag.value * combo count
 *   damage_per_mark:     damage.value += flag.value * total mark stacks
 *   consume_mark_damage: damage.value += flag.value * total mark stacks
 *                        (the base damage value is replaced, not added to)
 *   bypass_block:        damage ignores target.block during absorption
 */
function applyScalingFlags(
  effects: CardEffect[],
  _playerBuffs: BuffSystem,
  enemyBuffs: BuffSystem,
  getComboCount: () => number,
): ScaledEffect[] {
  const out: ScaledEffect[] = [];
  for (let i = 0; i < effects.length; i++) {
    const eff = effects[i];
    if (eff.type !== 'add_status' || !eff.statusId || !SCALING_FLAG_IDS.has(eff.statusId)) {
      out.push({ effect: eff, bypassBlock: false, consumeMarks: false });
      continue;
    }
    const flag = eff;
    // Find the next damage effect after this flag.
    const nextDamageIdx = effects.findIndex(
      (e, j) => j > i && e.type === 'damage',
    );
    if (nextDamageIdx === -1) {
      // No following damage — emit the flag as-is.
      out.push({ effect: eff, bypassBlock: false, consumeMarks: false });
      continue;
    }
    const next = effects[nextDamageIdx];
    let scaledValue = next.value;
    let bypassBlock = false;
    let consumeMarks = false;
    if (flag.statusId === 'damage_per_combo') {
      const count = getComboCount();
      scaledValue = (next.value || 0) + (flag.value || 0) * count;
    } else if (flag.statusId === 'damage_per_mark') {
      const totalMarks = enemyBuffs.totalStacks('mark');
      scaledValue = (next.value || 0) + (flag.value || 0) * totalMarks;
    } else if (flag.statusId === 'consume_mark_damage') {
      const totalMarks = enemyBuffs.totalStacks('mark');
      // Consume mode adds bonus damage on top of the base damage and
      // removes all marks from the target as a side effect.
      scaledValue = (next.value || 0) + (flag.value || 0) * totalMarks;
      consumeMarks = true;
    } else if (flag.statusId === 'bypass_block') {
      bypassBlock = true;
    }
    out.push({ effect: eff, bypassBlock: false, consumeMarks: false });
    out.push({
      effect: { ...next, value: scaledValue, bypassBlock: bypassBlock || undefined },
      bypassBlock,
      consumeMarks,
    });
    // Skip everything between flag and the matched damage.
    i = nextDamageIdx;
  }
  return out;
}

/**
 * Computes the modified value for a damage or block effect given the current
 * buff state. Returns a NEW effect (the input is not mutated).
 *
 * Damage formula:
 *   (base + strength) -> 0.75 if attacker has weak -> 1.5 if target has vulnerable
 * Block formula:
 *   (base + dexterity) -> 0.75 if attacker has frail
 *
 * Other effects pass through unchanged.
 */
function applyBuffModifiers(
  effect: CardEffect,
  singleEnemy: EnemyState | undefined,
  playerBuffs: BuffSystem,
  enemyBuffs: BuffSystem,
): CardEffect {
  if (effect.type === 'damage') {
    let value = effect.value + playerBuffs.totalStacks('strength');
    if (playerBuffs.totalStacks('weak') > 0) {
      value = Math.floor(value * 0.75);
    }
    if (singleEnemy && enemyBuffs.totalStacks('vulnerable') > 0) {
      value = Math.floor(value * 1.5);
    }
    return { ...effect, value };
  }
  if (effect.type === 'block') {
    let value = effect.value + playerBuffs.totalStacks('dexterity');
    if (playerBuffs.totalStacks('frail') > 0) {
      value = Math.floor(value * 0.75);
    }
    return { ...effect, value };
  }
  return effect;
}

/**
 * Decides whether an effect is targeted at an enemy (and therefore needs the
 * `enemies` array) or at the player (and therefore ignores `enemies`).
 */
function effectHitsEnemy(effect: CardEffect): boolean {
  // Effects whose primary impact is on enemies
  return effect.type === 'damage' || effect.type === 'apply_debuff';
}

/**
 * Orchestrates a card play: validates resources + targets, deducts costs,
 * applies buff modifiers, runs effects through CardEffectExecutor, and
 * returns a structured result for the BattleEngine to record.
 */
export class CardExecutor {
  private getComboCount: () => number;

  constructor(
    private effectExecutor: CardEffectExecutor,
    private playerBuffs: BuffSystem,
    private enemyBuffs: BuffSystem,
    options: CardExecutorOptions = {},
  ) {
    // Default combo source: read `combo` buff stacks from the player
    // BuffSystem. Callers (e.g. BattleEngine) can override with a callback
    // that reads from ComboTracker.
    this.getComboCount =
      options.getComboCount ?? (() => this.playerBuffs.totalStacks('combo'));
  }

  /** True if the player can afford the card and valid targets exist. */
  canPlay(card: Card, player: PlayerState, enemies: EnemyState[]): boolean {
    if (player.energy < card.cost) return false;
    const qiCost = card.qiCost ?? 0;
    if (player.qi < qiCost) return false;

    switch (card.targetType) {
      case 'enemy': {
        // Need at least one alive enemy
        return enemies.some(e => e.hp > 0);
      }
      case 'all_enemies': {
        // No-op is acceptable when no enemies are alive
        return true;
      }
      case 'self':
      case 'none':
        return true;
      default:
        return false;
    }
  }

  /** Resolve which enemies a card will hit. Empty array for self/none. */
  getTargets(card: Card, enemies: EnemyState[], targetIndex: number): EnemyState[] {
    switch (card.targetType) {
      case 'enemy': {
        const target = enemies[targetIndex];
        if (!target) return [];
        return target.hp > 0 ? [target] : [];
      }
      case 'all_enemies':
        return enemies.filter(e => e.hp > 0);
      case 'self':
      case 'none':
      default:
        return [];
    }
  }

  /**
   * Play a card: validate, resolve targets, deduct resources, run effects,
   * record buff application. Throws if the card cannot be played.
   */
  play(
    card: Card,
    player: PlayerState,
    enemies: EnemyState[],
    targetIndex: number = 0,
  ): CardPlayResult {
    if (!this.canPlay(card, player, enemies)) {
      throw new Error('Cannot play card: insufficient resources or no valid targets');
    }

    const targets = this.getTargets(card, enemies, targetIndex);
    const targetIds = targets.map(t => t.id);

    // Deduct resources
    const energySpent = card.cost;
    const qiSpent = card.qiCost ?? 0;
    player.energy -= energySpent;
    player.qi -= qiSpent;

    // Snapshot BuffSystem appliedAt counters before effect execution so we
    // can diff newly applied entries for the play result. BuffSystem stores
    // all state — the legacy `player.buffs` / `enemy.buffs` arrays are no
    // longer mutated by the executor.
    const playerAppliedAtBefore = maxAppliedAt(this.playerBuffs);
    const enemyAppliedAtBefore = maxAppliedAt(this.enemyBuffs);

    // Pre-process effects: turn add_status scaling flags into modified
    // damage effects. Other add_status effects keep their original id so
    // the executor can dispatch them via the status handler table.
    const scaled = applyScalingFlags(
      card.effects,
      this.playerBuffs,
      this.enemyBuffs,
      this.getComboCount,
    );

    // Run each effect
    for (const item of scaled) {
      const effect = item.effect;
      const isConsumeMarks = item.consumeMarks;

      if (effectHitsEnemy(effect)) {
        // Damage / debuff effects target enemies. CardEffectExecutor only
        // acts on enemies[0], so call once per target.
        if (targets.length === 0) {
          // No valid targets (e.g. all_enemies but no alive enemies).
          // Skip without executing.
          continue;
        }
        for (const target of targets) {
          let modified = applyBuffModifiers(
            effect,
            target,
            this.playerBuffs,
            this.enemyBuffs,
          );
          if (item.bypassBlock) {
            modified = { ...modified, target: 'enemy' };
          }
          this.effectExecutor.execute(modified, player, [target]);
          if (isConsumeMarks) {
            // Consume all marks from this target.
            this.enemyBuffs.removeWhere((b) => b.type === 'mark');
          }
        }
      } else if (effect.type === 'add_status') {
        // add_status effects may need to iterate the target list (e.g.
        // mark_to_stun scales per enemy). Pass the resolved targets so
        // the executor's handler can iterate them.
        this.effectExecutor.execute(effect, player, targets);
      } else {
        // Self-targeted effects (block, heal, gain_*, etc.)
        const modified = applyBuffModifiers(
          effect,
          undefined,
          this.playerBuffs,
          this.enemyBuffs,
        );
        this.effectExecutor.execute(modified, player, []);
      }
    }

    // Diff against the BuffSystem: any buff applied after the snapshot
    // timestamp was caused by this card play.
    const buffsApplied: { buffId: string; type: string; stacks: number }[] = [];
    for (const b of this.playerBuffs.all()) {
      if (b.appliedAt > playerAppliedAtBefore) {
        buffsApplied.push({ buffId: b.id, type: b.type, stacks: b.stacks });
      }
    }
    for (const b of this.enemyBuffs.all()) {
      if (b.appliedAt > enemyAppliedAtBefore) {
        buffsApplied.push({ buffId: b.id, type: b.type, stacks: b.stacks });
      }
    }

    const exhausted = card.exhaust === true;

    return {
      cardId: card.id,
      playedAt: Date.now(),
      targetIds,
      energySpent,
      qiSpent,
      buffsApplied,
      discarded: !exhausted,
      exhausted,
    };
  }
}