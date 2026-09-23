import "server-only";

import {
  getCharacterActiveEffects,
  type EffectSourceType,
} from "@/lib/effects/active-effects";

export type EffectModifierTotal = {
  muscles: number;
  reflexes: number;
  vigor: number;
  brains: number;
  shrewd: number;
  presence_score: number;
  maxHealth: number;
};

export type ActiveEffectModifierBreakdown = {
  shape: EffectModifierTotal;
  feat: EffectModifierTotal;
  item: EffectModifierTotal;
};

const zero = (): EffectModifierTotal => ({
  muscles: 0,
  reflexes: 0,
  vigor: 0,
  brains: 0,
  shrewd: 0,
  presence_score: 0,
  maxHealth: 0,
});

export async function getCharacterActiveEffectModifiers(
  characterId: string,
): Promise<ActiveEffectModifierBreakdown> {
  const result:
    ActiveEffectModifierBreakdown = {
      shape: zero(),
      feat: zero(),
      item: zero(),
    };

  const rows =
    await getCharacterActiveEffects(
      characterId,
      [
        "shape",
        "feat",
        "item",
      ],
    );

  for (const row of rows) {
    const key =
      row.source_type as
        | "shape"
        | "feat"
        | "item";

    const total =
      result[key];

    total.muscles +=
      row.muscles_modifier;
    total.reflexes +=
      row.reflexes_modifier;
    total.vigor +=
      row.vigour_modifier;
    total.brains +=
      row.brains_modifier;
    total.shrewd +=
      row.shrewd_modifier;
    total.presence_score +=
      row.presence_modifier;
    total.maxHealth +=
      row.max_health_modifier;
  }

  return result;
}
