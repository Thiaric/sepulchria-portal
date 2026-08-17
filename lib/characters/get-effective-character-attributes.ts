import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getCharacterGiftAttributeModifiers,
} from "@/lib/gifts/get-character-gift-modifiers";
import {
  getCharacterItemPassiveModifiers,
} from "@/lib/items/get-character-item-modifiers";

export type CharacterAttributeValues = {
  muscles: number | null;
  reflexes: number | null;
  vigor: number | null;
  brains: number | null;
  shrewd: number | null;
  presence_score: number | null;
};

export type CharacterAttributeBreakdownEntry = {
  base: number | null;
  gifts: number;
  items: number;
  adjustedBase: number | null;
  ancestry: number;
  order: number;
  effective: number | null;
};

export type CharacterAttributeBreakdown = {
  muscles: CharacterAttributeBreakdownEntry;
  reflexes: CharacterAttributeBreakdownEntry;
  vigor: CharacterAttributeBreakdownEntry;
  brains: CharacterAttributeBreakdownEntry;
  shrewd: CharacterAttributeBreakdownEntry;
  presence_score: CharacterAttributeBreakdownEntry;
  itemMaxHealth: number;
};

type Relation<T> = T | T[] | null;

type ModifierRow = {
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  shrewd_modifier: number;
  brains_modifier: number;
  presence_modifier: number;
};

function one<T>(value: Relation<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function makeBreakdown(
  base: number | null,
  gifts: number,
  items: number,
  ancestry: number,
  order: number,
): CharacterAttributeBreakdownEntry {
  const adjustedBase =
    base === null
      ? null
      : base + gifts + items;

  return {
    base,
    gifts,
    items,
    adjustedBase,
    ancestry,
    order,
    effective:
      adjustedBase === null
        ? null
        : adjustedBase + ancestry + order,
  };
}

export async function getCharacterAttributeBreakdown(
  characterId: string,
  baseAttributes: CharacterAttributeValues,
): Promise<CharacterAttributeBreakdown> {
  const supabase = await createClient();

  const [
    {
      data: characterData,
      error: characterError,
    },
    {
      data: membershipData,
      error: membershipError,
    },
    giftModifiers,
    itemModifiers,
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
        role:order_jobs!order_memberships_order_job_id_fkey(
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

    getCharacterGiftAttributeModifiers(characterId),
    getCharacterItemPassiveModifiers(characterId),
  ]);

  if (characterError) {
    throw new Error(
      `Unable to load ancestry attribute modifiers: ${characterError.message}`,
    );
  }

  if (membershipError) {
    throw new Error(
      `Unable to load Order role attribute modifiers: ${membershipError.message}`,
    );
  }

  const ancestry = one(
    (characterData?.race ?? null) as Relation<ModifierRow>,
  );

  const orderRole = one(
    (membershipData?.role ?? null) as Relation<ModifierRow>,
  );

  return {
    muscles: makeBreakdown(
      baseAttributes.muscles,
      giftModifiers.muscles,
      itemModifiers.muscles,
      ancestry?.muscles_modifier ?? 0,
      orderRole?.muscles_modifier ?? 0,
    ),
    reflexes: makeBreakdown(
      baseAttributes.reflexes,
      giftModifiers.reflexes,
      itemModifiers.reflexes,
      ancestry?.reflexes_modifier ?? 0,
      orderRole?.reflexes_modifier ?? 0,
    ),
    vigor: makeBreakdown(
      baseAttributes.vigor,
      giftModifiers.vigor,
      itemModifiers.vigor,
      ancestry?.vigour_modifier ?? 0,
      orderRole?.vigour_modifier ?? 0,
    ),
    brains: makeBreakdown(
      baseAttributes.brains,
      giftModifiers.brains,
      itemModifiers.brains,
      ancestry?.brains_modifier ?? 0,
      orderRole?.brains_modifier ?? 0,
    ),
    shrewd: makeBreakdown(
      baseAttributes.shrewd,
      giftModifiers.shrewd,
      itemModifiers.shrewd,
      ancestry?.shrewd_modifier ?? 0,
      orderRole?.shrewd_modifier ?? 0,
    ),
    presence_score: makeBreakdown(
      baseAttributes.presence_score,
      giftModifiers.presence_score,
      itemModifiers.presence_score,
      ancestry?.presence_modifier ?? 0,
      orderRole?.presence_modifier ?? 0,
    ),
    itemMaxHealth: itemModifiers.maxHealth,
  };
}

export async function getEffectiveCharacterAttributes(
  characterId: string,
  baseAttributes: CharacterAttributeValues,
): Promise<CharacterAttributeValues> {
  const breakdown = await getCharacterAttributeBreakdown(
    characterId,
    baseAttributes,
  );

  return {
    muscles: breakdown.muscles.effective,
    reflexes: breakdown.reflexes.effective,
    vigor: breakdown.vigor.effective,
    brains: breakdown.brains.effective,
    shrewd: breakdown.shrewd.effective,
    presence_score: breakdown.presence_score.effective,
  };
}
