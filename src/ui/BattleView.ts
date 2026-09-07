// src/ui/BattleView.ts
// Battle screen rendering.
import type { BattleState, PlayerState, EnemyState } from '../core/types';
import { InkStyle } from './style';

const HAND_Y_OFFSET = 60;     // distance from bottom of canvas

export interface EndTurnButtonBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function renderBattle(
  ctx: CanvasRenderingContext2D,
  battle: BattleState,
  width: number,
  height: number
): void {
  drawBackground(ctx, width, height);
  drawEnemyArea(ctx, battle.enemies, width, height);
  drawPlayerStatus(ctx, battle.player, width, height);
  drawHand(ctx, battle, width, height);
  drawEndTurnButton(ctx, width, height, battle);
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = InkStyle.background;
  ctx.fillRect(0, 0, width, height);
}

function drawEnemyArea(
  ctx: CanvasRenderingContext2D,
  enemies: EnemyState[],
  width: number,
  height: number
): void {
  if (enemies.length === 0) return;
  const enemyY = height * 0.2;
  const enemyWidth = 180;
  const enemyHeight = 200;
  const totalWidth = enemies.length * (enemyWidth + 40) - 40;
  let startX = (width - totalWidth) / 2;
  for (const enemy of enemies) {
    drawEnemy(ctx, enemy, startX, enemyY, enemyWidth, enemyHeight);
    startX += enemyWidth + 40;
  }
}

function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyState,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  // Background panel
  ctx.fillStyle = 'rgba(245, 232, 200, 0.1)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = InkStyle.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  // Name
  ctx.fillStyle = InkStyle.paper;
  ctx.font = `bold 18px "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.fillText(enemy.name, x + w / 2, y + 20);

  // HP bar
  const hpBarX = x + 10;
  const hpBarY = y + h - 30;
  const hpBarW = w - 20;
  const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(hpBarX, hpBarY, hpBarW, 12);
  ctx.fillStyle = hpRatio > 0.5 ? InkStyle.jade : hpRatio > 0.25 ? InkStyle.gold : InkStyle.vermillion;
  ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, 12);

  // HP text
  ctx.fillStyle = InkStyle.paper;
  ctx.font = `12px "KaiTi", serif`;
  ctx.fillText(`${enemy.hp}/${enemy.maxHp}`, x + w / 2, hpBarY + 10);

  // Intent indicator (next intent)
  const intent = enemy.intents[enemy.currentIntentIndex];
  if (intent) {
    ctx.fillStyle = intent.type === 'attack' ? InkStyle.vermillion : InkStyle.paper;
    ctx.font = `bold 24px "KaiTi", serif`;
    const intentText = intent.type === 'attack' ? `${intent.value}` : intent.type === 'defend' ? `${intent.value}` : '?';
    ctx.fillText(intentText, x + w / 2, y + h / 2);
  }
}

function drawPlayerStatus(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  width: number,
  _height: number
): void {
  const statusY = 10;
  const startX = 20;

  drawStat(ctx, startX, statusY, 'HP', `${player.hp}/${player.maxHp}`, InkStyle.vermillion);
  drawStat(ctx, startX + 150, statusY, '能量', `${player.energy}/${player.maxEnergy}`, InkStyle.gold);
  drawStat(ctx, startX + 300, statusY, '灵气', `${player.qi}/${player.maxQi}`, InkStyle.cardTypes.qi);
  if (player.block > 0) {
    drawStat(ctx, startX + 450, statusY, '格挡', String(player.block), InkStyle.block);
  }
  drawStat(ctx, startX + 600, statusY, '金币', String(player.gold), InkStyle.gold);

  // Suppress unused width parameter lint
  void width;
}

function drawStat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  value: string,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.font = `bold 18px "KaiTi", serif`;
  ctx.textAlign = 'left';
  ctx.fillText(`${label}: ${value}`, x, y + 20);
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  battle: BattleState,
  width: number,
  height: number
): void {
  const hand = battle.player.hand;
  if (!hand || hand.length === 0) return;
  // Hand is an array of card IDs in PlayerState; for visual representation we
  // simply show the count and let the input handler deal with selection.
  ctx.fillStyle = InkStyle.paper;
  ctx.font = `14px "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`手牌: ${hand.length} 张`, width / 2, height - HAND_Y_OFFSET - 20);
}

function drawEndTurnButton(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _battle: BattleState
): void {
  const btn = getEndTurnButton(width, height);
  ctx.fillStyle = InkStyle.gold;
  ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
  ctx.strokeStyle = InkStyle.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
  ctx.fillStyle = InkStyle.ink;
  ctx.font = `bold 18px "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('结束回合', btn.x + btn.width / 2, btn.y + btn.height / 2);
  ctx.textBaseline = 'alphabetic';
}

/** Compute the end-turn button rectangle for the given canvas dimensions. */
export function getEndTurnButton(width: number, height: number): EndTurnButtonBounds {
  return { x: width - 130, y: height - 80, width: 110, height: 50 };
}