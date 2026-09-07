// src/ui/RewardView.ts
// Reward (post-battle card selection) screen. Shows the 3 card choices and
// a "Skip" button. Pure render + hitbox helpers.

import { InkStyle } from './style';
import type { Card } from '../core/types';

export interface RewardCardBounds {
  cardIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  card: Card;
}

export interface RewardButtonBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export interface RewardHitboxes {
  cards: RewardCardBounds[];
  skip: RewardButtonBounds;
}

const REWARD_CARD_WIDTH = 160;
const REWARD_CARD_HEIGHT = 240;
const REWARD_CARD_GAP = 30;
const REWARD_SKIP_WIDTH = 160;
const REWARD_SKIP_HEIGHT = 50;

/**
 * Render the reward screen showing up to 3 card choices.
 */
export function renderReward(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  choices: Card[],
): void {
  // Background
  ctx.fillStyle = InkStyle.background;
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = InkStyle.gold;
  ctx.font = InkStyle.font.title;
  ctx.textAlign = 'center';
  ctx.fillText('战斗胜利', width / 2, height * 0.1);

  ctx.fillStyle = InkStyle.paper;
  ctx.font = InkStyle.font.heading;
  ctx.fillText('选择一张牌加入卡组', width / 2, height * 0.1 + 50);

  // Cards
  const hitboxes = getRewardHitboxes(width, height, choices.length);
  for (const c of hitboxes.cards) {
    drawRewardCard(ctx, c);
  }

  // Skip button
  drawButton(ctx, hitboxes.skip, InkStyle.block);
}

function drawRewardCard(ctx: CanvasRenderingContext2D, c: RewardCardBounds): void {
  const rarityColor = InkStyle.rarity[c.card.rarity] ?? InkStyle.ink;
  const typeColor = InkStyle.cardTypes[c.card.type] ?? InkStyle.ink;

  // Background
  ctx.fillStyle = InkStyle.paper;
  ctx.fillRect(c.x, c.y, c.width, c.height);

  // Rarity border
  ctx.strokeStyle = rarityColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(c.x, c.y, c.width, c.height);

  // Type bar
  ctx.fillStyle = typeColor;
  ctx.fillRect(c.x, c.y, c.width, 28);
  ctx.fillStyle = InkStyle.paper;
  ctx.font = `bold 14px "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`${c.card.type.toUpperCase()} - ${c.card.cost}费`, c.x + c.width / 2, c.y + 19);

  // Name
  ctx.fillStyle = InkStyle.ink;
  ctx.font = `bold 20px "KaiTi", serif`;
  ctx.fillText(c.card.name, c.x + c.width / 2, c.y + 60);

  // Rarity
  ctx.fillStyle = rarityColor;
  ctx.font = `14px "KaiTi", serif`;
  ctx.fillText(c.card.rarity, c.x + c.width / 2, c.y + 82);

  // Description
  ctx.fillStyle = InkStyle.ink;
  ctx.font = `12px "KaiTi", serif`;
  const lines = wrapText(c.card.description, 8);
  let ty = c.y + 115;
  for (const line of lines) {
    ctx.fillText(line, c.x + c.width / 2, ty);
    ty += 18;
  }
}

function drawButton(ctx: CanvasRenderingContext2D, btn: RewardButtonBounds, fill: string): void {
  ctx.fillStyle = fill;
  ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
  ctx.strokeStyle = InkStyle.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
  ctx.fillStyle = InkStyle.ink;
  ctx.font = `bold 20px "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(btn.label, btn.x + btn.width / 2, btn.y + btn.height / 2);
  ctx.textBaseline = 'alphabetic';
}

/**
 * Return hitboxes for the reward cards + skip button.
 */
export function getRewardHitboxes(width: number, height: number, count: number): RewardHitboxes {
  const safeCount = Math.max(1, count);
  const totalWidth = safeCount * REWARD_CARD_WIDTH + (safeCount - 1) * REWARD_CARD_GAP;
  const startX = (width - totalWidth) / 2;
  const cardY = height * 0.3;
  const cards: RewardCardBounds[] = [];
  for (let i = 0; i < safeCount; i++) {
    cards.push({
      cardIndex: i,
      x: startX + i * (REWARD_CARD_WIDTH + REWARD_CARD_GAP),
      y: cardY,
      width: REWARD_CARD_WIDTH,
      height: REWARD_CARD_HEIGHT,
      card: { id: '', name: '', description: '', type: 'attack', rarity: 'common', cost: 0, targetType: 'enemy', effects: [] },
    });
  }
  const skipY = cardY + REWARD_CARD_HEIGHT + 40;
  return {
    cards,
    skip: {
      x: width / 2 - REWARD_SKIP_WIDTH / 2,
      y: skipY,
      width: REWARD_SKIP_WIDTH,
      height: REWARD_SKIP_HEIGHT,
      label: '跳过奖励',
    },
  };
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const lines: string[] = [];
  let buf = '';
  for (const ch of text) {
    buf += ch;
    if (buf.length >= maxCharsPerLine) {
      lines.push(buf);
      buf = '';
    }
  }
  if (buf) lines.push(buf);
  return lines;
}
