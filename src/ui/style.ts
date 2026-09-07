// src/ui/style.ts
// Ink-wash (国风水墨) style constants and helper drawing functions.

export const InkStyle = {
  background: '#1a1a1a',
  paper: '#f5e8c8',
  ink: '#1c1c1c',
  vermillion: '#c83232',
  gold: '#c4a849',
  jade: '#5c8a4a',
  indigo: '#3a4f7a',
  block: '#7a7a7a',
  cardTypes: {
    attack: '#c83232',   // vermillion
    skill: '#5c8a4a',    // jade
    power: '#c4a849',    // gold
    qi: '#7c4a9a',       // purple
  },
  rarity: {
    common: '#7a7a7a',
    rare: '#3a4f7a',
    legendary: '#c4a849',
  },
  font: {
    title: '48px "KaiTi", "STKaiti", serif',
    heading: '32px "KaiTi", serif',
    body: '20px "KaiTi", serif',
    small: '16px "KaiTi", serif',
    tiny: '14px "KaiTi", serif',
  },
};

/** Draw an ink brush stroke — radial gradient circle fading out. */
export function drawInkBrush(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string = 'rgba(28, 28, 28, 0.9)'
): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.7, color.replace(/[\d.]+\)$/, '0.3)'));
  gradient.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw a paper-textured rectangle (gradient + noise approximation). */
export function drawPaperRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  ctx.fillStyle = InkStyle.paper;
  ctx.fillRect(x, y, width, height);
  // Subtle inner shadow for paper depth
  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
  gradient.addColorStop(0.1, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.9, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
}

/** Draw a card frame (ink border). */
export function drawCardFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string = InkStyle.ink
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 4, y + 4, width - 8, height - 8);
}