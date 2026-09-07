import type { CardEffect, PlayerState, EnemyState } from './types';

export class CardEffectExecutor {
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
        // Apply to first enemy for now
        if (enemies.length > 0) {
          enemies[0].buffs.push({
            id: effect.statusId ?? 'unknown',
            value: effect.value,
            duration: 3  // default duration
          });
        }
        break;
      case 'draw':
        // Draw effect handled by BattleEngine separately
        break;
      case 'add_status':
        // Status effect application
        break;
    }
  }

  // `_player` is unused today but retained for upcoming player-side damage
  // modifiers (e.g. strength buffs); underscore keeps noUnusedParameters happy.
  private applyDamage(effect: CardEffect, _player: PlayerState, enemies: EnemyState[]): void {
    const target = enemies[0];
    if (!target) return;

    // Account for target's block
    let damage = effect.value;
    if (target.block > 0) {
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
    player.buffs.push({
      id: effect.statusId ?? 'unknown',
      value: effect.value,
      duration: 99  // permanent for combat
    });
  }
}
