import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const applicationId =
    String(
      (body as { applicationId?: unknown } | null)
        ?.applicationId ?? "",
    ).trim();

  if (!applicationId) {
    return NextResponse.json(
      { error: "Missing registration application." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (
    userError ||
    !user ||
    !user.email
  ) {
    return NextResponse.json(
      { error: "Your invitation session is not valid." },
      { status: 401 },
    );
  }

  const metadataApplicationId =
    String(
      user.user_metadata
        ?.registration_application_id ?? "",
    ).trim();

  if (
    !metadataApplicationId ||
    metadataApplicationId !== applicationId
  ) {
    return NextResponse.json(
      {
        error:
          "This account is not linked to this registration application.",
      },
      { status: 403 },
    );
  }

  const admin = createAdminClient();

  const {
    data: application,
    error: applicationError,
  } = await admin
    .from("registration_applications")
    .select("id,email,status")
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationError || !application) {
    return NextResponse.json(
      {
        error:
          applicationError?.message ??
          "Registration application not found.",
      },
      { status: 404 },
    );
  }

  if (
    application.email.toLowerCase() !==
    user.email.toLowerCase()
  ) {
    return NextResponse.json(
      {
        error:
          "This invitation belongs to a different email address.",
      },
      { status: 403 },
    );
  }

  if (
    application.status === "declined"
  ) {
    return NextResponse.json(
      {
        error:
          "This registration application has been declined.",
      },
      { status: 403 },
    );
  }

  const completedAt = new Date().toISOString();

  const { error: updateError } = await admin
    .from("registration_applications")
    .update({
      status: "registered",
      registered_at: completedAt,
      updated_at: completedAt,
    })
    .eq("id", application.id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  const {
    data: latestInvitation,
  } = await admin
    .from("registration_auth_invitations")
    .select("id")
    .eq("application_id", application.id)
    .is("accepted_at", null)
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestInvitation?.id) {
    await admin
      .from("registration_auth_invitations")
      .update({
        accepted_at: completedAt,
      })
      .eq("id", latestInvitation.id);
  }

  return NextResponse.json({ ok: true });
}
