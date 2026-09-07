// src/core/CardExecutor.ts

import type { Card, CardEffect, PlayerState, EnemyState } from './types';
import { CardEffectExecutor } from './CardEffect';
import { BuffSystem } from './BuffSystem';

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
  constructor(
    private effectExecutor: CardEffectExecutor,
    private playerBuffs: BuffSystem,
    private enemyBuffs: BuffSystem,
  ) {}

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

    // Snapshot player/enemy buff arrays before effect execution so we can
    // diff newly applied entries for the play result.
    const playerBuffsLenBefore = player.buffs.length;
    const enemyBuffsLensBefore = new Map<string, number>();
    for (const e of enemies) {
      enemyBuffsLensBefore.set(e.id, e.buffs.length);
    }

    // Run each effect
    for (const effect of card.effects) {
      if (effectHitsEnemy(effect)) {
        // Damage / debuff effects target enemies. CardEffectExecutor only
        // acts on enemies[0], so call once per target.
        if (targets.length === 0) {
          // No valid targets (e.g. all_enemies but no alive enemies).
          // Skip without executing.
          continue;
        }
        for (const target of targets) {
          const modified = applyBuffModifiers(
            effect,
            target,
            this.playerBuffs,
            this.enemyBuffs,
          );
          this.effectExecutor.execute(modified, player, [target]);
        }
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

    // Diff player buffs
    const buffsApplied: { buffId: string; type: string; stacks: number }[] = [];
    for (let i = playerBuffsLenBefore; i < player.buffs.length; i++) {
      const b = player.buffs[i];
      buffsApplied.push({ buffId: b.id, type: b.id, stacks: b.value });
    }
    for (const e of enemies) {
      const before = enemyBuffsLensBefore.get(e.id) ?? 0;
      for (let i = before; i < e.buffs.length; i++) {
        const b = e.buffs[i];
        buffsApplied.push({ buffId: b.id, type: b.id, stacks: b.value });
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