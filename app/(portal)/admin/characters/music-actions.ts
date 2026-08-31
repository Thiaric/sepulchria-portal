"use server";

import { revalidatePath } from "next/cache";

import { requireStaffCapability } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

const SOURCES = new Set([
  "paid",
  "remnants",
  "staff",
  "reward",
  "event",
  "promotion",
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

export async function setCharacterMusicEntitlement(
  formData: FormData,
) {
  await requireStaffCapability(
    "character_economy",
  );

  const characterId = required(
    formData,
    "characterId",
  );
  const musicTrackId = required(
    formData,
    "musicTrackId",
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
      "Invalid music entitlement source.",
    );
  }

  const note =
    String(
      formData.get("note") ?? "",
    )
      .trim()
      .slice(0, 1000) || null;

  const admin = createAdminClient();

  const { error } = await admin
    .from(
      "character_music_entitlements",
    )
    .upsert(
      {
        character_id: characterId,
        music_track_id: musicTrackId,
        enabled,
        source,
        note,
        granted_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "character_id,music_track_id",
      },
    );

  if (error) {
    throw new Error(
      `Unable to update music ownership: ${error.message}`,
    );
  }

  if (!enabled) {
    await admin
      .from(
        "character_music_preferences",
      )
      .update({
        use_personal_music: false,
        selected_track_id: null,
      })
      .eq(
        "character_id",
        characterId,
      )
      .eq(
        "selected_track_id",
        musicTrackId,
      );
  }

  revalidatePath(
    `/admin/characters/${characterId}/premium-features`,
  );
  revalidatePath("/game");
}
