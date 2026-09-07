// src/core/EnemyAI.ts

import type { EnemyState, EnemyIntentData } from './Enemy';
import type { PlayerState } from './types';
import type { SeededRandom } from '../utils/rng';

/**
 * Every AI pattern picks the next intent the enemy will execute this turn.
 * AIs are stateless w.r.t. RNG — they receive it as an argument so the
 * battle remains deterministic when the caller seeds RNG.
 */
export interface EnemyAI {
  decideNextIntent(enemy: EnemyState, player: PlayerState, rng: SeededRandom): EnemyIntentData;
}

/**
 * SimpleAI: cycles through intents in fixed order, ignoring player state.
 * Use for predictable early-game enemies whose rotation never changes.
 */
export class SimpleAI implements EnemyAI {
  decideNextIntent(enemy: EnemyState, _player: PlayerState, _rng: SeededRandom): EnemyIntentData {
    return enemy.getCurrentIntent();
  }
}

/**
 * SequenceAI: same cycling behavior as SimpleAI, kept distinct so future
 * intent-order tweaks can land without renaming existing patterns.
 */
export class SequenceAI implements EnemyAI {
  decideNextIntent(enemy: EnemyState, _player: PlayerState, _rng: SeededRandom): EnemyIntentData {
    return enemy.getCurrentIntent();
  }
}

/**
 * AdaptiveAI: weighted-random selection among intents.
 * - Each intent's weight defaults to 1 when omitted.
 * - Higher weights are more likely. With equal weights the selection is uniform.
 */
export class AdaptiveAI implements EnemyAI {
  decideNextIntent(enemy: EnemyState, _player: PlayerState, rng: SeededRandom): EnemyIntentData {
    const intents = enemy.data.intents;
    const weights = intents.map((i) => i.weight ?? 1);
    const total = weights.reduce((a, b) => a + b, 0);

    // SeededRandom.next() returns a value in [0, 1).
    let pick = rng.next() * total;
    for (let i = 0; i < intents.length; i++) {
      pick -= weights[i];
      if (pick <= 0) return intents[i];
    }
    // Floating-point fallback — return the last intent if rounding kept us short.
    return intents[intents.length - 1];
  }
}

/**
 * BossAI: multi-phase, switches intent pool based on HP thresholds.
 *
 *   hp > 66%   -> phase 1 (first third)
 *   33-66%     -> phase 2 (middle third)
 *   0-33%      -> phase 3 (last third)
 *
 * The caller arranges EnemyData.intents in three equal groups.
 * `Math.floor(intents.length / 3)` is used to compute the phase slice size;
 * a small `|| 1` guards against empty phase slices for bosses with
 * fewer than 3 declared intents.
 */
export class BossAI implements EnemyAI {
  decideNextIntent(enemy: EnemyState, _player: PlayerState, _rng: SeededRandom): EnemyIntentData {
    const intents = enemy.data.intents;
    const phaseSize = Math.floor(intents.length / 3) || 1;
    const hpRatio = enemy.hp / enemy.maxHp;

    let phaseIndex = 0;
    if (hpRatio <= 0.33) phaseIndex = 2;
    else if (hpRatio <= 0.66) phaseIndex = 1;

    const start = phaseIndex * phaseSize;
    const phaseIntents = intents.slice(start, start + phaseSize);
    if (phaseIntents.length === 0) return intents[0];

    // Cycle within the phase.
    const offset = enemy.currentIntentIndex % phaseIntents.length;
    return phaseIntents[offset];
  }
}

/**
 * Factory: returns the right AI for a given data.aiPattern value.
 */
export function createAI(pattern: 'simple' | 'sequence' | 'adaptive' | 'boss'): EnemyAI {
  switch (pattern) {
    case 'simple':
      return new SimpleAI();
    case 'sequence':
      return new SequenceAI();
    case 'adaptive':
      return new AdaptiveAI();
    case 'boss':
      return new BossAI();
  }
}