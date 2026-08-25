from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED = "b9308d8"


def read(path: str) -> str:
    p = ROOT / path
    if not p.exists():
        raise SystemExit(f"ERROR: Missing expected file: {path}")
    return p.read_text(encoding="utf-8")


def ensure_absent(path: str) -> None:
    if (ROOT / path).exists():
        raise SystemExit(
            f"ERROR: {path} already exists. No changes were applied."
        )


def write(path: str, content: str) -> None:
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8", newline="\n")
    print(f"WROTE  {path}")


head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    cwd=ROOT,
    text=True,
).strip()

if not head.startswith(EXPECTED):
    raise SystemExit(
        f"ERROR: Patch expects {EXPECTED} but current HEAD is {head}. "
        "No changes were applied."
    )

login_path = "components/login-form.tsx"
layout_path = "app/(portal)/layout.tsx"

login_old = """      const { error } =
  await supabase.auth.signInWithPassword({
    email,
    password,
    options: {
      captchaToken,
    },
  });

      if (error) {
        throw error;
      }
"""

login_new = """      const { error } =
  await supabase.auth.signInWithPassword({
    email,
    password,
    options: {
      captchaToken,
    },
  });

      if (error) {
        throw error;
      }

      /*
       * Every successful login gets its own portal-window identity.
       * The newest successful login becomes the only active portal
       * instance for this account.
       */
      const portalInstanceId =
        crypto.randomUUID();

      const claimResponse =
        await fetch(
          "/api/portal-session/claim",
          {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              instanceId:
                portalInstanceId,
            }),
          },
        );

      if (!claimResponse.ok) {
        const claimResult =
          (await claimResponse
            .json()
            .catch(() => null)) as
            | {
                message?: string;
              }
            | null;

        throw new Error(
          claimResult?.message ??
            "Unable to establish the active Sepulchria login.",
        );
      }

      portalWindow.sessionStorage.setItem(
        "sepulchria-portal-instance-id",
        portalInstanceId,
      );
"""

layout_import_old = """import { PortalPresenceHeartbeat } from "@/components/portal/portal-presence-heartbeat";
"""
layout_import_new = """import { PortalPresenceHeartbeat } from "@/components/portal/portal-presence-heartbeat";
import { PortalSessionGuard } from "@/components/portal/portal-session-guard";
"""

layout_render_old = """            <PortalPresenceHeartbeat
              enabled={
                presenceEnabled
              }
            />

            <div className="shrink-0">
"""
layout_render_new = """            <PortalPresenceHeartbeat
              enabled={
                presenceEnabled
              }
            />

            <PortalSessionGuard />

            <div className="shrink-0">
"""

login_content = read(login_path)
layout_content = read(layout_path)

if login_content.count(login_old) != 1:
    raise SystemExit(
        f"ERROR: Expected exactly one login block in {login_path}, found {login_content.count(login_old)}. No changes were applied."
    )
if layout_content.count(layout_import_old) != 1:
    raise SystemExit(
        f"ERROR: Expected exactly one heartbeat import in {layout_path}, found {layout_content.count(layout_import_old)}. No changes were applied."
    )
if layout_content.count(layout_render_old) != 1:
    raise SystemExit(
        f"ERROR: Expected exactly one heartbeat render block in {layout_path}, found {layout_content.count(layout_render_old)}. No changes were applied."
    )

for path in [
    "app/api/portal-session/claim/route.ts",
    "app/api/portal-session/check/route.ts",
    "components/portal/portal-session-guard.tsx",
    "supabase_latest_login_wins.sql",
]:
    ensure_absent(path)

login_after = login_content.replace(login_old, login_new, 1)
layout_after = layout_content.replace(layout_import_old, layout_import_new, 1)
layout_after = layout_after.replace(layout_render_old, layout_render_new, 1)

claim_route = """import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

  if (userError || !user) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Your login is no longer valid. Please sign in again.",
      },
      { status: 401 },
    );
  }

  const body =
    (await request
      .json()
      .catch(() => null)) as
      | { instanceId?: unknown }
      | null;

  const instanceId =
    typeof body?.instanceId === "string"
      ? body.instanceId
      : "";

  if (!UUID_PATTERN.test(instanceId)) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Invalid portal session identifier.",
      },
      { status: 400 },
    );
  }

  const now =
    new Date().toISOString();

  const admin =
    createAdminClient();

  const { error } =
    await admin
      .from("portal_active_sessions")
      .upsert(
        {
          user_id: user.id,
          portal_instance_id:
            instanceId,
          claimed_at: now,
          last_seen_at: now,
        },
        {
          onConflict: "user_id",
        },
      );

  if (error) {
    console.error(
      "Unable to claim active portal login:",
      error.message,
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Unable to establish the active Sepulchria login.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
"""

