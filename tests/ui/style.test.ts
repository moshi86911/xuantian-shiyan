// tests/ui/style.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InkStyle, drawInkBrush, drawPaperRect, drawCardFrame } from '../../src/ui/style';

function makeMockContext(): any {
  const ctx: any = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    measureText: vi.fn(() => ({ width: 50 })),
  };
  return ctx;
}

describe('InkStyle', () => {
  it('defines background and paper colors', () => {
    expect(InkStyle.background).toBeTruthy();
    expect(InkStyle.paper).toBeTruthy();
  });

  it('defines font sizes', () => {
    expect(InkStyle.font.title).toBeTruthy();
    expect(InkStyle.font.body).toBeTruthy();
  });

  it('defines card type colors', () => {
    expect(InkStyle.cardTypes.attack).toBeTruthy();
    expect(InkStyle.cardTypes.skill).toBeTruthy();
    expect(InkStyle.cardTypes.power).toBeTruthy();
    expect(InkStyle.cardTypes.qi).toBeTruthy();
  });

  it('defines rarity colors', () => {
    expect(InkStyle.rarity.common).toBeTruthy();
    expect(InkStyle.rarity.rare).toBeTruthy();
    expect(InkStyle.rarity.legendary).toBeTruthy();
  });
});

describe('Drawing helpers', () => {
  let ctx: any;
  beforeEach(() => {
    ctx = makeMockContext();
  });

  it('drawInkBrush calls gradient and arc', () => {
    drawInkBrush(ctx, 100, 100, 50);
    expect(ctx.createRadialGradient).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('drawPaperRect fills a rectangle', () => {
    drawPaperRect(ctx, 0, 0, 100, 100);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 100, 100);
  });

  it('drawCardFrame strokes a frame', () => {
    drawCardFrame(ctx, 10, 10, 100, 200);
    expect(ctx.strokeRect).toHaveBeenCalled();
  });
});