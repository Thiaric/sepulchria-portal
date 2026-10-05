from pathlib import Path

PATH = Path("app/(portal)/logout-presence-actions.ts")

if not PATH.exists():
    raise SystemExit(f"ERROR: {PATH} not found. Run this from the repo root.")

text = PATH.read_text(encoding="utf-8")

old = '''  const { error: friendLeaveError } =
    await supabase.rpc(
      "notify_my_mutual_friends_left",
    );

  if (friendLeaveError) {
    console.error(
      "Unable to notify mutual friends of logout:",
      friendLeaveError.message,
    );
  }

  const admin = createAdminClient();

  const {
    error: expertiseSettleError,
  } = await admin.rpc(
    "settle_portal_session_expertise",
    {
      p_user_id: user.id,
      p_now: new Date().toISOString(),
    },
  );

  if (expertiseSettleError) {
    console.error(
      "Unable to settle portal-time Expertise before logout:",
      expertiseSettleError.message,
    );
  }

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
  };'''

new = '''  const admin = createAdminClient();
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
  };'''

if old not in text:
    raise SystemExit(
        "ERROR: Expected logout cleanup block was not found exactly. No changes were made."
    )

if text.count(old) != 1:
    raise SystemExit(
        f"ERROR: Expected exactly 1 logout cleanup block, found {text.count(old)}. No changes were made."
    )

PATH.write_text(text.replace(old, new), encoding="utf-8")

print(f"Patched: {PATH}")
print("Changed logout cleanup from serial to concurrent DB operations.")
print("No Supabase schema changes were made.")
print("Next: run npm run build")
