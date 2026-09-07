// src/ui/ShopView.ts
// Shop screen. Renders purchasable cards + the "remove card" option + leave
// button. Pure render + hitbox helpers.

import { InkStyle } from './style';
import type { ShopItem, ShopState } from '../core/Shop';
import type { Card } from '../core/types';

export interface ShopCardBounds {
  itemIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  item: ShopItem;
}

export interface ShopButtonBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  kind: 'remove' | 'leave';
}

export interface ShopHitboxes {
  cards: ShopCardBounds[];
  remove: ShopButtonBounds;
  leave: ShopButtonBounds;
}

const SHOP_CARD_WIDTH = 130;
const SHOP_CARD_HEIGHT = 180;
const SHOP_CARD_GAP = 20;
const SHOP_BUTTON_WIDTH = 160;
const SHOP_BUTTON_HEIGHT = 50;

export function renderShop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  shop: ShopState,
  gold: number,
  pendingRemove?: boolean,
): void {
  // Background
  ctx.fillStyle = InkStyle.background;
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = InkStyle.gold;
  ctx.font = InkStyle.font.title;
  ctx.textAlign = 'center';
  ctx.fillText('神秘商店', width / 2, height * 0.1);

  // Gold display
  ctx.fillStyle = InkStyle.paper;
  ctx.font = InkStyle.font.body;
  ctx.fillText(`金币: ${gold}`, width / 2, height * 0.1 + 40);

  // Cards
  const hitboxes = getShopHitboxes(width, height, shop);
  for (const c of hitboxes.cards) {
    drawShopCard(ctx, c, gold);
  }

  // Remove button
  drawButton(ctx, hitboxes.remove, gold >= shop.removeCardCost ? InkStyle.vermillion : '#555');

  // Leave button
  drawButton(ctx, hitboxes.leave, InkStyle.block);

  // Status text if pendingRemove
  if (pendingRemove) {
    ctx.fillStyle = InkStyle.gold;
    ctx.font = `bold 18px "KaiTi", serif`;
    ctx.textAlign = 'center';
    ctx.fillText('已随机移除一张牌', width / 2, height * 0.92);
  }
}

function drawShopCard(ctx: CanvasRenderingContext2D, c: ShopCardBounds, gold: number): void {
  if (c.item.type !== 'card') {
    // relic/potion not implemented
    drawGenericShopItem(ctx, c);
    return;
  }
  const card: Card = c.item.data as Card;
  const rarityColor = InkStyle.rarity[card.rarity] ?? InkStyle.ink;
  const canAfford = gold >= c.item.cost;

  // Background
  ctx.fillStyle = InkStyle.paper;
  ctx.fillRect(c.x, c.y, c.width, c.height);

  // Rarity border
  ctx.strokeStyle = canAfford ? rarityColor : '#888';
  ctx.lineWidth = 2;
  ctx.strokeRect(c.x, c.y, c.width, c.height);

  // Cost
  ctx.fillStyle = canAfford ? InkStyle.gold : '#888';
  ctx.fillRect(c.x, c.y, c.width, 28);
  ctx.fillStyle = InkStyle.ink;
  ctx.font = `bold 14px "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`${c.item.cost} 金`, c.x + c.width / 2, c.y + 19);

  // Name
  ctx.fillStyle = InkStyle.ink;
  ctx.font = `bold 16px "KaiTi", serif`;
  ctx.fillText(card.name, c.x + c.width / 2, c.y + 55);

  // Type
  ctx.fillStyle = InkStyle.cardTypes[card.type] ?? InkStyle.ink;
  ctx.font = `12px "KaiTi", serif`;
  ctx.fillText(`${card.type} - ${card.cost}费`, c.x + c.width / 2, c.y + 75);

  // Description
  ctx.fillStyle = InkStyle.ink;
  ctx.font = `11px "KaiTi", serif`;
  const lines = wrapText(card.description, 6);
  let ty = c.y + 100;
  for (const line of lines) {
    ctx.fillText(line, c.x + c.width / 2, ty);
    ty += 15;
  }
}

function drawGenericShopItem(ctx: CanvasRenderingContext2D, c: ShopCardBounds): void {
  ctx.fillStyle = InkStyle.paper;
  ctx.fillRect(c.x, c.y, c.width, c.height);
  ctx.strokeStyle = InkStyle.ink;
  ctx.lineWidth = 1;
  ctx.strokeRect(c.x, c.y, c.width, c.height);
  ctx.fillStyle = InkStyle.ink;
  ctx.font = `14px "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`${c.item.type}`, c.x + c.width / 2, c.y + c.height / 2);
}

function drawButton(ctx: CanvasRenderingContext2D, btn: ShopButtonBounds, fill: string): void {
  ctx.fillStyle = fill;
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

export function getShopHitboxes(width: number, height: number, shop: ShopState): ShopHitboxes {
  const count = Math.max(1, shop.cards.length);
  const totalWidth = count * SHOP_CARD_WIDTH + (count - 1) * SHOP_CARD_GAP;
  const startX = (width - totalWidth) / 2;
  const cardY = height * 0.3;
  const cards: ShopCardBounds[] = shop.cards.map((item, i) => ({
    itemIndex: i,
    x: startX + i * (SHOP_CARD_WIDTH + SHOP_CARD_GAP),
    y: cardY,
    width: SHOP_CARD_WIDTH,
    height: SHOP_CARD_HEIGHT,
    item,
  }));
  const buttonY = cardY + SHOP_CARD_HEIGHT + 40;
  return {
    cards,
    remove: {
      x: width / 2 - SHOP_BUTTON_WIDTH - 20,
      y: buttonY,
      width: SHOP_BUTTON_WIDTH,
      height: SHOP_BUTTON_HEIGHT,
      label: `移除一张牌 (${shop.removeCardCost}金)`,
      kind: 'remove',
    },
    leave: {
      x: width / 2 + 20,
      y: buttonY,
      width: SHOP_BUTTON_WIDTH,
      height: SHOP_BUTTON_HEIGHT,
      label: '离开商店',
      kind: 'leave',
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
