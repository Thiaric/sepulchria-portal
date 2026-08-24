import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { PORTAL_SESSION_COOKIE } from "@/lib/portal-session/constants";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { active: false, reason: "not_authenticated" },
      { status: 401 },
    );
  }

  const cookieStore = await cookies();
  const sessionId =
    cookieStore.get(PORTAL_SESSION_COOKIE)?.value ?? null;

  const { data, error } = await supabase.rpc(
    "is_portal_character_session_active",
    {
      p_session_id: sessionId,
    },
  );

  if (error) {
    console.error(
      "Unable to validate portal character session:",
      error,
    );

    return NextResponse.json(
      { active: true, unavailable: true },
      { status: 200 },
    );
  }

  const active = data === true;

  return NextResponse.json(
    {
      active,
      reason: active ? null : "session_replaced",
    },
    { status: active ? 200 : 409 },
  );
}
