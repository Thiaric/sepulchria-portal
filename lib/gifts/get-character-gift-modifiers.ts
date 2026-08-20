import "server-only";

import { createClient } from "@/lib/supabase/server";

export type GiftAttributeModifiers = {
  muscles: number;
  reflexes: number;
  vigor: number;
  brains: number;
  shrewd: number;
  presence_score: number;
  maxHealth: number;
};

export const ZERO_GIFT_ATTRIBUTE_MODIFIERS: GiftAttributeModifiers = {
  muscles: 0,
  reflexes: 0,
  vigor: 0,
  brains: 0,
  shrewd: 0,
  presence_score: 0,
  maxHealth: 0,
};

type GiftRow = {
  id: string;
  name: string;
  effect_mode: "none" | "passive" | "temporary";
  is_active: boolean;
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  brains_modifier: number;
  shrewd_modifier: number;
  presence_modifier: number;
  max_health_modifier: number;
};

type OwnershipRow = {
  id: string;
  gift: GiftRow | GiftRow[] | null;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

export async function getCharacterGiftAttributeModifiers(
  characterId: string,
): Promise<GiftAttributeModifiers> {
  const supabase = await createClient();

  const { error: staffExpiryError } = await supabase.rpc(
    "reconcile_expired_staff_gifts",
    { p_character_id: characterId },
  );

  if (staffExpiryError) {
    throw new Error(`Unable to reconcile expired staff Feats: ${staffExpiryError.message}`);
  }

  // Revert any temporary Vigour Health that has expired before
  // calculating the character's current mechanics.
  const { error: reconcileError } =
    await supabase.rpc(
      "reconcile_expired_gift_health",
      {
        p_character_id:
          characterId,
      },
    );

  if (reconcileError) {
    throw new Error(
      `Unable to reconcile expired Feat Health: ${reconcileError.message}`,
    );
  }

  const {
    data: ownershipData,
    error: ownershipError,
  } = await supabase
    .from("character_gifts")
    .select(`
      id,
      gift:gifts(
        id,
        name,
        effect_mode,
        is_active,
        muscles_modifier,
        reflexes_modifier,
        vigour_modifier,
        brains_modifier,
        shrewd_modifier,
        presence_modifier,
        max_health_modifier
      )
    `)
    .eq(
      "character_id",
      characterId,
    );

  if (ownershipError) {
    throw new Error(
      `Unable to load character Feat modifiers: ${ownershipError.message}`,
    );
  }

  const ownerships =
    (ownershipData ??
      []) as unknown as OwnershipRow[];

  if (!ownerships.length) {
    return {
      ...ZERO_GIFT_ATTRIBUTE_MODIFIERS,
    };
  }

  const temporaryOwnershipIds =
    ownerships
      .filter((ownership) => {
        const gift =
          one(ownership.gift);

        return (
          gift?.is_active === true &&
          gift.effect_mode ===
            "temporary"
        );
      })
      .map(
        (ownership) =>
          ownership.id,
      );

  const activeTemporaryIds =
    new Set<string>();

  if (
    temporaryOwnershipIds.length
  ) {
    const now =
      new Date().toISOString();

    const {
      data: activationData,
      error: activationError,
    } = await supabase
      .from("gift_activations")
      .select(
        "character_gift_id, target_character_id",
      )
      .in(
        "character_gift_id",
        temporaryOwnershipIds,
      )
      .is(
        "ended_at",
        null,
      )
      .is(
        "health_reverted_at",
        null,
      )
      .lte(
        "activated_at",
        now,
      )
      .gt(
        "expires_at",
        now,
      );

    if (activationError) {
      throw new Error(
        `Unable to load active Feat effects: ${activationError.message}`,
      );
    }

    for (
      const activation
      of activationData ?? []
    ) {
      if (
        activation.target_character_id === null ||
        activation.target_character_id === characterId
      ) {
        activeTemporaryIds.add(
          activation.character_gift_id,
        );
      }
    }
  }

  const total: GiftAttributeModifiers = {
    ...ZERO_GIFT_ATTRIBUTE_MODIFIERS,
  };

  for (const ownership of ownerships) {
    const gift =
      one(ownership.gift);

    if (
      !gift ||
      !gift.is_active
    ) {
      continue;
    }

    const applies =
      gift.effect_mode ===
        "passive" ||
      (
        gift.effect_mode ===
          "temporary" &&
        activeTemporaryIds.has(
          ownership.id,
        )
      );

    if (!applies) {
      continue;
    }

    total.muscles +=
      gift.muscles_modifier ?? 0;

    total.reflexes +=
      gift.reflexes_modifier ?? 0;

    total.vigor +=
      gift.vigour_modifier ?? 0;

    total.brains +=
      gift.brains_modifier ?? 0;

    total.shrewd +=
      gift.shrewd_modifier ?? 0;

    total.presence_score +=
      gift.presence_modifier ?? 0;

    total.maxHealth +=
      gift.max_health_modifier ?? 0;
  }

  const {
    data: targetedRows,
    error: targetedError,
  } = await supabase.rpc(
    "get_targeted_gift_modifiers",
    { p_character_id: characterId },
  );

  if (targetedError) {
    throw new Error(
      `Unable to load targeted Feat effects: ${targetedError.message}`,
    );
  }

  const targeted = Array.isArray(targetedRows)
    ? targetedRows[0] ?? null
    : targetedRows;

  if (targeted) {
    total.muscles += Number(targeted.muscles ?? 0);
    total.reflexes += Number(targeted.reflexes ?? 0);
    total.vigor += Number(targeted.vigor ?? 0);
    total.brains += Number(targeted.brains ?? 0);
    total.shrewd += Number(targeted.shrewd ?? 0);
    total.presence_score += Number(targeted.presence_score ?? 0);
    total.maxHealth += Number(targeted.max_health ?? 0);
  }

  return total;
}
