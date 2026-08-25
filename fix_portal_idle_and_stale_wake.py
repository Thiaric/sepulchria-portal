from pathlib import Path

ROOT = Path.cwd()

PRESENCE = ROOT / "components/portal/portal-presence-heartbeat.tsx"
SESSION = ROOT / "components/portal/portal-session-guard.tsx"


def fail(message: str) -> None:
    raise SystemExit(
        f"ERROR: {message}\nNo changes were applied."
    )


for path in (PRESENCE, SESSION):
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")

presence_old = PRESENCE.read_text(encoding="utf-8")
session_old = SESSION.read_text(encoding="utf-8")

for marker in [
    "const HEARTBEAT_INTERVAL_MS =",
    "const AWAY_AFTER_MS =",
    "const LOGOUT_AFTER_MS =",
    "const HIDDEN_SINCE_KEY =",
    "document.visibilityState ===",
    "export function PortalPresenceHeartbeat({",
]:
    if marker not in presence_old:
        fail(f"Presence file differs from analysed repo: missing {marker!r}")

for marker in [
    "const CHECK_INTERVAL_MS =",
    "const STORAGE_KEY =",
    "runningRef.current = true;",
    '"/api/portal-session/check"',
    "export function PortalSessionGuard()",
]:
    if marker not in session_old:
        fail(f"Session guard differs from analysed repo: missing {marker!r}")

