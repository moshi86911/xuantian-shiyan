// src/ui/RestView.ts
// Rest site — offers 3 actions (heal 30%, upgrade random card, remove random
// card) plus a leave button. Pure render + hitboxes.

import { InkStyle } from './style';

export interface RestButtonBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  kind: 'heal' | 'upgrade' | 'remove' | 'leave';
}

export interface RestHitboxes {
  heal: RestButtonBounds;
  upgrade: RestButtonBounds;
  remove: RestButtonBounds;
  leave: RestButtonBounds;
}

const REST_BUTTON_WIDTH = 220;
const REST_BUTTON_HEIGHT = 60;
const REST_BUTTON_GAP = 20;

export function renderRest(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  hp: number,
  maxHp: number,
): void {
  // Background
  ctx.fillStyle = InkStyle.background;
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = InkStyle.jade;
  ctx.font = InkStyle.font.title;
  ctx.textAlign = 'center';
  ctx.fillText('休整之地', width / 2, height * 0.15);

  // HP info
  ctx.fillStyle = InkStyle.paper;
  ctx.font = InkStyle.font.body;
  ctx.fillText(`当前生命: ${hp} / ${maxHp}`, width / 2, height * 0.25);

  const healAmount = Math.floor(maxHp * 0.3);
  ctx.fillStyle = InkStyle.vermillion;
  ctx.font = `16px "KaiTi", serif`;
  ctx.fillText(`恢复 30% 生命 (+${healAmount})`, width / 2, height * 0.25 + 30);

  // Buttons
  const hitboxes = getRestHitboxes(width, height);
  drawRestButton(ctx, hitboxes.heal, InkStyle.vermillion, hp >= maxHp);
  drawRestButton(ctx, hitboxes.upgrade, InkStyle.gold, false);
  drawRestButton(ctx, hitboxes.remove, InkStyle.indigo, false);
  drawRestButton(ctx, hitboxes.leave, InkStyle.block, false);
}

function drawRestButton(
  ctx: CanvasRenderingContext2D,
  btn: RestButtonBounds,
  fill: string,
  dim: boolean,
): void {
  ctx.fillStyle = dim ? '#555' : fill;
  ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
  ctx.strokeStyle = InkStyle.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
  ctx.fillStyle = InkStyle.ink;
  ctx.font = `bold 18px "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2);
  ctx.textBaseline = 'alphabetic';
}

export function getRestHitboxes(width: number, height: number): RestHitboxes {
  const centerX = width / 2;
  const startY = height * 0.4;
  return {
    heal: {
      x: centerX - REST_BUTTON_WIDTH / 2,
      y: startY,
      width: REST_BUTTON_WIDTH,
      height: REST_BUTTON_HEIGHT,
      label: '打坐疗伤',
      kind: 'heal',
    },
    upgrade: {
      x: centerX - REST_BUTTON_WIDTH / 2,
      y: startY + REST_BUTTON_HEIGHT + REST_BUTTON_GAP,
      width: REST_BUTTON_WIDTH,
      height: REST_BUTTON_HEIGHT,
      label: '升级一张牌',
      kind: 'upgrade',
    },
    remove: {
      x: centerX - REST_BUTTON_WIDTH / 2,
      y: startY + 2 * (REST_BUTTON_HEIGHT + REST_BUTTON_GAP),
      width: REST_BUTTON_WIDTH,
      height: REST_BUTTON_HEIGHT,
      label: '移除一张牌',
      kind: 'remove',
    },
    leave: {
      x: centerX - REST_BUTTON_WIDTH / 2,
      y: startY + 3 * (REST_BUTTON_HEIGHT + REST_BUTTON_GAP),
      width: REST_BUTTON_WIDTH,
      height: REST_BUTTON_HEIGHT,
      label: '继续上路',
      kind: 'leave',
    },
  };
}
