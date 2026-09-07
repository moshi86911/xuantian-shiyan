// src/core/Events.ts

import type { PlayerState } from './types';
import eventsData from '../data/events.json';

export type EventEffect =
  | { type: 'gain_gold'; amount: number }
  | { type: 'lose_gold'; amount: number }
  | { type: 'gain_hp'; amount: number }
  | { type: 'lose_hp'; amount: number }
  | { type: 'upgrade_random_card' }
  | { type: 'gain_max_hp'; amount: number }
  | { type: 'gain_qi'; amount: number }
  | { type: 'add_card_to_deck'; cardId: string }
  | { type: 'remove_random_card' }
  | { type: 'noop' };

export interface EventChoice {
  text: string;
  effect: EventEffect;
}

export interface GameEvent {
  id: string;
  title: string;
  text: string;
  choices: EventChoice[];
}

export class Events {
  private static registry: Map<string, GameEvent> = new Map();

  static {
    for (const event of eventsData as GameEvent[]) {
      Events.registry.set(event.id, event);
    }
  }

  /** Get event by id. */
  static get(id: string): GameEvent | undefined {
    return Events.registry.get(id);
  }

  /** Pick a random event from the registry. */
  static randomEvent(rng: { nextInt: (a: number, b: number) => number }): GameEvent {
    const events = Array.from(Events.registry.values());
    return events[rng.nextInt(0, events.length - 1)];
  }

  /** List all events. */
  static listAll(): GameEvent[] {
    return Array.from(Events.registry.values());
  }

  /**
   * Apply an event effect to a player.
   * Returns updated player.
   */
  static applyEffect(player: PlayerState, effect: EventEffect): PlayerState {
    switch (effect.type) {
      case 'gain_gold':
        return { ...player, gold: player.gold + effect.amount };
      case 'lose_gold':
        return { ...player, gold: Math.max(0, player.gold - effect.amount) };
      case 'gain_hp':
        return { ...player, hp: Math.min(player.maxHp, player.hp + effect.amount) };
      case 'lose_hp':
        return { ...player, hp: Math.max(0, player.hp - effect.amount) };
      case 'gain_max_hp':
        return {
          ...player,
          maxHp: player.maxHp + effect.amount,
          hp: player.hp + effect.amount,
        };
      case 'gain_qi':
        return { ...player, qi: Math.min(player.maxQi, player.qi + effect.amount) };
      case 'upgrade_random_card':
        // Upgrade = not implemented (no upgrade() on cards yet)
        return player;
      case 'add_card_to_deck':
        return {
          ...player,
          drawPile: [...player.drawPile, effect.cardId],
        };
      case 'remove_random_card':
        // Take first card in draw pile (placeholder for "random")
        if (player.drawPile.length === 0) return player;
        return {
          ...player,
          drawPile: player.drawPile.slice(1),
        };
      case 'noop':
        return player;
    }
  }
}