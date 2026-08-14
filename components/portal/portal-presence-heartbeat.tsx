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

import { createClient } from "@/lib/supabase/client";

const HEARTBEAT_INTERVAL_MS =
  60_000;

const AWAY_AFTER_MS =
  15 * 60_000;

const LOGOUT_AFTER_MS =
  60 * 60_000;

const HIDDEN_SINCE_KEY =
  "sepulchria-hidden-since";

export function PortalPresenceHeartbeat({
  enabled,
}: {
  enabled: boolean;
}) {
  const runningRef =
    useRef(false);

  const awayTimerRef =
    useRef<number | null>(null);

  const logoutTimerRef =
    useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    async function sendHeartbeat() {
      if (
        runningRef.current ||
        document.visibilityState ===
          "hidden"
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

    async function markAutomaticAway() {
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
      try {
        const result =
          await restoreManualPresence();

        if (!result.ok) {
          console.error(
            result.message,
          );
        }
      } catch (error) {
        console.error(
          "Unable to restore portal presence:",
          error,
        );
      }
    }

    async function logoutForInactivity() {
      try {
        localStorage.removeItem(
          HIDDEN_SINCE_KEY,
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

    function clearAwayTimer() {
      if (
        awayTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          awayTimerRef.current,
        );

        awayTimerRef.current =
          null;
      }
    }

    function clearLogoutTimer() {
      if (
        logoutTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          logoutTimerRef.current,
        );

        logoutTimerRef.current =
          null;
      }
    }

    function clearTimers() {
      clearAwayTimer();
      clearLogoutTimer();
    }

    function scheduleAway(
      delay = AWAY_AFTER_MS,
    ) {
      clearAwayTimer();

      if (delay <= 0) {
        void markAutomaticAway();
        return;
      }

      awayTimerRef.current =
        window.setTimeout(() => {
          if (
            document.visibilityState ===
            "hidden"
          ) {
            void markAutomaticAway();
          }
        }, delay);
    }

    function scheduleLogout(
      delay = LOGOUT_AFTER_MS,
    ) {
      clearLogoutTimer();

      if (delay <= 0) {
        void logoutForInactivity();
        return;
      }

      logoutTimerRef.current =
        window.setTimeout(() => {
          if (
            document.visibilityState ===
            "hidden"
          ) {
            void logoutForInactivity();
          }
        }, delay);
    }

    function beginHiddenPeriod() {
      const existing =
        localStorage.getItem(
          HIDDEN_SINCE_KEY,
        );

      const parsed =
        existing
          ? Number(existing)
          : NaN;

      const hiddenSince =
        Number.isFinite(parsed)
          ? parsed
          : Date.now();

      localStorage.setItem(
        HIDDEN_SINCE_KEY,
        String(hiddenSince),
      );

      const elapsed =
        Date.now() - hiddenSince;

      if (
        elapsed >= LOGOUT_AFTER_MS
      ) {
        void logoutForInactivity();
        return;
      }

      scheduleAway(
        Math.max(
          AWAY_AFTER_MS - elapsed,
          0,
        ),
      );

      scheduleLogout(
        Math.max(
          LOGOUT_AFTER_MS - elapsed,
          0,
        ),
      );
    }

    function returnToPortal() {
      const stored =
        localStorage.getItem(
          HIDDEN_SINCE_KEY,
        );

      if (stored) {
        const hiddenSince =
          Number(stored);

        if (
          Number.isFinite(
            hiddenSince,
          ) &&
          Date.now() -
            hiddenSince >=
            LOGOUT_AFTER_MS
        ) {
          void logoutForInactivity();
          return;
        }
      }

      localStorage.removeItem(
        HIDDEN_SINCE_KEY,
      );

      clearTimers();

      void restorePresence();
    }

    if (
      document.visibilityState ===
      "visible"
    ) {
      returnToPortal();
    } else {
      beginHiddenPeriod();
    }

    const intervalId =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            "visible"
          ) {
            void sendHeartbeat();
          }
        },
        HEARTBEAT_INTERVAL_MS,
      );

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "hidden"
      ) {
        beginHiddenPeriod();
        return;
      }

      returnToPortal();
    }

    function handleWindowFocus() {
      if (
        document.visibilityState !==
        "visible"
      ) {
        return;
      }

      returnToPortal();
    }

    function handleOnline() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        returnToPortal();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.addEventListener(
      "focus",
      handleWindowFocus,
    );

    window.addEventListener(
      "online",
      handleOnline,
    );

    return () => {
      window.clearInterval(
        intervalId,
      );

      clearTimers();

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      window.removeEventListener(
        "focus",
        handleWindowFocus,
      );

      window.removeEventListener(
        "online",
        handleOnline,
      );
    };
  }, [enabled]);

  return null;
}