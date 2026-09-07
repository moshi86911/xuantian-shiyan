import { describe, it, expect, beforeEach } from 'vitest';
import { BattleRewards } from '../../src/core/BattleRewards';
import { createRng } from '../../src/utils/rng';
import type { PlayerState } from '../../src/core/types';

function makePlayer(): PlayerState {
  return {
    characterId: 'sword',
    hp: 50, maxHp: 50,
    energy: 3, maxEnergy: 3,
    qi: 0, maxQi: 5,
    block: 0, gold: 99,
    hand: [], drawPile: ['sword_strike'], discardPile: [], exhaustPile: [],
    buffs: [],
  } as any;
}

describe('BattleRewards', () => {
  let player: PlayerState;

  beforeEach(() => {
    player = makePlayer();
  });

  it('generates 3 card choices by default', () => {
    const choices = BattleRewards.generate(player, createRng('test'), 3);
    expect(choices).toHaveLength(3);
  });

  it('generates exactly count choices when count is custom', () => {
    const choices = BattleRewards.generate(player, createRng('test'), 5);
    expect(choices).toHaveLength(5);
  });

  it('returns unique card IDs across choices', () => {
    const choices = BattleRewards.generate(player, createRng('test'), 3);
    const ids = choices.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not return cards owned 5+ times', () => {
    const deck: PlayerState = {
      ...player,
      drawPile: Array(6).fill('sword_strike'),
    };
    const choices = BattleRewards.generate(deck, createRng('test'), 10);
    const hasStrike = choices.some((c) => c.id === 'sword_strike');
    expect(hasStrike).toBe(false);
  });

  it('takeCard adds the card to drawPile', () => {
    const card = { id: 'test_card', name: 'Test', description: '', type: 'attack' as const, rarity: 'common' as const, cost: 1, targetType: 'enemy' as const, effects: [] };
    const updated = BattleRewards.takeCard(player, card);
    expect(updated.drawPile).toContain('test_card');
    expect(updated.drawPile.length).toBe(player.drawPile.length + 1);
  });

  it('takeCard does not mutate original', () => {
    const card = { id: 'test_card', name: 'Test', description: '', type: 'attack' as const, rarity: 'common' as const, cost: 1, targetType: 'enemy' as const, effects: [] };
    BattleRewards.takeCard(player, card);
    expect(player.drawPile).not.toContain('test_card');
  });

  it('canSkip returns true', () => {
    expect(BattleRewards.canSkip()).toBe(true);
  });
});