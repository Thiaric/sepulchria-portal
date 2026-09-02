"use server";

import { revalidatePath } from "next/cache";

import {
  COSMETIC_PREFERENCE_COLUMN,
  isCosmeticCategory,
  type CosmeticCategory,
} from "@/lib/cosmetics/catalogue";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function readSlot(
  value: FormDataEntryValue | null,
): CosmeticCategory {
  const slot = String(value ?? "");
  if (isCosmeticCategory(slot)) return slot;
  throw new Error("Invalid cosmetic slot.");
}

export async function setEquippedCosmetic(
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be signed in.");

  const characterResult = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterResult.error || !characterResult.data) {
    throw new Error(
      characterResult.error?.message ?? "Character not found.",
    );
  }

  const character = characterResult.data;
  const slot = readSlot(formData.get("slot"));
  const cosmeticIdRaw = String(
    formData.get("cosmeticId") ?? "",
  ).trim();
  const cosmeticId = cosmeticIdRaw || null;
  const admin = createAdminClient();

  if (cosmeticId) {
    const [cosmeticResult, entitlementResult] = await Promise.all([
      admin
        .from("cosmetic_items")
        .select("id, category, is_active")
        .eq("id", cosmeticId)
        .maybeSingle(),
      admin
        .from("character_cosmetic_entitlements")
        .select("enabled")
        .eq("character_id", character.id)
        .eq("cosmetic_item_id", cosmeticId)
        .maybeSingle(),
    ]);

    if (cosmeticResult.error || !cosmeticResult.data) {
      throw new Error(
        cosmeticResult.error?.message ?? "Cosmetic not found.",
      );
    }

    if (cosmeticResult.data.is_active !== true) {
      throw new Error("Inactive cosmetics cannot be equipped.");
    }

    if (cosmeticResult.data.category !== slot) {
      throw new Error("That cosmetic does not belong in this slot.");
    }

    if (
      entitlementResult.error ||
      entitlementResult.data?.enabled !== true
    ) {
      throw new Error(
        entitlementResult.error?.message ??
          "You do not own that cosmetic.",
      );
    }
  }

  const column = COSMETIC_PREFERENCE_COLUMN[slot];

  const preferenceResult = await admin
    .from("character_cosmetic_preferences")
    .upsert(
      {
        character_id: character.id,
        [column]: cosmeticId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "character_id" },
    );

  if (preferenceResult.error) {
    throw new Error(
      `Unable to equip cosmetic: ${preferenceResult.error.message}`,
    );
  }

  for (const path of [
    "/cosmetics",
    "/character",
    "/characters",
    "/game",
    "/messages",
    "/forum",
  ]) {
    revalidatePath(path);
  }

  revalidatePath("/", "layout");
}