check_route = """import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

  if (userError || !user) {
    return NextResponse.json(
      {
        ok: false,
        reason: "not_authenticated",
      },
      { status: 401 },
    );
  }

  const body =
    (await request
      .json()
      .catch(() => null)) as
      | { instanceId?: unknown }
      | null;

  const instanceId =
    typeof body?.instanceId === "string"
      ? body.instanceId
      : "";

  if (!UUID_PATTERN.test(instanceId)) {
    return NextResponse.json(
      {
        ok: false,
        reason: "invalid_instance",
      },
      { status: 400 },
    );
  }

  const admin =
    createAdminClient();

  const {
    data: activeSession,
    error,
  } = await admin
    .from("portal_active_sessions")
    .select("portal_instance_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to check active portal login:",
      error.message,
    );

    return NextResponse.json(
      {
        ok: false,
        reason: "server_error",
      },
      { status: 500 },
    );
  }

  if (!activeSession) {
    const now =
      new Date().toISOString();

    const { error: claimError } =
      await admin
        .from("portal_active_sessions")
        .insert({
          user_id: user.id,
          portal_instance_id:
            instanceId,
          claimed_at: now,
          last_seen_at: now,
        });

    if (!claimError) {
      return NextResponse.json({
        ok: true,
        current: true,
      });
    }

    const {
      data: racedSession,
      error: racedError,
    } = await admin
      .from("portal_active_sessions")
      .select("portal_instance_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (racedError) {
      return NextResponse.json(
        {
          ok: false,
          reason: "server_error",
        },
        { status: 500 },
      );
    }

    if (
      racedSession?.portal_instance_id !==
      instanceId
    ) {
      return NextResponse.json(
        {
          ok: false,
          reason: "replaced",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      current: true,
    });
  }

  if (
    activeSession.portal_instance_id !==
    instanceId
  ) {
    return NextResponse.json(
      {
        ok: false,
        reason: "replaced",
      },
      { status: 409 },
    );
  }

  const { error: seenError } =
    await admin
      .from("portal_active_sessions")
      .update({
        last_seen_at:
          new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq(
        "portal_instance_id",
        instanceId,
      );

  if (seenError) {
    console.warn(
      "Unable to update portal login last_seen_at:",
      seenError.message,
    );
  }

  return NextResponse.json({
    ok: true,
    current: true,
  });
}
"""

guard_component = """\"use client\";

import {
  useCallback,
  useEffect,
  useRef,
} from "react";

const STORAGE_KEY =
  "sepulchria-portal-instance-id";

const CHECK_INTERVAL_MS =
  5_000;

function getPortalInstanceId() {
  const existing =
    sessionStorage.getItem(
      STORAGE_KEY,
    );

  if (existing) {
    return existing;
  }

  const created =
    crypto.randomUUID();

  sessionStorage.setItem(
    STORAGE_KEY,
    created,
  );

  return created;
}

export function PortalSessionGuard() {
  const runningRef =
    useRef(false);

  const replacedRef =
    useRef(false);

  const checkCurrentLogin =
    useCallback(async () => {
      if (
        runningRef.current ||
        replacedRef.current
      ) {
        return;
      }

      runningRef.current = true;

      try {
        const instanceId =
          getPortalInstanceId();

        const response =
          await fetch(
            "/api/portal-session/check",
            {
              method: "POST",
              credentials:
                "same-origin",
              cache: "no-store",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                instanceId,
              }),
            },
          );

        if (response.status === 401) {
          replacedRef.current = true;
          window.location.replace(
            "/auth/login",
          );
          return;
        }

        if (response.status === 409) {
          replacedRef.current = true;

          /*
           * Do NOT call supabase.auth.signOut() here. Auth storage can be
           * shared by windows in the same browser; signing out the losing
           * window could also destroy the winning login.
           */
          window.location.replace(
            "/auth/login?portalSession=replaced",
          );
          return;
        }

        if (!response.ok) {
          console.error(
            "Unable to verify active portal login:",
            response.status,
          );
        }
      } catch (error) {
        /* Temporary network failures do not eject a valid player. */
        console.error(
          "Unable to verify active portal login:",
          error,
        );
      } finally {
        runningRef.current = false;
      }
    }, []);

  useEffect(() => {
    void checkCurrentLogin();

    const intervalId =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            "visible"
          ) {
            void checkCurrentLogin();
          }
        },
        CHECK_INTERVAL_MS,
      );

    function handleFocus() {
      void checkCurrentLogin();
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void checkCurrentLogin();
      }
    }

    function handleOnline() {
      void checkCurrentLogin();
    }

    window.addEventListener(
      "focus",
      handleFocus,
    );
    window.addEventListener(
      "online",
      handleOnline,
    );
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(
        "focus",
        handleFocus,
      );
      window.removeEventListener(
        "online",
        handleOnline,
      );
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [checkCurrentLogin]);

  return null;
}
"""

sql = """begin;

create table if not exists public.portal_active_sessions (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,
  portal_instance_id uuid not null,
  claimed_at timestamptz not null
    default now(),
  last_seen_at timestamptz not null
    default now()
);

create index if not exists portal_active_sessions_last_seen_idx
  on public.portal_active_sessions(last_seen_at);

alter table public.portal_active_sessions
  enable row level security;

revoke all
on table public.portal_active_sessions
from anon, authenticated;

commit;
"""

write(login_path, login_after)
write(layout_path, layout_after)
write("app/api/portal-session/claim/route.ts", claim_route)
write("app/api/portal-session/check/route.ts", check_route)
write("components/portal/portal-session-guard.tsx", guard_component)
write("supabase_latest_login_wins.sql", sql)

print()
print("PATCH APPLIED SUCCESSFULLY")
print()
print("Next steps:")
print("1. Run ALL of supabase_latest_login_wins.sql in Supabase SQL Editor.")
print("2. Run: npm run build")
print("3. Test login A, then login B with the same account.")
print("4. B stays active; A is redirected within about 5 seconds or immediately when focused.")
print("5. Do NOT commit/push until the test passes.")
