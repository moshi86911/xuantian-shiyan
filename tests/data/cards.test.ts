// tests/data/cards.test.ts

import { describe, it, expect } from 'vitest';
import { getCard, listAllCards, listCardsByCharacter, listNeutralCards } from '../../src/data/cards';

describe('Card Data', () => {
  it('loads all 72 cards', () => {
    expect(listAllCards()).toHaveLength(72);
  });

  it('sword cultivator has 24 cards', () => {
    expect(listCardsByCharacter('sword')).toHaveLength(24);
  });

  it('talisman cultivator has 20 cards', () => {
    expect(listCardsByCharacter('talisman')).toHaveLength(20);
  });

  it('alchemy cultivator has 17 cards', () => {
    expect(listCardsByCharacter('alchemy')).toHaveLength(17);
  });

  it('neutral cards count to 11', () => {
    expect(listNeutralCards()).toHaveLength(11);
  });

  it('all card ids are unique', () => {
    const ids = listAllCards().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every card has required fields', () => {
    for (const card of listAllCards()) {
      expect(card.id).toBeTruthy();
      expect(card.name).toBeTruthy();
      expect(card.description).toBeTruthy();
      expect(card.cost).toBeGreaterThanOrEqual(0);
      expect(['attack', 'skill', 'power', 'qi']).toContain(card.type);
      expect(['common', 'rare', 'legendary']).toContain(card.rarity);
      expect(['enemy', 'self', 'all_enemies', 'none']).toContain(card.targetType);
      expect(Array.isArray(card.effects)).toBe(true);
      expect(card.effects.length).toBeGreaterThan(0);
    }
  });

  it('all effects have a known type and numeric value', () => {
    const known = [
      'damage',
      'heal',
      'block',
      'draw',
      'apply_buff',
      'apply_debuff',
      'gain_energy',
      'gain_qi',
      'add_status'
    ];
    for (const card of listAllCards()) {
      for (const effect of card.effects) {
        expect(known).toContain(effect.type);
        expect(typeof effect.value).toBe('number');
      }
    }
  });

  it('buff / debuff / status effects always carry a statusId', () => {
    for (const card of listAllCards()) {
      for (const effect of card.effects) {
        if (effect.type === 'apply_buff' || effect.type === 'apply_debuff' || effect.type === 'add_status') {
          expect(effect.statusId).toBeTruthy();
        }
      }
    }
  });

  it('every card id is retrievable', () => {
    for (const card of listAllCards()) {
      expect(getCard(card.id)).toBeDefined();
    }
  });

  it('returns undefined for unknown ids', () => {
    expect(getCard('does_not_exist')).toBeUndefined();
  });

  it('rarity distribution per character matches design', () => {
    const count = (cards: { rarity: string }[], rarity: string) =>
      cards.filter((c) => c.rarity === rarity).length;

    const sword = listCardsByCharacter('sword');
    expect([count(sword, 'common'), count(sword, 'rare'), count(sword, 'legendary')]).toEqual([12, 8, 4]);

    const talisman = listCardsByCharacter('talisman');
    expect([count(talisman, 'common'), count(talisman, 'rare'), count(talisman, 'legendary')]).toEqual([
      10, 7, 3
    ]);

    const alchemy = listCardsByCharacter('alchemy');
    expect([count(alchemy, 'common'), count(alchemy, 'rare'), count(alchemy, 'legendary')]).toEqual([
      8, 6, 3
    ]);

    const neutral = listNeutralCards();
    expect([count(neutral, 'common'), count(neutral, 'rare'), count(neutral, 'legendary')]).toEqual([
      5, 4, 2
    ]);
  });

  it('all_enemies cards contain at least one effect and attack cards deal damage', () => {
    for (const card of listAllCards()) {
      if (card.type === 'attack') {
        expect(card.effects.some((e) => e.type === 'damage')).toBe(true);
      }
    }
  });
});
