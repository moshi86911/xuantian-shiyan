// src/core/GameStateMachine.ts
// Stage 3 state machine: pure reducers per screen, with an outer dispatch
// wrapper that handles side effects (RNG, auto-save hook) and fires
// transition callbacks.
//
// Architecture:
//   - State changes happen via pure reducer functions (`reduceXxx`) that
//     take (state, action, ctx) and return a new state. No I/O inside.
//   - The `GameStateMachine.dispatch` wrapper picks the right reducer based
//     on `state.screen`, passes it a deterministic RNG derived from
//     `run.seed`, fires `onTransition` callbacks, and returns the next state.
//   - Side effects (e.g., auto-save to localStorage) should be wired up by
//     callers via `onTransition` hooks — they're not part of the reducer.

import type {
  CharacterId,
  GameState,
  GameScreen,
  MapNode,
  RunState,
} from './types';
import { DEFAULT_META } from './MetaProgress';
import { Character } from './Character';
import { BattleRewards } from './BattleRewards';
import { Shop, type ShopState } from './Shop';
import { Events } from './Events';
import { MapGenerator } from '../levels/MapGenerator';
import { SeededRandom, createRng } from '../utils/rng';
import { listEnemiesByTier } from '../data/enemies/loader';
import { EnemyState } from '../core/Enemy';
import type { BattleState, EnemyState as EnemyBattleState, PlayerState } from './types';
import swordData from '../data/characters/sword.json';
import talismanData from '../data/characters/talisman.json';
import alchemyData from '../data/characters/alchemy.json';

const CHARACTER_REGISTRY: Record<CharacterId, Character> = {
  sword: new Character(swordData as any),
  talisman: new Character(talismanData as any),
  alchemy: new Character(alchemyData as any),
};

// ---------------------------------------------------------------------------
// Action union
// ---------------------------------------------------------------------------

export type DispatchAction =
  | { type: 'menu_select'; action: string }
  | { type: 'character_confirm'; characterId: CharacterId }
  | { type: 'character_select'; characterId: CharacterId }
  | { type: 'character_back' }
  | { type: 'select_map_node'; nodeId: string }
  | { type: 'battle_end'; outcome: 'won' | 'lost' }
  | { type: 'reward_take'; cardIndex: number }
  | { type: 'reward_skip' }
  | { type: 'shop_buy'; itemIndex: number }
  | { type: 'shop_remove_random' }
  | { type: 'shop_leave' }
  | { type: 'event_pick'; choiceIndex: number }
  | { type: 'rest_heal' }
  | { type: 'rest_upgrade_random' }
  | { type: 'rest_remove_random' }
  | { type: 'rest_leave' }
  | { type: 'game_over_choice'; keepSave: boolean }
  | { type: 'victory_continue' };

/** Optional side-effect context carried alongside a dispatched action. */
export interface DispatchContext {
  /** Deterministic RNG used by the reducer. */
  rng?: SeededRandom;
}

export type TransitionListener = (from: GameScreen, to: GameScreen) => void;

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

/**
 * Build a fresh `GameState` for app start. The 3 characters are all unlocked
 * by default here — production wiring (Unlocks.canUnlock) can be plugged
 * into the reducer later.
 */
