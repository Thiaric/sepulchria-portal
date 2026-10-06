import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const dynamic =
  "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
) {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          "not_authenticated",
      },
      {
        status: 401,
      },
    );
  }

  const body =
    (await request
      .json()
      .catch(() => null)) as
      | {
          instanceId?: unknown;
        }
      | null;

  const instanceId =
    typeof body?.instanceId ===
      "string"
      ? body.instanceId
      : "";

  if (
    !UUID_PATTERN.test(
      instanceId,
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          "invalid_instance",
      },
      {
        status: 400,
      },
    );
  }

  const admin =
    createAdminClient();

  const {
    data: activeSession,
    error: sessionError,
  } = await admin
    .from(
      "portal_active_sessions",
    )
    .select(
      "portal_instance_id",
    )
    .eq(
      "user_id",
      user.id,
    )
    .maybeSingle();

  if (sessionError) {
    console.error(
      "Unable to verify Portal session before close:",
      sessionError.message,
    );

    return NextResponse.json(
      {
        ok: false,
        reason:
          "server_error",
      },
      {
        status: 500,
      },
    );
  }

  if (
    !activeSession ||
    activeSession
      .portal_instance_id !==
      instanceId
  ) {
    return NextResponse.json({
      ok: true,
      current: false,
    });
  }

  const {
    data: character,
    error: characterError,
  } = await admin
    .from("characters")
    .select("id")
    .eq(
      "user_id",
      user.id,
    )
    .maybeSingle();

  if (characterError) {
    console.error(
      "Unable to find Character during Portal close:",
      characterError.message,
    );

    return NextResponse.json(
      {
        ok: false,
        reason:
          "server_error",
      },
      {
        status: 500,
      },
    );
  }

  const now =
    new Date().toISOString();

  const [
    friendLeaveResult,
    expertiseSettleResult,
    presenceDeleteResult,
  ] = await Promise.all([
    character
      ? supabase.rpc(
          "notify_my_mutual_friends_left",
        )
      : Promise.resolve({
          error: null,
        }),
    admin.rpc(
      "settle_portal_session_expertise",
      {
        p_user_id:
          user.id,
        p_now:
          now,
      },
    ),
    character
      ? admin
          .from(
            "character_presence",
          )
          .delete()
          .eq(
            "character_id",
            character.id,
          )
      : Promise.resolve({
          error: null,
        }),
  ]);

  if (
    friendLeaveResult.error
  ) {
    console.warn(
      "Unable to notify mutual friends during Portal close:",
      friendLeaveResult
        .error.message,
    );
  }

  if (
    presenceDeleteResult.error
  ) {
    console.warn(
      "Unable to clear Character presence during Portal close:",
      presenceDeleteResult
        .error.message,
    );
  }

  if (
    expertiseSettleResult.error
  ) {
    console.error(
      "Unable to settle Portal-time Expertise during window close:",
      expertiseSettleResult
        .error.message,
    );

    return NextResponse.json(
      {
        ok: false,
        reason:
          "expertise_settle_failed",
      },
      {
        status: 500,
      },
    );
  }

  const {
    error: deleteSessionError,
  } = await admin
    .from(
      "portal_active_sessions",
    )
    .delete()
    .eq(
      "user_id",
      user.id,
    )
    .eq(
      "portal_instance_id",
      instanceId,
    );

  if (deleteSessionError) {
    console.error(
      "Unable to remove Portal session during window close:",
      deleteSessionError.message,
    );

    return NextResponse.json(
      {
        ok: false,
        reason:
          "server_error",
      },
      {
        status: 500,
      },
    );
  }

  const {
    error: signOutError,
  } =
    await supabase.auth.signOut();

  if (signOutError) {
    console.error(
      "Unable to sign out after Portal window close:",
      signOutError.message,
    );

    return NextResponse.json(
      {
        ok: false,
        reason:
          "sign_out_failed",
      },
      {
        status: 500,
      },
    );
  }

  return NextResponse.json({
    ok: true,
    current: true,
  });
}