presence_new = """\
"use client";

import {
  useEffect,
  useRef,
} from "react";

import {
  heartbeatPresence,
  restoreManualPresence,
  setAutomaticAway,
} from "@/app/(portal)/game/actions";
import {
  heartbeatExpertisePresence,
} from "@/app/(portal)/game/expertise-presence-actions";

import { createClient } from "@/lib/supabase/client";

const HEARTBEAT_INTERVAL_MS =
  60_000;

const EXPERTISE_HEARTBEAT_INTERVAL_MS =
  10 * 60_000;

const AWAY_AFTER_MS =
  15 * 60_000;

const LOGOUT_AFTER_MS =
  60 * 60_000;

const IDLE_CHECK_INTERVAL_MS =
  30_000;

const LAST_ACTIVITY_KEY =
  "sepulchria-last-activity-at";

const LEGACY_HIDDEN_SINCE_KEY =
  "sepulchria-hidden-since";

export function PortalPresenceHeartbeat({
  enabled,
}: {
  enabled: boolean;
}) {
  const runningRef =
    useRef(false);

  const expertiseRunningRef =
    useRef(false);

  const awayAppliedRef =
    useRef(false);

  const logoutStartedRef =
    useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function readLastActivity() {
      const stored =
        localStorage.getItem(
          LAST_ACTIVITY_KEY,
        );

      const parsed =
        stored
          ? Number(stored)
          : NaN;

      if (
        Number.isFinite(parsed)
      ) {
        return parsed;
      }

      const now = Date.now();

      localStorage.setItem(
        LAST_ACTIVITY_KEY,
        String(now),
      );

      return now;
    }

    function writeLastActivity(
      value = Date.now(),
    ) {
      localStorage.setItem(
        LAST_ACTIVITY_KEY,
        String(value),
      );
    }

    function idleForMs() {
      return (
        Date.now() -
        readLastActivity()
      );
    }

    async function sendHeartbeat() {
      if (
        runningRef.current ||
        idleForMs() >=
          AWAY_AFTER_MS
      ) {
        return;
      }

      runningRef.current = true;

      try {
        await heartbeatPresence();
      } catch (error) {
        console.error(
          "Unable to refresh portal presence:",
          error,
        );
      } finally {
        runningRef.current = false;
      }
    }

    async function sendExpertiseHeartbeat() {
      if (
        expertiseRunningRef.current ||
        idleForMs() >=
          AWAY_AFTER_MS
      ) {
        return;
      }

      expertiseRunningRef.current =
        true;

      try {
        await heartbeatExpertisePresence();
      } catch (error) {
        console.error(
          "Unable to refresh portal-time Expertise:",
          error,
        );
      } finally {
        expertiseRunningRef.current =
          false;
      }
    }

    async function markAutomaticAway() {
      if (
        awayAppliedRef.current
      ) {
        return;
      }

      awayAppliedRef.current = true;

      try {
        const result =
          await setAutomaticAway();

        if (!result.ok) {
          console.error(
            result.message,
          );
        }
      } catch (error) {
        console.error(
          "Unable to mark portal presence away:",
          error,
        );
      }
    }

    async function restorePresence() {
      if (
        !awayAppliedRef.current
      ) {
        return;
      }

      try {
        const result =
          await restoreManualPresence();

        if (!result.ok) {
          console.error(
            result.message,
          );
          return;
        }

        awayAppliedRef.current =
          false;
      } catch (error) {
        console.error(
          "Unable to restore portal presence:",
          error,
        );
      }
    }

    async function logoutForInactivity() {
      if (
        logoutStartedRef.current
      ) {
        return;
      }

      logoutStartedRef.current = true;

      try {
        localStorage.removeItem(
          LAST_ACTIVITY_KEY,
        );

        localStorage.removeItem(
          LEGACY_HIDDEN_SINCE_KEY,
        );

        const supabase =
          createClient();

        const { error } =
          await supabase.auth.signOut();

        if (error) {
          console.error(
            "Unable to sign out inactive session:",
            error.message,
          );
        }
      } catch (error) {
        console.error(
          "Unable to sign out inactive session:",
          error,
        );
      } finally {
        window.location.replace(
          "/auth/login",
        );
      }
    }

    function evaluateIdleState() {
      const elapsed =
        idleForMs();

      if (
        elapsed >=
        LOGOUT_AFTER_MS
      ) {
        void logoutForInactivity();
        return false;
      }

      if (
        elapsed >=
        AWAY_AFTER_MS
      ) {
        void markAutomaticAway();
        return false;
      }

      return true;
    }

    function registerActivity() {
      const elapsed =
        idleForMs();

      if (
        elapsed >=
        LOGOUT_AFTER_MS
      ) {
        void logoutForInactivity();
        return;
      }

      writeLastActivity();

      if (
        elapsed >=
          AWAY_AFTER_MS ||
        awayAppliedRef.current
      ) {
        void restorePresence();
      }

      void sendHeartbeat();
    }

    localStorage.removeItem(
      LEGACY_HIDDEN_SINCE_KEY,
    );

    readLastActivity();
    evaluateIdleState();

    const activityEvents = [
      "pointerdown",
      "keydown",
      "wheel",
      "touchstart",
    ] as const;

    for (
      const eventName of
      activityEvents
    ) {
      window.addEventListener(
        eventName,
        registerActivity,
        {
          passive: true,
        },
      );
    }

    function handleFocus() {
      registerActivity();
    }

    function handleOnline() {
      if (
        evaluateIdleState()
      ) {
        void sendHeartbeat();
      }
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        if (
          evaluateIdleState()
        ) {
          void sendHeartbeat();
        }
      }
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

    const heartbeatIntervalId =
      window.setInterval(
        () => {
          if (
            evaluateIdleState()
          ) {
            void sendHeartbeat();
          }
        },
        HEARTBEAT_INTERVAL_MS,
      );

    const idleIntervalId =
      window.setInterval(
        evaluateIdleState,
        IDLE_CHECK_INTERVAL_MS,
      );

    void sendHeartbeat();
    void sendExpertiseHeartbeat();

    const expertiseIntervalId =
      window.setInterval(
        () => {
          if (
            evaluateIdleState()
          ) {
            void sendExpertiseHeartbeat();
          }
        },
        EXPERTISE_HEARTBEAT_INTERVAL_MS,
      );

    return () => {
      window.clearInterval(
        heartbeatIntervalId,
      );

      window.clearInterval(
        idleIntervalId,
      );

      window.clearInterval(
        expertiseIntervalId,
      );

      for (
        const eventName of
        activityEvents
      ) {
        window.removeEventListener(
          eventName,
          registerActivity,
        );
      }

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
  }, [enabled]);

  return null;
}
"""

