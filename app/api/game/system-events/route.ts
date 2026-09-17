import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

  const { data: character, error: characterError } =
    await admin
      .from("characters")
      .select("id,current_room_id")
      .eq("user_id", user.id)
      .maybeSingle();

  if (
    characterError ||
    !character ||
    character.current_room_id !== roomId
  ) {
    return NextResponse.json(
      { error: "This Location is not currently available." },
      { status: 403 },
    );
  }

  const cutoff = new Date(
    Date.now() - 48 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await admin
    .from("room_system_events")
    .select("id,message,created_at")
    .eq("room_id", roomId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    events: data ?? [],
  });
}
