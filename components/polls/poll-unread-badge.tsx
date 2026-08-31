"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";


function isTransientTransportError(
  error: unknown,
) {
  return (
    error instanceof TypeError &&
    /failed to fetch|networkerror|load failed/i.test(
      error.message,
    )
  );
}

const REFRESH_MS = 15_000;

type UnreadPayload = {
  ids?: string[];
  count?: number;
};

export function usePollUnreadCount() {
  const [count, setCount] =
    useState(0);

  const refresh =
    useCallback(async () => {
      try {
        const response =
          await fetch(
            "/api/polls/unread",
            {
              cache: "no-store",
            },
          );

        if (!response.ok) {
          if (
            response.status ===
            401
          ) {
            setCount(0);
          }
          return;
        }

        const payload =
          (
            await response.json()
          ) as UnreadPayload;

        setCount(
          Math.max(
            0,
            Number(
              payload.count ??
                0,
            ) || 0,
          ),
        );
      } catch (error) {
        if (
          isTransientTransportError(
            error,
          )
        ) {
          return;
        }

        console.error(
          "Unable to refresh Poll unread count:",
          error,
        );
      }
    }, []);

  useEffect(() => {
    void refresh();

    const timer =
      window.setInterval(
        () => {
          void refresh();
        },
        REFRESH_MS,
      );

    const handleRefresh =
      () => {
        void refresh();
      };

    window.addEventListener(
      "focus",
      handleRefresh,
    );

    window.addEventListener(
      "sepulchria:poll-unread-changed",
      handleRefresh,
    );

    return () => {
      window.clearInterval(
        timer,
      );

      window.removeEventListener(
        "focus",
        handleRefresh,
      );

      window.removeEventListener(
        "sepulchria:poll-unread-changed",
        handleRefresh,
      );
    };
  }, [refresh]);

  return count;
}

export function PollUnreadBadge({
  count,
}: {
  count?: number;
}) {
  const ownCount =
    usePollUnreadCount();

  const value =
    count ?? ownCount;

  if (value <= 0) {
    return null;
  }

  return (
    <span
      title={`${value} new open Poll${value === 1 ? "" : "s"}`}
      className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-[rgb(var(--sep-colour-d19a4c))] bg-[rgb(var(--sep-colour-7a291f))] px-1 text-[7px] font-bold leading-none text-[rgb(var(--sep-colour-ffe1ac))] shadow-[0_0_9px_rgba(var(--sep-rgb-177-132-75),0.18)]"
    >
      {value > 9
        ? "9+"
        : value}
    </span>
  );
}