session_new = """\
"use client";

import {
  useCallback,
  useEffect,
  useRef,
} from "react";

const STORAGE_KEY =
  "sepulchria-portal-instance-id";

const CHECK_INTERVAL_MS =
  5_000;

const CHECK_TIMEOUT_MS =
  10_000;

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

      const controller =
        new AbortController();

      const timeoutId =
        window.setTimeout(
          () => {
            controller.abort();
          },
          CHECK_TIMEOUT_MS,
        );

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
              signal:
                controller.signal,
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                instanceId,
              }),
            },
          );

        if (
          response.status === 401
        ) {
          replacedRef.current =
            true;

          window.location.replace(
            "/auth/login",
          );

          return;
        }

        if (
          response.status === 409
        ) {
          replacedRef.current =
            true;

          sessionStorage.removeItem(
            STORAGE_KEY,
          );

          if (
            window.opener &&
            !window.opener.closed
          ) {
            try {
              window.opener.postMessage(
                {
                  type:
                    "sepulchria:portal-session-replaced",
                },
                window.location.origin,
              );
            } catch (error) {
              console.warn(
                "Unable to notify homepage that the portal session was replaced:",
                error,
              );
            }
          }

          window.close();

          window.setTimeout(() => {
            if (!window.closed) {
              window.location.replace(
                "/auth/login?portalSession=replaced",
              );
            }
          }, 150);

          return;
        }

        if (!response.ok) {
          console.error(
            "Unable to verify active portal login:",
            response.status,
          );
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name ===
            "AbortError"
        ) {
          console.warn(
            "Portal session verification timed out; it will retry.",
          );
        } else {
          console.error(
            "Unable to verify active portal login:",
            error,
          );
        }
      } finally {
        window.clearTimeout(
          timeoutId,
        );

        runningRef.current = false;
      }
    }, []);

  useEffect(() => {
    void checkCurrentLogin();

    const intervalId =
      window.setInterval(
        () => {
          void checkCurrentLogin();
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

    function handlePageShow() {
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

    window.addEventListener(
      "pageshow",
      handlePageShow,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.clearInterval(
        intervalId,
      );

      window.removeEventListener(
        "focus",
        handleFocus,
      );

      window.removeEventListener(
        "online",
        handleOnline,
      );

      window.removeEventListener(
        "pageshow",
        handlePageShow,
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

for marker in [
    "const LAST_ACTIVITY_KEY =",
    "evaluateIdleState()",
    "registerActivity()",
    "heartbeatPresence()",
]:
    if marker not in presence_new:
        fail(f"Generated presence safety check failed: {marker!r}")

for marker in [
    "const CHECK_TIMEOUT_MS =",
    "new AbortController()",
    '"pageshow"',
    "runningRef.current = false;",
]:
    if marker not in session_new:
        fail(f"Generated session guard safety check failed: {marker!r}")

PRESENCE.write_text(
    presence_new,
    encoding="utf-8",
    newline="\n",
)

SESSION.write_text(
    session_new,
    encoding="utf-8",
    newline="\n",
)

print("WROTE  components/portal/portal-presence-heartbeat.tsx")
print("WROTE  components/portal/portal-session-guard.tsx")
print()
print("PORTAL IDLE / WAKE RECOVERY FIX APPLIED")
print("- Inactivity now uses real interaction, not tab visibility.")
print("- Away after 15 minutes with no interaction.")
print("- Logout after 60 minutes with no interaction.")
print("- First interaction after 60 minutes cannot reset expiry.")
print("- Presence heartbeat stops once idle.")
print("- Return before logout restores manual presence.")
print("- Session checks abort after 10 seconds and retry.")
print("- Focus/online/visibility/pageshow trigger fresh validation.")
print("- Modal code untouched.")
print()
print("Next: npm run build")
