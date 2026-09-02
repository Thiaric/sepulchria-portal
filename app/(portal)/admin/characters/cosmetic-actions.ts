"use server";

import { revalidatePath } from "next/cache";

import { requireStaffCapability } from "@/lib/auth/require-staff";
import {
  COSMETIC_LABELS,
  isCosmeticCategory,
} from "@/lib/cosmetics/catalogue";
import { createPremiumFeatureGrantNotification } from "@/lib/premium-features/notifications";
import { createAdminClient } from "@/lib/supabase/admin";

const SOURCES = new Set([
  "paid",
  "staff",
  "reward",
  "promotion",
  "gift",
  "event",
]);

function required(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

export async function setCharacterCosmeticEntitlement(
  formData: FormData,
) {
  const staff = await requireStaffCapability("character_economy");
  const characterId = required(formData, "characterId");
  const cosmeticItemId = required(formData, "cosmeticItemId");
  const enabled =
    String(formData.get("enabled") ?? "false") === "true";
  const source = String(formData.get("source") ?? "staff");

  if (!SOURCES.has(source)) {
    throw new Error("Invalid cosmetic entitlement source.");
  }

  const note =
    String(formData.get("note") ?? "").trim().slice(0, 1000) ||
    null;

  const admin = createAdminClient();
  const [previousResult, cosmeticResult] = await Promise.all([
    admin
      .from("character_cosmetic_entitlements")
      .select("enabled")
      .eq("character_id", characterId)
      .eq("cosmetic_item_id", cosmeticItemId)
      .maybeSingle(),
    admin
      .from("cosmetic_items")
      .select("id, name, category, is_active")
      .eq("id", cosmeticItemId)
      .maybeSingle(),
  ]);

  if (previousResult.error) {
    throw new Error(
      `Unable to check existing cosmetic ownership: ${previousResult.error.message}`,
    );
  }

  if (cosmeticResult.error || !cosmeticResult.data) {
    throw new Error(
      cosmeticResult.error?.message ?? "Cosmetic not found.",
    );
  }

  const cosmetic = cosmeticResult.data;

  if (!isCosmeticCategory(cosmetic.category)) {
    throw new Error("Unsupported cosmetic category.");
  }

  if (enabled && cosmetic.is_active !== true) {
    throw new Error("Inactive cosmetics cannot be granted.");
  }

  const wasEnabled = previousResult.data?.enabled === true;
  const now = new Date().toISOString();

  const update = await admin
    .from("character_cosmetic_entitlements")
    .upsert(
      {
        character_id: characterId,
        cosmetic_item_id: cosmeticItemId,
        enabled,
        source,
        note,
        granted_at: now,
        granted_by: staff.userId,
        updated_at: now,
      },
      { onConflict: "character_id,cosmetic_item_id" },
    );

  if (update.error) {
    throw new Error(
      `Unable to update cosmetic ownership: ${update.error.message}`,
    );
  }

  if (enabled && !wasEnabled) {
    try {
      await createPremiumFeatureGrantNotification({
        characterId,
        createdBy: staff.userId,
        title: `Premium cosmetic unlocked: ${cosmetic.name}`,
        body: `You have unlocked ${cosmetic.name} (${COSMETIC_LABELS[cosmetic.category]}). Equip it from your Cosmetics collection.`,
        href: "/cosmetics",
      });
    } catch (notificationError) {
      console.error(
        "Cosmetic ownership was granted, but its notification could not be created:",
        notificationError,
      );
    }
  }

  for (const path of [
    `/admin/characters/${characterId}/premium-features`,
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
