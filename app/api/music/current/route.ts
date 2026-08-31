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
    room.is_active !== true ||
    !room.music_track_id
  ) {
    return NextResponse.json({
      locationName:
        room?.name ?? null,
      music: null,
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

  if (
    trackError ||
    !track
  ) {
    return NextResponse.json({
      locationName: room.name,
      music: null,
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
  if (known === track.id) {
    return NextResponse.json({
      locationName: room.name,
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
      music: null,
    });
  }

  return NextResponse.json({
    locationName: room.name,
    music,
  });
}
