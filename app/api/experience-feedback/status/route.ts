import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { EXPERIENCE_FEEDBACK_COOLDOWN_DAYS } from "@/lib/experience/experience-ratings";
import { createClient } from "@/lib/supabase/server";

const COOLDOWN_MS =
  EXPERIENCE_FEEDBACK_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ due: false }, { status: 200 });
  }

  const admin = createAdminClient();

  const staffResult = await admin
    .from("staff_members")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (staffResult.error) {
    return NextResponse.json(
      { error: staffResult.error.message },
      { status: 500 },
    );
  }

  if (staffResult.data) {
    return NextResponse.json({ due: false }, { status: 200 });
  }

  const result = await admin
    .from("experience_feedback")
    .select("prompted_at")
    .eq("user_id", user.id)
    .order("prompted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 500 },
    );
  }

  const lastPromptAt = result.data?.prompted_at
    ? new Date(result.data.prompted_at).getTime()
    : null;

  const due =
    lastPromptAt === null ||
    Number.isNaN(lastPromptAt) ||
    Date.now() - lastPromptAt >= COOLDOWN_MS;

  return NextResponse.json({ due });
}
