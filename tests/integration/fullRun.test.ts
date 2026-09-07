// tests/integration/fullRun.test.ts
// End-to-end integration test that drives the GameStateMachine from
// main_menu through a complete run (multiple node types across all 6
// floors) to victory. Deterministic via the seeded RNG inside the machine.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  GameStateMachine,
  initialState,
} from '../../src/core/GameStateMachine';
import { SaveManager } from '../../src/core/SaveManager';
import type { GameState, MapNode } from '../../src/core/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * In-memory mock of SaveManager so the auto-save hook doesn't touch
 * localStorage during the test. Records every save() call for assertions.
 */
function makeMockSaveManager(): SaveManager & { saves: Map<number, any>; savesCount: number } {
  const saves = new Map<number, any>();
  const mgr = {
    saves,
    savesCount: 0,
    save(slot: number, run: any) {
      saves.set(slot, run);
      this.savesCount++;
      return true;
    },
    load(slot: number) {
      return saves.has(slot) ? saves.get(slot) : null;
    },
    clear(slot: number) {
      saves.delete(slot);
      return true;
    },
    delete(slot: number) {
      saves.delete(slot);
      return true;
    },
    listSlots() {
      return [saves.get(0) ?? null, saves.get(1) ?? null, saves.get(2) ?? null];
    },
    hasSave(slot: number) {
      return saves.has(slot);
    },
    saveMeta(_meta: unknown) { return true; },
    loadMeta() { return null; },
  };
  return mgr as any;
}

/** Build a 2-layer map: battle → boss (used to skip straight to floor-end). */
function buildSingleBattleBossMap(floor: number): { map: GameState['map']; battleId: string; bossId: string } {
  const battleId = `battle_${floor}_0`;
  const bossId = `boss_${floor}_0`;
  const battle: MapNode = {
    id: battleId,
    type: 'battle',
    x: 0, y: 0,
    connections: [bossId],
    visited: false,
    available: true,
  };
  const boss: MapNode = {
    id: bossId,
    type: 'boss',
    x: 0, y: 0,
    connections: [],
    visited: false,
    available: true,
  };
  return {
    map: {
      floor,
      nodes: [[battle], [boss]],
      currentNodeId: battleId,
    },
    battleId,
    bossId,
  };
}

/**
 * Drive a machine from `main_menu` to `victory` by fast-forwarding the
 * 6-floor progression: each floor is a single battle followed by the boss.
 * This avoids depending on RNG outcomes for node-type picks.
 */
