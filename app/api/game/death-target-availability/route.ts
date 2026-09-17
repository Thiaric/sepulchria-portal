import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getDeathRules } from "@/lib/death/death-system";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const roomId = String(
    url.searchParams.get("roomId") ?? "",
  ).trim();

  if (!roomId) {
    return NextResponse.json(
      { error: "Missing Location." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 },
    );
  }

  const admin = createAdminClient();

  const { data: viewer, error: viewerError } =
    await admin
      .from("characters")
      .select("id,current_room_id")
      .eq("user_id", user.id)
      .maybeSingle();

  if (
    viewerError ||
    !viewer ||
    viewer.current_room_id !== roomId
  ) {
    return NextResponse.json(
      { error: "This Location is not currently available." },
      { status: 403 },
    );
  }

  const [rules, charactersResult] =
    await Promise.all([
      getDeathRules(),
      admin
        .from("characters")
        .select(
          "id,life_state,died_at,zero_hp_at",
        )
        .eq("current_room_id", roomId)
        .eq("status", "approved"),
    ]);

  if (charactersResult.error) {
    return NextResponse.json(
      { error: charactersResult.error.message },
      { status: 500 },
    );
  }

  const deadCharacterIds: string[] = [];
  const beyondEssenceCharacterIds: string[] = [];

  for (const character of charactersResult.data ?? []) {
    if (character.life_state !== "dead") {
      continue;
    }

    deadCharacterIds.push(character.id);

    const startedAt =
      character.died_at ??
      character.zero_hp_at;

    if (!startedAt) {
      beyondEssenceCharacterIds.push(
        character.id,
      );
      continue;
    }

    const startedMs = Date.parse(startedAt);

    if (
      Number.isNaN(startedMs) ||
      Date.now() >
        startedMs +
          rules.essenceWindowMinutes *
            60_000
    ) {
      beyondEssenceCharacterIds.push(
        character.id,
      );
    }
  }

  return NextResponse.json({
    viewerCharacterId: viewer.id,
    deadCharacterIds,
    beyondEssenceCharacterIds,
  });
}
