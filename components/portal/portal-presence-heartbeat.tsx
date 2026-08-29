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
import {
  clearOwnPresenceForLogout,
} from "@/app/(portal)/logout-presence-actions";

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
        logoutStartedRef.current ||
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
        logoutStartedRef.current ||
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

        const presenceResult =
          await clearOwnPresenceForLogout();

        if (!presenceResult.ok) {
          console.error(
            "Unable to clear inactive character presence:",
            presenceResult.message,
          );
        }

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
      if (logoutStartedRef.current) {
        return false;
      }

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

    function handleLogoutStarted() {
      logoutStartedRef.current = true;
    }

    function registerActivity() {
      if (logoutStartedRef.current) {
        return;
      }

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
      "sepulchria-logout-started",
      handleLogoutStarted,
    );

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
        "sepulchria-logout-started",
        handleLogoutStarted,
      );

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
