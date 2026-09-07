import type { CardEffect, PlayerState, EnemyState } from './types';
import { BuffSystem, type BuffType, type BuffSource } from './BuffSystem';

type AddStatusHandler = (
  effect: CardEffect,
  ctx: {
    player: PlayerState;
    enemies: EnemyState[];
    playerBuffs: BuffSystem;
    enemyBuffs: BuffSystem;
  },
) => void;

/**
 * Status effect ID → handler. Each handler is invoked when the executor
 * encounters an `add_status` effect. Statuses that affect damage scaling
 * (`damage_per_combo`, `damage_per_mark`, `consume_mark_damage`,
 * `bypass_block`) are marker flags — the CardExecutor reads them when
 * building the scaled effect, so the executor-level handlers for those
 * IDs are intentional no-ops.
 */
const STATUS_HANDLERS: Record<string, AddStatusHandler> = {
  damage_per_combo: () => {
    /* marker — scaling handled in CardExecutor */
  },
  damage_per_mark: () => {
    /* marker — scaling handled in CardExecutor */
  },
  consume_mark_damage: () => {
    /* marker — scaling + mark removal handled in CardExecutor */
  },
  bypass_block: () => {
    /* marker — handled in CardExecutor */
  },
  mark_to_stun: (effect, ctx) => {
    const totalMarks = ctx.enemyBuffs.totalStacks('mark');
    const perMark = effect.value > 0 ? effect.value : 1;
    const stunStacks = totalMarks * perMark;
    if (stunStacks <= 0) return;
    for (const _enemy of ctx.enemies) {
      ctx.enemyBuffs.apply({
        type: 'stun',
        stacks: stunStacks,
        source: 'player',
        duration: 1,
      });
    }
  },
  remove_all_enemy_buffs: (_effect, ctx) => {
    ctx.enemyBuffs.clear();
  },
  remove_random_debuff: (_effect, ctx) => {
    const debuffs = ctx.playerBuffs.all().filter((b) => b.source === 'enemy');
    if (debuffs.length === 0) return;
    const idx = Math.floor(Math.random() * debuffs.length);
    const target = debuffs[idx];
    ctx.playerBuffs.remove(target.id);
  },
  remove_all_debuffs: (_effect, ctx) => {
    ctx.playerBuffs.removeWhere((b) => b.source === 'enemy');
  },
  upgrade_random_card: () => {
    /* no upgrade system yet */
  },
  discard_random: (_effect, ctx) => {
    if (ctx.player.hand.length === 0) return;
    const idx = Math.floor(Math.random() * ctx.player.hand.length);
    ctx.player.hand.splice(idx, 1);
  },
};

export class CardEffectExecutor {
  constructor(
    private playerBuffs: BuffSystem,
    private enemyBuffs: BuffSystem,
  ) {}

  execute(effect: CardEffect, player: PlayerState, enemies: EnemyState[]): void {
    switch (effect.type) {
      case 'damage':
        this.applyDamage(effect, player, enemies);
        break;
      case 'block':
        this.applyBlock(effect, player);
        break;
      case 'heal':
        this.applyHeal(effect, player);
        break;
      case 'gain_energy':
        player.energy = Math.min(player.energy + effect.value, player.maxEnergy + effect.value);
        break;
      case 'gain_qi':
        player.qi = Math.min(player.qi + effect.value, player.maxQi);
        break;
      case 'apply_buff':
        this.applyBuff(effect, player);
        break;
      case 'apply_debuff':
        this.applyDebuff(effect, enemies);
        break;
      case 'draw':
        // Draw effect handled by BattleEngine separately
        break;
      case 'add_status': {
        const handler = effect.statusId ? STATUS_HANDLERS[effect.statusId] : undefined;
        if (handler) {
          handler(effect, {
            player,
            enemies,
            playerBuffs: this.playerBuffs,
            enemyBuffs: this.enemyBuffs,
          });
        }
        break;
      }
    }
  }

  private applyDamage(effect: CardEffect, _player: PlayerState, enemies: EnemyState[]): void {
    const target = enemies[0];
    if (!target) return;

    let damage = effect.value;
    if (!effect.bypassBlock && target.block > 0) {
      const absorbed = Math.min(target.block, damage);
      target.block -= absorbed;
      damage -= absorbed;
    }

    target.hp = Math.max(0, target.hp - damage);
  }

  private applyBlock(effect: CardEffect, player: PlayerState): void {
    player.block += effect.value;
  }

  private applyHeal(effect: CardEffect, player: PlayerState): void {
    player.hp = Math.min(player.maxHp, player.hp + effect.value);
  }

  private applyBuff(effect: CardEffect, player: PlayerState): void {
    const statusId = effect.statusId ?? 'unknown';
    // Cast: statusId may be a runtime-only buff type (e.g. 'combo') not yet
    // declared on the strict BuffType union. The BuffSystem Map key uses the
    // string directly so this is safe at runtime; we cast to satisfy strict TS.
    this.playerBuffs.apply({
      type: statusId as BuffType,
      stacks: effect.value,
      source: 'player' as BuffSource,
    });
    // `player.buffs` (legacy array) is intentionally NOT mutated here —
    // all buff state lives in the BuffSystem. The legacy field is left
    // untouched for callers that still read it (e.g. test fixtures).
    void player;
  }

  private applyDebuff(effect: CardEffect, enemies: EnemyState[]): void {
    const statusId = effect.statusId ?? 'unknown';
    if (enemies.length === 0) return;
    this.enemyBuffs.apply({
      type: statusId as BuffType,
      stacks: effect.value,
      source: 'player' as BuffSource,
      duration: 3,
    });
    // `enemy.buffs` (legacy array) is intentionally NOT mutated here —
    // all buff state lives in the BuffSystem.
    void enemies;
  }
}