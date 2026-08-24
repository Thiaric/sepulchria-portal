import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { PORTAL_SESSION_COOKIE } from "@/lib/portal-session/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const sessionId =
    cookieStore.get(PORTAL_SESSION_COOKIE)?.value ?? null;

  if (user && sessionId) {
    const admin = createAdminClient();

    const { error } = await admin
      .from("portal_character_sessions")
      .delete()
      .eq("user_id", user.id)
      .eq("session_id", sessionId);

    if (error) {
      console.error(
        "Unable to release portal character session:",
        error,
      );
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(PORTAL_SESSION_COOKIE);
  return response;
}
