// src/ui/MenuView.ts
// Main menu screen rendering.
import { InkStyle } from './style';

export interface MenuItem {
  label: string;
  action: string;
  enabled: boolean;
}

export const MENU_ITEMS: MenuItem[] = [
  { label: '开始游戏', action: 'start', enabled: true },
  { label: '继续游戏', action: 'continue', enabled: false },
  { label: '设置', action: 'settings', enabled: false },
  { label: '退出', action: 'quit', enabled: true },
];

export const MENU_ACTIONS: string[] = MENU_ITEMS.map((m) => m.action);

export function renderMainMenu(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  // Background
  ctx.fillStyle = InkStyle.background;
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = InkStyle.vermillion;
  ctx.font = `bold 72px "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.fillText('玄 天 试 炼', width / 2, height * 0.3);

  // Subtitle
  ctx.fillStyle = InkStyle.paper;
  ctx.font = `24px "KaiTi", serif`;
  ctx.fillText('Xuantian Shiyan', width / 2, height * 0.3 + 50);

  // Menu items
  let y = height * 0.55;
  for (const item of MENU_ITEMS) {
    ctx.fillStyle = item.enabled ? InkStyle.paper : '#666';
    ctx.font = `32px "KaiTi", serif`;
    ctx.fillText(item.label, width / 2, y);
    y += 50;
  }
}