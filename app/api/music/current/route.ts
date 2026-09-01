import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCharacterMusicPayload } from "@/lib/music/get-character-music";

export async function GET(
  request: NextRequest,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Not authenticated.",
      },
      {
        status: 401,
      },
    );
  }

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select(
      "id, current_room_id, status",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    characterError ||
    !character ||
    character.status !== "approved" ||
    !character.current_room_id
  ) {
    return NextResponse.json({
      locationName: null,
      ownedTrackIds: [],
      music: null,
    });
  }

  const admin = createAdminClient();

  const {
    data: room,
    error: roomError,
  } = await admin
    .from("rooms")
    .select(
      "id, name, music_track_id, is_active",
    )
    .eq(
      "id",
      character.current_room_id,
    )
    .maybeSingle();

  if (
    roomError ||
    !room ||
    room.is_active !== true
  ) {
    return NextResponse.json({
      locationName:
        room?.name ?? null,
      ownedTrackIds: [],
      music: null,
    });
  }

  const {
    data: entitlementRows,
    error: entitlementError,
  } = await admin
    .from("character_music_entitlements")
    .select("music_track_id")
    .eq("character_id", character.id)
    .eq("enabled", true);

  if (entitlementError) {
    return NextResponse.json(
      {
        error:
          entitlementError.message,
      },
      { status: 500 },
    );
  }

  const entitledIds = [
    ...new Set(
      (entitlementRows ?? []).map(
        (row) =>
          row.music_track_id,
      ),
    ),
  ];

  const {
    data: playableOwnedRows,
    error: playableOwnedError,
  } = entitledIds.length > 0
    ? await admin
        .from("music_tracks")
        .select("id")
        .in("id", entitledIds)
        .eq("is_active", true)
        .eq(
          "is_personal_selectable",
          true,
        )
    : {
        data: [],
        error: null,
      };

  if (playableOwnedError) {
    return NextResponse.json(
      {
        error:
          playableOwnedError.message,
      },
      { status: 500 },
    );
  }

  const ownedTrackIds =
    (playableOwnedRows ?? [])
      .map((row) => row.id)
      .sort();

  const knownOwned =
    (
      request.nextUrl.searchParams.get(
        "knownOwned",
      ) ?? ""
    )
      .split(",")
      .filter(Boolean)
      .sort();

  const ownershipChanged =
    ownedTrackIds.join(",") !==
    knownOwned.join(",");

  /*
   * A room without location music can still expose
   * the player's owned premium music. We return a
   * lightweight music payload here; the page load
   * already supplied the signed owned-track URLs.
   */
  if (!room.music_track_id) {
    const music =
      ownershipChanged
        ? await getCharacterMusicPayload(
            character.id,
            null,
          )
        : {
            locationTrack: null,
            ownedTracks: [],
            preferences: {
              usePersonalMusic: false,
              selectedTrackId: null,
              volume: 0,
              muted: false,
            },
          };

    return NextResponse.json({
      locationName: room.name,
      ownedTrackIds,
      music,
    });
  }

  /*
   * Confirm the assigned track is still
   * active. This is the live kill switch.
   */
  const {
    data: track,
    error: trackError,
  } = await admin
    .from("music_tracks")
    .select("id, name")
    .eq(
      "id",
      room.music_track_id,
    )
    .eq("is_active", true)
    .maybeSingle();

  if (trackError) {
    return NextResponse.json(
      {
        error: trackError.message,
      },
      { status: 500 },
    );
  }

  if (!track) {
    const music =
      ownershipChanged
        ? await getCharacterMusicPayload(
            character.id,
            null,
          )
        : {
            locationTrack: null,
            ownedTracks: [],
            preferences: {
              usePersonalMusic: false,
              selectedTrackId: null,
              volume: 0,
              muted: false,
            },
          };

    return NextResponse.json({
      locationName: room.name,
      ownedTrackIds,
      music,
    });
  }

  const known =
    request.nextUrl.searchParams.get(
      "known",
    );

  /*
   * If it is still the same active location
   * track, avoid regenerating signed URLs on
   * every live heartbeat.
   */
  if (
    known === track.id &&
    !ownershipChanged
  ) {
    return NextResponse.json({
      locationName: room.name,
      ownedTrackIds,
      music: {
        locationTrack: {
          id: track.id,
          name: track.name,
          url: "",
        },
        ownedTracks: [],
        preferences: {
          usePersonalMusic: false,
          selectedTrackId: null,
          volume: 0,
          muted: false,
        },
      },
    });
  }

  const music =
    await getCharacterMusicPayload(
      character.id,
      room.music_track_id,
    );

  if (!music.locationTrack) {
    return NextResponse.json({
      locationName: room.name,
      ownedTrackIds,
      music:
        ownershipChanged
          ? music
          : null,
    });
  }

  return NextResponse.json({
    locationName: room.name,
    ownedTrackIds,
    music,
  });
}
