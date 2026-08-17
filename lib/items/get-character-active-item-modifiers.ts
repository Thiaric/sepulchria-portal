import "server-only";

import { createClient } from "@/lib/supabase/server";

export type CharacterActiveItemModifiers = {
  muscles: number;
  reflexes: number;
  vigor: number;
  shrewd: number;
  brains: number;
  presence_score: number;
  maxHealth: number;
};

type ModifierRow = {
  muscles_modifier: number | null;
  reflexes_modifier: number | null;
  vigour_modifier: number | null;
  shrewd_modifier: number | null;
  brains_modifier: number | null;
  presence_modifier: number | null;
  max_health_modifier: number | null;
};

const ZERO: CharacterActiveItemModifiers = {
  muscles: 0,
  reflexes: 0,
  vigor: 0,
  shrewd: 0,
  brains: 0,
  presence_score: 0,
  maxHealth: 0,
};

export async function getCharacterActiveItemModifiers(
  characterId: string,
): Promise<CharacterActiveItemModifiers> {
  const supabase = await createClient();

  // IMPORTANT:
  // This function is called while rendering character sheets.
  // It must remain read-only. Expired effects are already excluded by
  // get_character_active_item_modifiers() with `expires_at > now()`.
  //
  // The previous D5.1 version called reconcile_expired_item_effects()
  // here, which updated the character row during every render and could
  // create repeated render/invalidation activity.
  const { data, error } = await supabase
    .rpc("get_character_active_item_modifiers", {
      p_character_id: characterId,
    })
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load active Item modifiers: ${error.message}`,
    );
  }

  if (!data) {
    return ZERO;
  }

  const row = data as unknown as ModifierRow;

  return {
    muscles: Number(row.muscles_modifier ?? 0),
    reflexes: Number(row.reflexes_modifier ?? 0),
    vigor: Number(row.vigour_modifier ?? 0),
    shrewd: Number(row.shrewd_modifier ?? 0),
    brains: Number(row.brains_modifier ?? 0),
    presence_score: Number(row.presence_modifier ?? 0),
    maxHealth: Number(row.max_health_modifier ?? 0),
  };
}
