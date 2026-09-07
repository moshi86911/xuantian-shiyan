// tests/core/GameStateMachine.test.ts
// Tests for the Stage 3 state machine: main_menu → character_select → map →
// battle → reward → shop/event/rest → map flow + game_over/victory stubs.

import { describe, it, expect } from 'vitest';
import {
  GameStateMachine,
  initialState,
} from '../../src/core/GameStateMachine';
import type { GameState, MapNode, MapState } from '../../src/core/types';

function freshState(): GameState {
  return initialState();
}

function stateWithScreen(screen: GameState['screen'], extras: Partial<GameState> = {}): GameState {
  return { ...freshState(), screen, ...extras };
}

// Helper: build a minimal floor-1 MapState with one battle node, one shop
// node, one event node, and one rest node, all connected linearly. All
// non-current nodes are flagged as available so the routing reducer accepts
// them — the real "available" flag is flipped by `leaveNode` after each
// visit, but routing tests want to skip the gate.
function buildTinyMap(opts: { allAvailable?: boolean } = {}): MapState {
  const allAvailable = opts.allAvailable ?? true;
  const battle: MapNode = {
    id: 'n_battle',
    type: 'battle',
    x: 0, y: 0,
    connections: ['n_shop'],
    visited: false,
    available: true,
  };
  const shop: MapNode = {
    id: 'n_shop',
    type: 'shop',
    x: 0, y: 0,
    connections: ['n_event'],
    visited: false,
    available: allAvailable,
  };
  const event: MapNode = {
    id: 'n_event',
    type: 'event',
    x: 0, y: 0,
    connections: ['n_rest'],
    visited: false,
    available: allAvailable,
  };
  const rest: MapNode = {
    id: 'n_rest',
    type: 'rest',
    x: 0, y: 0,
    connections: [],
    visited: false,
    available: allAvailable,
  };
  return {
    floor: 1,
    nodes: [[battle], [shop], [event], [rest]],
    currentNodeId: 'n_battle',
  };
}

function stateWithMap(map: MapState, runSeed = 'unit-test-seed'): GameState {
  return {
    ...freshState(),
    screen: 'map',
    map,
    run: {
      seed: runSeed,
      characterId: 'sword',
      floor: map.floor,
      hp: 70,
      maxHp: 75,
      gold: 50,
      deck: ['sword_strike', 'sword_strike', 'sword_defend'],
      relics: [],
      potions: [],
      path: [],
      startTime: 0,
    },
  };
}

describe('GameStateMachine — initialState', () => {
  it('starts on main_menu', () => {
    expect(freshState().screen).toBe('main_menu');
  });

  it('has 3 unlocked characters (sword, talisman, alchemy)', () => {
    const meta = freshState().meta;
    expect(meta.unlockedCharacters).toEqual(
      expect.arrayContaining(['sword', 'talisman', 'alchemy'])
    );
  });

  it('has 3 empty save slots', () => {
    expect(freshState().saveSlots).toEqual([null, null, null]);
  });
});

describe('GameStateMachine — main_menu', () => {
  it('start → character_select', () => {
    const m = new GameStateMachine(freshState());
    const next = m.dispatch({ type: 'menu_select', action: 'start' });
    expect(next.screen).toBe('character_select');
  });

  it('quit on main_menu is a no-op (stays on main_menu)', () => {
    const m = new GameStateMachine(freshState());
    const next = m.dispatch({ type: 'menu_select', action: 'quit' });
    expect(next.screen).toBe('main_menu');
  });

  it('unknown action is a no-op', () => {
    const m = new GameStateMachine(freshState());
    const next = m.dispatch({ type: 'menu_select', action: 'settings' });
    expect(next.screen).toBe('main_menu');
  });
});

