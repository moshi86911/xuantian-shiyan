// src/main.ts
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function render(): void {
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = '48px KaiTi, STKaiti, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('玄天试炼', canvas.width / 2, canvas.height / 2);
  ctx.font = '20px KaiTi, serif';
  ctx.fillText('Xuantian Shiyan', canvas.width / 2, canvas.height / 2 + 60);
}

render();