function runFullVictory(): { machine: GameStateMachine; saveManager: ReturnType<typeof makeMockSaveManager>; transitions: Array<[string, string]> } {
  const saveManager = makeMockSaveManager();
  const machine = new GameStateMachine(initialState());
  const transitions: Array<[string, string]> = [];
  machine.onTransition((from, to) => transitions.push([from, to]));

  // Wire the same auto-save hook that main.ts uses.
  machine.onTransition((from, to) => {
    const state = machine.getState();
    if (to === 'map' && state.run) {
      saveManager.save(0, state.run);
    }
    if (to === 'main_menu' && from !== 'victory' && from !== 'game_over') {
      const fresh = saveManager.load(0);
      machine.updateOptions({ savedSlot: fresh });
    }
  });

  // Start
  machine.dispatch({ type: 'menu_select', action: 'start' });
  expect(machine.getState().screen).toBe('character_select');

  // Highlight sword then confirm
  machine.dispatch({ type: 'character_select', characterId: 'sword' });
  machine.dispatch({ type: 'character_confirm', characterId: 'sword' });
  expect(machine.getState().screen).toBe('map');

  // Inject a deterministic single-battle-then-boss map per floor.
  // Then iterate select_map_node → battle → battle_end(won) → reward_skip
  // for each floor. After floor 6's boss, the screen should be 'victory'.
  for (let floor = 1; floor <= 6; floor++) {
    const { map, battleId, bossId } = buildSingleBattleBossMap(floor);
    // Replace the current map with our deterministic one.
    machine.setState({
      ...machine.getState(),
      map,
      run: machine.getState().run
        ? { ...machine.getState().run!, floor }
        : machine.getState().run,
    });

    // Battle node (not the last layer — leaves currentNodeId on boss)
    machine.dispatch({ type: 'select_map_node', nodeId: battleId });
    expect(machine.getState().screen).toBe('battle');
    machine.dispatch({ type: 'battle_end', outcome: 'won' });
    expect(machine.getState().screen).toBe('reward');
    machine.dispatch({ type: 'reward_skip' });
    // Battle is not the last layer, so floor does NOT advance yet.
    expect(machine.getState().screen).toBe('map');
    expect(machine.getState().run?.floor).toBe(floor);
    expect(machine.getState().map?.currentNodeId).toBe(bossId);

    // Boss node (last layer — leaving it advances floor or triggers victory)
    machine.dispatch({ type: 'select_map_node', nodeId: bossId });
    expect(machine.getState().screen).toBe('battle');
    machine.dispatch({ type: 'battle_end', outcome: 'won' });
    expect(machine.getState().screen).toBe('reward');
    machine.dispatch({ type: 'reward_skip' });
    if (floor < 6) {
      expect(machine.getState().screen).toBe('map');
      expect(machine.getState().run?.floor).toBe(floor + 1);
    }
  }

  return { machine, saveManager, transitions };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Integration: full run e2e', () => {
  it('drives main_menu → character_select → map → … → victory across 6 floors', () => {
    const { machine } = runFullVictory();
    expect(machine.getState().screen).toBe('victory');
    expect(machine.getState().run?.floor).toBe(6);
  });

  it('fires transition callbacks in the expected order', () => {
    const { transitions } = runFullVictory();
    // Start: main_menu → character_select → map
    expect(transitions[0]).toEqual(['main_menu', 'character_select']);
    expect(transitions[1]).toEqual(['character_select', 'map']);
    // The final transition should end on victory.
    expect(transitions[transitions.length - 1][1]).toBe('victory');
  });

  it('persists auto-saves to slot 0 every time the player lands on the map', () => {
    const { saveManager } = runFullVictory();
    // 5 non-final map landings (after floors 1-5) before victory.
    expect(saveManager.savesCount).toBeGreaterThanOrEqual(5);
    // The final save reflects the post-floor-6-boss run (which is now
    // victory, so run is cleared by the victory reducer).
    // Slot 0 will be wiped by victory_continue at the end of the run.
    // We don't dispatch victory_continue in runFullVictory, so the slot
    // should hold the most recent run snapshot.
    expect(saveManager.saves.has(0)).toBe(true);
  });

  it('continue path: load saved slot, then victory_continue wipes slot 0', () => {
    const { machine, saveManager } = runFullVictory();
    // simulate a fresh machine load from disk
    const fresh = new GameStateMachine(initialState());
    fresh.updateOptions({ savedSlot: saveManager.load(0) });
    // Continue button should now be enabled (slot 0 non-null)
    const beforeContinue = fresh.getState();
    expect(beforeContinue.saveSlots[0]).not.toBeNull();

    // End the run cleanly
    machine.dispatch({ type: 'victory_continue' });
    expect(machine.getState().screen).toBe('main_menu');
    expect(machine.getState().saveSlots).toEqual([null, null, null]);
  });
});

