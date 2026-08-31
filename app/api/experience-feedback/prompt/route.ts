import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { EXPERIENCE_FEEDBACK_COOLDOWN_DAYS } from "@/lib/experience/experience-ratings";
import { createClient } from "@/lib/supabase/server";

const COOLDOWN_MS =
  EXPERIENCE_FEEDBACK_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { due: false, promptId: null },
      { status: 200 },
    );
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
    return NextResponse.json(
      { due: false, promptId: null },
      { status: 200 },
    );
  }

  const latest = await admin
    .from("experience_feedback")
    .select("id, prompted_at")
    .eq("user_id", user.id)
    .order("prompted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest.error) {
    return NextResponse.json(
      { error: latest.error.message },
      { status: 500 },
    );
  }

  const lastPromptAt = latest.data?.prompted_at
    ? new Date(latest.data.prompted_at).getTime()
    : null;

  const due =
    lastPromptAt === null ||
    Number.isNaN(lastPromptAt) ||
    Date.now() - lastPromptAt >= COOLDOWN_MS;

  if (!due) {
    return NextResponse.json({ due: false, promptId: null });
  }

  const inserted = await admin
    .from("experience_feedback")
    .insert({
      user_id: user.id,
      prompted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (inserted.error) {
    return NextResponse.json(
      { error: inserted.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    due: true,
    promptId: inserted.data.id,
  });
}
