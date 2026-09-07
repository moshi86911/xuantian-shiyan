import { describe, it, expect, beforeEach } from 'vitest';
import { BattleEngine, BattlePhase } from '../../src/core/BattleEngine';
import { CardExecutor } from '../../src/core/CardExecutor';
import { CardEffectExecutor } from '../../src/core/CardEffect';
import { BuffSystem } from '../../src/core/BuffSystem';
import { ComboTracker } from '../../src/core/ComboTracker';
import { Deck } from '../../src/core/Deck';
import { createRng } from '../../src/utils/rng';
import type { PlayerState, EnemyState, Card, EnemyIntent } from '../../src/core/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer(): PlayerState {
  return {
    characterId: 'sword',
    hp: 50, maxHp: 50, block: 0,
    energy: 0, maxEnergy: 3,
    qi: 0, maxQi: 5,
    gold: 0, deck: [],
    drawPile: [], discardPile: [], hand: [], exhaustPile: [],
    buffs: [],
  };
}

function makeEnemy(
  id = 'e1',
  hp = 30,
  intents: EnemyIntent[] = [],
): EnemyState {
  return {
    id, name: 'enemy',
    hp, maxHp: hp, block: 0,
    intents, currentIntentIndex: 0,
    buffs: [], tier: 'normal', data: {},
  };
}

function makeCard(partial: Partial<Card>): Card {
  return {
    id: 'unknown',
    name: 'Unknown',
    description: '',
    type: 'skill',
    rarity: 'common',
    cost: 0,
    targetType: 'none',
    effects: [],
    ...partial,
  };
}

/**
 * Adapter exposing the duck-typed deck surface BattleEngine expects:
 *   { drawCards, discard, exhaust, discardHand, size }
 * Wraps the real Deck class so tests use the real draw / reshuffle logic.
 */
interface EngineDeck {
  drawCards: (n: number) => string[];
  discard: (id: string) => void;
  exhaust: (id: string) => void;
  discardHand: () => void;
  size: number;
}

function makeEngineDeck(cardIds: string[], seed: string): { deck: EngineDeck; raw: Deck } {
  const raw = new Deck(cardIds, createRng(seed));
  const adapter: EngineDeck = {
    drawCards: (n) => raw.draw(n),
    discard: (id) => raw.discard(id),
    exhaust: (id) => raw.exhaust(id),
    discardHand: () => raw.clearHand(),
    get size() { return raw.size; },
  };
  return { deck: adapter, raw };
}

function makeCardRegistry(cards: Card[]): (id: string) => Card | undefined {
  const map = new Map<string, Card>(cards.map(c => [c.id, c]));
  return (id) => map.get(id);
}

