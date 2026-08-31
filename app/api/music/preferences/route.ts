import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function fail(
  error: string,
  status = 400,
) {
  return NextResponse.json(
    { error },
    { status },
  );
}

export async function PATCH(
  request: NextRequest,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return fail(
      "Not authenticated.",
      401,
    );
  }

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError || !character) {
    return fail(
      "Character not found.",
      404,
    );
  }

  const body =
    (await request.json()) as {
      usePersonalMusic?: boolean;
      selectedTrackId?:
        | string
        | null;
      volume?: number;
      muted?: boolean;
    };

  const volume = Math.max(
    0,
    Math.min(
      1,
      Number(body.volume ?? 0.55),
    ),
  );

  if (!Number.isFinite(volume)) {
    return fail(
      "Invalid volume.",
    );
  }

  const selectedTrackId =
    typeof body.selectedTrackId ===
      "string" &&
    body.selectedTrackId.trim()
      ? body.selectedTrackId.trim()
      : null;

  const usePersonalMusic =
    body.usePersonalMusic === true;

  const admin = createAdminClient();

  if (usePersonalMusic) {
    if (!selectedTrackId) {
      return fail(
        "Choose a personal track first.",
      );
    }

    const [
      entitlementResult,
      trackResult,
    ] = await Promise.all([
      admin
        .from(
          "character_music_entitlements",
        )
        .select("id")
        .eq(
          "character_id",
          character.id,
        )
        .eq(
          "music_track_id",
          selectedTrackId,
        )
        .eq("enabled", true)
        .maybeSingle(),

      admin
        .from("music_tracks")
        .select("id")
        .eq("id", selectedTrackId)
        .eq("is_active", true)
        .eq(
          "is_personal_selectable",
          true,
        )
        .maybeSingle(),
    ]);

    const accessError =
      entitlementResult.error ??
      trackResult.error;

    if (accessError) {
      return fail(
        accessError.message,
        500,
      );
    }

    if (
      !entitlementResult.data ||
      !trackResult.data
    ) {
      return fail(
        "You do not own that music track.",
        403,
      );
    }
  }

  const { error } = await admin
    .from(
      "character_music_preferences",
    )
    .upsert(
      {
        character_id: character.id,
        use_personal_music:
          usePersonalMusic,
        selected_track_id:
          selectedTrackId,
        volume,
        muted:
          body.muted === true,
      },
      {
        onConflict: "character_id",
      },
    );

  if (error) {
    return fail(
      error.message,
      500,
    );
  }

  return NextResponse.json({
    ok: true,
  });
}
