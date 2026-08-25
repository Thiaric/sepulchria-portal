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
