// src/data/cards/loader.ts

import swordData from './sword.json';
import talismanData from './talisman.json';
import alchemyData from './alchemy.json';
import neutralData from './neutral.json';
import type { Card, CharacterId } from '../../core/types';

/**
 * Static registry of all card definitions keyed by id.
 * Character cards carry a `characterId`; neutral cards omit it and are
 * available to every character.
 */
const allCards: Record<string, Card> = Object.fromEntries(
  ([...swordData, ...talismanData, ...alchemyData, ...neutralData] as unknown as Card[]).map((c) => [
    c.id,
    c
  ])
);

/** Look up a single card by id. Returns undefined when not found. */
export function getCard(id: string): Card | undefined {
  return allCards[id];
}

/** All cards belonging to one character (excludes neutral cards). */
export function listCardsByCharacter(characterId: CharacterId): Card[] {
  return Object.values(allCards).filter((c) => c.characterId === characterId);
}

/** Cards with no character restriction, usable by any character. */
export function listNeutralCards(): Card[] {
  return Object.values(allCards).filter((c) => !c.characterId);
}

/** Every card in the registry. */
export function listAllCards(): Card[] {
  return Object.values(allCards);
}
