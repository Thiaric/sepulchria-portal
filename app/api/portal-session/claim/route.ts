import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { PORTAL_SESSION_COOKIE } from "@/lib/portal-session/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated." },
      { status: 401 },
    );
  }

  const admin = createAdminClient();
  const {
    data: character,
    error: characterError,
  } = await admin
    .from("characters")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError) {
    console.error(
      "Unable to load character while claiming portal session:",
      characterError,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Unable to open the portal session.",
      },
      { status: 500 },
    );
  }

  // Draft/submitted accounts are not subject to the one-active-character rule.
  if (!character || character.status !== "approved") {
    const response = NextResponse.json({
      ok: true,
      claimed: false,
    });

    response.cookies.delete(PORTAL_SESSION_COOKIE);
    return response;
  }

  const sessionId = randomUUID();
  const now = new Date().toISOString();

  const { error: claimError } = await admin
    .from("portal_character_sessions")
    .upsert(
      {
        character_id: character.id,
        user_id: user.id,
        session_id: sessionId,
        claimed_at: now,
        updated_at: now,
      },
      {
        onConflict: "character_id",
      },
    );

  if (claimError) {
    console.error(
      "Unable to claim portal character session:",
      claimError,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Unable to open the portal session.",
      },
      { status: 500 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    claimed: true,
  });

  response.cookies.set({
    name: PORTAL_SESSION_COOKIE,
    value: sessionId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
