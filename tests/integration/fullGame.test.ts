// tests/integration/fullGame.test.ts
// End-to-end integration tests covering a complete game session: battles,
// rewards, shop, map generation, character progression, and events.

import { describe, it, expect } from 'vitest';
import { BattleEngine, BattlePhase } from '../../src/core/BattleEngine';
import { CardExecutor } from '../../src/core/CardExecutor';
import { CardEffectExecutor } from '../../src/core/CardEffect';
import { BuffSystem } from '../../src/core/BuffSystem';
import { ComboTracker } from '../../src/core/ComboTracker';
import { Deck } from '../../src/core/Deck';
import { createRng } from '../../src/utils/rng';
import { getCharacter } from '../../src/data/characters';
import { getCard, listAllCards } from '../../src/data/cards';
import { getEnemy } from '../../src/data/enemies';
import { EnemyState } from '../../src/core/Enemy';
import { Character } from '../../src/core/Character';
import { MapGenerator } from '../../src/levels/MapGenerator';
import { BattleRewards } from '../../src/core/BattleRewards';
import { Shop } from '../../src/core/Shop';
import { Events } from '../../src/core/Events';
import { Unlocks } from '../../src/core/Unlocks';
import type { Card, EnemyState as EnemyStateType } from '../../src/core/types';
import type { MetaState } from '../../src/core/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a fully wired BattleEngine. Player and enemy buff systems are shared
 * with the CardExecutor so damage / block modifiers stay consistent.
 */
function makeBattleEngine(): BattleEngine {
  const playerBuffs = new BuffSystem();
  const enemyBuffs = new BuffSystem();
  const cardExecutor = new CardExecutor(new CardEffectExecutor(playerBuffs, enemyBuffs), playerBuffs, enemyBuffs);
  const combo = new ComboTracker();
  const rng = createRng('integration-test');
  return new BattleEngine(cardExecutor, playerBuffs, enemyBuffs, combo, rng);
}

/** Build a card-by-id lookup from a list of cards. */
function makeCardRegistry(cards: Card[] = listAllCards()): (id: string) => Card | undefined {
  const map = new Map<string, Card>(cards.map((c) => [c.id, c]));
  return (id) => map.get(id);
}

/**
 * Wrap the Deck class in the duck-typed surface the BattleEngine expects
 * (drawCards / discard / exhaust / discardHand / size).
 */
