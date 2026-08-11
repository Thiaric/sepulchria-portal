"use client";

import {
  useEffect,
  useRef,
} from "react";

import {
  heartbeatPresence,
  updatePresence,
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

    async function markAway() {
      try {
        await updatePresence(
          "away",
        );
      } catch (error) {
        console.error(
          "Unable to mark portal presence away:",
          error,
        );
      }
    }

    async function restoreOnline() {
      try {
        /*
         * Do not overwrite BUSY.
         *
         * updatePresence itself cannot tell
         * whether Away was manual or automatic,
         * so this preserves the same existing
         * behaviour: Busy is sticky, while Away
         * returns to Online when the user comes
         * back to the portal.
         */
        const result =
          await updatePresence(
            "online",
          );

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

    function scheduleAway() {
      clearAwayTimer();

      awayTimerRef.current =
        window.setTimeout(() => {
          if (
            document.visibilityState ===
            "hidden"
          ) {
            void markAway();
          }
        }, AWAY_AFTER_MS);
    }

    /*
     * Portal mounted and visible:
     * register activity immediately.
     */
    if (
      document.visibilityState ===
      "visible"
    ) {
      void sendHeartbeat();
    } else {
      hiddenSinceRef.current =
        Date.now();

      scheduleAway();
    }

    /*
     * Heartbeat only while the portal
     * is actually visible.
     */
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

      const hiddenSince =
        hiddenSinceRef.current;

      hiddenSinceRef.current =
        null;

      clearAwayTimer();

      /*
       * If the tab was hidden for at
       * least 15 minutes, Away may have
       * been applied while hidden.
       *
       * Returning to the portal makes
       * the character Online again.
       */
      if (
        hiddenSince !== null &&
        Date.now() -
          hiddenSince >=
          AWAY_AFTER_MS
      ) {
        void restoreOnline();
      } else {
        void sendHeartbeat();
      }
    }

    function handleWindowFocus() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        hiddenSinceRef.current =
          null;

        clearAwayTimer();

        void sendHeartbeat();
      }
    }

    function handleOnline() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void sendHeartbeat();
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