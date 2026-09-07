// src/core/types.ts

export type CharacterId = 'sword' | 'talisman' | 'alchemy';

export type CardType = 'attack' | 'skill' | 'power' | 'qi';
export type CardRarity = 'common' | 'rare' | 'legendary';
export type TargetType = 'enemy' | 'self' | 'all_enemies' | 'none';

export type EffectType =
  | 'damage'
  | 'heal'
  | 'block'
  | 'draw'
  | 'apply_buff'
  | 'apply_debuff'
  | 'gain_energy'
  | 'gain_qi'
  | 'add_status';

export interface CardEffect {
  type: EffectType;
  value: number;
  target?: TargetType;
  statusId?: string;
  /** Internal flag set by CardExecutor when a `bypass_block` add_status
   * flag precedes this damage effect. Causes applyDamage to ignore the
   * target's block. */
  bypassBlock?: boolean;
}

export interface Card {
  id: string;
  name: string;
  description: string;
  type: CardType;
  rarity: CardRarity;
  cost: number;
  qiCost?: number;
  targetType: TargetType;
  effects: CardEffect[];
  characterId?: CharacterId;
  exhaust?: boolean;
}

export interface PlayerState {
  characterId: CharacterId;
  hp: number;
  maxHp: number;
  block: number;
  energy: number;
  maxEnergy: number;
  qi: number;
  maxQi: number;
  gold: number;
  deck: string[];
  drawPile: string[];
  discardPile: string[];
  hand: string[];
  exhaustPile: string[];
  buffs: { id: string; value: number; duration: number }[];
}

export interface EnemyIntent {
  type: 'attack' | 'defend' | 'buff' | 'debuff' | 'special';
  value: number;
  description: string;
  specialEffect?: string;
}

export interface EnemyState {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  block: number;
  intents: EnemyIntent[];
  currentIntentIndex: number;
  buffs: { id: string; value: number; duration: number }[];
  tier: 'normal' | 'elite' | 'boss';
  data: any;
}

export interface BattleState {
  player: PlayerState;
  enemies: EnemyState[];
  turn: number;
  phase: 'player_turn' | 'enemy_turn' | 'won' | 'lost';
}

export interface MapNode {
  id: string;
  type: 'battle' | 'elite' | 'shop' | 'event' | 'rest' | 'boss';
  x: number;
  y: number;
  connections: string[];
  visited: boolean;
  available: boolean;
}

export interface MapState {
  floor: number;
  nodes: MapNode[][];
  currentNodeId: string;
}

export interface RunState {
  seed: string;
  characterId: CharacterId;
  floor: number;
  hp: number;
  maxHp: number;
  gold: number;
  deck: string[];
  relics: string[];
  potions: string[];
  path: string[];
  startTime: number;
}

export interface MetaState {
  unlockedCharacters: CharacterId[];
  completedCharacters: CharacterId[];
  unlockedCards: string[];
  achievements: string[];
  stats: {
    totalRuns: number;
    totalWins: number;
    bestFloor: number;
    fastestWin: number;
  };
}

export type GameScreen =
  | 'main_menu'
  | 'character_select'
  | 'map'
  | 'battle'
  | 'reward'
  | 'shop'
  | 'event'
  | 'rest'
  | 'game_over'
  | 'victory';

export interface GameState {
  screen: GameScreen;
  run?: RunState;
  battle?: BattleState;
  map?: MapState;
  meta: MetaState;
  saveSlots: (RunState | null)[];
}