"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireStaffCapability,
} from "@/lib/auth/require-staff";
import {
  createPremiumFeatureGrantNotification,
} from "@/lib/premium-features/notifications";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

const SOURCES = new Set([
  "paid",
  "staff",
  "reward",
  "promotion",
  "gift",
  "event",
]);

const PHASE_ONE_CATEGORIES = new Set([
  "sheet_frame",
  "chat_frame",
]);

function required(
  formData: FormData,
  key: string,
) {
  const value = String(
    formData.get(key) ?? "",
  ).trim();

  if (!value) {
    throw new Error(
      `${key} is required.`,
    );
  }

  return value;
}

export async function setCharacterCosmeticEntitlement(
  formData: FormData,
) {
  const staff =
    await requireStaffCapability(
      "character_economy",
    );

  const characterId =
    required(
      formData,
      "characterId",
    );

  const cosmeticItemId =
    required(
      formData,
      "cosmeticItemId",
    );

  const enabled =
    String(
      formData.get("enabled") ??
        "false",
    ) === "true";

  const source = String(
    formData.get("source") ??
      "staff",
  );

  if (!SOURCES.has(source)) {
    throw new Error(
      "Invalid cosmetic entitlement source.",
    );
  }

  const note =
    String(
      formData.get("note") ?? "",
    )
      .trim()
      .slice(0, 1000) || null;

  const admin =
    createAdminClient();

  const [
    previousResult,
    cosmeticResult,
  ] = await Promise.all([
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
        cosmeticItemId,
      )
      .maybeSingle(),

    admin
      .from("cosmetic_items")
      .select(
        "id, name, category, is_active",
      )
      .eq(
        "id",
        cosmeticItemId,
      )
      .maybeSingle(),
  ]);

  if (previousResult.error) {
    throw new Error(
      `Unable to check existing cosmetic ownership: ${previousResult.error.message}`,
    );
  }

  if (
    cosmeticResult.error ||
    !cosmeticResult.data
  ) {
    throw new Error(
      `Unable to load cosmetic: ${
        cosmeticResult.error?.message ??
        "Cosmetic not found."
      }`,
    );
  }

  const cosmetic =
    cosmeticResult.data;

  if (
    !PHASE_ONE_CATEGORIES.has(
      cosmetic.category,
    )
  ) {
    throw new Error(
      "Only Phase 1 Sheet Frame and Chat Frame cosmetics can be assigned here.",
    );
  }

  if (
    enabled &&
    cosmetic.is_active !== true
  ) {
    throw new Error(
      "Inactive cosmetics cannot be granted.",
    );
  }

  const wasEnabled =
    previousResult.data?.enabled ===
    true;

  const now =
    new Date().toISOString();

  const { error } = await admin
    .from(
      "character_cosmetic_entitlements",
    )
    .upsert(
      {
        character_id:
          characterId,
        cosmetic_item_id:
          cosmeticItemId,
        enabled,
        source,
        note,
        granted_at: now,
        granted_by:
          staff.userId,
        updated_at: now,
      },
      {
        onConflict:
          "character_id,cosmetic_item_id",
      },
    );

  if (error) {
    throw new Error(
      `Unable to update cosmetic ownership: ${error.message}`,
    );
  }

  if (
    enabled &&
    !wasEnabled
  ) {
    const typeLabel =
      cosmetic.category ===
      "sheet_frame"
        ? "character sheet frame"
        : "location chat frame";

    try {
      await createPremiumFeatureGrantNotification({
        characterId,
        createdBy:
          staff.userId,
        title:
          `Premium cosmetic unlocked: ${cosmetic.name}`,
        body:
          `You have unlocked the ${cosmetic.name} ${typeLabel}. You can equip it from your Cosmetics collection once available.`,
        href: "/cosmetics",
      });
    } catch (
      notificationError
    ) {
      console.error(
        "Cosmetic ownership was granted, but its notification could not be created:",
        notificationError,
      );
    }
  }

  revalidatePath(
    `/admin/characters/${characterId}/premium-features`,
  );
  revalidatePath(
    "/character",
  );
  revalidatePath(
    "/characters",
  );
  revalidatePath(
    "/game",
  );
  revalidatePath(
    "/",
    "layout",
  );
}
