"use client";

import {
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

const REFRESH_MS = 30_000;

type UnreadPayload = {
  ids?: string[];
  count?: number;
};

type CountListener = (
  count: number,
) => void;

let sharedCount = 0;
let sharedTimer:
  | number
  | null = null;
let sharedRunning = false;

const listeners =
  new Set<CountListener>();

function publishCount(
  count: number,
) {
  sharedCount = count;

  for (const listener of listeners) {
    listener(count);
  }
}

async function refreshSharedCount() {
  if (sharedRunning) {
    return;
  }

  sharedRunning = true;

  try {
    const response =
      await fetch(
        "/api/polls/unread",
        {
          cache: "no-store",
        },
      );

    if (!response.ok) {
      if (response.status === 401) {
        publishCount(0);
      }

      return;
    }

    const payload =
      (await response.json()) as
        UnreadPayload;

    publishCount(
      Math.max(
        0,
        Number(
          payload.count ?? 0,
        ) || 0,
      ),
    );
  } catch (error) {
    if (
      !isTransientTransportError(
        error,
      )
    ) {
      console.error(
        "Unable to refresh Poll unread count:",
        error,
      );
    }
  } finally {
    sharedRunning = false;
  }
}

function ensureSharedPolling() {
  if (sharedTimer !== null) {
    return;
  }

  void refreshSharedCount();

  sharedTimer =
    window.setInterval(
      () => {
        void refreshSharedCount();
      },
      REFRESH_MS,
    );
}

function stopSharedPollingIfUnused() {
  if (
    listeners.size > 0 ||
    sharedTimer === null
  ) {
    return;
  }

  window.clearInterval(sharedTimer);
  sharedTimer = null;
}

export function usePollUnreadCount() {
  const [count, setCount] =
    useState(sharedCount);

  useEffect(() => {
    listeners.add(setCount);
    setCount(sharedCount);
    ensureSharedPolling();

    const handleRefresh = () => {
      void refreshSharedCount();
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
      listeners.delete(setCount);

      window.removeEventListener(
        "focus",
        handleRefresh,
      );

      window.removeEventListener(
        "sepulchria:poll-unread-changed",
        handleRefresh,
      );

      stopSharedPollingIfUnused();
    };
  }, []);

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
      data-sep-counter-badge="true"
      title={`${value} new open Poll${
        value === 1 ? "" : "s"
      }`}
      className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-[#d19a4c] bg-[#7a291f] px-1 text-[7px] font-bold leading-none text-[#ffe1ac] shadow-[0_0_9px_rgba(var(--sep-rgb-177-132-75),0.18)]"
    >
      {value > 9 ? "9+" : value}
    </span>
  );
}
