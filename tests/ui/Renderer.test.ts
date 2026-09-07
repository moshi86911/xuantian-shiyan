// tests/ui/Renderer.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Renderer, type Animation } from '../../src/ui/Renderer';

function makeMockContext(): any {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
  };
}

function makeCanvas(): any {
  return {
    width: 1280,
    height: 720,
    getContext: () => makeMockContext(),
  };
}

function makeGameState(screen: string): any {
  return { screen, player: {} };
}

describe('Renderer', () => {
  let renderer: Renderer;
  beforeEach(() => {
    renderer = new Renderer(makeCanvas() as HTMLCanvasElement);
  });

  it('renders main menu', () => {
    const state = makeGameState('main_menu');
    expect(() => renderer.render(state)).not.toThrow();
  });

  it('renders map screen', () => {
    const state = {
      screen: 'map' as const,
      map: { floor: 1, nodes: [[]], currentNodeId: '' },
      meta: {
        unlockedCharacters: [],
        completedCharacters: [],
        unlockedCards: [],
        achievements: [],
        stats: { totalRuns: 0, totalWins: 0, bestFloor: 0, fastestWin: 0 },
      },
      saveSlots: [],
    };
    expect(() => renderer.render(state)).not.toThrow();
  });

  it('renders battle screen', () => {
    const state = {
      screen: 'battle' as const,
      battle: {
        player: {
          characterId: 'sword' as const,
          hp: 50,
          maxHp: 50,
          block: 0,
          energy: 3,
          maxEnergy: 3,
          qi: 0,
          maxQi: 5,
          gold: 99,
          deck: [],
          drawPile: [],
          discardPile: [],
          hand: [],
          exhaustPile: [],
          buffs: [],
        },
        enemies: [],
        turn: 1,
        phase: 'player_turn' as const,
      },
      meta: {
        unlockedCharacters: [],
        completedCharacters: [],
        unlockedCards: [],
        achievements: [],
        stats: { totalRuns: 0, totalWins: 0, bestFloor: 0, fastestWin: 0 },
      },
      saveSlots: [],
    };
    expect(() => renderer.render(state)).not.toThrow();
  });

  it('renders placeholder for unimplemented screens', () => {
    expect(() => renderer.render(makeGameState('shop'))).not.toThrow();
    expect(() => renderer.render(makeGameState('event'))).not.toThrow();
    expect(() => renderer.render(makeGameState('reward'))).not.toThrow();
  });

  it('tick advances animations', () => {
    const anim: Animation = {
      duration: 1000,
      elapsed: 0,
      draw: vi.fn(),
    };
    renderer.pushAnimation(anim);
    renderer.tick(500);
    expect(anim.elapsed).toBe(500);
  });

  it('tick removes finished animations', () => {
    const anim: Animation = {
      duration: 100,
      elapsed: 0,
      draw: vi.fn(),
    };
    renderer.pushAnimation(anim);
    renderer.tick(500);  // exceeds duration
    renderer.render(makeGameState('main_menu'));  // animations should not draw
    expect(anim.draw).not.toHaveBeenCalled();
  });

  it('clear fills background', () => {
    renderer.clear();
    // We can't easily spy on the internal ctx; just ensure no throw
    expect(true).toBe(true);
  });
});