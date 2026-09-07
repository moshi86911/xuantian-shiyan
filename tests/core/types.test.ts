import { describe, it, expect } from 'vitest';
import type { Card, PlayerState, BattleState } from '../../src/core/types';

describe('Game Types', () => {
  it('Card type can be instantiated', () => {
    const card: Card = {
      id: 'sword_001',
      name: '御剑术',
      description: '攻击 6 伤害',
      type: 'attack',
      rarity: 'common',
      cost: 1,
      characterId: 'sword',
      targetType: 'enemy',
      effects: []
    };
    expect(card.id).toBe('sword_001');
    expect(card.type).toBe('attack');
  });

  it('PlayerState has all required fields', () => {
    const player: PlayerState = {
      characterId: 'sword',
      hp: 75,
      maxHp: 75,
      block: 0,
      energy: 3,
      maxEnergy: 3,
      qi: 0,
      maxQi: 5,
      gold: 99,
      deck: ['card1', 'card2'],
      drawPile: ['card3'],
      discardPile: [],
      hand: [],
      exhaustPile: [],
      buffs: []
    };
    expect(player.hp).toBe(75);
    expect(player.maxHp).toBe(75);
  });

  it('BattleState contains player and enemies', () => {
    const battle: BattleState = {
      player: {
        characterId: 'sword',
        hp: 75, maxHp: 75, block: 0, energy: 3, maxEnergy: 3,
        qi: 0, maxQi: 5, gold: 0, deck: [], drawPile: [],
        discardPile: [], hand: [], exhaustPile: [], buffs: []
      },
      enemies: [],
      turn: 1,
      phase: 'player_turn'
    };
    expect(battle.phase).toBe('player_turn');
    expect(battle.turn).toBe(1);
  });
});