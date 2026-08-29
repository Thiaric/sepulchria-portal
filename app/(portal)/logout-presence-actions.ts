"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type LogoutPresenceResult = {
  ok: boolean;
  message?: string;
};

export async function clearOwnPresenceForLogout(): Promise<LogoutPresenceResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      message:
        authError?.message ??
        "No authenticated user was found.",
    };
  }

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError) {
    return {
      ok: false,
      message:
        `Unable to find character before logout: ${characterError.message}`,
    };
  }

  if (!character) {
    return { ok: true };
  }

  const admin = createAdminClient();

  const { error: deleteError } =
    await admin
      .from("character_presence")
      .delete()
      .eq(
        "character_id",
        character.id,
      );

  if (deleteError) {
    return {
      ok: false,
      message:
        `Unable to clear character presence: ${deleteError.message}`,
    };
  }

  return { ok: true };
}
