import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type PlayableMusicTrack = {
  id: string;
  name: string;
  url: string;
};

export type CharacterMusicPayload = {
  locationTrack: PlayableMusicTrack | null;
  ownedTracks: PlayableMusicTrack[];
  preferences: {
    usePersonalMusic: boolean;
    selectedTrackId: string | null;
    volume: number;
    muted: boolean;
  };
};

const SIGNED_URL_SECONDS = 6 * 60 * 60;

async function signTrack(
  admin: ReturnType<typeof createAdminClient>,
  track: {
    id: string;
    name: string;
    storage_path: string;
  } | null,
): Promise<PlayableMusicTrack | null> {
  if (!track) return null;

  const { data, error } = await admin.storage
    .from("music")
    .createSignedUrl(
      track.storage_path,
      SIGNED_URL_SECONDS,
    );

  if (error || !data?.signedUrl) {
    return null;
  }

  return {
    id: track.id,
    name: track.name,
    url: data.signedUrl,
  };
}

export async function getCharacterMusicPayload(
  characterId: string,
  locationTrackId: string | null,
): Promise<CharacterMusicPayload> {
  const admin = createAdminClient();

  const [
    preferenceResult,
    entitlementResult,
    locationResult,
  ] = await Promise.all([
    admin
      .from("character_music_preferences")
      .select(
        "use_personal_music, selected_track_id, volume, muted",
      )
      .eq("character_id", characterId)
      .maybeSingle(),

    admin
      .from("character_music_entitlements")
      .select("music_track_id")
      .eq("character_id", characterId)
      .eq("enabled", true),

    locationTrackId
      ? admin
          .from("music_tracks")
          .select("id, name, storage_path")
          .eq("id", locationTrackId)
          .eq("is_active", true)
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null,
        }),
  ]);

  const firstError =
    preferenceResult.error ??
    entitlementResult.error ??
    locationResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load music settings: ${firstError.message}`,
    );
  }

  const ownedIds = [
    ...new Set(
      (entitlementResult.data ?? []).map(
        (row) => row.music_track_id,
      ),
    ),
  ];

  const ownedResult =
    ownedIds.length > 0
      ? await admin
          .from("music_tracks")
          .select("id, name, storage_path")
          .in("id", ownedIds)
          .eq("is_active", true)
          .eq(
            "is_personal_selectable",
            true,
          )
          .order("sort_order", {
            ascending: true,
          })
          .order("name", {
            ascending: true,
          })
      : {
          data: [],
          error: null,
        };

  if (ownedResult.error) {
    throw new Error(
      `Unable to load owned music: ${ownedResult.error.message}`,
    );
  }

  const [
    locationTrack,
    ...ownedTracks
  ] = await Promise.all([
    signTrack(
      admin,
      locationResult.data ?? null,
    ),
    ...(ownedResult.data ?? []).map(
      (track) => signTrack(admin, track),
    ),
  ]);

  const preference =
    preferenceResult.data ?? null;

  return {
    locationTrack,
    ownedTracks: ownedTracks.filter(
      (
        track,
      ): track is PlayableMusicTrack =>
        track !== null,
    ),
    preferences: {
      usePersonalMusic:
        preference?.use_personal_music ===
        true,
      selectedTrackId:
        preference?.selected_track_id ??
        null,
      volume: Math.max(
        0,
        Math.min(
          1,
          Number(
            preference?.volume ?? 0.55,
          ),
        ),
      ),
      muted:
        preference?.muted === true,
    },
  };
}
