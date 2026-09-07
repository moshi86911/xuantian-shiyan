// src/core/Unlocks.ts

import type { CharacterId } from './Character';
import type { MetaState } from './types';

/**
 * Unlock progression for characters.
 *
 * - sword is the starter, always in the initial unlockedCharacters list.
 * - talisman unlocks once the player has finished a sword run.
 * - alchemy unlocks once the player has finished a talisman run.
 *
 * All mutation helpers return new arrays/objects so MetaState remains
 * immutable from the perspective of the save system.
 */
export class Unlocks {
  /** True if the character is in the unlocked list. */
  static isUnlocked(characterId: CharacterId, meta: MetaState): boolean {
    return meta.unlockedCharacters.includes(characterId);
  }

  /**
   * True if the player has met the unlock requirement and does not
   * already own the character.
   */
  static canUnlock(characterId: CharacterId, meta: MetaState): boolean {
    if (meta.unlockedCharacters.includes(characterId)) return false;
    switch (characterId) {
      case 'sword':
        return false; // starter, no unlock step
      case 'talisman':
        return meta.completedCharacters.includes('sword');
      case 'alchemy':
        return meta.completedCharacters.includes('talisman');
    }
  }

  /** Return a new unlockedCharacters list with the target added. */
  static unlock(characterId: CharacterId, meta: MetaState): CharacterId[] {
    if (meta.unlockedCharacters.includes(characterId)) {
      return meta.unlockedCharacters;
    }
    return [...meta.unlockedCharacters, characterId];
  }

  /** Mark a character run as completed. Pure: returns a new list. */
  static markCompleted(characterId: CharacterId, meta: MetaState): CharacterId[] {
    if (meta.completedCharacters.includes(characterId)) {
      return meta.completedCharacters;
    }
    return [...meta.completedCharacters, characterId];
  }

  /** Characters that should appear in the UI selection screen. */
  static listVisible(meta: MetaState): CharacterId[] {
    return meta.unlockedCharacters;
  }
}