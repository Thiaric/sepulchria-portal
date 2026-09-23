import "server-only";

import {
  getCharacterActiveEffectModifiers,
} from "@/lib/effects/get-character-active-effect-modifiers";

export type CharacterActiveItemModifiers = {
  muscles: number;
  reflexes: number;
  vigor: number;
  shrewd: number;
  brains: number;
  presence_score: number;
  maxHealth: number;
};

export async function getCharacterActiveItemModifiers(
  characterId: string,
): Promise<CharacterActiveItemModifiers> {
  const effects =
    await getCharacterActiveEffectModifiers(
      characterId,
    );

  return {
    ...effects.item,
  };
}
