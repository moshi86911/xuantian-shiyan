import { describe, it, expect } from 'vitest';
import { getCharacter, listAllCharacters } from '../../src/data/characters';
import { listAllCards } from '../../src/data/cards';

describe('Character Data', () => {
  it('loads 3 characters', () => {
    expect(listAllCharacters()).toHaveLength(3);
  });

  it('sword has 10-card starting deck', () => {
    const c = getCharacter('sword');
    expect(c?.startingDeck).toHaveLength(10);
  });

  it('talisman has 10-card starting deck', () => {
    const c = getCharacter('talisman');
    expect(c?.startingDeck).toHaveLength(10);
  });

  it('alchemy has 10-card starting deck', () => {
    const c = getCharacter('alchemy');
    expect(c?.startingDeck).toHaveLength(10);
  });

  it('all starting deck cards exist in card registry', () => {
    const allCardIds = new Set(listAllCards().map((c) => c.id));
    for (const char of listAllCharacters()) {
      for (const cardId of char.startingDeck) {
        expect(allCardIds.has(cardId), `${char.id} references unknown card ${cardId}`).toBe(true);
      }
    }
  });
});