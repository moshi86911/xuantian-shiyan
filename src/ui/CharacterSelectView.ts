// src/ui/CharacterSelectView.ts
// Character selection screen. Shows 3 character cards (sword/talisman/alchemy)
// plus a confirm + back button. Pure render + pure hitbox functions.

import { InkStyle } from './style';
import type { CharacterId } from '../core/types';

export interface CharacterCardBounds {
  characterId: CharacterId;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CharacterSelectButtonBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export interface CharacterSelectHitboxes {
  cards: CharacterCardBounds[];
  confirm: CharacterSelectButtonBounds;
  back: CharacterSelectButtonBounds;
}

const CARD_WIDTH = 200;
const CARD_HEIGHT = 280;
const CARD_GAP = 40;
const BUTTON_WIDTH = 160;
const BUTTON_HEIGHT = 50;

/**
 * Render the character select screen.
 *
 * @param selectedId  The currently highlighted character id (visual only).
 */
export function renderCharacterSelect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  selectedId?: CharacterId,
): void {
  // Background
  ctx.fillStyle = InkStyle.background;
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = InkStyle.vermillion;
  ctx.font = InkStyle.font.title;
  ctx.textAlign = 'center';
  ctx.fillText('选择角色', width / 2, height * 0.12);

  // Three character cards
  const cards = getCharacterSelectHitboxes(width, height).cards;
  for (const card of cards) {
    drawCharacterCard(ctx, card, selectedId === card.characterId);
  }

  // Buttons
  const { confirm, back } = getCharacterSelectHitboxes(width, height);
  drawButton(ctx, confirm, selectedId ? InkStyle.gold : '#555');
  drawButton(ctx, back, '#555');
}

function drawCharacterCard(
  ctx: CanvasRenderingContext2D,
  card: CharacterCardBounds,
  highlighted: boolean,
): void {
  const accent = colorForCharacter(card.characterId);
  const fillColor = highlighted ? accent : 'rgba(245, 232, 200, 0.06)';
  const borderColor = highlighted ? accent : InkStyle.ink;

  // Background panel
  ctx.fillStyle = fillColor;
  ctx.fillRect(card.x, card.y, card.width, card.height);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = highlighted ? 3 : 1;
  ctx.strokeRect(card.x, card.y, card.width, card.height);

  // Character title
  const info = CHARACTER_INFO[card.characterId];
  ctx.fillStyle = accent;
  ctx.font = `bold 32px "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.fillText(info.name, card.x + card.width / 2, card.y + 50);

  ctx.fillStyle = InkStyle.paper;
  ctx.font = `bold 18px "KaiTi", serif`;
  ctx.fillText(info.title, card.x + card.width / 2, card.y + 80);

  // Max HP
  ctx.fillStyle = InkStyle.vermillion;
  ctx.font = `16px "KaiTi", serif`;
  ctx.fillText(`生命: ${info.maxHp}`, card.x + card.width / 2, card.y + 110);

  // Mechanic
  ctx.fillStyle = InkStyle.gold;
  ctx.font = `bold 16px "KaiTi", serif`;
  ctx.fillText(info.mechanic, card.x + card.width / 2, card.y + 140);

  // Description (wrap manually into ~10 Chinese chars per line)
  ctx.fillStyle = InkStyle.paper;
  ctx.font = `14px "KaiTi", serif`;
  const lines = wrapText(info.description, 10);
  let ty = card.y + 175;
  for (const line of lines) {
    ctx.fillText(line, card.x + card.width / 2, ty);
    ty += 22;
  }
}

function drawButton(
  ctx: CanvasRenderingContext2D,
  btn: CharacterSelectButtonBounds,
  fill: string,
): void {
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

function colorForCharacter(id: CharacterId): string {
  switch (id) {
    case 'sword': return InkStyle.vermillion;
    case 'talisman': return InkStyle.indigo;
    case 'alchemy': return InkStyle.jade;
  }
}

/**
 * Return the hitboxes for the character cards and the action buttons.
 */
export function getCharacterSelectHitboxes(width: number, height: number): CharacterSelectHitboxes {
  const totalWidth = 3 * CARD_WIDTH + 2 * CARD_GAP;
  const startX = (width - totalWidth) / 2;
  const cardY = height * 0.25;
  const ids: CharacterId[] = ['sword', 'talisman', 'alchemy'];
  const cards: CharacterCardBounds[] = ids.map((id, i) => ({
    characterId: id,
    x: startX + i * (CARD_WIDTH + CARD_GAP),
    y: cardY,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  }));
  const buttonY = height * 0.25 + CARD_HEIGHT + 40;
  const confirmX = width / 2 - BUTTON_WIDTH - 20;
  const backX = width / 2 + 20;
  return {
    cards,
    confirm: { x: confirmX, y: buttonY, width: BUTTON_WIDTH, height: BUTTON_HEIGHT, label: '确认' },
    back: { x: backX, y: buttonY, width: BUTTON_WIDTH, height: BUTTON_HEIGHT, label: '返回' },
  };
}

// -- Static display data ----------------------------------------------------

const CHARACTER_INFO: Record<CharacterId, {
  name: string;
  title: string;
  description: string;
  maxHp: number;
  mechanic: string;
}> = {
  sword: {
    name: '凌霄',
    title: '剑修',
    description: '以剑入道，一剑破万法。连击为核心。',
    maxHp: 75,
    mechanic: '连击',
  },
  talisman: {
    name: '清虚',
    title: '符修',
    description: '以符入道，符咒驱邪。印记触发特效。',
    maxHp: 70,
    mechanic: '印记',
  },
  alchemy: {
    name: '素心',
    title: '丹修',
    description: '以丹入道，药济苍生。依赖丹药续航。',
    maxHp: 85,
    mechanic: '丹药',
  },
};

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
