import "server-only";

import { createClient } from "@/lib/supabase/server";

type ModifierRow = {
  affinity_modifier: number | null;
  warps_per_day_modifier: number | null;
};

export async function getEffectiveCharacterWarping(characterId: string) {
  const db = await createClient();

  const [baseResult, itemResult, featResult] = await Promise.all([
    db.from("characters").select("warping_affinity,warps_per_day").eq("id", characterId).single(),
    db.rpc("get_character_item_warping_modifiers", { p_character_id: characterId }).maybeSingle(),
    db.rpc("get_character_warping_feat_bonuses", { p_character_id: characterId }).maybeSingle(),
  ]);

  if (baseResult.error || !baseResult.data) throw new Error(baseResult.error?.message ?? "Character not found.");
  if (itemResult.error) throw new Error(itemResult.error.message);
  if (featResult.error) throw new Error(featResult.error.message);

  const item = itemResult.data as ModifierRow | null;
  const feat = featResult.data as ModifierRow | null;

  const baseAffinity = Number(baseResult.data.warping_affinity ?? 1);
  const baseWarpsPerDay = Number(baseResult.data.warps_per_day ?? 3);
  const itemAffinity = Number(item?.affinity_modifier ?? 0);
  const itemWarpsPerDay = Number(item?.warps_per_day_modifier ?? 0);
  const featAffinity = Number(feat?.affinity_modifier ?? 0);
  const featWarpsPerDay = Number(feat?.warps_per_day_modifier ?? 0);

  return {
    baseAffinity, baseWarpsPerDay,
    itemAffinity, itemWarpsPerDay,
    featAffinity, featWarpsPerDay,
    affinity: baseAffinity + itemAffinity + featAffinity,
    warpsPerDay: baseWarpsPerDay + itemWarpsPerDay + featWarpsPerDay,
  };
}
