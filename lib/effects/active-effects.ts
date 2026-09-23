import "server-only";

import {
  createClient,
} from "@/lib/supabase/server";

export type EffectSourceType =
  | "shape"
  | "feat"
  | "item"
  | "manual";

export type ActiveCharacterEffect = {
  id: string;
  target_character_id: string;
  source_type: EffectSourceType;
  source_definition_id: string | null;
  mechanics_definition_id: string | null;
  source_instance_id: string | null;
  source_character_id: string | null;
  source_name: string;
  source_level: number;
  effect_nature: string;
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
  starts_at: string;
  expires_at: string | null;
  dispellable: boolean;
};

export async function getCharacterActiveEffects(
  characterId: string,
  sourceTypes?: EffectSourceType[],
): Promise<ActiveCharacterEffect[]> {
  const db: any =
    await createClient();

  let query =
    db
      .from("character_effects")
      .select(`
        id,
        target_character_id,
        source_type,
        source_definition_id,
        mechanics_definition_id,
        source_instance_id,
        source_character_id,
        source_name,
        source_level,
        effect_nature,
        conditions,
        muscles_modifier,
        reflexes_modifier,
        vigour_modifier,
        brains_modifier,
        shrewd_modifier,
        presence_modifier,
        max_health_modifier,
        warping_affinity_modifier,
        warps_per_day_modifier,
        starts_at,
        expires_at,
        dispellable
      `)
      .eq(
        "target_character_id",
        characterId,
      )
      .is(
        "ended_at",
        null,
      )
      .is(
        "dispelled_at",
        null,
      )
      .or(
        `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`,
      )
      .order(
        "starts_at",
        {
          ascending: true,
        },
      );

  if (
    sourceTypes?.length
  ) {
    query =
      query.in(
        "source_type",
        sourceTypes,
      );
  }

  const {
    data,
    error,
  } =
    await query;

  if (error) {
    throw new Error(
      `Unable to load active effects: ${error.message}`,
    );
  }

  return (
    data ?? []
  ).map(
    (row: any) => ({
      ...row,
      conditions:
        Array.isArray(
          row.conditions,
        )
          ? row.conditions
          : [],
      source_level:
        Number(
          row.source_level ??
            1,
        ),
      muscles_modifier:
        Number(
          row.muscles_modifier ??
            0,
        ),
      reflexes_modifier:
        Number(
          row.reflexes_modifier ??
            0,
        ),
      vigour_modifier:
        Number(
          row.vigour_modifier ??
            0,
        ),
      brains_modifier:
        Number(
          row.brains_modifier ??
            0,
        ),
      shrewd_modifier:
        Number(
          row.shrewd_modifier ??
            0,
        ),
      presence_modifier:
        Number(
          row.presence_modifier ??
            0,
        ),
      max_health_modifier:
        Number(
          row.max_health_modifier ??
            0,
        ),
      warping_affinity_modifier:
        Number(
          row.warping_affinity_modifier ??
            0,
        ),
      warps_per_day_modifier:
        Number(
          row.warps_per_day_modifier ??
            0,
        ),
    }),
  ) as ActiveCharacterEffect[];
}
