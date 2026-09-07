// src/ui/GameOverView.ts
// Game-over screen. Shows the floor reached and offers two choices:
// - Keep save and return to menu (so the player can continue later)
// - Wipe save and return to menu (fresh start)

import { InkStyle } from './style';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameOverHitboxes {
  continueBtn: Box;
  restartBtn: Box;
}

const BTN_WIDTH = 260;
const BTN_HEIGHT = 64;
const BTN_GAP = 30;

const CHARACTER_NAME: Record<string, string> = {
  sword: '凌霄',
  talisman: '清虚',
  alchemy: '素心',
};

/**
 * Render the game-over screen.
 *
 * @param ctx          Canvas 2D context
 * @param width        Canvas width in px
 * @param height       Canvas height in px
 * @param floor        Floor reached in the lost run (for the summary line)
 * @param characterId  Character id (used to show the cultivator's name)
 */
export function renderGameOver(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  floor: number,
  characterId?: string,
): void {
  // Background
  ctx.fillStyle = InkStyle.background;
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = InkStyle.vermillion;
  ctx.font = `bold 72px "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('道 消 身 陨', width / 2, height * 0.28);

  // Summary line
  const characterName = characterId ? CHARACTER_NAME[characterId] ?? '修士' : '修士';
  ctx.fillStyle = InkStyle.paper;
  ctx.font = `24px "KaiTi", serif`;
  ctx.fillText(`${characterName} 在第 ${floor} 层道消`, width / 2, height * 0.38);

  ctx.fillStyle = '#888';
  ctx.font = `18px "KaiTi", serif`;
  ctx.fillText('命数已尽，魂归天地', width / 2, height * 0.38 + 36);

  // Buttons
  const boxes = getGameOverHitboxes(width, height);
  drawButton(ctx, boxes.continueBtn, InkStyle.indigo, '保留存档');
  drawButton(ctx, boxes.restartBtn, InkStyle.vermillion, '重新开始');
}

/**
 * Hitboxes for the two game-over buttons.
 */
export function getGameOverHitboxes(width: number, height: number): GameOverHitboxes {
  const y = height * 0.6;
  return {
    continueBtn: {
      x: width / 2 - BTN_WIDTH - BTN_GAP / 2,
      y,
      width: BTN_WIDTH,
      height: BTN_HEIGHT,
    },
    restartBtn: {
      x: width / 2 + BTN_GAP / 2,
      y,
      width: BTN_WIDTH,
      height: BTN_HEIGHT,
    },
  };
}

function drawButton(
  ctx: CanvasRenderingContext2D,
  btn: Box,
  fill: string,
  label: string,
): void {
  ctx.fillStyle = fill;
  ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
  ctx.strokeStyle = InkStyle.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
  ctx.fillStyle = InkStyle.paper;
  ctx.font = `bold 22px "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, btn.x + btn.width / 2, btn.y + btn.height / 2);
  ctx.textBaseline = 'alphabetic';
}
