import { redirect } from "next/navigation";

import {
  PlayerCosmeticsManager,
  type PlayerCosmeticRow,
} from "@/components/cosmetics/player-cosmetics-manager";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CosmeticsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: character, error: characterError } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError || !character) redirect("/");

  const [entitlementResult, preferenceResult] = await Promise.all([
    supabase
      .from("character_cosmetic_entitlements")
      .select(`
        cosmetic_item_id,
        cosmetic:cosmetic_items!character_cosmetic_entitlements_cosmetic_item_id_fkey(
          id, slug, name, description, category, preview_image_url, asset_url, sort_order, is_active
        )
      `)
      .eq("character_id", character.id)
      .eq("enabled", true),

    supabase
      .from("character_cosmetic_preferences")
      .select("equipped_sheet_frame_id, equipped_chat_frame_id")
      .eq("character_id", character.id)
      .maybeSingle(),
  ]);

  const firstError = entitlementResult.error ?? preferenceResult.error;
  if (firstError) throw new Error(`Unable to load Cosmetics: ${firstError.message}`);

  const cosmetics: PlayerCosmeticRow[] = (entitlementResult.data ?? [])
    .map((entry) => {
      const relation = Array.isArray(entry.cosmetic) ? entry.cosmetic[0] : entry.cosmetic;
      if (!relation || relation.is_active !== true) return null;
      if (relation.category !== "sheet_frame" && relation.category !== "chat_frame") return null;
      return {
        id: String(relation.id),
        slug: String(relation.slug),
        name: String(relation.name),
        description: relation.description ?? "",
        category: relation.category,
        previewImageUrl: relation.preview_image_url ?? null,
        assetUrl: relation.asset_url ?? null,
        sortOrder: Number(relation.sort_order ?? 0),
      };
    })
    .filter((entry): entry is PlayerCosmeticRow => entry !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">Premium</p>
        <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">Cosmetics</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]">
          Choose the visual treatments your character currently wears. You can own many cosmetics, but only one cosmetic can be equipped in each slot at a time.
        </p>

        <PlayerCosmeticsManager
          initialCosmetics={cosmetics}
          initialSheetFrameId={preferenceResult.data?.equipped_sheet_frame_id ?? null}
          initialChatFrameId={preferenceResult.data?.equipped_chat_frame_id ?? null}
        />
      </div>
    </main>
  );
}
