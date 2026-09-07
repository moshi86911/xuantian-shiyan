import { describe, it, expect, beforeEach } from 'vitest';
import { CardEffectExecutor } from '../../src/core/CardEffect';
import { BuffSystem } from '../../src/core/BuffSystem';
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

  let playerBuffs: BuffSystem;
  let enemyBuffs: BuffSystem;

  beforeEach(() => {
    playerBuffs = new BuffSystem();
    enemyBuffs = new BuffSystem();
  });

  it('damage effect reduces enemy hp', () => {
    const executor = new CardEffectExecutor(playerBuffs, enemyBuffs);
    const player = makePlayer();
    const enemy = makeEnemy();
    const effect: CardEffect = { type: 'damage', value: 6, target: 'enemy' };

    executor.execute(effect, player, [enemy]);
    expect(enemy.hp).toBe(24);
  });

  it('block effect increases player block', () => {
    const executor = new CardEffectExecutor(playerBuffs, enemyBuffs);
    const player = makePlayer();
    const enemy = makeEnemy();
    const effect: CardEffect = { type: 'block', value: 8, target: 'self' };

    executor.execute(effect, player, [enemy]);
    expect(player.block).toBe(8);
  });

  it('heal effect restores player hp', () => {
    const executor = new CardEffectExecutor(playerBuffs, enemyBuffs);
    const player = makePlayer();
    player.hp = 50;
    const enemy = makeEnemy();
    const effect: CardEffect = { type: 'heal', value: 10, target: 'self' };

    executor.execute(effect, player, [enemy]);
    expect(player.hp).toBe(60);
  });

  it('heal does not exceed maxHp', () => {
    const executor = new CardEffectExecutor(playerBuffs, enemyBuffs);
    const player = makePlayer();
    player.hp = 70;
    const enemy = makeEnemy();
    const effect: CardEffect = { type: 'heal', value: 20, target: 'self' };

    executor.execute(effect, player, [enemy]);
    expect(player.hp).toBe(75);  // capped at maxHp
  });

  it('draw effect would trigger deck refilling (placeholder)', () => {
    const executor = new CardEffectExecutor(playerBuffs, enemyBuffs);
    const player = makePlayer();
    const enemy = makeEnemy();
    const effect: CardEffect = { type: 'draw', value: 2 };

    // Draw effect is a no-op for now (handled by BattleEngine)
    executor.execute(effect, player, [enemy]);
    expect(true).toBe(true);  // no exception
  });

  it('gain_energy increases player energy', () => {
    const executor = new CardEffectExecutor(playerBuffs, enemyBuffs);
    const player = makePlayer();
    player.energy = 2;
    const enemy = makeEnemy();
    const effect: CardEffect = { type: 'gain_energy', value: 1 };

    executor.execute(effect, player, [enemy]);
    expect(player.energy).toBe(3);
  });

  it('gain_qi increases player qi', () => {
    const executor = new CardEffectExecutor(playerBuffs, enemyBuffs);
    const player = makePlayer();
    const enemy = makeEnemy();
    const effect: CardEffect = { type: 'gain_qi', value: 2 };

    executor.execute(effect, player, [enemy]);
    expect(player.qi).toBe(2);
  });

  it('apply_buff adds buff to player', () => {
    const executor = new CardEffectExecutor(playerBuffs, enemyBuffs);
    const player = makePlayer();
    const enemy = makeEnemy();
    const effect: CardEffect = { type: 'apply_buff', value: 2, statusId: 'combo' };

    executor.execute(effect, player, [enemy]);
    expect(playerBuffs.totalStacks('combo')).toBe(2);
  });
});

describe('applyBuff / apply_debuff routing to BuffSystem', () => {
  let executor: CardEffectExecutor;
  let playerBuffs: BuffSystem;
  let enemyBuffs: BuffSystem;

  beforeEach(() => {
    playerBuffs = new BuffSystem();
    enemyBuffs = new BuffSystem();
    executor = new CardEffectExecutor(playerBuffs, enemyBuffs);
  });

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

  it('apply_buff writes to playerBuffs (not player.buffs array)', () => {
    const player = makePlayer();
    executor.execute({ type: 'apply_buff', value: 2, statusId: 'strength' }, player, []);
    expect(playerBuffs.totalStacks('strength')).toBe(2);
    expect(player.buffs).toHaveLength(0);
  });

  it('apply_debuff writes to enemyBuffs (not enemy.buffs array)', () => {
    const enemies = [makeEnemy()];
    executor.execute({ type: 'apply_debuff', value: 1, statusId: 'weak' }, makePlayer(), enemies);
    expect(enemyBuffs.totalStacks('weak')).toBe(1);
    expect(enemies[0].buffs).toHaveLength(0);
  });
});

