// tests/ui/CardView.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderCard, getCardBounds, CARD_WIDTH, CARD_HEIGHT, wrapText } from '../../src/ui/CardView';
import type { Card } from '../../src/core/types';

function makeMockContext(): any {
  return {
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
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    measureText: (text: string) => ({ width: text.length * 16 }),
  };
}

function makeCard(): Card {
  return {
    id: 'test',
    name: '御剑术',
    description: '造成 6 伤害。',
    type: 'attack',
    rarity: 'common',
    cost: 1,
    targetType: 'enemy',
    effects: [{ type: 'damage', value: 6 }],
  };
}

describe('CardView', () => {
  let ctx: any;
  beforeEach(() => { ctx = makeMockContext(); });

  it('renders a card', () => {
    renderCard(ctx, makeCard(), 100, 100);
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('renders qi cost when card has qiCost', () => {
    const card = { ...makeCard(), qiCost: 2 };
    renderCard(ctx, card, 100, 100);
    expect(ctx.fillText).toHaveBeenCalledWith('2', expect.any(Number), expect.any(Number));
  });

  it('applies hovered scale to bounds', () => {
    const normal = getCardBounds(100, 100);
    const hovered = getCardBounds(100, 100, true);
    expect(hovered.width).toBeGreaterThan(normal.width);
  });

  it('wrapText splits long text', () => {
    const lines = wrapText(ctx, '一二三四五六七八九十', 100);
    expect(lines.length).toBeGreaterThan(0);
  });
});

describe('Card dimensions', () => {
  it('CARD_WIDTH is positive', () => {
    expect(CARD_WIDTH).toBeGreaterThan(0);
  });
  it('CARD_HEIGHT is positive', () => {
    expect(CARD_HEIGHT).toBeGreaterThan(0);
  });
});