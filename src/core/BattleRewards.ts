// src/core/BattleRewards.ts

import type { PlayerState, CardRarity } from './types';
import type { Card } from './types';
import { listAllCards } from '../data/cards';
import type { SeededRandom } from '../utils/rng';

export interface BattleReward {
  cardChoices: Card[];        // 3 cards offered
}

export class BattleRewards {
  /**
   * Generate 3 random card choices for battle victory.
   * - 1 random rarity weighted (50% common, 35% rare, 15% legendary)
   * - Excludes cards already owned 5+ times in deck (avoid flooding)
   * - Each card chosen from the player's character pool (or neutral)
   */
  static generate(
    player: PlayerState,
    rng: SeededRandom,
    count: number = 3
  ): Card[] {
    const allCards = listAllCards();
    const characterCards = allCards.filter(
      (c) => c.characterId === player.characterId || !c.characterId
    );
    const owned = countOwned(player);
    const eligible = characterCards.filter((c) => (owned.get(c.id) ?? 0) < 5);
    if (eligible.length === 0) return [];

    const choices: Card[] = [];
    const used = new Set<string>();
    for (let i = 0; i < count && used.size < eligible.length; i++) {
      const rarity = pickRarity(rng);
      const pool = eligible.filter((c) => c.rarity === rarity && !used.has(c.id));
      const fallback = eligible.filter((c) => !used.has(c.id));
      const pickFrom = pool.length > 0 ? pool : fallback;
      if (pickFrom.length === 0) break;
      const picked = pickFrom[rng.nextInt(0, pickFrom.length - 1)];
      used.add(picked.id);
      choices.push(picked);
    }
    return choices;
  }

  /**
   * Apply the player's choice: add the selected card to their deck.
   * Returns the updated player.
   */
  static takeCard(player: PlayerState, card: Card): PlayerState {
    return {
      ...player,
      drawPile: [...player.drawPile, card.id],
    };
  }

  /**
   * Returns true if the player can skip rewards (don't take a card).
   * Always returns true.
   */
  static canSkip(): boolean {
    return true;
  }
}

function pickRarity(rng: SeededRandom): CardRarity {
  const r = rng.next();
  if (r < 0.50) return 'common';
  if (r < 0.85) return 'rare';
  return 'legendary';
}

function countOwned(player: PlayerState): Map<string, number> {
  const map = new Map<string, number>();
  const all = [...player.drawPile, ...player.discardPile, ...player.hand, ...player.exhaustPile];
  for (const id of all) {
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}