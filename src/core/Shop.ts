// src/core/Shop.ts

import type { PlayerState, Card, CardRarity } from './types';
import { listAllCards } from '../data/cards';
import type { SeededRandom } from '../utils/rng';

export type ShopItemType = 'card' | 'relic' | 'potion' | 'remove_card';

export interface ShopItem {
  type: ShopItemType;
  cost: number;
  data: Card | string;  // Card for 'card', relic id for 'relic', potion id for 'potion'
}

export interface ShopState {
  cards: ShopItem[];        // 3-5 purchasable cards
  removeCardCost: number;   // cost to remove a card from deck
}

export class Shop {
  /**
   * Generate a shop with 3-5 random cards plus the remove-card option.
   */
  static generate(
    player: PlayerState,
    rng: SeededRandom
  ): ShopState {
    const allCards = listAllCards();
    const eligible = allCards.filter(c => c.characterId === player.characterId || !c.characterId);
    const cardCount = rng.nextInt(3, 5);
    const items: ShopItem[] = [];
    const used = new Set<string>();
    for (let i = 0; i < cardCount && used.size < eligible.length; i++) {
      const card = eligible[rng.nextInt(0, eligible.length - 1)];
      if (used.has(card.id)) {
        i--;
        continue;
      }
      used.add(card.id);
      items.push({
        type: 'card',
        cost: priceForRarity(card.rarity),
        data: card,
      });
    }
    return {
      cards: items,
      removeCardCost: REMOVE_CARD_COST,
    };
  }

  /**
   * Returns true if the player has enough gold to buy this item.
   */
  static canAfford(player: PlayerState, item: ShopItem): boolean {
    return player.gold >= item.cost;
  }

  /**
   * Apply purchase: deduct gold and add card to deck.
   * Returns updated player state.
   */
  static purchase(player: PlayerState, item: ShopItem): PlayerState {
    if (!Shop.canAfford(player, item)) {
      throw new Error('Insufficient gold');
    }
    if (item.type !== 'card') {
      // relic/potion not implemented yet
      return {
        ...player,
        gold: player.gold - item.cost,
      };
    }
    const card = item.data as Card;
    return {
      ...player,
      gold: player.gold - item.cost,
      drawPile: [...player.drawPile, card.id],
    };
  }

  /**
   * Remove a card from deck for the removeCardCost.
   * Returns updated player state.
   */
  static removeCard(player: PlayerState, cardId: string): PlayerState {
    if (player.gold < REMOVE_CARD_COST) {
      throw new Error('Insufficient gold');
    }
    return {
      ...player,
      gold: player.gold - REMOVE_CARD_COST,
      drawPile: player.drawPile.filter((id) => id !== cardId),
      discardPile: player.discardPile.filter((id) => id !== cardId),
      exhaustPile: player.exhaustPile.filter((id) => id !== cardId),
      hand: player.hand.filter((id) => id !== cardId),
    };
  }
}

function priceForRarity(rarity: CardRarity): number {
  switch (rarity) {
    case 'common': return 50;
    case 'rare': return 100;
    case 'legendary': return 200;
  }
}

const REMOVE_CARD_COST = 75;