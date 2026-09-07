// src/data/enemies/loader.ts

import normalData from './normal.json';
import type { EnemyData, EnemyTier } from '../../core/Enemy';

/**
 * Static registry of all enemy definitions keyed by id.
 * Phase 5 ships only normal-tier enemies; elite + boss entries will be
 * added in later phases and merged into the same record.
 */
const allEnemies: Record<string, EnemyData> = {
  ...Object.fromEntries(normalData.map((e) => [e.id, e as EnemyData])),
};

/** Look up a single enemy by id. Returns undefined when not found. */
export function getEnemy(id: string): EnemyData | undefined {
  return allEnemies[id];
}

/** Filter the registry by tier (normal / elite / boss). */
export function listEnemiesByTier(tier: EnemyTier): EnemyData[] {
  return Object.values(allEnemies).filter((e) => e.tier === tier);
}

/** All enemies in the registry, regardless of tier. */
export function listAllEnemies(): EnemyData[] {
  return Object.values(allEnemies);
}