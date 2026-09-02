import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export type EquippedCosmetic = {
  id: string;
  name: string;
  assetUrl: string;
};

export async function getEquippedCosmetic(
  characterId: string,
  category:
    | "sheet_frame"
    | "chat_frame",
): Promise<EquippedCosmetic | null> {
  const admin =
    createAdminClient();

  const {
    data: preference,
    error: preferenceError,
  } = await admin
    .from(
      "character_cosmetic_preferences",
    )
    .select(
      "equipped_sheet_frame_id, equipped_chat_frame_id",
    )
    .eq(
      "character_id",
      characterId,
    )
    .maybeSingle();

  if (preferenceError) {
    throw new Error(
      `Unable to load equipped cosmetic: ${preferenceError.message}`,
    );
  }

  const cosmeticId =
    category ===
    "sheet_frame"
      ? preference
          ?.equipped_sheet_frame_id
      : preference
          ?.equipped_chat_frame_id;

  if (!cosmeticId) {
    return null;
  }

  const [
    cosmeticResult,
    entitlementResult,
  ] = await Promise.all([
    admin
      .from(
        "cosmetic_items",
      )
      .select(
        "id, name, category, asset_url, is_active",
      )
      .eq(
        "id",
        cosmeticId,
      )
      .maybeSingle(),

    admin
      .from(
        "character_cosmetic_entitlements",
      )
      .select("enabled")
      .eq(
        "character_id",
        characterId,
      )
      .eq(
        "cosmetic_item_id",
        cosmeticId,
      )
      .maybeSingle(),
  ]);

  if (
    cosmeticResult.error ||
    entitlementResult.error
  ) {
    throw new Error(
      `Unable to validate equipped cosmetic: ${
        cosmeticResult.error
          ?.message ??
        entitlementResult.error
          ?.message ??
        "Unknown error"
      }`,
    );
  }

  if (
    !cosmeticResult.data ||
    cosmeticResult.data
      .is_active !== true ||
    cosmeticResult.data
      .category !== category ||
    !cosmeticResult.data
      .asset_url ||
    entitlementResult.data
      ?.enabled !== true
  ) {
    return null;
  }

  return {
    id:
      cosmeticResult.data.id,
    name:
      cosmeticResult.data.name,
    assetUrl:
      cosmeticResult.data
        .asset_url,
  };
}
