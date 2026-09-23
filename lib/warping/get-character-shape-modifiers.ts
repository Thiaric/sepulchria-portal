import "server-only";

import {
  getCharacterActiveEffectModifiers,
} from "@/lib/effects/get-character-active-effect-modifiers";

export type ShapeModifiers = {
  muscles: number;
  reflexes: number;
  vigor: number;
  brains: number;
  shrewd: number;
  presence_score: number;
  maxHealth: number;
};

export async function getCharacterShapeModifiers(
  characterId: string,
): Promise<ShapeModifiers> {
  const effects =
    await getCharacterActiveEffectModifiers(
      characterId,
    );

  return {
    ...effects.shape,
  };
}
