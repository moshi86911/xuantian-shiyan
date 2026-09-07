import { describe, it, expect } from 'vitest';
import {
  SimpleAI,
  SequenceAI,
  AdaptiveAI,
  BossAI,
  createAI,
} from '../../src/core/EnemyAI';
import { EnemyState } from '../../src/core/Enemy';
import type { EnemyData } from '../../src/core/Enemy';
import type { PlayerState } from '../../src/core/types';
import { SeededRandom } from '../../src/utils/rng';

const makePlayer = (): PlayerState => ({
  characterId: 'sword',
  hp: 80,
  maxHp: 80,
  block: 0,
  energy: 3,
  maxEnergy: 3,
  qi: 0,
  maxQi: 3,
  gold: 0,
  deck: [],
  drawPile: [],
  discardPile: [],
  hand: [],
  exhaustPile: [],
  buffs: [],
});

const sequenceData: EnemyData = {
  id: 'wolf',
  name: '妖狼',
  tier: 'normal',
  maxHp: 28,
  intents: [
    { type: 'attack', value: 6 },
    { type: 'defend', value: 5 },
  ],
  aiPattern: 'sequence',
  description: 'test',
};

const adaptiveData: EnemyData = {
  id: 'xiexiu',
  name: '邪修',
  tier: 'normal',
  maxHp: 35,
  intents: [
    { type: 'attack', value: 7 },
    { type: 'buff', value: 1, specialEffect: 'strength', weight: 1 },
  ],
  aiPattern: 'adaptive',
  description: 'test',
};

const heavyWeighted: EnemyData = {
  id: 'weighted',
  name: 'Weighted',
  tier: 'normal',
  maxHp: 30,
  intents: [
    { type: 'attack', value: 5, weight: 9 },
    { type: 'defend', value: 4, weight: 1 },
  ],
  aiPattern: 'adaptive',
  description: 'test',
};

const bossData: EnemyData = {
  id: 'boss',
  name: 'Boss',
  tier: 'boss',
  maxHp: 300,
  intents: [
    // phase 1 (3 entries)
    { type: 'attack', value: 10 },
    { type: 'attack', value: 11 },
    { type: 'defend', value: 8 },
    // phase 2 (3 entries)
    { type: 'attack', value: 15 },
    { type: 'defend', value: 10 },
    { type: 'buff', value: 1, specialEffect: 'strength' },
    // phase 3 (3 entries)
    { type: 'attack', value: 20 },
    { type: 'attack', value: 22 },
    { type: 'special', value: 0, specialEffect: 'enrage' },
  ],
  aiPattern: 'boss',
  description: 'test',
};

describe('SimpleAI', () => {
  it('returns the current intent', () => {
    const ai = new SimpleAI();
    const e = new EnemyState(sequenceData);
    const player = makePlayer();
    const rng = new SeededRandom(1);
    const intent = ai.decideNextIntent(e, player, rng);
    expect(intent).toEqual({ type: 'attack', value: 6 });
  });

  it('reflects currentIntentIndex changes', () => {
    const ai = new SimpleAI();
    const e = new EnemyState(sequenceData);
    e.advanceIntent();
    const intent = ai.decideNextIntent(e, makePlayer(), new SeededRandom(1));
    expect(intent).toEqual({ type: 'defend', value: 5 });
  });
});

describe('SequenceAI', () => {
  it('returns the current intent', () => {
    const ai = new SequenceAI();
    const e = new EnemyState(sequenceData);
    const intent = ai.decideNextIntent(e, makePlayer(), new SeededRandom(1));
    expect(intent).toEqual({ type: 'attack', value: 6 });
  });

  it('reflects currentIntentIndex changes', () => {
    const ai = new SequenceAI();
    const e = new EnemyState(sequenceData);
    e.advanceIntent();
    const intent = ai.decideNextIntent(e, makePlayer(), new SeededRandom(1));
    expect(intent).toEqual({ type: 'defend', value: 5 });
  });
});

describe('AdaptiveAI', () => {
  it('uses weighted-random selection favoring higher weights (statistical)', () => {
    const ai = new AdaptiveAI();
    const e = new EnemyState(heavyWeighted);
    const player = makePlayer();
    const rng = new SeededRandom(42);

    let attackCount = 0;
    let defendCount = 0;
    const iterations = 1000;
    for (let i = 0; i < iterations; i++) {
      const intent = ai.decideNextIntent(e, player, rng);
      if (intent.type === 'attack') attackCount += 1;
      else if (intent.type === 'defend') defendCount += 1;
    }

    // weight ratio 9:1, expect roughly 90% attacks
    expect(attackCount).toBeGreaterThan(defendCount * 5);
    expect(attackCount).toBeGreaterThan(700);
    expect(attackCount + defendCount).toBe(iterations);
  });

  it('treats missing weights as 1 (equal probability)', () => {
    const ai = new AdaptiveAI();
    const e = new EnemyState(adaptiveData);
    const player = makePlayer();
    const rng = new SeededRandom(7);

    let attackCount = 0;
    let buffCount = 0;
    for (let i = 0; i < 1000; i++) {
      const intent = ai.decideNextIntent(e, player, rng);
      if (intent.type === 'attack') attackCount += 1;
      else if (intent.type === 'buff') buffCount += 1;
    }
    // weights: attack (default 1), buff (1) -> roughly 50/50
    expect(attackCount).toBeGreaterThan(350);
    expect(buffCount).toBeGreaterThan(350);
  });

  it('is deterministic for a fixed seed', () => {
    const ai = new AdaptiveAI();
    const e = new EnemyState(heavyWeighted);
    const player = makePlayer();

    const rng1 = new SeededRandom(123);
    const rng2 = new SeededRandom(123);
    const first = ai.decideNextIntent(e, player, rng1);
    const second = ai.decideNextIntent(e, player, rng2);
    expect(first).toEqual(second);
  });
});

describe('BossAI', () => {
  it('phase 1: hp > 66% picks from first third', () => {
    const ai = new BossAI();
    const e = new EnemyState(bossData);
    e.hp = 250; // ~83%
    const intent = ai.decideNextIntent(e, makePlayer(), new SeededRandom(1));
    expect([10, 11, 8]).toContain(intent.value);
  });

  it('phase 2: hp between 33% and 66% picks from middle third', () => {
    const ai = new BossAI();
    const e = new EnemyState(bossData);
    e.hp = 150; // 50%
    const intent = ai.decideNextIntent(e, makePlayer(), new SeededRandom(1));
    expect([15, 10, 1]).toContain(intent.value);
  });

  it('phase 3: hp <= 33% picks from last third', () => {
    const ai = new BossAI();
    const e = new EnemyState(bossData);
    e.hp = 60; // 20%
    const intent = ai.decideNextIntent(e, makePlayer(), new SeededRandom(1));
    expect([20, 22, 0]).toContain(intent.value);
  });
});

describe('createAI factory', () => {
  it('returns SimpleAI for pattern simple', () => {
    expect(createAI('simple')).toBeInstanceOf(SimpleAI);
  });
  it('returns SequenceAI for pattern sequence', () => {
    expect(createAI('sequence')).toBeInstanceOf(SequenceAI);
  });
  it('returns AdaptiveAI for pattern adaptive', () => {
    expect(createAI('adaptive')).toBeInstanceOf(AdaptiveAI);
  });
  it('returns BossAI for pattern boss', () => {
    expect(createAI('boss')).toBeInstanceOf(BossAI);
  });
});