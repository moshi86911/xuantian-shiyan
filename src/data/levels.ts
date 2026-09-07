// src/data/levels.ts
// Theme / background configuration for each floor. Typed in TS rather than JSON
// to keep the floor metadata type-safe at compile time.

import type { FloorConfig } from '../levels/MapGenerator';

export const FLOORS: FloorConfig[] = [
  {
    floor: 1,
    name: '外门试炼',
    background: 'mountain_outer.svg',
    boss: 'outer_elder',
  },
  {
    floor: 2,
    name: '内门考核',
    background: 'hall_inner.svg',
    boss: 'inner_guardian',
  },
  {
    floor: 3,
    name: '秘境探险',
    background: 'cave_secret.svg',
    boss: 'realm_lord',
  },
  {
    floor: 4,
    name: '天劫降临',
    background: 'thunder_tribulation.svg',
    boss: 'thunder_lord',
  },
  {
    floor: 5,
    name: '飞升之路',
    background: 'ascension_path.svg',
    boss: 'outer_demon',
  },
  {
    floor: 6,
    name: '通天',
    background: 'heaven_dao.svg',
    boss: 'heaven_dao_incarnate',
  },
];

export function getFloorConfig(floor: number): FloorConfig | undefined {
  return FLOORS.find((f) => f.floor === floor);
}