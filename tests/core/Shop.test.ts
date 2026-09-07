import { describe, it, expect } from 'vitest';
import { Shop } from '../../src/core/Shop';
import { createRng } from '../../src/utils/rng';
import type { PlayerState } from '../../src/core/types';

function makePlayer(gold = 200): PlayerState {
  return {
    characterId: 'sword',
    hp: 50, maxHp: 50,
    energy: 3, maxEnergy: 3,
    qi: 0, maxQi: 5,
    block: 0, gold,
    hand: [], drawPile: [], discardPile: [], exhaustPile: [],
    buffs: [],
  } as any;
}

describe('Shop', () => {
  describe('generate', () => {
    it('returns 3-5 cards', () => {
      const shop = Shop.generate(makePlayer(), createRng('test'));
      expect(shop.cards.length).toBeGreaterThanOrEqual(3);
      expect(shop.cards.length).toBeLessThanOrEqual(5);
    });

    it('removeCardCost is set', () => {
      const shop = Shop.generate(makePlayer(), createRng('test'));
      expect(shop.removeCardCost).toBeGreaterThan(0);
    });

    it('all items have positive cost', () => {
      const shop = Shop.generate(makePlayer(), createRng('test'));
      for (const item of shop.cards) {
        expect(item.cost).toBeGreaterThan(0);
      }
    });
  });

  describe('canAfford', () => {
    it('returns true when player has enough gold', () => {
      const shop = Shop.generate(makePlayer(200), createRng('test'));
      const item = shop.cards[0];
      if (item) {
        expect(Shop.canAfford(makePlayer(200), item)).toBe(true);
      }
    });

    it('returns false when player lacks gold', () => {
      const shop = Shop.generate(makePlayer(), createRng('test'));
      const item = shop.cards[0];
      if (item) {
        expect(Shop.canAfford(makePlayer(10), item)).toBe(false);
      }
    });
  });

  describe('purchase', () => {
    it('deducts gold and adds card to deck', () => {
      const player = makePlayer(200);
      const shop = Shop.generate(player, createRng('test'));
      const item = shop.cards[0];
      if (item && item.type === 'card') {
        const updated = Shop.purchase(player, item);
        expect(updated.gold).toBe(player.gold - item.cost);
        expect(updated.drawPile.length).toBeGreaterThan(player.drawPile.length);
      }
    });

    it('throws when insufficient gold', () => {
      const player = makePlayer(0);
      const shop = Shop.generate(player, createRng('test'));
      const item = shop.cards[0];
      if (item) {
        expect(() => Shop.purchase(player, item)).toThrow();
      }
    });

    it('does not mutate original player', () => {
      const player = makePlayer(200);
      const shop = Shop.generate(player, createRng('test'));
      const item = shop.cards[0];
      if (item && item.type === 'card') {
        Shop.purchase(player, item);
        expect(player.gold).toBe(200);  // unchanged
      }
    });
  });

  describe('removeCard', () => {
    it('deducts removeCardCost and removes card', () => {
      const player = { ...makePlayer(200), drawPile: ['sword_strike', 'sword_defend'] };
      const updated = Shop.removeCard(player, 'sword_strike');
      expect(updated.gold).toBe(200 - 75);
      expect(updated.drawPile).not.toContain('sword_strike');
    });

    it('throws when insufficient gold', () => {
      const player = makePlayer(50);
      expect(() => Shop.removeCard(player, 'sword_strike')).toThrow();
    });
  });
});