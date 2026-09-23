import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  canDispelEffect,
  type DispelSourceType,
} from "@/lib/effects/dispel-rules";

export async function dispelActiveCharacterEffect({
  effectId,
  dispelSourceType,
  dispelLevel,
  dispelSourceId,
}: {
  effectId: string;
  dispelSourceType: DispelSourceType;
  dispelLevel: number;
  dispelSourceId: string | null;
}) {
  const admin: any =
    createAdminClient();

  const {
    data: effect,
    error,
  } =
    await admin
      .from(
        "character_effects",
      )
      .select(
        "id,source_type,source_level,source_name,dispellable,ended_at,dispelled_at,expires_at",
      )
      .eq(
        "id",
        effectId,
      )
      .maybeSingle();

  if (
    error ||
    !effect
  ) {
    throw new Error(
      error?.message ??
        "Active effect not found.",
    );
  }

  if (
    effect.ended_at ||
    effect.dispelled_at ||
    (
      effect.expires_at &&
      Date.parse(
        effect.expires_at,
      ) <= Date.now()
    )
  ) {
    throw new Error(
      "That effect is no longer active.",
    );
  }

  if (
    effect.dispellable !==
    true
  ) {
    throw new Error(
      "That effect cannot be dispelled.",
    );
  }

  if (
    !canDispelEffect({
      dispelSourceType,
      dispelLevel,
      effectSourceType:
        effect.source_type,
      effectLevel:
        Number(
          effect.source_level ??
            1,
        ),
    })
  ) {
    throw new Error(
      "That Dispel cannot remove this effect.",
    );
  }

  const now =
    new Date()
      .toISOString();

  const update =
    await admin
      .from(
        "character_effects",
      )
      .update({
        dispelled_at:
          now,
        ended_at:
          now,
        dispelled_by_source_type:
          dispelSourceType,
        dispelled_by_source_id:
          dispelSourceId,
      })
      .eq(
        "id",
        effectId,
      )
      .is(
        "ended_at",
        null,
      )
      .is(
        "dispelled_at",
        null,
      );

  if (
    update.error
  ) {
    throw new Error(
      update.error.message,
    );
  }

  return {
    id:
      effect.id,
    sourceName:
      effect.source_name,
    sourceType:
      effect.source_type,
    sourceLevel:
      Number(
        effect.source_level ??
          1,
      ),
  };
}
