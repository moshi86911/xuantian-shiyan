// src/ui/EventView.ts
// Event screen — story text + 2-3 choice buttons. Pure render + hitboxes.

import { InkStyle } from './style';

export interface EventChoiceBounds {
  choiceIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

export interface EventHitboxes {
  choices: EventChoiceBounds[];
}

export interface EventViewData {
  title: string;
  text: string;
  choices: { text: string }[];
}

const EVENT_BUTTON_WIDTH = 500;
const EVENT_BUTTON_HEIGHT = 50;
const EVENT_BUTTON_GAP = 15;

export function renderEvent(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: EventViewData,
): void {
  // Background
  ctx.fillStyle = InkStyle.background;
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = InkStyle.gold;
  ctx.font = InkStyle.font.title;
  ctx.textAlign = 'center';
  ctx.fillText(data.title, width / 2, height * 0.15);

  // Body text (manual wrap)
  ctx.fillStyle = InkStyle.paper;
  ctx.font = InkStyle.font.body;
  const lines = wrapText(data.text, 22);
  let ty = height * 0.3;
  for (const line of lines) {
    ctx.fillText(line, width / 2, ty);
    ty += 32;
  }

  // Choices
  const hitboxes = getEventHitboxes(width, height, data.choices.length);
  for (let i = 0; i < hitboxes.choices.length; i++) {
    drawChoiceButton(ctx, hitboxes.choices[i]);
  }
}

function drawChoiceButton(ctx: CanvasRenderingContext2D, c: EventChoiceBounds): void {
  ctx.fillStyle = 'rgba(245, 232, 200, 0.15)';
  ctx.fillRect(c.x, c.y, c.width, c.height);
  ctx.strokeStyle = InkStyle.gold;
  ctx.lineWidth = 1;
  ctx.strokeRect(c.x, c.y, c.width, c.height);
  ctx.fillStyle = InkStyle.paper;
  ctx.font = `bold 18px "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(c.text, c.x + c.width / 2, c.y + c.height / 2);
  ctx.textBaseline = 'alphabetic';
}

export function getEventHitboxes(width: number, height: number, choiceCount: number): EventHitboxes {
  const startY = height * 0.6;
  const choices: EventChoiceBounds[] = [];
  for (let i = 0; i < choiceCount; i++) {
    choices.push({
      choiceIndex: i,
      x: width / 2 - EVENT_BUTTON_WIDTH / 2,
      y: startY + i * (EVENT_BUTTON_HEIGHT + EVENT_BUTTON_GAP),
      width: EVENT_BUTTON_WIDTH,
      height: EVENT_BUTTON_HEIGHT,
      text: '',
    });
  }
  return { choices };
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
