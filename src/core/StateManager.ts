import type { GameState, GameScreen, MetaState } from './types';

type Listener = (state: GameState) => void;

const DEFAULT_META: MetaState = {
  unlockedCharacters: ['sword'],
  unlockedCards: [],
  achievements: [],
  stats: {
    totalRuns: 0,
    totalWins: 0,
    bestFloor: 0,
    fastestWin: 0
  }
};

export class StateManager {
  private state: GameState;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.state = {
      screen: 'main_menu',
      meta: structuredClone(DEFAULT_META),
      saveSlots: [null, null, null]
    };
  }

  getState(): GameState {
    return this.state;
  }

  setScreen(screen: GameScreen): void {
    this.state = { ...this.state, screen };
    this.notify();
  }

  setRun(run: GameState['run']): void {
    this.state = { ...this.state, run };
    this.notify();
  }

  setBattle(battle: GameState['battle']): void {
    this.state = { ...this.state, battle };
    this.notify();
  }

  setMap(map: GameState['map']): void {
    this.state = { ...this.state, map };
    this.notify();
  }

  updateMeta(updater: (meta: MetaState) => MetaState): void {
    this.state = {
      ...this.state,
      meta: updater(this.state.meta)
    };
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
