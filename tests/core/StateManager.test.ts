import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '../../src/core/StateManager';

describe('StateManager', () => {
  let manager: StateManager;

  beforeEach(() => {
    manager = new StateManager();
  });

  it('initializes with default state', () => {
    const state = manager.getState();
    expect(state.screen).toBe('main_menu');
    expect(state.meta.unlockedCharacters).toContain('sword');
  });

  it('notifies subscribers on state change', () => {
    let notified = false;
    manager.subscribe(() => { notified = true; });
    manager.setScreen('character_select');
    expect(notified).toBe(true);
    expect(manager.getState().screen).toBe('character_select');
  });

  it('supports multiple subscribers', () => {
    let count = 0;
    manager.subscribe(() => count++);
    manager.subscribe(() => count++);
    manager.setScreen('character_select');
    expect(count).toBe(2);
  });

  it('unsubscribe stops notifications', () => {
    let count = 0;
    const unsub = manager.subscribe(() => count++);
    manager.setScreen('character_select');
    expect(count).toBe(1);
    unsub();
    manager.setScreen('main_menu');
    expect(count).toBe(1);
  });

  it('updateMeta merges new meta state', () => {
    manager.updateMeta(meta => ({
      ...meta,
      unlockedCharacters: ['sword', 'talisman']
    }));
    expect(manager.getState().meta.unlockedCharacters).toContain('talisman');
  });

  it('saveSlots initialized to 3 nulls', () => {
    expect(manager.getState().saveSlots).toEqual([null, null, null]);
  });
});
