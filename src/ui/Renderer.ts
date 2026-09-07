// src/ui/Renderer.ts
// Main canvas renderer that dispatches to per-screen views.
import type { GameState } from '../core/types';
import { renderBattle } from './BattleView';
import { renderMap } from './MapView';
import { renderMainMenu } from './MenuView';
import { InkStyle } from './style';

export interface Animation {
  duration: number;
  elapsed: number;
  draw: (ctx: CanvasRenderingContext2D, progress: number) => void;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private animations: Animation[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  render(state: GameState): void {
    this.clear();

    switch (state.screen) {
      case 'main_menu':
        renderMainMenu(this.ctx, this.width, this.height);
        break;
      case 'character_select':
        this.renderPlaceholder('选择角色');
        break;
      case 'map':
        if (state.map) renderMap(this.ctx, state.map, this.width, this.height);
        break;
      case 'battle':
        if (state.battle) renderBattle(this.ctx, state.battle, this.width, this.height);
        break;
      case 'reward':
        this.renderPlaceholder('奖励选牌');
        break;
      case 'shop':
        this.renderPlaceholder('商店');
        break;
      case 'event':
        this.renderPlaceholder('事件');
        break;
      case 'rest':
        this.renderPlaceholder('休息');
        break;
      case 'game_over':
        this.renderPlaceholder('游戏结束');
        break;
      case 'victory':
        this.renderPlaceholder('胜利');
        break;
    }

    this.renderAnimations();
  }

  /** Advance all active animations by deltaMs; remove finished ones. */
  tick(deltaMs: number): void {
    for (const a of this.animations) {
      a.elapsed += deltaMs;
    }
    this.animations = this.animations.filter((a) => a.elapsed < a.duration);
  }

  pushAnimation(anim: Animation): void {
    this.animations.push(anim);
  }

  clear(): void {
    this.ctx.fillStyle = InkStyle.background;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private renderPlaceholder(text: string): void {
    this.ctx.fillStyle = InkStyle.paper;
    this.ctx.font = InkStyle.font.title;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, this.width / 2, this.height / 2);
  }

  private renderAnimations(): void {
    for (const a of this.animations) {
      const progress = Math.min(1, a.elapsed / a.duration);
      a.draw(this.ctx, progress);
    }
  }
}