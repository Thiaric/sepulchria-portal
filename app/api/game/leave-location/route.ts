import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Authentication required.",
      },
      {
        status: 401,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select("id")
    .eq(
      "user_id",
      user.id,
    )
    .maybeSingle();

  if (characterError) {
    return NextResponse.json(
      {
        ok: false,
        message:
          `Unable to identify the Character: ${characterError.message}`,
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  if (!character) {
    return NextResponse.json(
      {
        ok: true,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  const now =
    new Date().toISOString();

  const {
    error: presenceError,
  } = await supabase
    .from(
      "character_presence",
    )
    .upsert(
      {
        character_id:
          character.id,
        room_id: null,
        last_seen_at:
          now,
      },
      {
        onConflict:
          "character_id",
      },
    );

  if (presenceError) {
    return NextResponse.json(
      {
        ok: false,
        message:
          `Unable to leave Location presence: ${presenceError.message}`,
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  const {
    error: locationError,
  } = await supabase
    .from("characters")
    .update({
      current_room_id:
        null,
      updated_at:
        now,
    })
    .eq(
      "id",
      character.id,
    );

  if (locationError) {
    return NextResponse.json(
      {
        ok: false,
        message:
          `Unable to leave the current Location: ${locationError.message}`,
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  return NextResponse.json(
    {
      ok: true,
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}
