"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

const STORAGE_KEY =
  "sepulchria-portal-instance-id";

const LAST_ACTIVITY_KEY =
  "sepulchria-last-activity-at";

const CLAIM_RETRY_DELAYS_MS = [
  0,
  150,
  300,
  500,
  750,
  1000,
  1500,
];

function wait(ms: number) {
  return new Promise<void>(
    (resolve) => {
      window.setTimeout(
        resolve,
        ms,
      );
    },
  );
}

export default function PortalEntryPage() {
  const startedRef =
    useRef(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;

    let cancelled = false;

    async function enterPortal() {
      const instanceId =
        crypto.randomUUID();

      let lastMessage =
        "Unable to establish the active Sepulchria login.";

      for (
        const delay of
        CLAIM_RETRY_DELAYS_MS
      ) {
        if (cancelled) {
          return;
        }

        if (delay > 0) {
          await wait(delay);
        }

        if (cancelled) {
          return;
        }

        const response =
          await fetch(
            "/api/portal-session/claim",
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

        const result =
          (await response
            .json()
            .catch(() => null)) as
            | {
                message?: string;
              }
            | null;

        if (response.ok) {
          window.sessionStorage.setItem(
            STORAGE_KEY,
            instanceId,
          );

          /*
           * A timestamp from an old portal session is shared through
           * localStorage. Reset it after a genuinely successful login so
           * the inactivity watchdog cannot immediately sign out this new
           * session as if it had already been idle for an hour.
           */
          window.localStorage.setItem(
            LAST_ACTIVITY_KEY,
            String(Date.now()),
          );

          window.location.replace(
            "/",
          );
          return;
        }

        lastMessage =
          result?.message ??
          lastMessage;

        /*
         * Retry only the fresh-login cookie timing case. Any other error
         * is a real failure and should be shown instead of looping.
         */
        if (
          response.status !== 401
        ) {
          break;
        }
      }

      if (!cancelled) {
        setError(lastMessage);
      }
    }

    void enterPortal();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[rgb(var(--sep-colour-120f0d))] px-6 text-[rgb(var(--sep-colour-e8dcc4))]">
      <div className="max-w-md text-center">
        <p className="font-serif text-lg text-[rgb(var(--sep-colour-d4b27e))]">
          {error
            ? "The gates did not open."
            : "Entering Sepulchria..."}
        </p>

        {error ? (
          <>
            <p className="mt-3 text-sm leading-6 text-[rgb(var(--sep-colour-b7a58c))]">
              {error}
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.replace(
                  "/auth/login",
                );
              }}
              className="mt-5 border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-241a12))] px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd4a0))]"
            >
              Return to Login
            </button>
          </>
        ) : null}
      </div>
    </main>
  );
}
