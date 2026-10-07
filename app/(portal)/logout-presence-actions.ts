"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type LogoutPresenceResult = {
  ok: boolean;
  message?: string;
};

export async function clearOwnPresenceForLogout(
  clearLocation = false,
): Promise<LogoutPresenceResult> {
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
  const now = new Date().toISOString();

  /*
   * These logout operations do not depend on one another, so do them
   * concurrently instead of making the player wait for three separate
   * database round trips in sequence.
   */
  const [
    friendLeaveResult,
    expertiseSettleResult,
    presenceDeleteResult,
  ] = await Promise.all([
    supabase.rpc(
      "notify_my_mutual_friends_left",
    ),
    admin.rpc(
      "settle_portal_session_expertise",
      {
        p_user_id: user.id,
        p_now: now,
      },
    ),
    admin
      .from("character_presence")
      .delete()
      .eq(
        "character_id",
        character.id,
      ),
  ]);

  const friendLeaveError =
    friendLeaveResult.error;

  const expertiseSettleError =
    expertiseSettleResult.error;

  const deleteError =
    presenceDeleteResult.error;

  if (friendLeaveError) {
    console.error(
      "Unable to notify mutual friends of logout:",
      friendLeaveError.message,
    );
  }

  if (expertiseSettleError) {
    console.error(
      "Unable to settle portal-time Expertise before logout:",
      expertiseSettleError.message,
    );
  }

  if (deleteError) {
    return {
      ok: false,
      message:
        `Unable to clear character presence: ${deleteError.message}`,
    };
  }

  /*
   * ONLY the explicit Logout button passes clearLocation=true.
   * Inactivity logout leaves it false, and the separate window-close
   * endpoint does not call this action, so those flows preserve Location.
   */
  if (clearLocation) {
    const {
      error: locationError,
    } = await admin
      .from("characters")
      .update({
        current_room_id: null,
        updated_at: now,
      })
      .eq(
        "id",
        character.id,
      );

    if (locationError) {
      return {
        ok: false,
        message:
          `Unable to clear Character Location before logout: ${locationError.message}`,
      };
    }
  }

  /*
   * Only remove the active portal session after Expertise has been
   * settled successfully, preserving the existing safety behaviour.
   */
  if (!expertiseSettleError) {
    const {
      error: sessionDeleteError,
    } = await admin
      .from("portal_active_sessions")
      .delete()
      .eq("user_id", user.id);

    if (sessionDeleteError) {
      return {
        ok: false,
        message:
          `Unable to close portal session: ${sessionDeleteError.message}`,
      };
    }
  }

  return {
    ok: !expertiseSettleError,
    ...(expertiseSettleError
      ? {
          message:
            `Unable to settle portal-time Expertise: ${expertiseSettleError.message}`,
        }
      : {}),
  };
}
