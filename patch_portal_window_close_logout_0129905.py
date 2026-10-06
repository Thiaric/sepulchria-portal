from pathlib import Path

GUARD = Path("components/portal/portal-session-guard.tsx")
HOMEPAGE = Path("components/homepage/sepulchria-homepage.tsx")
ROUTE = Path("app/api/portal-session/close/route.ts")

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were made.")

for path in (GUARD, HOMEPAGE):
    if not path.exists():
        fail(f"Missing expected file: {path}")

if ROUTE.exists():
    fail(f"{ROUTE} already exists.")

guard = GUARD.read_text(encoding="utf-8")
homepage = HOMEPAGE.read_text(encoding="utf-8")

old = '''  const replacedRef =
    useRef(false);

  const lastEventCheckRef =
    useRef(0);
'''
new = '''  const replacedRef =
    useRef(false);

  const intentionalLogoutRef =
    useRef(false);

  const lastEventCheckRef =
    useRef(0);
'''
if guard.count(old) != 1:
    fail("Could not uniquely locate PortalSessionGuard refs.")
guard = guard.replace(old, new, 1)

old = '''    function handleOnline() {
      checkFromBrowserEvent();
    }

    window.addEventListener(
      "online",
      handleOnline,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );
'''
new = '''    function handleOnline() {
      checkFromBrowserEvent();
    }

    function handleLogoutStarted() {
      intentionalLogoutRef.current =
        true;
    }

    function handlePageHide() {
      if (
        intentionalLogoutRef.current ||
        replacedRef.current
      ) {
        return;
      }

      if (
        !window.opener ||
        window.opener.closed
      ) {
        return;
      }

      try {
        window.opener.postMessage(
          {
            type:
              "sepulchria:portal-window-maybe-closed",
            instanceId:
              getPortalInstanceId(),
          },
          window.location.origin,
        );
      } catch (error) {
        console.warn(
          "Unable to notify homepage that the Portal window may be closing:",
          error,
        );
      }
    }

    window.addEventListener(
      "sepulchria-logout-started",
      handleLogoutStarted,
    );

    window.addEventListener(
      "pagehide",
      handlePageHide,
    );

    window.addEventListener(
      "online",
      handleOnline,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );
'''
if guard.count(old) != 1:
    fail("Could not uniquely locate PortalSessionGuard browser listeners.")
guard = guard.replace(old, new, 1)

old = '''      window.removeEventListener(
        "online",
        handleOnline,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
'''
new = '''      window.removeEventListener(
        "sepulchria-logout-started",
        handleLogoutStarted,
      );

      window.removeEventListener(
        "pagehide",
        handlePageHide,
      );

      window.removeEventListener(
        "online",
        handleOnline,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
'''
if guard.count(old) != 1:
    fail("Could not uniquely locate PortalSessionGuard listener cleanup.")
guard = guard.replace(old, new, 1)

old = '''      if (
        event.data?.type ===
          "sepulchria:portal-session-replaced"
      ) {
'''
new = '''      if (
        event.data?.type ===
          "sepulchria:portal-window-maybe-closed"
      ) {
        const portalWindow =
          event.source as Window | null;

        const instanceId =
          typeof event.data?.instanceId ===
          "string"
            ? event.data.instanceId
            : "";

        if (
          !portalWindow ||
          !instanceId
        ) {
          return;
        }

        window.setTimeout(
          async () => {
            if (!portalWindow.closed) {
              return;
            }

            try {
              const response =
                await fetch(
                  "/api/portal-session/close",
                  {
                    method: "POST",
                    credentials:
                      "same-origin",
                    cache: "no-store",
                    headers: {
                      "Content-Type":
                        "application/json",
                    },
                    body:
                      JSON.stringify({
                        instanceId,
                      }),
                  },
                );

              if (!response.ok) {
                console.error(
                  "Unable to close Portal session after window close:",
                  response.status,
                );
                return;
              }

              window.location.reload();
            } catch (error) {
              console.error(
                "Unable to close Portal session after window close:",
                error,
              );
            }
          },
          300,
        );

        return;
      }

      if (
        event.data?.type ===
          "sepulchria:portal-session-replaced"
      ) {
'''
if homepage.count(old) != 1:
    fail("Could not uniquely locate homepage Portal message handler.")
homepage = homepage.replace(old, new, 1)

route = '''import {
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
'''

ROUTE.parent.mkdir(
    parents=True,
    exist_ok=True,
)

GUARD.write_text(
    guard,
    encoding="utf-8",
)
HOMEPAGE.write_text(
    homepage,
    encoding="utf-8",
)
ROUTE.write_text(
    route,
    encoding="utf-8",
)

print("SUCCESS")
print("Updated:")
print(f"  {GUARD}")
print(f"  {HOMEPAGE}")
print("Created:")
print(f"  {ROUTE}")
print()
print("Next: npm run build")
