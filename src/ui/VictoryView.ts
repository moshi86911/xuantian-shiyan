// src/ui/VictoryView.ts
// Victory screen shown after defeating the floor-6 boss. Displays run stats
// and a single continue button to return to the main menu.

import { InkStyle } from './style';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VictoryStats {
  floor: number;
  durationMs: number;
  finalHp: number;
  maxHp: number;
}

export interface VictoryHitboxes {
  continueBtn: Box;
}

const BTN_WIDTH = 240;
const BTN_HEIGHT = 64;

const CHARACTER_NAME: Record<string, string> = {
  sword: '凌霄',
  talisman: '清虚',
  alchemy: '素心',
};

/**
 * Render the victory screen.
 *
 * @param characterId  Character id (used to show the cultivator's name).
 */
export function renderVictory(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stats: VictoryStats,
  characterId?: string,
): void {
  // Background
  ctx.fillStyle = InkStyle.background;
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = InkStyle.gold;
  ctx.font = `bold 80px "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('道 成 飞 升', width / 2, height * 0.22);

  // Subtitle
  const characterName = characterId ? CHARACTER_NAME[characterId] ?? '修士' : '修士';
  ctx.fillStyle = InkStyle.paper;
  ctx.font = `26px "KaiTi", serif`;
  ctx.fillText(`${characterName} 历经 ${stats.floor} 层试炼`, width / 2, height * 0.34);

  // Stats panel
  ctx.fillStyle = 'rgba(245, 232, 200, 0.08)';
  ctx.fillRect(width * 0.2, height * 0.42, width * 0.6, height * 0.18);
  ctx.strokeStyle = InkStyle.gold;
  ctx.lineWidth = 1;
  ctx.strokeRect(width * 0.2, height * 0.42, width * 0.6, height * 0.18);

  ctx.fillStyle = InkStyle.paper;
  ctx.font = `20px "KaiTi", serif`;
  const lines = [
    `通关层数: ${stats.floor}`,
    `耗时: ${formatDuration(stats.durationMs)}`,
    `剩余生命: ${stats.finalHp} / ${stats.maxHp}`,
  ];
  let ty = height * 0.46 + 18;
  for (const line of lines) {
    ctx.fillText(line, width / 2, ty);
    ty += 32;
  }

  // Continue button
  const boxes = getVictoryHitboxes(width, height);
  drawButton(ctx, boxes.continueBtn, InkStyle.gold, '返回主菜单');
}

/**
 * Hitbox for the single victory continue button.
 */
export function getVictoryHitboxes(width: number, height: number): VictoryHitboxes {
  return {
    continueBtn: {
      x: width / 2 - BTN_WIDTH / 2,
      y: height * 0.72,
      width: BTN_WIDTH,
      height: BTN_HEIGHT,
    },
  };
}

function formatDuration(ms: number): string {
  if (ms < 0 || !Number.isFinite(ms)) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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
  ctx.fillStyle = InkStyle.ink;
  ctx.font = `bold 22px "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, btn.x + btn.width / 2, btn.y + btn.height / 2);
  ctx.textBaseline = 'alphabetic';
}