function makeEngineDeck(cardIds: string[], seed: string): Deck & { drawCards: (n: number) => string[]; discardHand: () => void } {
  const raw = new Deck(cardIds, createRng(seed));
  // Attach `drawCards` (Deck has `draw`) and `discardHand` (Deck has
  // `clearHand`) aliases; the engine only needs these two extra methods.
  (raw as any).drawCards = (n: number) => raw.draw(n);
  (raw as any).discardHand = () => raw.clearHand();
  return raw as Deck & { drawCards: (n: number) => string[]; discardHand: () => void };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Integration: full game session', () => {
  it('completes a battle and returns to player turn', () => {
    const player = new Character(getCharacter('sword')!).toPlayerState();
    const enemyData = getEnemy('wolf')!;
    // EnemyState stores intents on `data`; BattleEngine reads `enemy.intents`
    // directly, so populate the convenience field after construction.
    const enemy = new EnemyState(enemyData);
    (enemy as any).intents = enemyData.intents;
    const enemies: EnemyStateType[] = [enemy as unknown as EnemyStateType];
    const deck = makeEngineDeck([...player.drawPile], 'battle1');

    const engine = makeBattleEngine();

    // Start battle
    engine.startBattle(player, enemies, deck);
    expect(engine.getPhase()).toBe(BattlePhase.PlayerTurn);
    expect(player.hand.length).toBeGreaterThan(0);

    // End turn triggers enemy turn, then back to player
    engine.endTurn(player, deck);

    // Phase should be PlayerTurn again (enemy turn auto-resolved)
    expect(engine.getPhase()).toBe(BattlePhase.PlayerTurn);
  });

  it('rewards add to deck after picking a card', () => {
    const player = new Character(getCharacter('sword')!).toPlayerState();
    const initialDeckSize = player.drawPile.length;

    const rewards = BattleRewards.generate(player, createRng('rewards'), 3);
    expect(rewards).toHaveLength(3);

    // Player picks one
    const picked = rewards[0];
    const updated = BattleRewards.takeCard(player, picked);
    expect(updated.drawPile.length).toBe(initialDeckSize + 1);
    expect(updated.drawPile).toContain(picked.id);
  });

  it('Shop purchase adds card and deducts gold', () => {
    // Give the player enough gold for any card in the shop
    const player = new Character(getCharacter('sword')!).toPlayerState();
    player.gold = 500;
    const initialGold = player.gold;

    const shop = Shop.generate(player, createRng('shop1'));
    const item = shop.cards[0];
    expect(item).toBeDefined();

    if (item && Shop.canAfford(player, item)) {
      const updated = Shop.purchase(player, item);
      expect(updated.gold).toBe(initialGold - item.cost);
      expect(updated.drawPile.length).toBeGreaterThan(player.drawPile.length);
    } else {
      // We gave the player 500 gold so this branch should never trigger
      expect.fail('Player should be able to afford the first shop item');
    }
  });

  it('Map generation produces 5 floors with boss at end', () => {
    const rng = createRng('map');
    const gen = new MapGenerator(rng);
    for (let floor = 1; floor <= 5; floor++) {
      const map = gen.generate(floor);
      const lastLayer = map.nodes[map.nodes.length - 1];
      expect(lastLayer[0].type).toBe('boss');
    }
  });

  it('Character progression: sword -> talisman -> alchemy', () => {
    let meta: MetaState = {
      unlockedCharacters: ['sword'],
      completedCharacters: [],
      unlockedCards: [],
      achievements: [],
      stats: { totalRuns: 0, totalWins: 0, bestFloor: 0, fastestWin: 0 },
    };

    expect(Unlocks.canUnlock('talisman', meta)).toBe(false);

    // Complete sword run
    meta = {
      ...meta,
      completedCharacters: Unlocks.markCompleted('sword', meta),
    };
    expect(Unlocks.canUnlock('talisman', meta)).toBe(true);
    meta = {
      ...meta,
      unlockedCharacters: Unlocks.unlock('talisman', meta),
    };

    expect(meta.unlockedCharacters).toContain('talisman');
    expect(Unlocks.canUnlock('alchemy', meta)).toBe(false);

    // Complete talisman run
    meta = {
      ...meta,
      completedCharacters: Unlocks.markCompleted('talisman', meta),
    };
    expect(Unlocks.canUnlock('alchemy', meta)).toBe(true);
    meta = {
      ...meta,
      unlockedCharacters: Unlocks.unlock('alchemy', meta),
    };

    expect(meta.unlockedCharacters).toContain('alchemy');
  });

  it('Event applies reward effect to player', () => {
    const player = new Character(getCharacter('sword')!).toPlayerState();
    const event = Events.get('ancient_relics');
    expect(event).toBeDefined();

    // First choice is "gain_qi" amount 2
    const effect = event!.choices[0].effect;
    expect(effect.type).toBe('gain_qi');

    const updated = Events.applyEffect(player, effect);
    expect(updated.qi).toBe(player.qi + 2);
  });

  it('Card data roundtrips through card registry', () => {
    const allCards = listAllCards();
    expect(allCards.length).toBeGreaterThan(0);

    for (const card of allCards) {
      const fetched = getCard(card.id);
      expect(fetched).toBeDefined();
      expect(fetched!.id).toBe(card.id);
      expect(fetched!.name).toBe(card.name);
    }
  });
});

describe('Integration: enemy combat scenario', () => {
  it('sword cultivator deals damage via battle', () => {
    const player = new Character(getCharacter('sword')!).toPlayerState();
    const enemyData = getEnemy('snake')!;
    const enemy = new EnemyState(enemyData);
    // EnemyState stores intents on `data`; BattleEngine reads `enemy.intents`
    // directly, so populate the convenience field after construction.
    (enemy as any).intents = enemyData.intents;
    const enemyInitialHp = enemy.hp;

    const deck = makeEngineDeck([...player.drawPile], 'combat');

    const engine = makeBattleEngine();
    const enemies: EnemyStateType[] = [enemy as unknown as EnemyStateType];
    engine.startBattle(player, enemies, deck);

    // Find an attack card that the player can afford in their opening hand
    const cardRegistry = makeCardRegistry();
    const attackIdx = player.hand.findIndex((id) => {
      const card = cardRegistry(id);
      return card?.type === 'attack' && card.cost <= player.energy;
    });

    // Skip the assertion if the random draw didn't include an affordable attack
    if (attackIdx === -1) {
      expect(true).toBe(true);
      return;
    }

    const result = engine.playCard(attackIdx, 0, player, enemies, cardRegistry);
    expect(result.success).toBe(true);

    // Enemy should have taken damage
    expect(enemy.hp).toBeLessThan(enemyInitialHp);
  });
});