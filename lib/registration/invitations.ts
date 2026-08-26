import "server-only";

import { createHash } from "crypto";

import { createAdminClient } from "@/lib/supabase/admin";

export type RegistrationInvitation = {
  id: string;
  application_id: string;
  email: string;
  expires_at: string;
  used_at: string | null;
};

export function hashRegistrationInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getValidRegistrationInvitation(
  token: string | null | undefined,
): Promise<RegistrationInvitation | null> {
  if (!token?.trim()) return null;

  const admin = createAdminClient();
  const tokenHash =
    hashRegistrationInvitationToken(token.trim());

  const { data, error } = await admin
    .from("registration_invitations")
    .select("id,application_id,email,expires_at,used_at")
    .eq("token_hash", tokenHash)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to validate registration invitation:",
      error.message,
    );
    return null;
  }

  return data ?? null;
}
