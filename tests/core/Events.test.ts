import { describe, it, expect, beforeEach } from 'vitest';
import { Events } from '../../src/core/Events';
import type { PlayerState } from '../../src/core/types';
import { createRng } from '../../src/utils/rng';

function makePlayer(): PlayerState {
  return {
    characterId: 'sword',
    hp: 50, maxHp: 50,
    energy: 3, maxEnergy: 3,
    qi: 0, maxQi: 5,
    block: 0, gold: 100,
    hand: [], drawPile: ['sword_strike'], discardPile: [], exhaustPile: [],
    buffs: [],
  } as any;
}

describe('Events', () => {
  describe('registry', () => {
    it('loads events from JSON', () => {
      expect(Events.listAll().length).toBeGreaterThan(0);
    });

    it('has unique IDs', () => {
      const events = Events.listAll();
      const ids = events.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every event has title, text, choices', () => {
      for (const event of Events.listAll()) {
        expect(event.title).toBeTruthy();
        expect(event.text).toBeTruthy();
        expect(event.choices.length).toBeGreaterThan(0);
      }
    });

    it('every choice has text and effect', () => {
      for (const event of Events.listAll()) {
        for (const choice of event.choices) {
          expect(choice.text).toBeTruthy();
          expect(choice.effect).toBeDefined();
        }
      }
    });
  });

  describe('get', () => {
    it('returns event by id', () => {
      const e = Events.get('old_sage');
      expect(e?.title).toBe('山中老者');
    });

    it('returns undefined for unknown id', () => {
      expect(Events.get('unknown')).toBeUndefined();
    });
  });

  describe('randomEvent', () => {
    it('returns a valid event', () => {
      const rng = createRng('test');
      const event = Events.randomEvent(rng);
      expect(event).toBeDefined();
      expect(event.id).toBeTruthy();
    });
  });

  describe('applyEffect', () => {
    let player: PlayerState;
    beforeEach(() => { player = makePlayer(); });

    it('gain_gold adds gold', () => {
      const updated = Events.applyEffect(player, { type: 'gain_gold', amount: 30 });
      expect(updated.gold).toBe(130);
    });

    it('lose_gold subtracts gold (clamped at 0)', () => {
      const p = { ...player, gold: 10 };
      const updated = Events.applyEffect(p, { type: 'lose_gold', amount: 50 });
      expect(updated.gold).toBe(0);
    });

    it('gain_hp heals (clamped at maxHp)', () => {
      const p = { ...player, hp: 40, maxHp: 50 };
      const updated = Events.applyEffect(p, { type: 'gain_hp', amount: 20 });
      expect(updated.hp).toBe(50);
    });

    it('lose_hp subtracts (clamped at 0)', () => {
      const p = { ...player, hp: 5 };
      const updated = Events.applyEffect(p, { type: 'lose_hp', amount: 20 });
      expect(updated.hp).toBe(0);
    });

    it('gain_max_hp increases both maxHp and current hp', () => {
      const updated = Events.applyEffect(player, { type: 'gain_max_hp', amount: 5 });
      expect(updated.maxHp).toBe(55);
      expect(updated.hp).toBe(55);
    });

    it('gain_qi adds qi (clamped at maxQi)', () => {
      const p = { ...player, qi: 4 };
      const updated = Events.applyEffect(p, { type: 'gain_qi', amount: 3 });
      expect(updated.qi).toBe(5);
    });

    it('add_card_to_deck adds card', () => {
      const updated = Events.applyEffect(player, { type: 'add_card_to_deck', cardId: 'sword_defend' });
      expect(updated.drawPile).toContain('sword_defend');
    });

    it('remove_random_card removes first card from drawPile', () => {
      const updated = Events.applyEffect(player, { type: 'remove_random_card' });
      expect(updated.drawPile.length).toBe(0);
    });

    it('does not mutate original player', () => {
      Events.applyEffect(player, { type: 'gain_gold', amount: 30 });
      expect(player.gold).toBe(100);
    });
  });
});