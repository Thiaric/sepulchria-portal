import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  hashRegistrationInvitationToken,
} from "@/lib/registration/invitations";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const token =
    String((body as any)?.token ?? "").trim();
  const email =
    String((body as any)?.email ?? "")
      .trim()
      .toLowerCase();

  if (!token || !email) {
    return NextResponse.json(
      {
        error:
          "Invitation token and email are required.",
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const tokenHash =
    hashRegistrationInvitationToken(token);

  const { data: invitation, error } = await admin
    .from("registration_invitations")
    .select("id,application_id,email,expires_at,used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (
    error ||
    !invitation ||
    invitation.used_at ||
    new Date(invitation.expires_at).getTime() <= Date.now() ||
    invitation.email.toLowerCase() !== email
  ) {
    return NextResponse.json(
      {
        error:
          "This invitation is invalid, expired, or has already been used.",
      },
      { status: 400 },
    );
  }

  const usedAt = new Date().toISOString();

  const { error: useError } = await admin
    .from("registration_invitations")
    .update({ used_at: usedAt })
    .eq("id", invitation.id)
    .is("used_at", null);

  if (useError) {
    return NextResponse.json(
      {
        error:
          "Unable to complete invitation registration.",
      },
      { status: 500 },
    );
  }

  await admin
    .from("registration_applications")
    .update({
      status: "registered",
      registered_at: usedAt,
      updated_at: usedAt,
    })
    .eq("id", invitation.application_id);

  return NextResponse.json({ ok: true });
}
