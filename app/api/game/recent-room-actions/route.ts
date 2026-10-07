import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getRecentRoomActionCharacterIds,
  RECENT_ROOM_ACTION_MINUTES,
} from "@/lib/game/recent-room-actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
) {
  const roomId =
    request.nextUrl.searchParams
      .get("roomId")
      ?.trim() ?? "";

  if (!roomId) {
    return NextResponse.json(
      {
        ok: false,
        error: "roomId is required.",
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        ok: false,
        error: "Authentication required.",
      },
      { status: 401 },
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

  if (characterError || !character) {
    return NextResponse.json(
      {
        ok: false,
        error:
          characterError?.message ??
          "Character not found.",
      },
      { status: 404 },
    );
  }

  if (
    character.status !== "approved" ||
    character.current_room_id !== roomId
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "This is not your current Location.",
      },
      { status: 403 },
    );
  }

  try {
    const ids =
      await getRecentRoomActionCharacterIds(
        roomId,
      );

    return NextResponse.json(
      {
        ok: true,
        minutes:
          RECENT_ROOM_ACTION_MINUTES,
        characterIds:
          Array.from(ids),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load recent Location actions.",
      },
      { status: 500 },
    );
  }
}
