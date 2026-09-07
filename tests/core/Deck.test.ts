import { describe, it, expect, beforeEach } from 'vitest';
import { Deck } from '../../src/core/Deck';
import { createRng } from '../../src/utils/rng';

describe('Deck', () => {
  let deck: Deck;

  beforeEach(() => {
    deck = new Deck(['a', 'b', 'c', 'd', 'e'], createRng('test'));
  });

  it('initializes with card ids', () => {
    expect(deck.size).toBe(5);
  });

  it('draws cards from draw pile', () => {
    const drawn = deck.draw(3);
    expect(drawn).toHaveLength(3);
    expect(deck.size).toBe(5);  // total deck size unchanged
  });

  it('draws all cards then stops when empty', () => {
    const drawn = deck.draw(10);
    expect(drawn).toHaveLength(5);  // only 5 available
  });

  it('reshuffles discard into draw when draw pile empty', () => {
    deck.draw(5);  // empty the draw pile
    deck.discard('a');
    deck.discard('b');
    deck.discard('c');
    const drawn = deck.draw(3);
    expect(drawn).toHaveLength(3);
  });

  it('addCard increases deck size', () => {
    deck.addCard('f');
    expect(deck.size).toBe(6);
  });

  it('addCard to draw pile makes card immediately drawable', () => {
    deck.draw(5);
    deck.addCard('z', 'draw');
    const drawn = deck.draw(1);
    expect(drawn).toContain('z');
  });

  it('exhaust removes card from deck', () => {
    deck.exhaust('a');
    expect(deck.size).toBe(4);
  });

  it('size counts draw + discard + exhaust piles', () => {
    deck.draw(2);
    deck.discard('x');
    deck.exhaust('y');
    expect(deck.size).toBe(5);  // 3 in draw + 1 in discard + 1 in exhaust
  });

  it('draw 0 returns empty array', () => {
    expect(deck.draw(0)).toEqual([]);
  });
});