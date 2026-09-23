import "server-only";

import {
  createClient,
} from "@/lib/supabase/server";

export type GiftAttributeModifiers = {
  muscles: number;
  reflexes: number;
  vigor: number;
  brains: number;
  shrewd: number;
  presence_score: number;
  maxHealth: number;
};

export const ZERO_GIFT_ATTRIBUTE_MODIFIERS:
  GiftAttributeModifiers = {
    muscles: 0,
    reflexes: 0,
    vigor: 0,
    brains: 0,
    shrewd: 0,
    presence_score: 0,
    maxHealth: 0,
  };

function one<T>(
  value:
    | T
    | T[]
    | null,
): T | null {
  return Array.isArray(
    value,
  )
    ? value[0] ?? null
    : value;
}

export async function getCharacterGiftAttributeModifiers(
  characterId: string,
): Promise<GiftAttributeModifiers> {
  const supabase =
    await createClient();

  const expiry =
    await supabase.rpc(
      "reconcile_expired_staff_gifts",
      {
        p_character_id:
          characterId,
      },
    );

  if (expiry.error) {
    throw new Error(
      `Unable to reconcile expired staff Feats: ${expiry.error.message}`,
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "character_gifts",
      )
      .select(`
        gift:gifts(
          is_active,
          effect_mode,
          muscles_modifier,
          reflexes_modifier,
          vigour_modifier,
          brains_modifier,
          shrewd_modifier,
          presence_modifier,
          max_health_modifier,
          mechanics:shapes!shapes_feat_id_fkey(id)
        )
      `)
      .eq(
        "character_id",
        characterId,
      );

  if (error) {
    throw new Error(
      `Unable to load passive Feat modifiers: ${error.message}`,
    );
  }

  const total = {
    ...ZERO_GIFT_ATTRIBUTE_MODIFIERS,
  };

  for (
    const ownership
    of data ?? []
  ) {
    const gift =
      one<any>(
        ownership.gift as any,
      );

    if (
      !gift ||
      !gift.is_active ||
      gift.effect_mode !==
        "passive"
    ) {
      continue;
    }

    const mechanics =
      one<any>(
        gift.mechanics as any,
      );

    if (mechanics) {
      continue;
    }

    total.muscles +=
      Number(
        gift.muscles_modifier ??
          0,
      );
    total.reflexes +=
      Number(
        gift.reflexes_modifier ??
          0,
      );
    total.vigor +=
      Number(
        gift.vigour_modifier ??
          0,
      );
    total.brains +=
      Number(
        gift.brains_modifier ??
          0,
      );
    total.shrewd +=
      Number(
        gift.shrewd_modifier ??
          0,
      );
    total.presence_score +=
      Number(
        gift.presence_modifier ??
          0,
      );
    total.maxHealth +=
      Number(
        gift.max_health_modifier ??
          0,
      );
  }

  return total;
}
