"use server";

import { revalidatePath } from "next/cache";

import { requireStaffCapability } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPremiumFeatureGrantNotification } from "@/lib/premium-features/notifications";

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
  const staff =
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

  const [
    previousEntitlementResult,
    trackResult,
  ] = await Promise.all([
    admin
      .from(
        "character_music_entitlements",
      )
      .select("enabled")
      .eq(
        "character_id",
        characterId,
      )
      .eq(
        "music_track_id",
        musicTrackId,
      )
      .maybeSingle(),

    admin
      .from("music_tracks")
      .select("id, name")
      .eq("id", musicTrackId)
      .maybeSingle(),
  ]);

  if (
    previousEntitlementResult.error
  ) {
    throw new Error(
      `Unable to check existing music ownership: ${previousEntitlementResult.error.message}`,
    );
  }

  if (
    trackResult.error ||
    !trackResult.data
  ) {
    throw new Error(
      `Unable to load music track: ${
        trackResult.error?.message ??
        "Track not found."
      }`,
    );
  }

  const wasMusicEnabled =
    previousEntitlementResult.data
      ?.enabled === true;

  const musicTrack =
    trackResult.data;

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

  if (
    enabled &&
    !wasMusicEnabled
  ) {
    try {
      await createPremiumFeatureGrantNotification({
        characterId,
        createdBy: staff.userId,
        title:
          `Premium feature unlocked: ${musicTrack.name}`,
        body:
          `You have unlocked the music track ${musicTrack.name}. You can select it from the music controls while in a location.`,
        href: "/game",
      });
    } catch (notificationError) {
      console.error(
        "Music ownership was granted, but its notification could not be created:",
        notificationError,
      );
    }
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
  revalidatePath("/", "layout");
}
