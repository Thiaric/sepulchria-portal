import "server-only";

import { createClient } from "@/lib/supabase/server";

export type CharacterAttributeValues = {
  muscles: number | null;
  reflexes: number | null;
  vigor: number | null;
  brains: number | null;
  shrewd: number | null;
  presence_score: number | null;
};

type Relation<T> =
  | T
  | T[]
  | null;

type ModifierRow = {
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  shrewd_modifier: number;
  brains_modifier: number;
  presence_modifier: number;
};

function one<T>(
  value: Relation<T>,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function effective(
  baseValue: number | null,
  ancestryModifier: number,
  orderModifier: number,
): number | null {
  if (baseValue === null) {
    return null;
  }

  return (
    baseValue +
    ancestryModifier +
    orderModifier
  );
}

export async function getEffectiveCharacterAttributes(
  characterId: string,
  baseAttributes: CharacterAttributeValues,
): Promise<CharacterAttributeValues> {
  const supabase =
    await createClient();

  const [
    {
      data: characterData,
      error: characterError,
    },
    {
      data: membershipData,
      error: membershipError,
    },
  ] = await Promise.all([
    supabase
      .from("characters")
      .select(`
        race:races!characters_race_id_fkey(
          muscles_modifier,
          reflexes_modifier,
          vigour_modifier,
          shrewd_modifier,
          brains_modifier,
          presence_modifier
        )
      `)
      .eq("id", characterId)
      .maybeSingle(),

    supabase
      .from("order_memberships")
      .select(`
        level:order_levels!order_memberships_order_level_id_fkey(
          muscles_modifier,
          reflexes_modifier,
          vigour_modifier,
          shrewd_modifier,
          brains_modifier,
          presence_modifier
        )
      `)
      .eq("character_id", characterId)
      .limit(1)
      .maybeSingle(),
  ]);

  if (characterError) {
    throw new Error(
      `Unable to load ancestry attribute modifiers: ${characterError.message}`,
    );
  }

  if (membershipError) {
    throw new Error(
      `Unable to load Order attribute modifiers: ${membershipError.message}`,
    );
  }

  const ancestry = one(
    (characterData?.race ?? null) as
      Relation<ModifierRow>,
  );

  const orderLevel = one(
    (membershipData?.level ?? null) as
      Relation<ModifierRow>,
  );

  return {
    muscles: effective(
      baseAttributes.muscles,
      ancestry?.muscles_modifier ?? 0,
      orderLevel?.muscles_modifier ?? 0,
    ),
    reflexes: effective(
      baseAttributes.reflexes,
      ancestry?.reflexes_modifier ?? 0,
      orderLevel?.reflexes_modifier ?? 0,
    ),
    vigor: effective(
      baseAttributes.vigor,
      ancestry?.vigour_modifier ?? 0,
      orderLevel?.vigour_modifier ?? 0,
    ),
    brains: effective(
      baseAttributes.brains,
      ancestry?.brains_modifier ?? 0,
      orderLevel?.brains_modifier ?? 0,
    ),
    shrewd: effective(
      baseAttributes.shrewd,
      ancestry?.shrewd_modifier ?? 0,
      orderLevel?.shrewd_modifier ?? 0,
    ),
    presence_score: effective(
      baseAttributes.presence_score,
      ancestry?.presence_modifier ?? 0,
      orderLevel?.presence_modifier ?? 0,
    ),
  };
}