function buildEngine(): {
  engine: BattleEngine;
  cardExecutor: CardExecutor;
  playerBuffs: BuffSystem;
  enemyBuffs: BuffSystem;
  combo: ComboTracker;
} {
  const playerBuffs = new BuffSystem();
  const enemyBuffs = new BuffSystem();
  const cardExecutor = new CardExecutor(new CardEffectExecutor(playerBuffs, enemyBuffs), playerBuffs, enemyBuffs);
  const combo = new ComboTracker();
  const rng = createRng('battle-test');
  const engine = new BattleEngine(cardExecutor, playerBuffs, enemyBuffs, combo, rng);
  return { engine, cardExecutor, playerBuffs, enemyBuffs, combo };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BattleEngine', () => {
  it('starts in NotStarted phase', () => {
    const { engine } = buildEngine();
    expect(engine.getPhase()).toBe(BattlePhase.NotStarted);
  });

  // -------------------------------------------------------------------------
  describe('startBattle', () => {
    it('sets phase to PlayerTurn, turn to 1, draws 5 from deck', () => {
      const { engine } = buildEngine();
      const player = makePlayer();
      const enemies = [makeEnemy()];
      const { deck } = makeEngineDeck(['c1','c2','c3','c4','c5','c6','c7'], 'start');

      engine.startBattle(player, enemies, deck);

      expect(engine.getPhase()).toBe(BattlePhase.PlayerTurn);
      expect(engine.getTurn()).toBe(1);
      expect(player.hand).toHaveLength(5);
    });

    it('refills player energy to max', () => {
      const { engine } = buildEngine();
      const player = makePlayer();
      player.energy = 0;
      const { deck } = makeEngineDeck(['c1','c2','c3','c4','c5','c6','c7'], 'start');
      engine.startBattle(player, [makeEnemy()], deck);
      expect(player.energy).toBe(player.maxEnergy);
    });

    it('resets qi to 0', () => {
      const { engine } = buildEngine();
      const player = makePlayer();
      player.qi = 3;
      const { deck } = makeEngineDeck(['c1','c2','c3','c4','c5','c6','c7'], 'start');
      engine.startBattle(player, [makeEnemy()], deck);
      expect(player.qi).toBe(0);
    });

    it('clears player and enemy buffs', () => {
      const { engine, playerBuffs, enemyBuffs } = buildEngine();
      playerBuffs.apply({ type: 'strength', stacks: 5, source: 'player' });
      enemyBuffs.apply({ type: 'vulnerable', stacks: 2, source: 'enemy' });
      const player = makePlayer();
      const { deck } = makeEngineDeck(['c1','c2','c3','c4','c5','c6','c7'], 'start');

      engine.startBattle(player, [makeEnemy()], deck);

      expect(playerBuffs.all()).toHaveLength(0);
      expect(enemyBuffs.all()).toHaveLength(0);
    });

    it('clears combo tracker', () => {
      const { engine, combo } = buildEngine();
      combo.addCombo(7);
      const player = makePlayer();
      const { deck } = makeEngineDeck(['c1','c2','c3','c4','c5','c6','c7'], 'start');

      engine.startBattle(player, [makeEnemy()], deck);

      expect(combo.getState().count).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  describe('startTurn', () => {
    let player: PlayerState;
    let engine: BattleEngine;
    let deck: EngineDeck;
    let playerBuffs: BuffSystem;
    let enemyBuffs: BuffSystem;

    beforeEach(() => {
      const built = buildEngine();
      engine = built.engine;
      playerBuffs = built.playerBuffs;
      enemyBuffs = built.enemyBuffs;
      player = makePlayer();
      const builtDeck = makeEngineDeck(
        ['c1','c2','c3','c4','c5','c6','c7','c8','c9','c10'],
        'turn'
      );
      deck = builtDeck.deck;
      engine.startBattle(player, [makeEnemy()], deck);
    });

    it('increments turn counter', () => {
      engine.startTurn(player, deck);
      expect(engine.getTurn()).toBe(2);
      engine.startTurn(player, deck);
      expect(engine.getTurn()).toBe(3);
    });

    it('refills energy', () => {
      player.energy = 0;
      engine.startTurn(player, deck);
      expect(player.energy).toBe(player.maxEnergy);
    });

    it('adds 1 qi (打坐)', () => {
      player.qi = 0;
      engine.startTurn(player, deck);
      expect(player.qi).toBe(1);
    });

    it('caps qi at maxQi', () => {
      player.qi = player.maxQi;
      engine.startTurn(player, deck);
      expect(player.qi).toBe(player.maxQi);
    });

    it('draws 5 cards after discarding hand', () => {
      // Hand was already populated by startBattle (5 cards).
      engine.startTurn(player, deck);
      expect(player.hand).toHaveLength(5);
    });

    it('ticks player and enemy buff durations', () => {
      playerBuffs.apply({ type: 'strength', stacks: 1, source: 'player', duration: 1 });
      enemyBuffs.apply({ type: 'vulnerable', stacks: 1, source: 'player', duration: 1 });
      engine.startTurn(player, deck);
      expect(playerBuffs.all().some(b => b.type === 'strength')).toBe(false);
      expect(enemyBuffs.all().some(b => b.type === 'vulnerable')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe('playCard', () => {
    let player: PlayerState;
    let enemies: EnemyState[];
    let engine: BattleEngine;
    let deck: EngineDeck;
    let combo: ComboTracker;

    // Registry covering the five hand slots we use in tests.
    const registryCards: Card[] = [
      makeCard({ id: 'strike',  name: 'Strike',  type: 'attack', cost: 1, targetType: 'enemy',         effects: [{ type: 'damage', value: 6 }] }),
      makeCard({ id: 'defend',  name: 'Defend',  type: 'skill',  cost: 1, targetType: 'self',          effects: [{ type: 'block',  value: 5 }] }),
      makeCard({ id: 'heal',    name: 'Heal',    type: 'skill',  cost: 1, targetType: 'self',          effects: [{ type: 'heal',   value: 5 }] }),
      makeCard({ id: 'bash',    name: 'Bash',    type: 'attack', cost: 2, targetType: 'enemy', exhaust: true,
                 effects: [{ type: 'damage', value: 8 }] }),
      makeCard({ id: 'cleave',  name: 'Cleave',  type: 'attack', cost: 1, targetType: 'all_enemies',  effects: [{ type: 'damage', value: 4 }] }),
    ];
    const cardById = makeCardRegistry(registryCards);

    beforeEach(() => {
      const built = buildEngine();
      engine = built.engine;
      combo = built.combo;
      player = makePlayer();
      enemies = [makeEnemy('e1', 30)];
      const builtDeck = makeEngineDeck(
        ['strike','defend','heal','bash','cleave','extra'],
        'pc'
      );
      deck = builtDeck.deck;
      engine.startBattle(player, enemies, deck);
    });

    it('plays a valid card: deducts resources, applies effects, returns success', () => {
      // Force a known hand so hand[0] is always the 'strike' card.
      player.hand = ['strike', 'defend', 'heal', 'bash', 'cleave'];

      const result = engine.playCard(0, 0, player, enemies, cardById);

      expect(result.success).toBe(true);
      expect(player.energy).toBe(2);          // 3 - 1
      expect(enemies[0].hp).toBe(24);         // 30 - 6
      expect(player.hand).toHaveLength(4);   // 5 - 1
    });

    it('returns failure when card cannot be played (insufficient energy)', () => {
      player.hand = ['bash', 'defend', 'heal', 'cleave', 'strike'];
      player.energy = 0;
      const beforeHand = player.hand.length;

      const result = engine.playCard(0, 0, player, enemies, cardById);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('cannot play');
      expect(player.hand).toHaveLength(beforeHand);
    });

    it('returns failure when phase is not PlayerTurn', () => {
      player.hand = ['strike', 'defend', 'heal', 'bash', 'cleave'];
      // Force phase out of PlayerTurn by ending the battle (player dies).
      player.hp = 0;
      engine.checkBattleOutcome(player, enemies);
      expect(engine.getPhase()).not.toBe(BattlePhase.PlayerTurn);

      const result = engine.playCard(0, 0, player, enemies, cardById);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('not your turn');
    });

    it('returns failure when card index is invalid', () => {
      const result = engine.playCard(99, 0, player, enemies, cardById);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('invalid card');
    });

    it('moves card to discard pile by default', () => {
      player.hand = ['strike', 'defend', 'heal', 'bash', 'cleave'];
      const beforeHandSize = player.hand.length;

      engine.playCard(0, 0, player, enemies, cardById);

      expect(player.hand).toHaveLength(beforeHandSize - 1);
      expect(player.hand).not.toContain('strike');
    });

    it('moves card to exhaust pile when exhaust=true', () => {
      player.hand = ['bash', 'defend', 'heal', 'cleave', 'strike'];
      const beforeHandSize = player.hand.length;

      engine.playCard(0, 0, player, enemies, cardById);

      // Hand shrinks by exactly 1 (exhausted card, no new draw on play).
      expect(player.hand).toHaveLength(beforeHandSize - 1);
      expect(player.hand).not.toContain('bash');
    });

    it('increments combo when playing attack card', () => {
      player.hand = ['strike', 'defend', 'heal', 'bash', 'cleave'];

      engine.playCard(0, 0, player, enemies, cardById);

      expect(combo.getState().count).toBe(1);
    });

    it('does not increment combo when playing skill card', () => {
      player.hand = ['defend', 'strike', 'heal', 'bash', 'cleave'];

      engine.playCard(0, 0, player, enemies, cardById);

      expect(combo.getState().count).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  describe('endTurn -> processEnemyTurn', () => {
    let player: PlayerState;
    let enemies: EnemyState[];
    let engine: BattleEngine;
    let deck: EngineDeck;

    beforeEach(() => {
      const built = buildEngine();
      engine = built.engine;
      player = makePlayer();
      enemies = [makeEnemy('e1', 30, [
        { type: 'attack', value: 5, description: 'bite' },
      ])];
      const builtDeck = makeEngineDeck(
        ['c1','c2','c3','c4','c5','c6','c7','c8','c9','c10'],
        'et'
      );
      deck = builtDeck.deck;
      engine.startBattle(player, enemies, deck);
    });

    it('transitions to enemy turn, executes enemy actions, returns to player turn', () => {
      expect(engine.getPhase()).toBe(BattlePhase.PlayerTurn);

      engine.endTurn(player, deck);

      // After endTurn we should be back on the player turn.
      expect(engine.getPhase()).toBe(BattlePhase.PlayerTurn);
      // Enemy attacked for 5 with no block -> player hp = 45
      expect(player.hp).toBe(45);
    });

    it('discards remaining hand at end of turn', () => {
      const initialHandSize = player.hand.length;
      expect(initialHandSize).toBeGreaterThan(0);

      engine.endTurn(player, deck);

      // After end-of-turn, a fresh hand of 5 should be drawn for the
      // upcoming player turn.
      expect(player.hand).toHaveLength(5);
    });

    it('advances currentIntentIndex on each enemy', () => {
      engine.endTurn(player, deck);
      expect(enemies[0].currentIntentIndex).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  describe('executeEnemyAction', () => {
    it('attack intent subtracts from player block first, then hp', () => {
      const { engine } = buildEngine();
      const player = makePlayer();
      player.block = 3;
      const enemy = makeEnemy('e1', 30, [
        { type: 'attack', value: 7, description: 'claw' },
      ]);

      const result = engine.executeEnemyAction(enemy, player);

      expect(result.action).toBe('attack');
      expect(result.damage).toBe(7);
      expect(player.block).toBe(0);     // 3 absorbed
      expect(player.hp).toBe(46);       // 50 - 4
    });

    it('attack damage clamps at 0 when block absorbs all', () => {
      const { engine } = buildEngine();
      const player = makePlayer();
      player.block = 100;
      const enemy = makeEnemy('e1', 30, [
        { type: 'attack', value: 7, description: 'claw' },
      ]);

      const result = engine.executeEnemyAction(enemy, player);

      expect(result.damage).toBe(7);   // reported raw intent damage
      expect(player.hp).toBe(50);
      expect(player.block).toBe(93);
    });
  });

  // -------------------------------------------------------------------------
  describe('checkBattleOutcome', () => {
    it('returns Won when all enemies are dead', () => {
      const { engine } = buildEngine();
      const player = makePlayer();
      const enemies = [makeEnemy('e1', 0), makeEnemy('e2', 0)];
      const outcome = engine.checkBattleOutcome(player, enemies);
      expect(outcome).toBe(BattlePhase.Won);
    });

    it('returns Lost when player hp <= 0', () => {
      const { engine } = buildEngine();
      const player = makePlayer();
      player.hp = 0;
      const enemies = [makeEnemy('e1', 30)];
      const outcome = engine.checkBattleOutcome(player, enemies);
      expect(outcome).toBe(BattlePhase.Lost);
    });

    it('returns current phase otherwise', () => {
      const { engine } = buildEngine();
      const player = makePlayer();
      const enemies = [makeEnemy('e1', 30)];
      engine.startBattle(player, enemies, makeEngineDeck(['c1','c2','c3','c4','c5','c6','c7'], 'co').deck);
      const outcome = engine.checkBattleOutcome(player, enemies);
      expect(outcome).toBe(BattlePhase.PlayerTurn);
    });
  });

  // -------------------------------------------------------------------------
  describe('endBattle', () => {
    it('returns rewards when won', () => {
      const { engine } = buildEngine();
      const player = makePlayer();
      const { deck } = makeEngineDeck(['c1','c2','c3','c4','c5','c6','c7'], 'eb');
      engine.startBattle(player, [makeEnemy('e1', 30)], deck);
      // Force win by killing all enemies first
      const enemies = [makeEnemy('e1', 0)];
      engine.checkBattleOutcome(player, enemies);
      const result = engine.endBattle();
      expect(result.won).toBe(true);
      expect(result.rewards).toEqual({ gold: 15, cardChoices: 3 });
    });

    it('returns no rewards when lost', () => {
      const { engine } = buildEngine();
      const player = makePlayer();
      player.hp = 0;
      const enemies = [makeEnemy('e1', 30)];
      engine.checkBattleOutcome(player, enemies);
      const result = engine.endBattle();
      expect(result.won).toBe(false);
      expect(result.rewards).toEqual({ gold: 0, cardChoices: 0 });
    });

    it('sets phase to Ended', () => {
      const { engine } = buildEngine();
      const player = makePlayer();
      const enemies = [makeEnemy('e1', 30)];
      engine.checkBattleOutcome(player, enemies);
      engine.endBattle();
      expect(engine.getPhase()).toBe(BattlePhase.Ended);
    });
  });
});