describe('GameStateMachine — character_select', () => {
  it('confirm sword → map with sword run', () => {
    const m = new GameStateMachine(stateWithScreen('character_select'));
    const next = m.dispatch({ type: 'character_confirm', characterId: 'sword' });
    expect(next.screen).toBe('map');
    expect(next.run?.characterId).toBe('sword');
    expect(next.map?.floor).toBe(1);
  });

  it('confirm talisman → map with talisman run', () => {
    const m = new GameStateMachine(stateWithScreen('character_select'));
    const next = m.dispatch({ type: 'character_confirm', characterId: 'talisman' });
    expect(next.screen).toBe('map');
    expect(next.run?.characterId).toBe('talisman');
  });

  it('confirm alchemy → map with alchemy run', () => {
    const m = new GameStateMachine(stateWithScreen('character_select'));
    const next = m.dispatch({ type: 'character_confirm', characterId: 'alchemy' });
    expect(next.screen).toBe('map');
    expect(next.run?.characterId).toBe('alchemy');
  });

  it('builds run.deck from character starting deck', () => {
    const m = new GameStateMachine(stateWithScreen('character_select'));
    const next = m.dispatch({ type: 'character_confirm', characterId: 'sword' });
    expect(next.run?.deck).toEqual(expect.arrayContaining(['sword_strike', 'sword_slash', 'sword_defend']));
    expect(next.run?.deck.length).toBe(10); // sword starting deck size
  });

  it('initialises hp to maxHp', () => {
    const m = new GameStateMachine(stateWithScreen('character_select'));
    const next = m.dispatch({ type: 'character_confirm', characterId: 'sword' });
    expect(next.run?.hp).toBe(next.run?.maxHp);
    expect(next.run?.maxHp).toBe(75);
  });

  it('character_select (clicking a card) just highlights — does not start run', () => {
    const m = new GameStateMachine(stateWithScreen('character_select'));
    const next = m.dispatch({ type: 'character_select', characterId: 'talisman' });
    expect(next.screen).toBe('character_select');
    expect(next.run).toBeUndefined();
  });
});

describe('GameStateMachine — map routing', () => {
  it('click battle node → screen=battle + battle state exists', () => {
    const m = new GameStateMachine(stateWithMap(buildTinyMap()));
    const next = m.dispatch({ type: 'select_map_node', nodeId: 'n_battle' });
    expect(next.screen).toBe('battle');
    expect(next.battle).toBeDefined();
  });

  it('click shop node → screen=shop + shop state exists', () => {
    const m = new GameStateMachine(stateWithMap(buildTinyMap()));
    const next = m.dispatch({ type: 'select_map_node', nodeId: 'n_shop' });
    expect(next.screen).toBe('shop');
    expect(next.shop).toBeDefined();
    expect(next.shop?.cards.length).toBeGreaterThan(0);
  });

  it('click event node → screen=event + event state exists', () => {
    const m = new GameStateMachine(stateWithMap(buildTinyMap()));
    const next = m.dispatch({ type: 'select_map_node', nodeId: 'n_event' });
    expect(next.screen).toBe('event');
    expect(next.event).toBeDefined();
  });

  it('click rest node → screen=rest', () => {
    const m = new GameStateMachine(stateWithMap(buildTinyMap()));
    const next = m.dispatch({ type: 'select_map_node', nodeId: 'n_rest' });
    expect(next.screen).toBe('rest');
  });

  it('click unavailable node → no transition (no-op)', () => {
    const m = new GameStateMachine(stateWithMap(buildTinyMap({ allAvailable: false })));
    // n_shop is unavailable → reducer should ignore it and stay on map.
    const next = m.dispatch({ type: 'select_map_node', nodeId: 'n_shop' });
    expect(next.screen).toBe('map');
    expect(next.shop).toBeUndefined();
  });
});

