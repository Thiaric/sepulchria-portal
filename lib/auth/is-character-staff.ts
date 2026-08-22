import "server-only";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

function createPrivilegedClient() {
  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const secret =
    process.env
      .SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.",
    );
  }

  return createAdminClient(
    url,
    secret,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export async function isCharacterStaff(
  characterId: string,
): Promise<boolean> {
  const admin =
    createPrivilegedClient();

  const {
    data: character,
    error: characterError,
  } = await admin
    .from("characters")
    .select("user_id")
    .eq("id", characterId)
    .maybeSingle();

  if (characterError) {
    throw new Error(
      `Unable to identify character account: ${characterError.message}`,
    );
  }

  if (!character?.user_id) {
    return false;
  }

  const {
    data: staffMember,
    error: staffError,
  } = await admin
    .from("staff_members")
    .select("user_id")
    .eq(
      "user_id",
      character.user_id,
    )
    .maybeSingle();

  if (staffError) {
    throw new Error(
      `Unable to identify staff status: ${staffError.message}`,
    );
  }

  return Boolean(staffMember);
}
