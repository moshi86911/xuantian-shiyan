import { describe, it, expect, beforeEach } from 'vitest';
import { CardExecutor } from '../../src/core/CardExecutor';
import { CardEffectExecutor } from '../../src/core/CardEffect';
import { BuffSystem } from '../../src/core/BuffSystem';
import type { Card, PlayerState, EnemyState } from '../../src/core/types';

function makePlayer(): PlayerState {
  return {
    characterId: 'sword',
    hp: 50, maxHp: 50, block: 0,
    energy: 3, maxEnergy: 3,
    qi: 0, maxQi: 5,
    gold: 0, deck: [],
    drawPile: [], discardPile: [], hand: [], exhaustPile: [],
    buffs: [],
  };
}

function makeEnemy(id = 'e1', hp = 30): EnemyState {
  return {
    id, name: 'enemy',
    hp, maxHp: hp, block: 0,
    intents: [], currentIntentIndex: 0,
    buffs: [], tier: 'normal', data: {},
  };
}

describe('CardExecutor', () => {
  let executor: CardExecutor;
  let player: PlayerState;
  let enemies: EnemyState[];
  let playerBuffs: BuffSystem;
  let enemyBuffs: BuffSystem;

  beforeEach(() => {
    playerBuffs = new BuffSystem();
    enemyBuffs = new BuffSystem();
    executor = new CardExecutor(new CardEffectExecutor(), playerBuffs, enemyBuffs);
    player = makePlayer();
    enemies = [makeEnemy('e1', 30), makeEnemy('e2', 20)];
  });

  it('canPlay returns true when resources are sufficient', () => {
    const card: Card = {
      id: 'c1', name: 'Strike', description: '',
      type: 'attack', rarity: 'common',
      cost: 1, targetType: 'enemy',
      effects: [{ type: 'damage', value: 6 }],
    };
    expect(executor.canPlay(card, player, enemies)).toBe(true);
  });

  it('canPlay returns false when energy insufficient', () => {
    const card: Card = { id: 'c1', name: 'big', description: '', type: 'attack', rarity: 'common', cost: 5, targetType: 'enemy', effects: [{ type: 'damage', value: 6 }] };
    expect(executor.canPlay(card, player, enemies)).toBe(false);
  });

  it('canPlay returns false when qi insufficient', () => {
    const card: Card = { id: 'c1', name: 'qi', description: '', type: 'qi', rarity: 'rare', cost: 0, qiCost: 2, targetType: 'self', effects: [{ type: 'damage', value: 15 }] };
    expect(executor.canPlay(card, player, enemies)).toBe(false);
  });

  it('canPlay returns false when no enemies for enemy target', () => {
    const card: Card = { id: 'c1', name: 's', description: '', type: 'attack', rarity: 'common', cost: 1, targetType: 'enemy', effects: [{ type: 'damage', value: 6 }] };
    expect(executor.canPlay(card, player, [])).toBe(false);
  });

  it('play deducts energy cost', () => {
    const card: Card = { id: 'c1', name: 's', description: '', type: 'attack', rarity: 'common', cost: 2, targetType: 'enemy', effects: [{ type: 'damage', value: 6 }] };
    const result = executor.play(card, player, enemies, 0);
    expect(player.energy).toBe(1);  // 3 - 2
    expect(result.energySpent).toBe(2);
  });

  it('play deducts qi cost', () => {
    player.qi = 3;
    const card: Card = { id: 'c1', name: 's', description: '', type: 'qi', rarity: 'rare', cost: 0, qiCost: 2, targetType: 'self', effects: [{ type: 'damage', value: 15 }] };
    const result = executor.play(card, player, enemies, 0);
    expect(player.qi).toBe(1);
    expect(result.qiSpent).toBe(2);
  });

  it('play applies damage to target enemy', () => {
    const card: Card = { id: 'c1', name: 's', description: '', type: 'attack', rarity: 'common', cost: 1, targetType: 'enemy', effects: [{ type: 'damage', value: 6 }] };
    executor.play(card, player, enemies, 1);  // target enemy2
    expect(enemies[0].hp).toBe(30);  // unaffected
    expect(enemies[1].hp).toBe(14);  // 20 - 6
  });

  it('play applies damage to all enemies for target=all_enemies', () => {
    const card: Card = { id: 'c1', name: 'cleave', description: '', type: 'attack', rarity: 'common', cost: 1, targetType: 'all_enemies', effects: [{ type: 'damage', value: 4 }] };
    executor.play(card, player, enemies, 0);
    expect(enemies[0].hp).toBe(26);
    expect(enemies[1].hp).toBe(16);
  });

  it('play applies self-targeted heal', () => {
    player.hp = 30;
    const card: Card = { id: 'c1', name: 'heal', description: '', type: 'skill', rarity: 'common', cost: 1, targetType: 'self', effects: [{ type: 'heal', value: 5 }] };
    executor.play(card, player, enemies, 0);
    expect(player.hp).toBe(35);
  });

  it('play throws when canPlay fails', () => {
    const card: Card = { id: 'c1', name: 'big', description: '', type: 'attack', rarity: 'common', cost: 5, targetType: 'enemy', effects: [{ type: 'damage', value: 6 }] };
    expect(() => executor.play(card, player, enemies, 0)).toThrow();
  });

  it('play marks card as exhausted when exhaust flag set', () => {
    const card: Card = { id: 'c1', name: 'ex', description: '', type: 'skill', rarity: 'rare', cost: 1, targetType: 'self', exhaust: true, effects: [{ type: 'block', value: 8 }] };
    const result = executor.play(card, player, enemies, 0);
    expect(result.exhausted).toBe(true);
    expect(result.discarded).toBe(false);
  });

  it('play marks card as discarded by default', () => {
    const card: Card = { id: 'c1', name: 's', description: '', type: 'attack', rarity: 'common', cost: 1, targetType: 'enemy', effects: [{ type: 'damage', value: 6 }] };
    const result = executor.play(card, player, enemies, 0);
    expect(result.exhausted).toBe(false);
    expect(result.discarded).toBe(true);
  });

  it('strength buff increases damage dealt', () => {
    playerBuffs.apply({ type: 'strength', stacks: 3, source: 'player' });
    const card: Card = { id: 'c1', name: 's', description: '', type: 'attack', rarity: 'common', cost: 1, targetType: 'enemy', effects: [{ type: 'damage', value: 6 }] };
    executor.play(card, player, enemies, 0);
    expect(enemies[0].hp).toBe(21);  // 30 - (6 + 3)
  });

  it('weak debuff decreases damage dealt', () => {
    playerBuffs.apply({ type: 'weak', stacks: 1, source: 'enemy' });
    const card: Card = { id: 'c1', name: 's', description: '', type: 'attack', rarity: 'common', cost: 1, targetType: 'enemy', effects: [{ type: 'damage', value: 8 }] };
    executor.play(card, player, enemies, 0);
    // 8 * 0.75 = 6
    expect(enemies[0].hp).toBe(24);
  });

  it('vulnerable debuff increases damage taken', () => {
    enemyBuffs.apply({ type: 'vulnerable', stacks: 1, source: 'player' });
    const card: Card = { id: 'c1', name: 's', description: '', type: 'attack', rarity: 'common', cost: 1, targetType: 'enemy', effects: [{ type: 'damage', value: 8 }] };
    executor.play(card, player, enemies, 0);
    // 8 * 1.5 = 12
    expect(enemies[0].hp).toBe(18);
  });

  it('getTargets returns single enemy for enemy target', () => {
    const card: Card = { id: 'c1', name: 's', description: '', type: 'attack', rarity: 'common', cost: 1, targetType: 'enemy', effects: [{ type: 'damage', value: 6 }] };
    const targets = executor.getTargets(card, enemies, 1);
    expect(targets).toHaveLength(1);
    expect(targets[0]).toBe(enemies[1]);
  });

  it('getTargets returns all alive enemies for all_enemies target', () => {
    const card: Card = { id: 'c1', name: 's', description: '', type: 'attack', rarity: 'common', cost: 1, targetType: 'all_enemies', effects: [{ type: 'damage', value: 4 }] };
    const targets = executor.getTargets(card, enemies, 0);
    expect(targets).toHaveLength(2);
  });

  it('getTargets excludes dead enemies for all_enemies target', () => {
    enemies[1].hp = 0;
    const card: Card = { id: 'c1', name: 's', description: '', type: 'attack', rarity: 'common', cost: 1, targetType: 'all_enemies', effects: [{ type: 'damage', value: 4 }] };
    const targets = executor.getTargets(card, enemies, 0);
    expect(targets).toHaveLength(1);
    expect(targets[0]).toBe(enemies[0]);
  });

  it('getTargets returns empty for self target', () => {
    const card: Card = { id: 'c1', name: 'h', description: '', type: 'skill', rarity: 'common', cost: 1, targetType: 'self', effects: [{ type: 'heal', value: 5 }] };
    const targets = executor.getTargets(card, enemies, 0);
    expect(targets).toHaveLength(0);
  });

  it('play returns CardPlayResult with targetIds', () => {
    const card: Card = { id: 'c1', name: 's', description: '', type: 'attack', rarity: 'common', cost: 1, targetType: 'enemy', effects: [{ type: 'damage', value: 6 }] };
    const result = executor.play(card, player, enemies, 0);
    expect(result.cardId).toBe('c1');
    expect(result.targetIds).toContain('e1');
    expect(result.targetIds).toHaveLength(1);
    expect(typeof result.playedAt).toBe('number');
  });

  it('play result for all_enemies target includes all targets', () => {
    const card: Card = { id: 'c1', name: 'cleave', description: '', type: 'attack', rarity: 'common', cost: 1, targetType: 'all_enemies', effects: [{ type: 'damage', value: 4 }] };
    const result = executor.play(card, player, enemies, 0);
    expect(result.targetIds).toHaveLength(2);
    expect(result.targetIds).toContain('e1');
    expect(result.targetIds).toContain('e2');
  });

  it('dexterity buff increases block gained', () => {
    playerBuffs.apply({ type: 'dexterity', stacks: 3, source: 'player' });
    const card: Card = { id: 'c1', name: 'def', description: '', type: 'skill', rarity: 'common', cost: 1, targetType: 'self', effects: [{ type: 'block', value: 5 }] };
    executor.play(card, player, enemies, 0);
    expect(player.block).toBe(8);  // 5 + 3
  });

  it('canPlay returns true for self when no enemies', () => {
    const card: Card = { id: 'c1', name: 'h', description: '', type: 'skill', rarity: 'common', cost: 1, targetType: 'self', effects: [{ type: 'heal', value: 5 }] };
    expect(executor.canPlay(card, player, [])).toBe(true);
  });

  it('canPlay returns true for all_enemies when no enemies (no-op)', () => {
    const card: Card = { id: 'c1', name: 'cleave', description: '', type: 'attack', rarity: 'common', cost: 1, targetType: 'all_enemies', effects: [{ type: 'damage', value: 4 }] };
    expect(executor.canPlay(card, player, [])).toBe(true);
  });

  it('canPlay returns false for enemy target with only dead enemies', () => {
    enemies[0].hp = 0;
    enemies[1].hp = 0;
    const card: Card = { id: 'c1', name: 's', description: '', type: 'attack', rarity: 'common', cost: 1, targetType: 'enemy', effects: [{ type: 'damage', value: 6 }] };
    expect(executor.canPlay(card, player, enemies)).toBe(false);
  });

  it('play can execute multiple effects in sequence', () => {
    const card: Card = {
      id: 'c1', name: 'combo', description: '', type: 'attack', rarity: 'common',
      cost: 1, targetType: 'enemy',
      effects: [
        { type: 'damage', value: 5 },
        { type: 'block', value: 3 },
      ],
    };
    executor.play(card, player, enemies, 0);
    expect(enemies[0].hp).toBe(25);  // 30 - 5
    expect(player.block).toBe(3);
  });

  it('strength and weakness stack multiplicatively', () => {
    playerBuffs.apply({ type: 'strength', stacks: 4, source: 'player' });
    playerBuffs.apply({ type: 'weak', stacks: 1, source: 'enemy' });
    const card: Card = { id: 'c1', name: 's', description: '', type: 'attack', rarity: 'common', cost: 1, targetType: 'enemy', effects: [{ type: 'damage', value: 8 }] };
    executor.play(card, player, enemies, 0);
    // (8 + 4) * 0.75 = 9
    expect(enemies[0].hp).toBe(21);
  });
});