describe('GameStateMachine — battle → reward → map', () => {
  it('battle_end won → screen=reward + 3 card choices', () => {
    const m = new GameStateMachine({
      ...stateWithMap(buildTinyMap()),
      screen: 'battle',
      battle: {
        player: {
          characterId: 'sword',
          hp: 50, maxHp: 75,
          energy: 0, maxEnergy: 3,
          qi: 0, maxQi: 5,
          block: 0, gold: 99,
          hand: [], deck: ['sword_strike'], drawPile: ['sword_strike'], discardPile: [], exhaustPile: [],
          buffs: [],
        },
        enemies: [{
          id: 'wolf', name: '妖狼', maxHp: 28, hp: 0, block: 0,
          intents: [{ type: 'attack', value: 6, description: '' }],
          currentIntentIndex: 0, buffs: [], tier: 'normal', data: {},
        }],
        turn: 1, phase: 'won',
      },
    });
    const next = m.dispatch({ type: 'battle_end', outcome: 'won' });
    expect(next.screen).toBe('reward');
    expect(next.reward?.cardChoices.length).toBe(3);
  });

  it('battle_end lost → screen=game_over', () => {
    const m = new GameStateMachine({
      ...stateWithMap(buildTinyMap()),
      screen: 'battle',
      battle: {
        player: {
          characterId: 'sword',
          hp: 0, maxHp: 75,
          energy: 0, maxEnergy: 3,
          qi: 0, maxQi: 5,
          block: 0, gold: 99,
          hand: [], deck: [], drawPile: [], discardPile: [], exhaustPile: [],
          buffs: [],
        },
        enemies: [],
        turn: 1, phase: 'lost',
      },
    });
    const next = m.dispatch({ type: 'battle_end', outcome: 'lost' });
    expect(next.screen).toBe('game_over');
  });

  it('reward_take adds card to run.deck and advances to next node', () => {
    const m = new GameStateMachine({
      ...stateWithMap(buildTinyMap()),
      screen: 'reward',
      reward: {
        cardChoices: [
          { id: 'sword_five_element', name: 'Five', description: '', type: 'attack', rarity: 'rare', cost: 2, targetType: 'enemy', effects: [] },
          { id: 'sword_celestial', name: 'Celestial', description: '', type: 'attack', rarity: 'rare', cost: 3, targetType: 'enemy', effects: [] },
          { id: 'sword_nine_swords', name: 'Nine', description: '', type: 'attack', rarity: 'rare', cost: 2, targetType: 'all_enemies', effects: [] },
        ],
      },
    });
    const beforeLen = m.state.run!.deck.length;
    const next = m.dispatch({ type: 'reward_take', cardIndex: 0 });
    expect(next.run?.deck.length).toBe(beforeLen + 1);
    expect(next.run?.deck).toContain('sword_five_element');
    expect(next.screen).toBe('map');
  });

  it('reward_skip advances to next node without adding card', () => {
    const m = new GameStateMachine({
      ...stateWithMap(buildTinyMap()),
      screen: 'reward',
      reward: {
        cardChoices: [
          { id: 'sword_five_element', name: 'Five', description: '', type: 'attack', rarity: 'rare', cost: 2, targetType: 'enemy', effects: [] },
        ],
      },
    });
    const beforeLen = m.state.run!.deck.length;
    const next = m.dispatch({ type: 'reward_skip' });
    expect(next.run?.deck.length).toBe(beforeLen);
    expect(next.screen).toBe('map');
  });

  it('reward_skip marks current node visited and unlocks next', () => {
    const m = new GameStateMachine({
      ...stateWithMap(buildTinyMap()),
      screen: 'reward',
      reward: { cardChoices: [] },
    });
    const next = m.dispatch({ type: 'reward_skip' });
    expect(next.map?.nodes[0][0].visited).toBe(true);
    expect(next.map?.nodes[1][0].available).toBe(true);
    expect(next.map?.currentNodeId).toBe('n_shop');
  });
});

describe('GameStateMachine — shop', () => {
  function shopState(): GameState {
    return {
      ...stateWithMap(buildTinyMap()),
      screen: 'shop',
      shop: {
        cards: [
          { type: 'card', cost: 50, data: { id: 'sword_five_element', name: 'Five', description: '', type: 'attack', rarity: 'rare', cost: 2, targetType: 'enemy', effects: [] } },
          { type: 'card', cost: 50, data: { id: 'sword_celestial', name: 'Celestial', description: '', type: 'attack', rarity: 'rare', cost: 3, targetType: 'enemy', effects: [] } },
        ],
        removeCardCost: 75,
      },
    };
  }

  it('shop_buy deducts gold, adds card, stays on shop', () => {
    const m = new GameStateMachine(shopState());
    const beforeGold = m.state.run!.gold;
    const beforeDeck = m.state.run!.deck.length;
    const next = m.dispatch({ type: 'shop_buy', itemIndex: 0 });
    expect(next.run?.gold).toBe(beforeGold - 50);
    expect(next.run?.deck.length).toBe(beforeDeck + 1);
    // shop_buy just purchases the card; the player must click "leave" to
    // advance to the map.
    expect(next.screen).toBe('shop');
  });

  it('shop_buy insufficient gold is a no-op', () => {
    const s = shopState();
    s.run!.gold = 10;
    const m = new GameStateMachine(s);
    const next = m.dispatch({ type: 'shop_buy', itemIndex: 0 });
    expect(next.screen).toBe('shop');
  });

  it('shop_leave advances to map', () => {
    const m = new GameStateMachine(shopState());
    const next = m.dispatch({ type: 'shop_leave' });
    expect(next.screen).toBe('map');
  });

  it('shop_remove_random removes a card and marks pendingShopRemove flag', () => {
    const s = shopState();
    s.run!.gold = 200;
    // Use distinct card IDs so filter removes exactly one entry.
    s.run!.deck = ['sword_strike', 'sword_slash', 'sword_defend'];
    const beforeDeck = s.run!.deck.length;
    const m = new GameStateMachine(s);
    const next = m.dispatch({ type: 'shop_remove_random' });
    expect(next.pendingShopRemove).toBe(true);
    expect(next.run?.deck.length).toBe(beforeDeck - 1);
  });
});

