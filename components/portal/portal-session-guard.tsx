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