export function initialState(): GameState {
  return {
    screen: 'main_menu',
    meta: {
      ...DEFAULT_META,
      unlockedCharacters: ['sword', 'talisman', 'alchemy'],
      stats: { ...DEFAULT_META.stats },
    },
    saveSlots: [null, null, null],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveRng(state: GameState): SeededRandom {
  if (state.run?.seed) {
    const cursor = state.run.path.length;
    return createRng(`${state.run.seed}:${state.run.floor}:${cursor}`);
  }
  return createRng('default-seed');
}

function loadCharacter(characterId: CharacterId): Character {
  return CHARACTER_REGISTRY[characterId];
}

/**
 * Convert a RunState into the minimal PlayerState shape that BattleRewards /
 * Shop / Events helpers expect (they only read gold and the deck arrays).
 */
function playerFromRun(run: RunState): PlayerState {
  return {
    characterId: run.characterId,
    hp: run.hp,
    maxHp: run.maxHp,
    energy: 3,
    maxEnergy: 3,
    qi: 0,
    maxQi: 5,
    block: 0,
    gold: run.gold,
    hand: [],
    deck: run.deck,
    drawPile: run.deck,
    discardPile: [],
    exhaustPile: [],
    buffs: [],
  };
}

/** Push updated deck + gold + hp from a player-shaped state back into a RunState. */
function syncRunFromPlayer(run: RunState, player: PlayerState): RunState {
  // Merge all piles back into the master deck so we never lose cards.
  const allCards = [
    ...player.drawPile,
    ...player.discardPile,
    ...player.hand,
    ...player.exhaustPile,
  ];
  return {
    ...run,
    hp: player.hp,
    maxHp: player.maxHp,
    gold: player.gold,
    deck: allCards,
  };
}

/** Build a starting BattleState from a RunState + a chosen enemy. */
function buildBattleState(
  run: RunState,
  enemyIds: string[],
  rng: SeededRandom,
): BattleState {
  const player: PlayerState = {
    characterId: run.characterId,
    hp: run.hp,
    maxHp: run.maxHp,
    energy: 3,
    maxEnergy: 3,
    qi: 0,
    maxQi: 5,
    block: 0,
    gold: run.gold,
    hand: [],
    deck: run.deck,
    drawPile: run.deck,
    discardPile: [],
    exhaustPile: [],
    buffs: [],
  };

  const enemies: EnemyBattleState[] = enemyIds.map((eid) => {
    const data = listEnemiesByTier('normal').find((e) => e.id === eid)
      ?? listEnemiesByTier('normal')[rng.nextInt(0, listEnemiesByTier('normal').length - 1)];
    const wrapper = new EnemyState(data);
    return {
      id: wrapper.id,
      name: wrapper.name,
      maxHp: wrapper.maxHp,
      hp: wrapper.hp,
      block: wrapper.block,
      intents: wrapper.intents.map((i) => ({
        type: i.type,
        value: i.value,
        description: i.description ?? '',
        specialEffect: i.specialEffect,
      })),
      currentIntentIndex: wrapper.currentIntentIndex,
      buffs: [],
      tier: wrapper.tier,
      data: wrapper.data as any,
    };
  });

  return {
    player,
    enemies,
    turn: 1,
    phase: 'player_turn',
  };
}

// ---------------------------------------------------------------------------
// Node enter / leave
// ---------------------------------------------------------------------------

function enterNode(s: GameState, node: MapNode, rng: SeededRandom): GameState {
  if (!s.run) return s;
  const run = s.run;
  switch (node.type) {
    case 'battle':
    case 'elite':
    case 'boss': {
      // Pick 1-3 enemies for a battle. Boss = single boss; otherwise random.
      const enemies =
        node.type === 'boss'
          ? [pickBossEnemy(rng)]
          : node.type === 'elite'
            ? [pickEliteEnemy(rng)]
            : [pickNormalEnemy(rng)];
      const battle = buildBattleState(run, enemies, rng);
      return { ...s, screen: 'battle', battle };
    }
    case 'shop': {
      const player = playerFromRun(run);
      const shopState: ShopState = Shop.generate(player, rng);
      return { ...s, screen: 'shop', shop: shopState, pendingShopRemove: false };
    }
    case 'event': {
      const event = Events.randomEvent(rng);
      return {
        ...s,
        screen: 'event',
        event: {
          id: event.id,
          title: event.title,
          text: event.text,
          choices: event.choices,
        },
      };
    }
    case 'rest':
      return { ...s, screen: 'rest' };
    default:
      return s;
  }
}

function pickNormalEnemy(rng: SeededRandom): string {
  const pool = listEnemiesByTier('normal');
  return pool[rng.nextInt(0, pool.length - 1)].id;
}

function pickEliteEnemy(rng: SeededRandom): string {
  // Fall back to a normal enemy with extra HP marker — elite pool not yet
  // populated in data/. Hook here when elite data lands.
  return pickNormalEnemy(rng);
}

function pickBossEnemy(rng: SeededRandom): string {
  // Same fallback strategy until boss roster lands.
  return pickNormalEnemy(rng);
}

function leaveNode(s: GameState, rng: SeededRandom): GameState {
  if (!s.run || !s.map) return s;
  const map = s.map;
  const run = s.run;

  // Find current node.
  let current: MapNode | undefined;
  let currentLayerIdx = -1;
  for (let i = 0; i < map.nodes.length; i++) {
    const found = map.nodes[i].find((n) => n.id === map.currentNodeId);
    if (found) {
      current = found;
      currentLayerIdx = i;
      break;
    }
  }
  if (!current) return s;

  // Mark visited + unlock children.
  const nextMap: typeof map = {
    ...map,
    nodes: map.nodes.map((layer) =>
      layer.map((n) => {
        if (n.id === current!.id) return { ...n, visited: true };
        if (current!.connections.includes(n.id)) return { ...n, available: true };
        return n;
      }),
    ),
  };

  // If the node is the last in the floor, advance floor.
  if (currentLayerIdx === map.nodes.length - 1) {
    if (map.floor >= 6) {
      return {
        ...s,
        screen: 'victory',
        run: { ...run, path: [...run.path, current!.id] },
        map: nextMap,
        reward: undefined,
        shop: undefined,
        event: undefined,
        pendingShopRemove: false,
        battle: undefined,
      };
    }
    const newFloor = map.floor + 1;
    const generator = new MapGenerator(rng);
    const newMap = generator.generate(newFloor);
    return {
      ...s,
      screen: 'map',
      run: { ...run, floor: newFloor, path: [...run.path, current!.id] },
      map: newMap,
      reward: undefined,
      shop: undefined,
      event: undefined,
      pendingShopRemove: false,
      battle: undefined,
      floorJustAdvanced: true,
    };
  }

  // Otherwise pick first child as new current.
  const next = current.connections[0] ?? map.currentNodeId;
  return {
    ...s,
    screen: 'map',
    run: { ...run, path: [...run.path, current!.id] },
    map: { ...nextMap, currentNodeId: next },
    reward: undefined,
    shop: undefined,
    event: undefined,
    pendingShopRemove: false,
    battle: undefined,
  };
}

// ---------------------------------------------------------------------------
// Per-screen reducers (pure)
// ---------------------------------------------------------------------------

function reduceMainMenu(s: GameState, action: DispatchAction): GameState {
  if (action.type !== 'menu_select') return s;
  if (action.action === 'start') return { ...s, screen: 'character_select' };
  return s;
}

function reduceCharacterSelect(s: GameState, action: DispatchAction): GameState {
  if (action.type === 'character_select') {
    // Clicking a card just highlights; store the selection on state.
    return { ...s, selectedCharacterId: action.characterId };
  }
  if (action.type === 'character_back') {
    return { ...s, screen: 'main_menu', selectedCharacterId: undefined };
  }
  if (action.type !== 'character_confirm') return s;
  // Allow the action to specify an id, but fall back to the highlighted one.
  const id: CharacterId =
    (action.characterId as CharacterId) ||
    s.selectedCharacterId ||
    'sword';
  const character = loadCharacter(id);
  const player = character.toPlayerState();
  const run: RunState = {
    seed: id + '-' + Date.now().toString(36),
    characterId: id,
    floor: 1,
    hp: player.hp,
    maxHp: player.maxHp,
    gold: player.gold,
    deck: player.drawPile,
    relics: [],
    potions: [],
    path: [],
    startTime: Date.now(),
  };
  const generator = new MapGenerator(createRng(run.seed));
  const map = generator.generate(1);
  return {
    ...s,
    screen: 'map',
    run,
    map,
    selectedCharacterId: undefined,
  };
}

function reduceMap(s: GameState, action: DispatchAction, ctx: DispatchContext): GameState {
  if (action.type !== 'select_map_node' || !s.map || !s.run) return s;
  const node = s.map.nodes
    .flat()
    .find((n) => n.id === action.nodeId);
  if (!node) return s;
  if (!node.available || node.visited) return s;
  const rng = ctx.rng ?? deriveRng(s);
  return enterNode(s, node, rng);
}

function reduceBattle(s: GameState, action: DispatchAction, ctx: DispatchContext): GameState {
  if (action.type !== 'battle_end' || !s.run) return s;
  const rng = ctx.rng ?? deriveRng(s);
  if (action.outcome === 'lost') {
    return {
      ...s,
      screen: 'game_over',
      reward: undefined,
      shop: undefined,
      event: undefined,
      pendingShopRemove: false,
    };
  }
  // Won: generate reward.
  const player = playerFromRun(s.run);
  const choices = BattleRewards.generate(player, rng, 3);
  return {
    ...s,
    screen: 'reward',
    reward: { cardChoices: choices },
    battle: undefined,
  };
}

function reduceReward(s: GameState, action: DispatchAction, ctx: DispatchContext): GameState {
  if (!s.run) return s;
  const rng = ctx.rng ?? deriveRng(s);
  if (action.type === 'reward_take') {
    if (!s.reward) return leaveNode(s, rng);
    const card = s.reward.cardChoices[action.cardIndex];
    if (!card) return leaveNode(s, rng);
    const player = playerFromRun(s.run);
    const updated = BattleRewards.takeCard(player, card);
    return leaveNode({ ...s, run: syncRunFromPlayer(s.run, updated) }, rng);
  }
  if (action.type === 'reward_skip') {
    return leaveNode(s, rng);
  }
  return s;
}

function reduceShop(s: GameState, action: DispatchAction, ctx: DispatchContext): GameState {
  if (!s.run) return s;
  const rng = ctx.rng ?? deriveRng(s);
  if (action.type === 'shop_buy') {
    if (!s.shop) return s;
    const item = s.shop.cards[action.itemIndex];
    if (!item) return s;
    const player = playerFromRun(s.run);
    if (!Shop.canAfford(player, item)) return s;
    const updated = Shop.purchase(player, item);
    // Mark item as bought by replacing shop cards with the remaining ones.
    const remaining = s.shop.cards.filter((_, idx) => idx !== action.itemIndex);
    return {
      ...s,
      run: syncRunFromPlayer(s.run, updated),
      shop: { ...s.shop, cards: remaining },
    };
  }
  if (action.type === 'shop_remove_random') {
    // Pick one random card from the player's deck and remove it.
    // `pendingShopRemove` is set to true so the UI can show a "card
    // removed" feedback after the operation.
    if (s.run.deck.length === 0) return { ...s, pendingShopRemove: false };
    const idx = rng.nextInt(0, s.run.deck.length - 1);
    const targetId = s.run.deck[idx];
    const player = playerFromRun(s.run);
    const updated = Shop.removeCard(player, targetId);
    return {
      ...s,
      run: syncRunFromPlayer(s.run, updated),
      pendingShopRemove: true,
    };
  }
  if (action.type === 'shop_leave') {
    return leaveNode(s, rng);
  }
  return s;
}

function reduceEvent(s: GameState, action: DispatchAction, ctx: DispatchContext): GameState {
  if (!s.run) return s;
  const rng = ctx.rng ?? deriveRng(s);
  if (action.type !== 'event_pick') return s;
  if (!s.event) return leaveNode(s, rng);
  const choice = s.event.choices[action.choiceIndex];
  if (!choice) return leaveNode(s, rng);
  const player = playerFromRun(s.run);
  const updated = Events.applyEffect(player, choice.effect as any);
  return leaveNode({ ...s, run: syncRunFromPlayer(s.run, updated) }, rng);
}

function reduceRest(s: GameState, action: DispatchAction, ctx: DispatchContext): GameState {
  if (!s.run) return s;
  const rng = ctx.rng ?? deriveRng(s);
  if (action.type === 'rest_heal') {
    const heal = Math.floor(s.run.maxHp * 0.3);
    return leaveNode(
      {
        ...s,
        run: {
          ...s.run,
          hp: Math.min(s.run.maxHp, s.run.hp + heal),
        },
      },
      rng,
    );
  }
  if (action.type === 'rest_upgrade_random') {
    if (s.run.deck.length === 0) return s;
    const idx = rng.nextInt(0, s.run.deck.length - 1);
    const newDeck = [...s.run.deck];
    newDeck[idx] = newDeck[idx] + '__UPGRADED';
    return leaveNode({ ...s, run: { ...s.run, deck: newDeck } }, rng);
  }
  if (action.type === 'rest_remove_random') {
    if (s.run.deck.length === 0) return s;
    const idx = rng.nextInt(0, s.run.deck.length - 1);
    const newDeck = s.run.deck.filter((_, i) => i !== idx);
    return leaveNode({ ...s, run: { ...s.run, deck: newDeck } }, rng);
  }
  if (action.type === 'rest_leave') {
    return leaveNode(s, rng);
  }
  return s;
}

function reduceGameOver(s: GameState, action: DispatchAction): GameState {
  if (action.type !== 'game_over_choice') return s;
  if (action.keepSave) {
    // Keep slot 0 — return to main_menu with continue enabled.
    return {
      ...s,
      screen: 'main_menu',
      run: undefined,
      map: undefined,
      battle: undefined,
      reward: undefined,
      shop: undefined,
      event: undefined,
      pendingShopRemove: false,
      floorJustAdvanced: false,
    };
  }
  // Wipe slot 0 — return to main_menu with continue disabled.
  return {
    ...s,
    screen: 'main_menu',
    run: undefined,
    map: undefined,
    battle: undefined,
    reward: undefined,
    shop: undefined,
    event: undefined,
    pendingShopRemove: false,
    floorJustAdvanced: false,
    saveSlots: [null, null, null],
  };
}

function reduceVictory(s: GameState, action: DispatchAction): GameState {
  if (action.type !== 'victory_continue') return s;
  // Clear slot 0 to prevent continue from re-loading a completed run.
  return {
    ...s,
    screen: 'main_menu',
    run: undefined,
    map: undefined,
    battle: undefined,
    reward: undefined,
    shop: undefined,
    event: undefined,
    pendingShopRemove: false,
    floorJustAdvanced: false,
    saveSlots: [null, null, null],
  };
}

// ---------------------------------------------------------------------------
// Machine wrapper
// ---------------------------------------------------------------------------

export class GameStateMachine {
  state: GameState;
  private listeners: TransitionListener[] = [];

  constructor(state: GameState = initialState()) {
    this.state = state;
  }

  /** Register a listener that fires on every screen transition. */
  onTransition(fn: TransitionListener): void {
    this.listeners.push(fn);
  }

  /** Read the current state. */
  getState(): GameState {
    return this.state;
  }

  /**
   * Merge options into the current state without touching the screen or any
   * run/battle data. Used by main.ts to refresh `saveSlots` from SaveManager
   * every time the player returns to main_menu (so the "Continue" button
   * reflects the latest disk save).
   */
  updateOptions(opts: { savedSlot?: RunState | null; saveSlots?: (RunState | null)[] }): void {
    const next: GameState = { ...this.state };
    if (opts.saveSlots !== undefined) {
      next.saveSlots = opts.saveSlots;
    } else if (opts.savedSlot !== undefined) {
      // Update slot 0 with the latest value; preserve the rest.
      const slots = [...this.state.saveSlots];
      slots[0] = opts.savedSlot;
      while (slots.length < 3) slots.push(null);
      next.saveSlots = slots.slice(0, 3);
    }
    this.state = next;
  }

  /** Direct state replacement — for testing and for end-of-run resets. */
  setState(state: GameState): void {
    const before = this.state.screen;
    this.state = state;
    if (state.screen !== before) {
      for (const fn of this.listeners) fn(before, state.screen);
    }
  }

  /**
   * Dispatch an action. Picks the right reducer for `state.screen`, applies
   * it, and fires transition callbacks. Side effects (RNG, save) belong in
   * the caller's `onTransition` hooks — never inside reducers.
   */
  dispatch(action: DispatchAction, ctx: DispatchContext = {}): GameState {
    const before = this.state.screen;
    const next = this.reduce(this.state, action, ctx);
    this.state = next;
    if (next.screen !== before) {
      for (const fn of this.listeners) fn(before, next.screen);
    }
    return next;
  }

  private reduce(s: GameState, action: DispatchAction, ctx: DispatchContext): GameState {
    switch (s.screen) {
      case 'main_menu':
        return reduceMainMenu(s, action);
      case 'character_select':
        return reduceCharacterSelect(s, action);
      case 'map':
        return reduceMap(s, action, ctx);
      case 'battle':
        return reduceBattle(s, action, ctx);
      case 'reward':
        return reduceReward(s, action, ctx);
      case 'shop':
        return reduceShop(s, action, ctx);
      case 'event':
        return reduceEvent(s, action, ctx);
      case 'rest':
        return reduceRest(s, action, ctx);
      case 'game_over':
        return reduceGameOver(s, action);
      case 'victory':
        return reduceVictory(s, action);
    }
  }
}

// ---------------------------------------------------------------------------
// Exported helpers for testing
// ---------------------------------------------------------------------------

export const __test = {
  playerFromRun,
  syncRunFromPlayer,
  deriveRng,
  loadCharacter,
  enterNode,
  leaveNode,
};
