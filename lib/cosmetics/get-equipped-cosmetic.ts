import "server-only";

import {
  COSMETIC_PREFERENCE_COLUMN,
  type CosmeticCategory,
} from "@/lib/cosmetics/catalogue";
import { createAdminClient } from "@/lib/supabase/admin";

export type EquippedCosmetic = {
  id: string;
  name: string;
  category: CosmeticCategory;
  assetUrl: string;
};

export type EquippedCosmeticMap =
  Partial<Record<CosmeticCategory, EquippedCosmetic>>;

export async function getEquippedCosmeticsForCharacters(
  characterIds: string[],
  categories: readonly CosmeticCategory[],
): Promise<Record<string, EquippedCosmeticMap>> {
  const ids = Array.from(new Set(characterIds.filter(Boolean)));
  if (!ids.length || !categories.length) return {};

  const admin = createAdminClient();
  const columns = categories.map(
    (category) => COSMETIC_PREFERENCE_COLUMN[category],
  );

  const preferencesResult = await admin
    .from("character_cosmetic_preferences")
    .select(["character_id", ...columns].join(","))
    .in("character_id", ids);

  if (preferencesResult.error) {
    throw new Error(
      `Unable to load equipped cosmetics: ${preferencesResult.error.message}`,
    );
  }

  const preferences =
    ((preferencesResult.data ?? []) as unknown[]) as Array<
      Record<string, unknown>
    >;

  const cosmeticIds = Array.from(
    new Set(
      preferences.flatMap((row) =>
        columns
          .map((column) =>
            String(row[column] ?? ""),
          )
          .filter(Boolean),
      ),
    ),
  );

  const result = Object.fromEntries(
    ids.map((id) => [id, {}]),
  ) as Record<string, EquippedCosmeticMap>;

  if (!cosmeticIds.length) return result;

  const [itemsResult, entitlementsResult] = await Promise.all([
    admin
      .from("cosmetic_items")
      .select("id, name, category, asset_url, is_active")
      .in("id", cosmeticIds)
      .eq("is_active", true),
    admin
      .from("character_cosmetic_entitlements")
      .select("character_id, cosmetic_item_id, enabled")
      .in("character_id", ids)
      .in("cosmetic_item_id", cosmeticIds)
      .eq("enabled", true),
  ]);

  const error = itemsResult.error ?? entitlementsResult.error;
  if (error) {
    throw new Error(`Unable to validate equipped cosmetics: ${error.message}`);
  }

  const items = new Map(
    (itemsResult.data ?? []).map((item) => [item.id, item]),
  );

  const enabled = new Set(
    (entitlementsResult.data ?? []).map(
      (row) => `${row.character_id}:${row.cosmetic_item_id}`,
    ),
  );

  for (const row of preferences) {
    const characterId = String(
      row.character_id ?? "",
    );

    for (const category of categories) {
      const column =
        COSMETIC_PREFERENCE_COLUMN[
          category
        ];

      const cosmeticId = String(
        row[column] ?? "",
      );

      if (
        !cosmeticId ||
        !enabled.has(`${characterId}:${cosmeticId}`)
      ) {
        continue;
      }

      const item = items.get(cosmeticId);
      if (
        !item ||
        item.category !== category ||
        !item.asset_url
      ) {
        continue;
      }

      result[characterId][category] = {
        id: item.id,
        name: item.name,
        category,
        assetUrl: item.asset_url,
      };
    }
  }

  return result;
}

export async function getEquippedCosmetics(
  characterId: string,
  categories: readonly CosmeticCategory[],
): Promise<EquippedCosmeticMap> {
  const result = await getEquippedCosmeticsForCharacters(
    [characterId],
    categories,
  );
  return result[characterId] ?? {};
}

export async function getEquippedCosmetic(
  characterId: string,
  category: CosmeticCategory,
): Promise<EquippedCosmetic | null> {
  const cosmetics = await getEquippedCosmetics(
    characterId,
    [category],
  );
  return cosmetics[category] ?? null;
}
