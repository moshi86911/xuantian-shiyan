import { describe, it, expect } from 'vitest';
import { CardEffectExecutor } from '../../src/core/CardEffect';
import type { CardEffect, PlayerState, EnemyState } from '../../src/core/types';

describe('CardEffectExecutor', () => {
  function makePlayer(): PlayerState {
    return {
      characterId: 'sword',
      hp: 75, maxHp: 75, block: 0, energy: 3, maxEnergy: 3,
      qi: 0, maxQi: 5, gold: 0, deck: [], drawPile: [],
      discardPile: [], hand: [], exhaustPile: [], buffs: []
    };
  }

  function makeEnemy(): EnemyState {
    return {
      id: 'wolf', name: '妖狼',
      hp: 30, maxHp: 30, block: 0,
      intents: [], currentIntentIndex: 0,
      buffs: [], tier: 'normal', data: {}
    };
  }

  it('damage effect reduces enemy hp', () => {
    const executor = new CardEffectExecutor();
    const player = makePlayer();
    const enemy = makeEnemy();
    const effect: CardEffect = { type: 'damage', value: 6, target: 'enemy' };

    executor.execute(effect, player, [enemy]);
    expect(enemy.hp).toBe(24);
  });

  it('block effect increases player block', () => {
    const executor = new CardEffectExecutor();
    const player = makePlayer();
    const enemy = makeEnemy();
    const effect: CardEffect = { type: 'block', value: 8, target: 'self' };

    executor.execute(effect, player, [enemy]);
    expect(player.block).toBe(8);
  });

  it('heal effect restores player hp', () => {
    const executor = new CardEffectExecutor();
    const player = makePlayer();
    player.hp = 50;
    const enemy = makeEnemy();
    const effect: CardEffect = { type: 'heal', value: 10, target: 'self' };

    executor.execute(effect, player, [enemy]);
    expect(player.hp).toBe(60);
  });

  it('heal does not exceed maxHp', () => {
    const executor = new CardEffectExecutor();
    const player = makePlayer();
    player.hp = 70;
    const enemy = makeEnemy();
    const effect: CardEffect = { type: 'heal', value: 20, target: 'self' };

    executor.execute(effect, player, [enemy]);
    expect(player.hp).toBe(75);  // capped at maxHp
  });

  it('draw effect would trigger deck refilling (placeholder)', () => {
    const executor = new CardEffectExecutor();
    const player = makePlayer();
    const enemy = makeEnemy();
    const effect: CardEffect = { type: 'draw', value: 2 };

    // Draw effect is a no-op for now (handled by BattleEngine)
    executor.execute(effect, player, [enemy]);
    expect(true).toBe(true);  // no exception
  });

  it('gain_energy increases player energy', () => {
    const executor = new CardEffectExecutor();
    const player = makePlayer();
    player.energy = 2;
    const enemy = makeEnemy();
    const effect: CardEffect = { type: 'gain_energy', value: 1 };

    executor.execute(effect, player, [enemy]);
    expect(player.energy).toBe(3);
  });

  it('gain_qi increases player qi', () => {
    const executor = new CardEffectExecutor();
    const player = makePlayer();
    const enemy = makeEnemy();
    const effect: CardEffect = { type: 'gain_qi', value: 2 };

    executor.execute(effect, player, [enemy]);
    expect(player.qi).toBe(2);
  });

  it('apply_buff adds buff to player', () => {
    const executor = new CardEffectExecutor();
    const player = makePlayer();
    const enemy = makeEnemy();
    const effect: CardEffect = { type: 'apply_buff', value: 2, statusId: 'combo' };

    executor.execute(effect, player, [enemy]);
    expect(player.buffs).toHaveLength(1);
    expect(player.buffs[0].id).toBe('combo');
  });
});
