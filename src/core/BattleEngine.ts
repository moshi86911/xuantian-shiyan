// src/core/BattleEngine.ts

import type { Card, EnemyState, PlayerState } from './types';
import type { SeededRandom } from '../utils/rng';
import type { CardExecutor } from './CardExecutor';
import type { BuffSystem } from './BuffSystem';
import type { ComboTracker } from './ComboTracker';

/** High-level phase of a battle. */
export enum BattlePhase {
  NotStarted = 'not_started',
  PlayerTurn = 'player_turn',
  PlayerTurnEnding = 'player_turn_ending',
  EnemyTurn = 'enemy_turn',
  Won = 'won',
  Lost = 'lost',
  Ended = 'ended',
}

/**
 * The minimal duck-typed surface of a deck the engine consumes. Any object
 * that implements these methods works — the engine doesn't depend on the
 * concrete `Deck` class.
 */
interface StoredDeck {
  drawCards: (n: number) => string[];
  discard: (id: string) => void;
  exhaust: (id: string) => void;
  discardHand: () => void;
  size: number;
}

const HAND_SIZE = 5;

/**
 * Orchestrates a single battle: turn loop, energy/qi bookkeeping, card play
 * dispatch through CardExecutor, enemy intent execution, win/loss detection.
 *
 * The engine does not own PlayerState/EnemyState — it mutates references
 * handed in by the caller. The engine stores the deck reference and the
 * active enemies list internally so that endTurn() can drive processEnemyTurn
 * without those objects appearing on every method signature.
 */
export class BattleEngine {
  private phase: BattlePhase = BattlePhase.NotStarted;
  private turn: number = 0;
  private currentEnemies: EnemyState[] = [];
  private currentDeck: StoredDeck | null = null;

  constructor(
    private cardExecutor: CardExecutor,
    private playerBuffs: BuffSystem,
    private enemyBuffs: BuffSystem,
    private combo: ComboTracker,
    // Reserved for Phase 5 enemy AI. Underscore-prefix satisfies
    // `noUnusedParameters` without forcing a dummy read.
    private _rng: SeededRandom,
  ) {
    void this._rng;
    // `damage_per_combo` scaling must read the live ComboTracker this engine
    // owns (the engine calls combo.addCombo(1) on every attack), not the
    // legacy `combo` buff stacks in playerBuffs. Wiring it here means every
    // caller gets correct scaling without having to remember the callback.
    this.cardExecutor.setComboSource(() => this.combo.getState().count);
  }

  /** Current battle phase. */
  getPhase(): BattlePhase {
    return this.phase;
  }

  /** Current turn (1-based, incremented by startTurn). */
  getTurn(): number {
    return this.turn;
  }

  // -------------------------------------------------------------------------
  // Battle start
  // -------------------------------------------------------------------------

  startBattle(
    player: PlayerState,
    enemies: EnemyState[],
    deck: { drawCards: (n: number) => string[]; size: number },
  ): void {
    this.phase = BattlePhase.PlayerTurn;
    this.turn = 1;
    this.currentEnemies = enemies;
    this.currentDeck = deck as StoredDeck;

    this.playerBuffs.clear();
    this.enemyBuffs.clear();
    this.combo.clear();

    player.energy = player.maxEnergy;
    player.qi = 0;

    for (const enemy of enemies) {
      enemy.hp = enemy.maxHp;
      enemy.block = 0;
      enemy.buffs = [];
      enemy.currentIntentIndex = 0;
    }

    // Clear any leftover hand, then draw the opening 5.
    player.hand = [];
    const drawn = deck.drawCards(HAND_SIZE);
    player.hand.push(...drawn);
  }

  // -------------------------------------------------------------------------
  // Turn loop
  // -------------------------------------------------------------------------

  startTurn(
    player: PlayerState,
    deck: { drawCards: (n: number) => string[]; discardHand: () => void; size: number },
  ): void {
    this.turn += 1;

    player.energy = player.maxEnergy;
    player.qi = Math.min(player.qi + 1, player.maxQi);

    // Tick turn-end buffs (decrement duration, expire any that hit 0).
    this.playerBuffs.tickTurnEnd();
    this.enemyBuffs.tickTurnEnd();

    // DOTs / HOTs on the player. Iterate a snapshot — apply() can mutate
    // the collection.
    const playerBuffSnapshot = this.playerBuffs.all();
    for (const buff of playerBuffSnapshot) {
      if (buff.type === 'poison') {
        player.hp = Math.max(0, player.hp - buff.stacks);
      } else if (buff.type === 'regeneration') {
        player.hp = Math.min(player.maxHp, player.hp + buff.stacks);
      }
    }

    deck.discardHand();
    player.hand = [];

    const drawn = deck.drawCards(HAND_SIZE);
    player.hand.push(...drawn);

    this.phase = BattlePhase.PlayerTurn;
  }

