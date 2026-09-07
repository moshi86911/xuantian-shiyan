import { describe, it, expect } from 'vitest';
import { Card } from '../../src/core/Card';
import type { CardEffect } from '../../src/core/types';

describe('Card', () => {
  const damageEffect: CardEffect = {
    type: 'damage',
    value: 6,
    target: 'enemy'
  };

  it('creates a card with effects', () => {
    const card = new Card({
      id: 'sword_001',
      name: '御剑术',
      description: '攻击 6 伤害',
      type: 'attack',
      rarity: 'common',
      cost: 1,
      targetType: 'enemy',
      effects: [damageEffect]
    });
    expect(card.id).toBe('sword_001');
    expect(card.cost).toBe(1);
    expect(card.effects).toHaveLength(1);
  });

  it('can be played if cost is met', () => {
    const card = new Card({
      id: 'test', name: 'Test', description: '', type: 'attack',
      rarity: 'common', cost: 2, targetType: 'enemy', effects: []
    });
    expect(card.canPlay(2, 0)).toBe(true);
    expect(card.canPlay(1, 0)).toBe(false);
  });

  it('can be played with qi cost', () => {
    const card = new Card({
      id: 'test', name: 'Test', description: '', type: 'qi',
      rarity: 'rare', cost: 0, qiCost: 2, targetType: 'enemy', effects: []
    });
    expect(card.canPlay(3, 1)).toBe(false);
    expect(card.canPlay(3, 2)).toBe(true);
  });

  it('is upgraded when marked', () => {
    const card = new Card({
      id: 'test', name: 'Test', description: '', type: 'attack',
      rarity: 'common', cost: 1, targetType: 'enemy', effects: [damageEffect]
    });
    expect(card.upgraded).toBe(false);
    card.upgrade();
    expect(card.upgraded).toBe(true);
    expect(card.effects[0].value).toBe(9);  // 6 * 1.5 = 9
  });

  it('upgrade is idempotent', () => {
    const card = new Card({
      id: 'test', name: 'Test', description: '6 damage', type: 'attack',
      rarity: 'common', cost: 1, targetType: 'enemy', effects: [damageEffect]
    });
    card.upgrade();
    const firstValue = card.effects[0].value;
    card.upgrade();
    expect(card.effects[0].value).toBe(firstValue);
  });

  it('shows + suffix when upgraded', () => {
    const card = new Card({
      id: 'test', name: '御剑术', description: '6 damage', type: 'attack',
      rarity: 'common', cost: 1, targetType: 'enemy', effects: [damageEffect]
    });
    expect(card.name).toBe('御剑术');
    card.upgrade();
    expect(card.name).toBe('御剑术+');
  });
});
