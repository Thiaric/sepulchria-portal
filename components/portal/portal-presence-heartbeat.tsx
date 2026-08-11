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

const HEARTBEAT_INTERVAL_MS =
  60_000;

const AWAY_AFTER_MS =
  15 * 60_000;

export function PortalPresenceHeartbeat({
  enabled,
}: {
  enabled: boolean;
}) {
  const runningRef =
    useRef(false);

  const hiddenSinceRef =
    useRef<number | null>(null);

  const awayTimerRef =
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

    function scheduleAway(
      delay = AWAY_AFTER_MS,
    ) {
      clearAwayTimer();

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

    if (
      document.visibilityState ===
      "visible"
    ) {
      /*
       * This also repairs a stale automatic Away
       * if the page was unloaded/reloaded while away.
       * A manually selected Away remains Away because
       * manual_status is also "away".
       */
      void restorePresence();
    } else {
      hiddenSinceRef.current =
        Date.now();

      scheduleAway();
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
        hiddenSinceRef.current =
          Date.now();

        scheduleAway();

        return;
      }

      hiddenSinceRef.current =
        null;

      clearAwayTimer();

      /*
       * Always restore the remembered manual status
       * when the user returns. This is safe even when
       * Away was selected manually.
       */
      void restorePresence();
    }

    function handleWindowFocus() {
      if (
        document.visibilityState !==
        "visible"
      ) {
        return;
      }

      hiddenSinceRef.current =
        null;

      clearAwayTimer();

      void restorePresence();
    }

    function handleOnline() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void restorePresence();
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

      clearAwayTimer();

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