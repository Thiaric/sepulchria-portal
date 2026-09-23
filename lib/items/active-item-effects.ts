import "server-only";

import {
  getCharacterActiveEffects,
} from "@/lib/effects/active-effects";

export type ActiveItemEffect = {
  id: string;
  item_id: string;
  source_name: string;
  conditions: string[];
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  brains_modifier: number;
  shrewd_modifier: number;
  presence_modifier: number;
  max_health_modifier: number;
  warping_affinity_modifier: number;
  warps_per_day_modifier: number;
  activated_at: string;
  expires_at: string;
};

export async function getCharacterActiveItemEffects(
  characterId: string,
): Promise<ActiveItemEffect[]> {
  const rows =
    await getCharacterActiveEffects(
      characterId,
      ["item"],
    );

  return rows.map(
    row => ({
      id:
        row.id,
      item_id:
        row.source_definition_id ??
        "",
      source_name:
        row.source_name,
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
      max_health_modifier:
        row.max_health_modifier,
      warping_affinity_modifier:
        row.warping_affinity_modifier,
      warps_per_day_modifier:
        row.warps_per_day_modifier,
      activated_at:
        row.starts_at,
      expires_at:
        row.expires_at ??
        row.starts_at,
    }),
  );
}

export function itemEffectDuration(
  effect:
    ActiveItemEffect,
) {
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
