// src/data/characters/loader.ts

import swordData from './sword.json';
import talismanData from './talisman.json';
import alchemyData from './alchemy.json';
import type { CharacterData, CharacterId } from '../../core/Character';

const characters: Record<CharacterId, CharacterData> = {
  sword: swordData as CharacterData,
  talisman: talismanData as CharacterData,
  alchemy: alchemyData as CharacterData,
};

export function getCharacter(id: CharacterId): CharacterData | undefined {
  return characters[id];
}

export function listAllCharacters(): CharacterData[] {
  return Object.values(characters);
}