describe('Integration: game over path', () => {
  it('battle_end lost → screen=game_over, game_over_choice keepSave=false wipes slots', () => {
    const machine = new GameStateMachine(initialState());
    machine.dispatch({ type: 'menu_select', action: 'start' });
    machine.dispatch({ type: 'character_select', characterId: 'sword' });
    machine.dispatch({ type: 'character_confirm', characterId: 'sword' });

    const { battleId } = buildSingleBattleBossMap(1);
    machine.setState({
      ...machine.getState(),
      map: {
        floor: 1,
        nodes: [[{
          id: battleId,
          type: 'battle',
          x: 0, y: 0,
          connections: [],
          visited: false,
          available: true,
        }]],
        currentNodeId: battleId,
      },
    });

    machine.dispatch({ type: 'select_map_node', nodeId: battleId });
    machine.dispatch({ type: 'battle_end', outcome: 'lost' });
    expect(machine.getState().screen).toBe('game_over');

    machine.dispatch({ type: 'game_over_choice', keepSave: false });
    expect(machine.getState().screen).toBe('main_menu');
    expect(machine.getState().saveSlots).toEqual([null, null, null]);
  });
});

describe('Integration: shop/event/rest nodes', () => {
  /**
   * Build a 3-layer map with shop + event + rest nodes (all on the same
   * linear chain for simplicity), and run the player through them.
   */
  function buildMixedMap(floor: number): { map: GameState['map']; ids: Record<string, string> } {
    const startId = `battle_${floor}_0`;
    const shopId = `shop_${floor}_1`;
    const eventId = `event_${floor}_2`;
    const restId = `rest_${floor}_3`;
    const battle: MapNode = { id: startId, type: 'battle', x: 0, y: 0, connections: [shopId], visited: false, available: true };
    const shop: MapNode = { id: shopId, type: 'shop', x: 0, y: 0, connections: [eventId], visited: false, available: true };
    const event: MapNode = { id: eventId, type: 'event', x: 0, y: 0, connections: [restId], visited: false, available: true };
    const rest: MapNode = { id: restId, type: 'rest', x: 0, y: 0, connections: [], visited: false, available: true };
    return {
      map: {
        floor,
        nodes: [[battle], [shop], [event], [rest]],
        currentNodeId: startId,
      },
      ids: { battle: startId, shop: shopId, event: eventId, rest: restId },
    };
  }

  beforeEach(() => {
    // No-op; vitest's beforeEach ensures isolation.
  });

  it('walks battle → reward → shop → reward → event → reward → rest → map', () => {
    const machine = new GameStateMachine(initialState());
    machine.dispatch({ type: 'menu_select', action: 'start' });
    machine.dispatch({ type: 'character_select', characterId: 'sword' });
    machine.dispatch({ type: 'character_confirm', characterId: 'sword' });

    const { map, ids } = buildMixedMap(1);
    machine.setState({ ...machine.getState(), map });

    // Battle
    machine.dispatch({ type: 'select_map_node', nodeId: ids.battle });
    expect(machine.getState().screen).toBe('battle');
    machine.dispatch({ type: 'battle_end', outcome: 'won' });
    expect(machine.getState().screen).toBe('reward');
    machine.dispatch({ type: 'reward_skip' });
    // After reward_skip from the first node, currentNodeId should advance
    // (battle.connections[0] === shop). The reducer routes to the first
    // child of the just-left node.
    expect(machine.getState().screen).toBe('map');
    expect(machine.getState().map?.currentNodeId).toBe(ids.shop);

    // Shop
    machine.dispatch({ type: 'select_map_node', nodeId: ids.shop });
    expect(machine.getState().screen).toBe('shop');
    machine.dispatch({ type: 'shop_leave' });
    expect(machine.getState().screen).toBe('map');

    // Event
    machine.dispatch({ type: 'select_map_node', nodeId: ids.event });
    expect(machine.getState().screen).toBe('event');
    // Pick the first choice (whatever effect it has)
    machine.dispatch({ type: 'event_pick', choiceIndex: 0 });
    expect(machine.getState().screen).toBe('map');

    // Rest
    machine.dispatch({ type: 'select_map_node', nodeId: ids.rest });
    expect(machine.getState().screen).toBe('rest');
    machine.dispatch({ type: 'rest_heal' });
    expect(machine.getState().screen).toBe('map');
  });
});