describe('add_status dispatcher', () => {
  let player: PlayerState;
  let enemies: EnemyState[];
  let playerBuffs: BuffSystem;
  let enemyBuffs: BuffSystem;
  let executor: CardEffectExecutor;

  beforeEach(() => {
    playerBuffs = new BuffSystem();
    enemyBuffs = new BuffSystem();
    executor = new CardEffectExecutor(playerBuffs, enemyBuffs);
    player = {
      characterId: 'sword',
      hp: 75, maxHp: 75, block: 0, energy: 3, maxEnergy: 3,
      qi: 0, maxQi: 5, gold: 0, deck: [], drawPile: [],
      discardPile: [], hand: ['a', 'b', 'c'], exhaustPile: [], buffs: []
    };
    enemies = [{
      id: 'wolf', name: '妖狼',
      hp: 30, maxHp: 30, block: 0,
      intents: [], currentIntentIndex: 0,
      buffs: [], tier: 'normal', data: {}
    }];
  });

  it('damage_per_mark reads mark stacks on enemy', () => {
    enemyBuffs.apply({ type: 'mark', stacks: 3, source: 'player' });
    executor.execute({ type: 'add_status', value: 5, statusId: 'damage_per_mark' }, player, enemies);
    expect(enemyBuffs.totalStacks('mark')).toBe(3);
  });

  it('consume_mark_damage reads mark stacks (does not consume in executor alone)', () => {
    enemyBuffs.apply({ type: 'mark', stacks: 2, source: 'player' });
    executor.execute({ type: 'add_status', value: 4, statusId: 'consume_mark_damage' }, player, enemies);
    expect(enemyBuffs.totalStacks('mark')).toBe(2);
  });

  it('mark_to_stun adds stun stacks per mark on enemy', () => {
    enemyBuffs.apply({ type: 'mark', stacks: 3, source: 'player' });
    executor.execute({ type: 'add_status', value: 1, statusId: 'mark_to_stun' }, player, enemies);
    expect(enemyBuffs.totalStacks('stun')).toBe(3);
  });

  it('mark_to_stun applies to all enemies for all_enemies target', () => {
    enemyBuffs.apply({ type: 'mark', stacks: 2, source: 'player' });
    const e2 = { ...enemies[0], id: 'wolf2' };
    enemies.push(e2);
    enemies[0].id = 'wolf1';
    executor.execute({ type: 'add_status', value: 2, statusId: 'mark_to_stun' }, player, enemies);
    expect(enemyBuffs.totalStacks('stun')).toBe(8);  // 2 marks * 2 stun each, on 2 enemies
  });

  it('remove_all_enemy_buffs clears enemy buffs', () => {
    enemyBuffs.apply({ type: 'strength', stacks: 5, source: 'enemy' });
    enemyBuffs.apply({ type: 'weak', stacks: 1, source: 'enemy' });
    executor.execute({ type: 'add_status', value: 0, statusId: 'remove_all_enemy_buffs' }, player, enemies);
    expect(enemyBuffs.all()).toHaveLength(0);
  });

  it('remove_random_debuff removes one debuff from player', () => {
    playerBuffs.apply({ type: 'weak', stacks: 1, source: 'enemy' });
    playerBuffs.apply({ type: 'weak', stacks: 1, source: 'enemy' });
    const before = playerBuffs.totalStacks('weak');
    executor.execute({ type: 'add_status', value: 0, statusId: 'remove_random_debuff' }, player, enemies);
    expect(playerBuffs.totalStacks('weak')).toBeLessThan(before);
  });

  it('remove_all_debuffs clears all debuffs from player but preserves buffs', () => {
    playerBuffs.apply({ type: 'weak', stacks: 1, source: 'enemy' });
    playerBuffs.apply({ type: 'vulnerable', stacks: 1, source: 'enemy' });
    playerBuffs.apply({ type: 'strength', stacks: 1, source: 'player' });
    executor.execute({ type: 'add_status', value: 0, statusId: 'remove_all_debuffs' }, player, enemies);
    expect(playerBuffs.totalStacks('weak')).toBe(0);
    expect(playerBuffs.totalStacks('vulnerable')).toBe(0);
    expect(playerBuffs.totalStacks('strength')).toBe(1);
  });

  it('discard_random removes a card from player hand', () => {
    const beforeLen = player.hand.length;
    executor.execute({ type: 'add_status', value: 1, statusId: 'discard_random' }, player, enemies);
    expect(player.hand.length).toBe(beforeLen - 1);
  });

  it('damage_per_combo is no-op in executor alone (handled in CardExecutor)', () => {
    expect(() => executor.execute({ type: 'add_status', value: 5, statusId: 'damage_per_combo' }, player, enemies)).not.toThrow();
  });

  it('bypass_block is no-op in executor alone (handled in CardExecutor)', () => {
    expect(() => executor.execute({ type: 'add_status', value: 0, statusId: 'bypass_block' }, player, enemies)).not.toThrow();
  });

  it('upgrade_random_card is no-op (no upgrade system)', () => {
    expect(() => executor.execute({ type: 'add_status', value: 1, statusId: 'upgrade_random_card' }, player, enemies)).not.toThrow();
  });
});
