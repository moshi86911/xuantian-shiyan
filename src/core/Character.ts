// src/core/Character.ts

import type { PlayerState } from './types';

export type CharacterId = 'sword' | 'talisman' | 'alchemy';

export interface CharacterMechanic {
  name: string;
  description: string;
}

export interface CharacterData {
  id: CharacterId;
  name: string;
  title: string;
  description: string;
  maxHp: number;
  startingDeck: string[]; // Card ids, must exist in card registry
  startingRelics: string[]; // Reserved for future relic system
  mechanic: CharacterMechanic;
  art: string; // SVG filename placeholder
}

/**
 * Character wraps static data with helper methods.
 *
 * The runtime class is intentionally thin: most gameplay logic that needs
 * to mutate player state lives in `BattleEngine`. The Character object is
 * just a convenient handle for "how do I bootstrap a fresh run with this
 * cultivator?".
 */
export class Character {
  data: CharacterData;

  constructor(data: CharacterData) {
    this.data = data;
  }

  get id(): CharacterId {
    return this.data.id;
  }

  get name(): string {
    return this.data.name;
  }

  get maxHp(): number {
    return this.data.maxHp;
  }

  /** Return a copy of the starting deck so callers can't mutate the source. */
  getStartingDeck(): string[] {
    return [...this.data.startingDeck];
  }

  /**
   * Build a fresh PlayerState for this character. Used at run start.
   * Pulls startingDeck into drawPile; the deck field is also kept for
   * systems that track the master deck list across battles.
   */
  toPlayerState(): PlayerState {
    return {
      characterId: this.data.id,
      hp: this.data.maxHp,
      maxHp: this.data.maxHp,
      energy: 3,
      maxEnergy: 3,
      qi: 0,
      maxQi: 5,
      block: 0,
      gold: 99,
      hand: [],
      deck: [...this.data.startingDeck],
      drawPile: [...this.data.startingDeck],
      discardPile: [],
      exhaustPile: [],
      buffs: [],
    };
  }

  /**
   * Validate that every card id in the starting deck resolves through the
   * supplied registry lookup. Returns the list of missing ids so a future
   * editor / dev-tool can surface a friendly error.
   */
  validateStartingDeck(cardRegistry: (id: string) => unknown): {
    valid: boolean;
    missing: string[];
  } {
    const missing: string[] = [];
    for (const id of this.data.startingDeck) {
      if (!cardRegistry(id)) missing.push(id);
    }
    return { valid: missing.length === 0, missing };
  }
}