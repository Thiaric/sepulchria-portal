"use client";

import { useEffect, useRef } from "react";

import {
  PORTAL_SESSION_CHECK_INTERVAL_MS,
} from "@/lib/portal-session/constants";
import { createClient } from "@/lib/supabase/client";

type PortalSessionGuardProps = {
  enabled: boolean;
};

export function PortalSessionGuard({
  enabled,
}: PortalSessionGuardProps) {
  const ejectingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const eject = async () => {
      if (ejectingRef.current) return;
      ejectingRef.current = true;

      try {
        const supabase = createClient();
        await supabase.auth.signOut({
          scope: "local",
        });
      } catch {
        // Access is already invalidated server-side. Redirect regardless.
      }

      window.location.replace(
        "/auth/login?reason=session_replaced",
      );
    };

    const checkSession = async () => {
      if (
        cancelled ||
        ejectingRef.current ||
        document.visibilityState === "hidden"
      ) {
        return;
      }

      try {
        const response = await fetch(
          "/api/portal-session/status",
          {
            method: "GET",
            cache: "no-store",
            credentials: "same-origin",
          },
        );

        if (cancelled) return;

        if (response.status === 401) {
          await eject();
          return;
        }

        const body = (await response.json()) as {
          active?: boolean;
        };

        if (
          response.status === 409 ||
          body.active === false
        ) {
          await eject();
        }
      } catch {
        // A temporary network failure must never log a player out.
      }
    };

    const handleFocus = () => {
      void checkSession();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkSession();
      }
    };

    void checkSession();

    const intervalId = window.setInterval(
      () => {
        void checkSession();
      },
      PORTAL_SESSION_CHECK_INTERVAL_MS,
    );

    window.addEventListener("focus", handleFocus);
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [enabled]);

  return null;
}
