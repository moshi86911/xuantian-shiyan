// src/ui/InputHandler.ts
// Mouse/keyboard input -> high-level action translation.
import type { GameState } from '../core/types';
import { CARD_WIDTH, CARD_HEIGHT } from './CardView';
import { MAP_NODE_RADIUS } from './MapView';
import { getEndTurnButton } from './BattleView';
import { MENU_ACTIONS } from './MenuView';
import { getCharacterSelectHitboxes } from './CharacterSelectView';
import { getRewardHitboxes } from './RewardView';
import { getShopHitboxes } from './ShopView';
import { getEventHitboxes } from './EventView';
import { getRestHitboxes } from './RestView';
import { getGameOverHitboxes } from './GameOverView';
import { getVictoryHitboxes } from './VictoryView';

export type InputAction =
  | { type: 'play_card'; cardIndex: number; targetIndex: number }
  | { type: 'end_turn' }
  | { type: 'select_map_node'; nodeId: string }
  | { type: 'menu_select'; action: string }
  | { type: 'character_select'; characterId: string }
  | { type: 'character_confirm'; characterId: string }
  | { type: 'character_back' }
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
  | { type: 'victory_continue' }
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
    // CSS scaling: convert display-space coords to canvas-internal coords so
    // hitbox math (which uses canvas.width / canvas.height) matches.
    const scaleX = rect.width > 0 ? this.canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? this.canvas.height / rect.height : 1;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    switch (state.screen) {
      case 'main_menu':
        return this.handleMenuClick(x, y, this.canvas.width, this.canvas.height, state);
      case 'character_select':
        return this.handleCharacterSelectClick(x, y, this.canvas.width, this.canvas.height);
      case 'battle':
        return this.handleBattleClick(x, y, state, this.canvas.width, this.canvas.height);
      case 'map':
        return this.handleMapClick(x, y, state);
      case 'reward':
        return this.handleRewardClick(x, y, state, this.canvas.width, this.canvas.height);
      case 'shop':
        return this.handleShopClick(x, y, state, this.canvas.width, this.canvas.height);
      case 'event':
        return this.handleEventClick(x, y, state, this.canvas.width, this.canvas.height);
      case 'rest':
        return this.handleRestClick(x, y, this.canvas.width, this.canvas.height);
      case 'game_over':
        return this.handleGameOverClick(x, y, this.canvas.width, this.canvas.height);
      case 'victory':
        return this.handleVictoryClick(x, y, this.canvas.width, this.canvas.height);
      default:
        return { type: 'noop' };
    }
  }

  private handleMenuClick(
    x: number,
    y: number,
    width: number,
    height: number,
    state: GameState,
  ): InputAction {
    const itemsY = height * 0.55;
    if (x > width * 0.3 && x < width * 0.7) {
      for (let i = 0; i < MENU_ACTIONS.length; i++) {
        const itemY = itemsY + i * 50;
        if (y > itemY - 24 && y < itemY + 24) {
          const action = MENU_ACTIONS[i];
          // Only enable 'start' (always), 'continue' (if slot 0 has a save),
          // and 'quit' (always). Other actions return noop so the UI can
          // grey them out without removing them from the menu list.
          if (action === 'start') return { type: 'menu_select', action: 'start' };
          if (action === 'continue') {
            if (state.saveSlots[0]) return { type: 'menu_select', action: 'continue' };
            return { type: 'noop' };
          }
          if (action === 'quit') return { type: 'menu_select', action: 'quit' };
          // settings / others stay disabled
          return { type: 'noop' };
        }
      }
    }
    return { type: 'noop' };
  }

  private handleCharacterSelectClick(
    x: number,
    y: number,
    width: number,
    height: number,
  ): InputAction {
    const boxes = getCharacterSelectHitboxes(width, height);
    // Check character cards first (highlight only)
    for (const card of boxes.cards) {
      if (
        x >= card.x && x <= card.x + card.width &&
        y >= card.y && y <= card.y + card.height
      ) {
        return { type: 'character_select', characterId: card.characterId };
      }
    }
    // Confirm
    if (
      x >= boxes.confirm.x && x <= boxes.confirm.x + boxes.confirm.width &&
      y >= boxes.confirm.y && y <= boxes.confirm.y + boxes.confirm.height
    ) {
      // The reducer must have a characterId on the action. The view can't
      // tell which one is highlighted without state, so we send a noop here
      // and rely on the caller to issue character_confirm with the saved id.
      // However, the InputHandler is pure (no state read), so we forward
      // the action with a placeholder and let main.ts fill in the id.
      // Better approach: use a `character_confirm` with empty id; the caller
      // patches it with the last-clicked character. Keep the simple flow:
      // caller maintains a "selectedCharacterId" hint.
      return { type: 'character_confirm', characterId: '' };
    }
    // Back
    if (
      x >= boxes.back.x && x <= boxes.back.x + boxes.back.width &&
      y >= boxes.back.y && y <= boxes.back.y + boxes.back.height
    ) {
      return { type: 'character_back' };
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

  private handleRewardClick(
    x: number,
    y: number,
    state: GameState,
    width: number,
    height: number,
  ): InputAction {
    if (!state.reward) return { type: 'noop' };
    const boxes = getRewardHitboxes(width, height, state.reward.cardChoices.length);
    for (const card of boxes.cards) {
      if (
        x >= card.x && x <= card.x + card.width &&
        y >= card.y && y <= card.y + card.height
      ) {
        return { type: 'reward_take', cardIndex: card.cardIndex };
      }
    }
    if (
      x >= boxes.skip.x && x <= boxes.skip.x + boxes.skip.width &&
      y >= boxes.skip.y && y <= boxes.skip.y + boxes.skip.height
    ) {
      return { type: 'reward_skip' };
    }
    return { type: 'noop' };
  }

  private handleShopClick(
    x: number,
    y: number,
    state: GameState,
    width: number,
    height: number,
  ): InputAction {
    if (!state.shop) return { type: 'noop' };
    const boxes = getShopHitboxes(width, height, state.shop);
    for (const card of boxes.cards) {
      if (
        x >= card.x && x <= card.x + card.width &&
        y >= card.y && y <= card.y + card.height
      ) {
        return { type: 'shop_buy', itemIndex: card.itemIndex };
      }
    }
    if (
      x >= boxes.remove.x && x <= boxes.remove.x + boxes.remove.width &&
      y >= boxes.remove.y && y <= boxes.remove.y + boxes.remove.height
    ) {
      return { type: 'shop_remove_random' };
    }
    if (
      x >= boxes.leave.x && x <= boxes.leave.x + boxes.leave.width &&
      y >= boxes.leave.y && y <= boxes.leave.y + boxes.leave.height
    ) {
      return { type: 'shop_leave' };
    }
    return { type: 'noop' };
  }

  private handleEventClick(
    x: number,
    y: number,
    state: GameState,
    width: number,
    height: number,
  ): InputAction {
    if (!state.event) return { type: 'noop' };
    const boxes = getEventHitboxes(width, height, state.event.choices.length);
    for (const c of boxes.choices) {
      if (
        x >= c.x && x <= c.x + c.width &&
        y >= c.y && y <= c.y + c.height
      ) {
        return { type: 'event_pick', choiceIndex: c.choiceIndex };
      }
    }
    return { type: 'noop' };
  }

  private handleRestClick(
    x: number,
    y: number,
    width: number,
    height: number,
  ): InputAction {
    const boxes = getRestHitboxes(width, height);
    if (pointInBox(x, y, boxes.heal)) return { type: 'rest_heal' };
    if (pointInBox(x, y, boxes.upgrade)) return { type: 'rest_upgrade_random' };
    if (pointInBox(x, y, boxes.remove)) return { type: 'rest_remove_random' };
    if (pointInBox(x, y, boxes.leave)) return { type: 'rest_leave' };
    return { type: 'noop' };
  }

  private handleGameOverClick(
    x: number,
    y: number,
    width: number,
    height: number,
  ): InputAction {
    const boxes = getGameOverHitboxes(width, height);
    if (pointInBox(x, y, boxes.continueBtn)) {
      return { type: 'game_over_choice', keepSave: true };
    }
    if (pointInBox(x, y, boxes.restartBtn)) {
      return { type: 'game_over_choice', keepSave: false };
    }
    return { type: 'noop' };
  }

  private handleVictoryClick(
    x: number,
    y: number,
    width: number,
    height: number,
  ): InputAction {
    const boxes = getVictoryHitboxes(width, height);
    if (pointInBox(x, y, boxes.continueBtn)) {
      return { type: 'victory_continue' };
    }
    return { type: 'noop' };
  }
}

function pointInBox(
  x: number,
  y: number,
  box: { x: number; y: number; width: number; height: number },
): boolean {
  return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
}
