// src/ui/CardView.ts
// Single card rendering with ink-wash aesthetic.
import type { Card } from '../core/types';
import { InkStyle, drawPaperRect, drawCardFrame } from './style';

export const CARD_WIDTH = 140;
export const CARD_HEIGHT = 200;

export interface CardRenderOptions {
  selected?: boolean;
  playable?: boolean;
  hovered?: boolean;
}

export interface CardBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function renderCard(
  ctx: CanvasRenderingContext2D,
  card: Card,
  x: number,
  y: number,
  options: CardRenderOptions = {}
): void {
  const w = CARD_WIDTH;
  const h = CARD_HEIGHT;
  const scale = options.hovered ? 1.1 : 1;
  const dw = w * scale;
  const dh = h * scale;
  const dx = x - (dw - w) / 2;
  const dy = y - (dh - h) / 2;

  // Card background
  drawPaperRect(ctx, dx, dy, dw, dh);

  // Rarity color border
  const borderColor = InkStyle.rarity[card.rarity];
  drawCardFrame(ctx, dx, dy, dw, dh, borderColor);

  // Card type stripe
  ctx.fillStyle = InkStyle.cardTypes[card.type];
  ctx.fillRect(dx, dy, dw, 6);

  // Cost badge (top-left)
  const costRadius = 14;
  const costX = dx + 14;
  const costY = dy + 14;
  ctx.fillStyle = InkStyle.gold;
  ctx.beginPath();
  ctx.arc(costX, costY, costRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = InkStyle.ink;
  ctx.font = `bold 16px "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(card.cost), costX, costY);

  // Qi cost (top-right, if > 0)
  if (card.qiCost) {
    const qiX = dx + dw - 14;
    ctx.fillStyle = InkStyle.cardTypes.qi;
    ctx.beginPath();
    ctx.arc(qiX, costY, costRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(String(card.qiCost), qiX, costY);
  }

  // Card name
  ctx.fillStyle = InkStyle.ink;
  ctx.font = `bold ${18 * scale}px "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(card.name, dx + dw / 2, dy + 40);

  // Description (wrapped)
  ctx.font = `${14 * scale}px "KaiTi", serif`;
  const lines = wrapText(ctx, card.description, dw - 20);
  let lineY = dy + 80;
  for (const line of lines) {
    ctx.fillText(line, dx + dw / 2, lineY);
    lineY += 18 * scale;
    if (lineY > dy + dh - 20) break;
  }

  // Playable indicator (greyed out)
  if (options.playable === false) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(dx, dy, dw, dh);
  }

  // Selected indicator
  if (options.selected) {
    ctx.strokeStyle = InkStyle.vermillion;
    ctx.lineWidth = 4;
    ctx.strokeRect(dx - 2, dy - 2, dw + 4, dh + 4);
    ctx.lineWidth = 1;
  }
}

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  let current = '';
  for (const char of text) {
    const test = current + char;
    const metrics = ctx.measureText(test);
    if (metrics.width > maxWidth && current.length > 0) {
      lines.push(current);
      current = char;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function getCardBounds(x: number, y: number, hovered: boolean = false): CardBounds {
  const scale = hovered ? 1.1 : 1;
  const w = CARD_WIDTH * scale;
  const h = CARD_HEIGHT * scale;
  return {
    x: x - (w - CARD_WIDTH) / 2,
    y: y - (h - CARD_HEIGHT) / 2,
    width: w,
    height: h,
  };
}