  endTurn(
    player: PlayerState,
    deck: { discardHand: () => void; drawCards: (n: number) => string[] },
  ): void {
    deck.discardHand();
    player.hand = [];

    this.phase = BattlePhase.EnemyTurn;
    this.processEnemyTurn(this.currentEnemies, player);

    // Draw 5 for the upcoming player turn so callers see a fresh hand
    // immediately after endTurn (matches the test contract).
    const drawn = deck.drawCards(HAND_SIZE);
    player.hand.push(...drawn);

    this.phase = BattlePhase.PlayerTurn;
  }

  // -------------------------------------------------------------------------
  // Card play
  // -------------------------------------------------------------------------

  playCard(
    cardIndex: number,
    targetIndex: number,
    player: PlayerState,
    enemies: EnemyState[],
    cardById: (id: string) => Card | undefined,
  ): { success: boolean; reason?: string } {
    const cardId = player.hand[cardIndex];
    const card = cardId !== undefined ? cardById(cardId) : undefined;
    if (!card) {
      return { success: false, reason: 'invalid card' };
    }

    if (this.phase !== BattlePhase.PlayerTurn) {
      return { success: false, reason: 'not your turn' };
    }

    if (!this.cardExecutor.canPlay(card, player, enemies)) {
      return { success: false, reason: 'cannot play' };
    }

    const result = this.cardExecutor.play(card, player, enemies, targetIndex);

    // Remove from the player's hand.
    player.hand.splice(cardIndex, 1);

    // Move the card to the right pile on the deck.
    if (this.currentDeck) {
      if (result.exhausted) {
        this.currentDeck.exhaust(cardId);
      } else {
        this.currentDeck.discard(cardId);
      }
    }

    // Combo: sword cultivator bonus applies to attack cards.
    if (card.type === 'attack') {
      this.combo.addCombo(1);
    }

    return { success: true };
  }

  // -------------------------------------------------------------------------
  // Enemy turn
  // -------------------------------------------------------------------------

  executeEnemyAction(
    enemy: EnemyState,
    player: PlayerState,
  ): { action: string; damage: number } {
    const intent = enemy.intents[enemy.currentIntentIndex];
    if (!intent || intent.type !== 'attack') {
      // Phase 4 stub: only attack intents deal damage. AI dispatch lands
      // in Phase 5.
      return { action: intent?.type ?? 'idle', damage: 0 };
    }

    const rawDamage = intent.value;
    let remaining = rawDamage;
    if (player.block > 0) {
      const absorbed = Math.min(player.block, remaining);
      player.block -= absorbed;
      remaining -= absorbed;
    }
    player.hp = Math.max(0, player.hp - remaining);

    return { action: 'attack', damage: rawDamage };
  }

  processEnemyTurn(
    enemies: EnemyState[],
    player: PlayerState,
  ): void {
    for (const enemy of enemies) {
      if (enemy.hp > 0) {
        this.executeEnemyAction(enemy, player);
      }
      // Advance intent index for every enemy (alive or not) so dead enemies
      // don't lock the intent rotation.
      enemy.currentIntentIndex += 1;
    }
    this.phase = BattlePhase.PlayerTurn;
  }

  // -------------------------------------------------------------------------
  // Outcome / end
  // -------------------------------------------------------------------------

  checkBattleOutcome(player: PlayerState, enemies: EnemyState[]): BattlePhase {
    if (enemies.length > 0 && enemies.every(e => e.hp <= 0)) {
      this.phase = BattlePhase.Won;
      return this.phase;
    }
    if (player.hp <= 0) {
      this.phase = BattlePhase.Lost;
      return this.phase;
    }
    return this.phase;
  }

  endBattle(): { won: boolean; rewards: { gold: number; cardChoices: number } } {
    const won = this.phase === BattlePhase.Won;
    this.phase = BattlePhase.Ended;
    return {
      won,
      rewards: { gold: won ? 15 : 0, cardChoices: won ? 3 : 0 },
    };
  }
}