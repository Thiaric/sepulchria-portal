"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type CosmeticSlot = "sheet_frame" | "chat_frame";

function readSlot(value: FormDataEntryValue | null): CosmeticSlot {
  if (value === "sheet_frame" || value === "chat_frame") return value;
  throw new Error("Invalid cosmetic slot.");
}

export async function setEquippedCosmetic(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: character, error: characterError } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError || !character) {
    throw new Error(characterError?.message ?? "Character not found.");
  }

  const slot = readSlot(formData.get("slot"));
  const cosmeticIdRaw = String(formData.get("cosmeticId") ?? "").trim();
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
      throw new Error(cosmeticResult.error?.message ?? "Cosmetic not found.");
    }

    if (cosmeticResult.data.is_active !== true) {
      throw new Error("Inactive cosmetics cannot be equipped.");
    }

    if (cosmeticResult.data.category !== slot) {
      throw new Error("That cosmetic does not belong in this slot.");
    }

    if (entitlementResult.error || entitlementResult.data?.enabled !== true) {
      throw new Error(entitlementResult.error?.message ?? "You do not own that cosmetic.");
    }
  }

  const column = slot === "sheet_frame" ? "equipped_sheet_frame_id" : "equipped_chat_frame_id";

  const { error: preferenceError } = await admin
    .from("character_cosmetic_preferences")
    .upsert(
      {
        character_id: character.id,
        [column]: cosmeticId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "character_id" },
    );

  if (preferenceError) {
    throw new Error(`Unable to equip cosmetic: ${preferenceError.message}`);
  }

  revalidatePath("/cosmetics");
  revalidatePath("/character");
  revalidatePath("/characters");
  revalidatePath("/game");
  revalidatePath("/", "layout");
}
