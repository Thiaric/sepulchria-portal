import "server-only";

import {
  getCharacterActiveEffects,
} from "@/lib/effects/active-effects";

export type ActiveShapeEffect = {
  id: string;
  shape_id: string;
  shape_name: string;
  shape_level: number;
  effect_nature: string;
  conditions: string[];
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  brains_modifier: number;
  shrewd_modifier: number;
  presence_modifier: number;
  max_hp_modifier: number;
  starts_at: string;
  expires_at: string | null;
  source_character_id: string;
  source_name: string;
};

export async function getCharacterActiveShapeEffects(
  characterId: string,
): Promise<ActiveShapeEffect[]> {
  const rows =
    await getCharacterActiveEffects(
      characterId,
      ["shape"],
    );

  return rows.map(
    row => ({
      id:
        row.id,
      shape_id:
        row.source_definition_id ??
        "",
      shape_name:
        row.source_name,
      shape_level:
        row.source_level,
      effect_nature:
        row.effect_nature,
      conditions:
        row.conditions,
      muscles_modifier:
        row.muscles_modifier,
      reflexes_modifier:
        row.reflexes_modifier,
      vigour_modifier:
        row.vigour_modifier,
      brains_modifier:
        row.brains_modifier,
      shrewd_modifier:
        row.shrewd_modifier,
      presence_modifier:
        row.presence_modifier,
      max_hp_modifier:
        row.max_health_modifier,
      starts_at:
        row.starts_at,
      expires_at:
        row.expires_at,
      source_character_id:
        row.source_character_id ??
        "",
      source_name:
        row.source_name,
    }),
  );
}

export function effectDuration(
  effect:
    ActiveShapeEffect,
) {
  if (!effect.expires_at) {
    return "Until Dispelled";
  }

  const ms =
    Date.parse(
      effect.expires_at,
    ) -
    Date.now();

  if (ms <= 0) {
    return "Expired";
  }

  const minutes =
    Math.ceil(
      ms / 60_000,
    );

  if (minutes < 60) {
    return `${minutes}m remaining`;
  }

  const hours =
    Math.ceil(
      minutes / 60,
    );

  if (hours < 48) {
    return `${hours}h remaining`;
  }

  return `${Math.ceil(
    hours / 24,
  )}d remaining`;
}