describe('GameStateMachine — event', () => {
  function eventState(): GameState {
    return {
      ...stateWithMap(buildTinyMap()),
      screen: 'event',
      event: {
        id: 'mysterious_well',
        title: '古井之谜',
        text: '一口古井散发着幽光。',
        choices: [
          { text: '探身查看', effect: { type: 'lose_hp', amount: 5 } },
          { text: '投入金币', effect: { type: 'lose_gold', amount: 50 } },
        ],
      },
    };
  }

  it('event_pick applies effect and advances to map', () => {
    const m = new GameStateMachine(eventState());
    const beforeGold = m.state.run!.gold;
    const next = m.dispatch({ type: 'event_pick', choiceIndex: 1 });
    expect(next.run?.gold).toBe(beforeGold - 50);
    expect(next.screen).toBe('map');
  });

  it('event_pick with heal restores hp (capped at maxHp)', () => {
    const s = eventState();
    s.run!.hp = 50;
    s.event!.choices = [
      { text: '恢复', effect: { type: 'gain_hp', amount: 100 } },
    ];
    const m = new GameStateMachine(s);
    const next = m.dispatch({ type: 'event_pick', choiceIndex: 0 });
    expect(next.run?.hp).toBe(s.run!.maxHp);
  });
});

describe('GameStateMachine — rest', () => {
  function restState(): GameState {
    return {
      ...stateWithMap(buildTinyMap()),
      screen: 'rest',
    };
  }

  it('rest_heal restores 30% maxHp', () => {
    const s = restState();
    s.run!.hp = 30;
    s.run!.maxHp = 75;
    const m = new GameStateMachine(s);
    const next = m.dispatch({ type: 'rest_heal' });
    expect(next.run?.hp).toBe(30 + Math.floor(75 * 0.3));
  });

  it('rest_heal caps at maxHp', () => {
    const s = restState();
    s.run!.hp = 70;
    s.run!.maxHp = 75;
    const m = new GameStateMachine(s);
    const next = m.dispatch({ type: 'rest_heal' });
    expect(next.run?.hp).toBe(75);
  });

  it('rest_upgrade_random marks one deck card as UPGRADED', () => {
    const s = restState();
    s.run!.deck = ['sword_strike', 'sword_strike', 'sword_defend'];
    const m = new GameStateMachine(s);
    const next = m.dispatch({ type: 'rest_upgrade_random' });
    expect(next.run?.deck.some((id) => id.includes('UPGRADED'))).toBe(true);
  });

  it('rest_remove_random removes a card from deck', () => {
    const s = restState();
    s.run!.deck = ['sword_strike', 'sword_strike', 'sword_defend'];
    const m = new GameStateMachine(s);
    const next = m.dispatch({ type: 'rest_remove_random' });
    expect(next.run?.deck.length).toBe(2);
  });

  it('rest_leave advances to map', () => {
    const m = new GameStateMachine(restState());
    const next = m.dispatch({ type: 'rest_leave' });
    expect(next.screen).toBe('map');
  });
});

describe('GameStateMachine — game_over / victory stubs', () => {
  it('game_over_choice keepSave=true clears run but keeps state on game_over', () => {
    const m = new GameStateMachine(stateWithScreen('game_over'));
    const next = m.dispatch({ type: 'game_over_choice', keepSave: true });
    // Stub: stays on game_over screen; Part 2 will own the full view.
    expect(next.screen).toBe('game_over');
  });

  it('victory_continue stays on victory screen (stub)', () => {
    const m = new GameStateMachine(stateWithScreen('victory'));
    const next = m.dispatch({ type: 'victory_continue' });
    expect(next.screen).toBe('victory');
  });
});

describe('GameStateMachine — transition callbacks', () => {
  it('onTransition fires when screen changes', () => {
    const m = new GameStateMachine(freshState());
    const calls: Array<[string, string]> = [];
    m.onTransition((from, to) => calls.push([from, to]));
    m.dispatch({ type: 'menu_select', action: 'start' });
    expect(calls).toEqual([['main_menu', 'character_select']]);
  });

  it('onTransition does NOT fire when screen stays the same', () => {
    const m = new GameStateMachine(freshState());
    const calls: Array<[string, string]> = [];
    m.onTransition((from, to) => calls.push([from, to]));
    m.dispatch({ type: 'menu_select', action: 'quit' });
    expect(calls).toEqual([]);
  });

  it('multiple listeners all fire', () => {
    const m = new GameStateMachine(freshState());
    let a = 0;
    let b = 0;
    m.onTransition(() => a++);
    m.onTransition(() => b++);
    m.dispatch({ type: 'menu_select', action: 'start' });
    expect(a).toBe(1);
    expect(b).toBe(1);
  });
});
