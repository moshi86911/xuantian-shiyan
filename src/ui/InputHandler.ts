// src/ui/InputHandler.ts
// Mouse/keyboard input -> high-level action translation.
import type { GameState } from '../core/types';
import { CARD_WIDTH, CARD_HEIGHT } from './CardView';
import { MAP_NODE_RADIUS } from './MapView';
import { getEndTurnButton } from './BattleView';
import { MENU_ACTIONS } from './MenuView';

export type InputAction =
  | { type: 'play_card'; cardIndex: number; targetIndex: number }
  | { type: 'end_turn' }
  | { type: 'select_map_node'; nodeId: string }
  | { type: 'menu_select'; action: string }
  | { type: 'noop' };

const HAND_GAP = 10;
const HAND_CARD_Y_OFFSET = 100; // distance from bottom

export class InputHandler {
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  /**
   * Convert a mouse event to an InputAction given the current state.
   */
  handleClick(event: MouseEvent, state: GameState): InputAction {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    switch (state.screen) {
      case 'main_menu':
        return this.handleMenuClick(x, y, this.canvas.width, this.canvas.height);
      case 'battle':
        return this.handleBattleClick(x, y, state, this.canvas.width, this.canvas.height);
      case 'map':
        return this.handleMapClick(x, y, state);
      default:
        return { type: 'noop' };
    }
  }

  private handleMenuClick(x: number, y: number, width: number, height: number): InputAction {
    const itemsY = height * 0.55;
    if (x > width * 0.3 && x < width * 0.7) {
      for (let i = 0; i < MENU_ACTIONS.length; i++) {
        const itemY = itemsY + i * 50;
        if (y > itemY - 24 && y < itemY + 24) {
          return { type: 'menu_select', action: MENU_ACTIONS[i] };
        }
      }
    }
    return { type: 'noop' };
  }

  private handleBattleClick(
    x: number,
    y: number,
    state: GameState,
    width: number,
    height: number
  ): InputAction {
    // Check end turn button
    const btn = getEndTurnButton(width, height);
    if (
      x >= btn.x &&
      x <= btn.x + btn.width &&
      y >= btn.y &&
      y <= btn.y + btn.height
    ) {
      return { type: 'end_turn' };
    }

    // Check card click
    if (state.battle) {
      const hand = state.battle.player.hand;
      const handX = width / 2 - (hand.length * (CARD_WIDTH + HAND_GAP)) / 2;
      const cardY = height - HAND_CARD_Y_OFFSET;
      for (let i = 0; i < hand.length; i++) {
        const cx = handX + i * (CARD_WIDTH + HAND_GAP);
        if (
          x >= cx &&
          x <= cx + CARD_WIDTH &&
          y >= cardY &&
          y <= cardY + CARD_HEIGHT
        ) {
          return { type: 'play_card', cardIndex: i, targetIndex: 0 };
        }
      }
    }

    return { type: 'noop' };
  }

  private handleMapClick(x: number, y: number, state: GameState): InputAction {
    if (!state.map) return { type: 'noop' };
    for (const layer of state.map.nodes) {
      for (const node of layer) {
        if (!node.available || node.visited) continue;
        const dx = x - node.x;
        const dy = y - node.y;
        if (dx * dx + dy * dy <= MAP_NODE_RADIUS * MAP_NODE_RADIUS) {
          return { type: 'select_map_node', nodeId: node.id };
        }
      }
    }
    return { type: 'noop' };
  }
}