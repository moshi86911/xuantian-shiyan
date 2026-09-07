import { describe, it, expect, beforeEach } from 'vitest';
import { Deck } from '../../src/core/Deck';
import { createRng } from '../../src/utils/rng';

describe('Deck (with hand pile)', () => {
  let deck: Deck;

  beforeEach(() => {
    deck = new Deck(['a', 'b', 'c', 'd', 'e'], createRng('test'));
  });

  it('initializes with card ids', () => {
    expect(deck.size).toBe(5);
    expect(deck.hand).toHaveLength(0);
  });

  it('draws cards into hand', () => {
    const drawn = deck.draw(3);
    expect(drawn).toHaveLength(3);
    expect(deck.hand).toHaveLength(3);
    expect(deck.size).toBe(5); // cards now in hand
  });

  it('draws all cards then stops when empty', () => {
    const drawn = deck.draw(10);
    expect(drawn).toHaveLength(5);
  });

  it('reshuffles discard into draw when draw pile empty', () => {
    deck.draw(5); // empty draw, all in hand
    deck.clearHand(); // back to discard
    deck.draw(2); // draws from reshuffled draw pile
    expect(deck.hand).toHaveLength(2);
  });

  it('addCard increases deck size', () => {
    deck.addCard('f');
    expect(deck.size).toBe(6);
  });

  it('addCard to hand makes card immediately playable', () => {
    deck.addCard('z', 'hand');
    expect(deck.hand).toContain('z');
  });

  it('exhaust removes card from hand to exhaust pile', () => {
    deck.draw(3);
    deck.exhaust('a'); // or any card in hand
    expect(deck.exhaustPile).toContain('a');
  });

  it('size counts draw + discard + hand + exhaust piles', () => {
    deck.draw(2); // 2 in hand
    deck.addCard('x', 'discard'); // 1 in discard
    deck.addCard('y', 'draw'); // 1 in draw
    // 4 in draw + 1 in discard + 2 in hand + 0 in exhaust = 7
    expect(deck.size).toBe(7);
  });

  it('discard moves from hand to discard', () => {
    deck.draw(3);
    const card = deck.hand[0];
    deck.discard(card);
    expect(deck.hand).not.toContain(card);
    expect(deck.discardPile).toContain(card);
  });

  it('draw 0 returns empty array', () => {
    expect(deck.draw(0)).toEqual([]);
  });
});