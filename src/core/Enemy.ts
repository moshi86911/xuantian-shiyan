// src/core/Enemy.ts

import { BuffSystem } from './BuffSystem';

export type EnemyTier = 'normal' | 'elite' | 'boss';
export type IntentKind = 'attack' | 'defend' | 'buff' | 'debuff' | 'special';
export type AIPattern = 'simple' | 'sequence' | 'adaptive' | 'boss';

export interface EnemyIntentData {
  type: IntentKind;
  value: number;
  /** Weight used by AdaptiveAI for weighted-random selection. Defaults to 1 when omitted. */
  weight?: number;
  /** Id of a special behavior. Metadata only — actual application lives elsewhere. */
  specialEffect?: string;
  /** Human-readable description of the intent. */
  description?: string;
}

export interface EnemyData {
  id: string;
  name: string;
  tier: EnemyTier;
  maxHp: number;
  intents: EnemyIntentData[];
  aiPattern: AIPattern;
  art?: string;
  description: string;
}

/**
 * Runtime wrapper around EnemyData. Owns mutable battle state (hp, block,
 * current intent index, buffs, statuses) and exposes intent helpers used by
 * AI classes and the BattleEngine.
 */
export class EnemyState {
  id: string;
  name: string;
  tier: EnemyTier;
  maxHp: number;
  hp: number;
  block: number;
  data: EnemyData;
  intents: EnemyIntentData[];
  currentIntentIndex: number;
  buffs: BuffSystem;
  statuses: { type: string; stacks: number; duration?: number }[];

  constructor(data: EnemyData) {
    this.id = data.id;
    this.name = data.name;
    this.tier = data.tier;
    this.maxHp = data.maxHp;
    this.hp = data.maxHp;
    this.block = 0;
    this.data = data;
    this.intents = data.intents;
    this.currentIntentIndex = 0;
    this.buffs = new BuffSystem();
    this.statuses = [];
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  getCurrentIntent(): EnemyIntentData {
    return this.intents[this.currentIntentIndex] ?? this.data.intents[this.currentIntentIndex];
  }

  advanceIntent(): void {
    this.currentIntentIndex = (this.currentIntentIndex + 1) % this.intents.length;
  }

  reset(): void {
    this.hp = this.maxHp;
    this.block = 0;
    this.currentIntentIndex = 0;
    this.buffs.clear();
    this.statuses = [];
    // intents array reference doesn't need reset (immutable)
  }
}