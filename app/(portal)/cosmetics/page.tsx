import { redirect } from "next/navigation";

import {
  PlayerCosmeticsManager,
  type PlayerCosmeticRow,
} from "@/components/cosmetics/player-cosmetics-manager";
import {
  COSMETIC_CATEGORIES,
  COSMETIC_PREFERENCE_COLUMN,
  type CosmeticCategory,
} from "@/lib/cosmetics/catalogue";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CosmeticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const characterResult = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterResult.error || !characterResult.data) {
    redirect("/");
  }

  const character = characterResult.data;
  const preferenceColumns = COSMETIC_CATEGORIES.map(
    (category) => COSMETIC_PREFERENCE_COLUMN[category],
  );

  const [entitlementResult, preferenceResult] = await Promise.all([
    supabase
      .from("character_cosmetic_entitlements")
      .select(`
        cosmetic_item_id,
        cosmetic:cosmetic_items!character_cosmetic_entitlements_cosmetic_item_id_fkey(
          id, slug, name, description, category,
          preview_image_url, asset_url, sort_order, is_active
        )
      `)
      .eq("character_id", character.id)
      .eq("enabled", true),

    supabase
      .from("character_cosmetic_preferences")
      .select(preferenceColumns.join(","))
      .eq("character_id", character.id)
      .maybeSingle(),
  ]);

  const error = entitlementResult.error ?? preferenceResult.error;
  if (error) {
    throw new Error(`Unable to load Cosmetics: ${error.message}`);
  }

  const cosmetics = (entitlementResult.data ?? [])
    .map((entry) => {
      const relation = Array.isArray(entry.cosmetic)
        ? entry.cosmetic[0]
        : entry.cosmetic;

      if (
        !relation ||
        relation.is_active !== true ||
        !COSMETIC_CATEGORIES.includes(
          relation.category as CosmeticCategory,
        )
      ) {
        return null;
      }

      return {
        id: String(relation.id),
        slug: String(relation.slug),
        name: String(relation.name),
        description: relation.description ?? "",
        category: relation.category as CosmeticCategory,
        previewImageUrl: relation.preview_image_url ?? null,
        assetUrl: relation.asset_url ?? null,
        sortOrder: Number(relation.sort_order ?? 0),
      } satisfies PlayerCosmeticRow;
    })
    .filter((entry): entry is PlayerCosmeticRow => entry !== null)
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.name.localeCompare(b.name),
    );

  const equipped: Partial<
    Record<CosmeticCategory, string | null>
  > = {};

  for (const category of COSMETIC_CATEGORIES) {
    const column = COSMETIC_PREFERENCE_COLUMN[category];
    equipped[category] =
      String(
        (preferenceResult.data as Record<string, unknown> | null)?.[
          column
        ] ?? "",
      ) || null;
  }

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
          Premium
        </p>
        <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">
          Cosmetics
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]">
          Equip character-facing and portal-facing visual treatments. You can own many items, but only one item can be equipped in each slot.
        </p>

        <PlayerCosmeticsManager
          initialCosmetics={cosmetics}
          initialEquipped={equipped}
        />
      </div>
    </main>
  );
}
