// src/ui/MapView.ts
// Map screen rendering.
import type { MapState, MapNode } from '../core/types';
import { InkStyle } from './style';

const NODE_RADIUS = 24;
const LAYER_SPACING = 100;

export const MAP_NODE_RADIUS = NODE_RADIUS;

export function renderMap(
  ctx: CanvasRenderingContext2D,
  map: MapState,
  width: number,
  height: number
): void {
  ctx.fillStyle = InkStyle.background;
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = InkStyle.paper;
  ctx.font = `bold 24px "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`第 ${map.floor} 层`, width / 2, 30);

  // Compute positions for nodes
  for (let li = 0; li < map.nodes.length; li++) {
    const layer = map.nodes[li];
    const y = 80 + li * LAYER_SPACING;
    const layerWidth = layer.length * 100;
    const startX = (width - layerWidth) / 2 + 50;
    for (let ni = 0; ni < layer.length; ni++) {
      const node = layer[ni];
      node.x = startX + ni * 100;
      node.y = y;
    }
  }

  // Connections (lines)
  ctx.strokeStyle = InkStyle.block;
  ctx.lineWidth = 1;
  for (const layer of map.nodes) {
    for (const node of layer) {
      for (const childId of node.connections) {
        const child = findNode(map, childId);
        if (child) {
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(child.x, child.y);
          ctx.stroke();
        }
      }
    }
  }

  // Nodes
  for (const layer of map.nodes) {
    for (const node of layer) {
      drawNode(ctx, node);
    }
  }
}

function drawNode(ctx: CanvasRenderingContext2D, node: MapNode): void {
  // Available = gold, visited = faded, locked = gray
  let fill = '#3a3a3a';
  if (node.visited) fill = InkStyle.jade;
  else if (node.available) fill = InkStyle.gold;

  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = InkStyle.ink;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Type icon
  ctx.fillStyle = InkStyle.ink;
  ctx.font = `bold 14px "KaiTi", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const icons: Record<MapNode['type'], string> = {
    battle: '⚔',
    elite: '★',
    shop: '$',
    event: '?',
    rest: '休',
    boss: '王',
  };
  ctx.fillText(icons[node.type] || '?', node.x, node.y);
  ctx.textBaseline = 'alphabetic';
}

function findNode(map: MapState, id: string): MapNode | undefined {
  for (const layer of map.nodes) {
    for (const n of layer) {
      if (n.id === id) return n;
    }
  }
  return undefined;
}