"use client";

import {
  useEffect,
  useRef,
} from "react";

import {
  heartbeatPresence,
} from "@/app/(portal)/game/actions";

const HEARTBEAT_INTERVAL_MS =
  60_000;

export function PortalPresenceHeartbeat({
  enabled,
}: {
  enabled: boolean;
}) {
  const runningRef =
    useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    async function sendHeartbeat() {
      if (
        runningRef.current ||
        document.visibilityState !==
          "visible"
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

    void sendHeartbeat();

    const intervalId =
      window.setInterval(
        () => {
          void sendHeartbeat();
        },
        HEARTBEAT_INTERVAL_MS,
      );

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void sendHeartbeat();
      }
    }

    function handleWindowFocus() {
      void sendHeartbeat();
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.addEventListener(
      "focus",
      handleWindowFocus,
    );

    return () => {
      window.clearInterval(
        intervalId,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      window.removeEventListener(
        "focus",
        handleWindowFocus,
      );
    };
  }, [enabled]);

  return null;
}
