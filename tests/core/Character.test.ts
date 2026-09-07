import { describe, it, expect } from 'vitest';
import { Character } from '../../src/core/Character';
import swordData from '../../src/data/characters/sword.json';

describe('Character', () => {
  it('exposes id, name, maxHp from data', () => {
    const c = new Character(swordData as any);
    expect(c.id).toBe('sword');
    expect(c.name).toBe('凌霄');
    expect(c.maxHp).toBe(75);
  });

  it('returns starting deck as copy', () => {
    const c = new Character(swordData as any);
    const deck = c.getStartingDeck();
    expect(deck).toHaveLength(10);
    deck.push('hacked');
    expect(c.getStartingDeck()).toHaveLength(10); // not mutated
  });

  it('builds PlayerState with correct defaults', () => {
    const c = new Character(swordData as any);
    const p = c.toPlayerState();
    expect(p.characterId).toBe('sword');
    expect(p.hp).toBe(75);
    expect(p.maxHp).toBe(75);
    expect(p.energy).toBe(3);
    expect(p.qi).toBe(0);
    expect(p.maxQi).toBe(5);
    expect(p.gold).toBe(99);
    expect(p.drawPile).toHaveLength(10);
  });

  it('validates starting deck against registry', () => {
    const c = new Character(swordData as any);
    const result = c.validateStartingDeck((id) => (id.startsWith('sword_') ? {} : undefined));
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('reports missing card IDs during validation', () => {
    const badData = { ...swordData, startingDeck: ['sword_strike', 'nonexistent_card'] };
    const c = new Character(badData as any);
    const result = c.validateStartingDeck((id) => (id.startsWith('sword_') ? {} : undefined));
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('nonexistent_card');
  });
});