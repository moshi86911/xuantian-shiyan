// src/ui/Animations.ts
// Reusable animation factories.
import { drawInkBrush } from './style';
import type { Animation } from './Renderer';

export function makeDamageAnimation(x: number, y: number, value: number): Animation {
  return {
    duration: 1500,
    elapsed: 0,
    draw: (ctx, progress) => {
      const alpha = 1 - progress;
      const yOffset = -40 * progress;
      ctx.fillStyle = `rgba(200, 50, 50, ${alpha})`;
      ctx.font = `bold 28px "KaiTi", serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`-${value}`, x, y + yOffset);
    },
  };
}

export function makeCardPlayAnimation(x: number, y: number): Animation {
  return {
    duration: 400,
    elapsed: 0,
    draw: (ctx, progress) => {
      const scale = 1 + progress * 0.3;
      const alpha = 1 - progress;
      ctx.fillStyle = `rgba(196, 168, 73, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 30 * scale, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}

export function makeHealAnimation(x: number, y: number, value: number): Animation {
  return {
    duration: 1500,
    elapsed: 0,
    draw: (ctx, progress) => {
      const alpha = 1 - progress;
      const yOffset = -40 * progress;
      ctx.fillStyle = `rgba(92, 138, 74, ${alpha})`;
      ctx.font = `bold 28px "KaiTi", serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`+${value}`, x, y + yOffset);
    },
  };
}

export function makeBossPhaseAnimation(width: number, height: number): Animation {
  return {
    duration: 2000,
    elapsed: 0,
    draw: (ctx, progress) => {
      const alpha = progress < 0.5 ? 1 : 1 - (progress - 0.5) * 2;
      ctx.fillStyle = `rgba(200, 50, 50, ${alpha * 0.7})`;
      ctx.fillRect(0, 0, width, height);
      // Ink splash
      const size = 100 + progress * 200;
      drawInkBrush(ctx, width / 2, height / 2, size, `rgba(200, 50, 50, ${alpha * 0.4})`);
    },
  };
}