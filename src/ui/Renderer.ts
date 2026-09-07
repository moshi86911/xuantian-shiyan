// src/ui/Renderer.ts
// Main canvas renderer that dispatches to per-screen views.
import type { GameState } from '../core/types';
import { renderBattle } from './BattleView';
import { renderMap } from './MapView';
import { renderMainMenu } from './MenuView';
import { renderCharacterSelect } from './CharacterSelectView';
import { renderReward, getRewardHitboxes } from './RewardView';
import { renderShop } from './ShopView';
import { renderEvent } from './EventView';
import { renderRest } from './RestView';
import { renderGameOver } from './GameOverView';
import { renderVictory } from './VictoryView';
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
        renderCharacterSelect(this.ctx, this.width, this.height);
        break;
      case 'map':
        if (state.map) renderMap(this.ctx, state.map, this.width, this.height);
        break;
      case 'battle':
        if (state.battle) renderBattle(this.ctx, state.battle, this.width, this.height);
        break;
      case 'reward':
        if (state.reward) {
          const choices = state.reward.cardChoices;
          // Use the hitboxes helper to guarantee layout parity with input.
          // It returns the same number of cards as `choices.length`.
          getRewardHitboxes(this.width, this.height, choices.length);
          renderReward(this.ctx, this.width, this.height, choices);
        } else {
          this.renderPlaceholder('奖励选牌');
        }
        break;
      case 'shop':
        if (state.shop && state.run) {
          renderShop(
            this.ctx,
            this.width,
            this.height,
            state.shop,
            state.run.gold,
            state.pendingShopRemove,
          );
        } else {
          this.renderPlaceholder('商店');
        }
        break;
      case 'event':
        if (state.event) {
          renderEvent(this.ctx, this.width, this.height, {
            title: state.event.title,
            text: state.event.text,
            choices: state.event.choices.map((c) => ({ text: c.text })),
          });
        } else {
          this.renderPlaceholder('事件');
        }
        break;
      case 'rest':
        if (state.run) {
          renderRest(this.ctx, this.width, this.height, state.run.hp, state.run.maxHp);
        } else {
          this.renderPlaceholder('休息');
        }
        break;
      case 'game_over':
        renderGameOver(
          this.ctx,
          this.width,
          this.height,
          state.run?.floor ?? state.map?.floor ?? 1,
          state.run?.characterId,
        );
        break;
      case 'victory': {
        const floor = state.run?.floor ?? state.map?.floor ?? 6;
        const now = Date.now();
        const startTime = state.run?.startTime ?? now;
        const hp = state.run?.hp ?? 0;
        const maxHp = state.run?.maxHp ?? 0;
        renderVictory(
          this.ctx,
          this.width,
          this.height,
          { floor, durationMs: Math.max(0, now - startTime), finalHp: hp, maxHp },
          state.run?.characterId,
        );
        break;
      }
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
