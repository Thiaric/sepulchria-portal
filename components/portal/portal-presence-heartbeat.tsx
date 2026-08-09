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
      if (runningRef.current) {
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

    // Register presence immediately when the portal shell mounts.
    void sendHeartbeat();

    // Keep refreshing even when the page is idle or the tab is in the
    // background. Browsers may throttle background timers, so focus,
    // visibility and reconnect events also force an immediate refresh.
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

    function handleOnline() {
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

    window.addEventListener(
      "online",
      handleOnline,
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

      window.removeEventListener(
        "online",
        handleOnline,
      );
    };
  }, [enabled]);

  return null;
}
