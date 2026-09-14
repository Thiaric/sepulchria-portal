import "server-only";

import { createClient } from "@/lib/supabase/server";

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

function normalizeConditions(
  value: unknown,
): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => String(entry).trim())
          .filter(Boolean);
      }
    } catch {
      // Ignore malformed JSON and fall through.
    }

    return value
      .replace(/^\{|\}$/g, "")
      .split(",")
      .map((entry) =>
        entry
          .replace(/^"|"$/g, "")
          .trim(),
      )
      .filter(Boolean);
  }

  return [];
}

export async function getCharacterActiveItemEffects(
  characterId: string,
): Promise<ActiveItemEffect[]> {
  const supabase = await createClient();

  const { data, error } =
    await supabase.rpc(
      "get_character_active_item_effects_v2",
      {
        p_character_id:
          characterId,
      },
    );

  if (error) {
    throw new Error(
      `Unable to load active Item effects: ${error.message}`,
    );
  }

  return (data ?? []).map(
    (row: any) => ({
      ...row,
      conditions:
        normalizeConditions(
          row.conditions,
        ),
    }),
  ) as ActiveItemEffect[];
}

export function itemEffectDuration(
  effect: ActiveItemEffect,
) {
  const ms =
    new Date(
      effect.expires_at,
    ).getTime() -
    Date.now();

  if (ms <= 0) {
    return "Expired";
  }

  const minutes =
    Math.ceil(ms / 60000);

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
