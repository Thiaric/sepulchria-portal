import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthenticated." },
      { status: 401 },
    );
  }

  const body = await request.json();
  const promptId =
    typeof body?.promptId === "string" ? body.promptId.trim() : "";
  const skipped = body?.skipped === true;
  const rating =
    typeof body?.rating === "number" ? Number(body.rating) : null;
  const comment =
    typeof body?.comment === "string" ? body.comment.trim().slice(0, 400) : null;

  if (!promptId) {
    return NextResponse.json(
      { error: "Prompt ID is required." },
      { status: 400 },
    );
  }

  if (!skipped && (rating === null || ![1, 2, 3, 4, 5].includes(rating))) {
    return NextResponse.json(
      { error: "Rating is invalid." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const update = await admin
    .from("experience_feedback")
    .update({
      skipped,
      rating: skipped ? null : rating,
      comment: skipped ? null : comment,
      responded_at: new Date().toISOString(),
    })
    .eq("id", promptId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (update.error) {
    return NextResponse.json(
      { error: update.error.message },
      { status: 500 },
    );
  }

  if (!update.data) {
    return NextResponse.json(
      { error: "Prompt not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
