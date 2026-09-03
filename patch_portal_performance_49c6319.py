#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(".")
sanctions = ROOT / "components/sanctions/sanction-capability-ui.tsx"
polls = ROOT / "components/polls/poll-unread-badge.tsx"
bell = ROOT / "components/notifications/notification-bell.tsx"

for path in (sanctions, polls, bell):
    if not path.exists():
        raise SystemExit(
            f"\nPATCH STOPPED: missing {path}. "
            "Run this from the sepulchria-portal project root.\n"
        )

# 1) SANCTIONS
sanctions_text = sanctions.read_text(encoding="utf-8")

if 'window.setInterval(()=>void refresh(),2500)' not in sanctions_text:
    raise SystemExit(
        "\nPATCH STOPPED: sanction-capability-ui.tsx does not match commit 49c6319 structure.\n"
    )

new_sanctions = '''"use client";

import {
  useEffect,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

export type SanctionCapability =
  | "communication"
  | "forum"
  | "game_chat";

type State = {
  loading: boolean;
  blocked: boolean;
  message: string | null;
};

type Listener = (state: State) => void;

const SHARED_REFRESH_MS = 15_000;

const stateByCapability =
  new Map<SanctionCapability, State>();

const listenersByCapability =
  new Map<SanctionCapability, Set<Listener>>();

const timersByCapability =
  new Map<SanctionCapability, number>();

const runningByCapability =
  new Set<SanctionCapability>();

async function refreshCapability(
  capability: SanctionCapability,
) {
  if (runningByCapability.has(capability)) {
    return;
  }

  runningByCapability.add(capability);

  try {
    const supabase = createClient();

    const { data, error } =
      await supabase.rpc(
        "get_current_sanction_enforcement",
        {
          p_capability: capability,
        },
      );

    const row =
      !error
        ? Array.isArray(data)
          ? data[0] ?? null
          : data
        : null;

    const next: State = error
      ? {
          loading: false,
          blocked: false,
          message: null,
        }
      : {
          loading: false,
          blocked: row?.blocked === true,
          message:
            typeof row?.message === "string"
              ? row.message
              : null,
        };

    stateByCapability.set(
      capability,
      next,
    );

    for (
      const listener of
      listenersByCapability.get(
        capability,
      ) ?? []
    ) {
      listener(next);
    }
  } finally {
    runningByCapability.delete(
      capability,
    );
  }
}

function ensureCapabilityPolling(
  capability: SanctionCapability,
) {
  if (timersByCapability.has(capability)) {
    return;
  }

  void refreshCapability(capability);

  const timer =
    window.setInterval(
      () => {
        void refreshCapability(
          capability,
        );
      },
      SHARED_REFRESH_MS,
    );

  timersByCapability.set(
    capability,
    timer,
  );
}

function maybeStopCapabilityPolling(
  capability: SanctionCapability,
) {
  const listeners =
    listenersByCapability.get(
      capability,
    );

  if (listeners && listeners.size > 0) {
    return;
  }

  const timer =
    timersByCapability.get(
      capability,
    );

  if (timer !== undefined) {
    window.clearInterval(timer);
    timersByCapability.delete(
      capability,
    );
  }
}

export function useSanctionCapability(
  capability: SanctionCapability,
): State {
  const [state, setState] =
    useState<State>(
      () =>
        stateByCapability.get(
          capability,
        ) ?? {
          loading: true,
          blocked: false,
          message: null,
        },
    );

  useEffect(() => {
    let listeners =
      listenersByCapability.get(
        capability,
      );

    if (!listeners) {
      listeners = new Set<Listener>();
      listenersByCapability.set(
        capability,
        listeners,
      );
    }

    listeners.add(setState);

    const cached =
      stateByCapability.get(
        capability,
      );

    if (cached) {
      setState(cached);
    }

    ensureCapabilityPolling(
      capability,
    );

    const refresh = () => {
      void refreshCapability(
        capability,
      );
    };

    window.addEventListener(
      "focus",
      refresh,
    );

    window.addEventListener(
      "sepulchria:sanctions-changed",
      refresh,
    );

    return () => {
      window.removeEventListener(
        "focus",
        refresh,
      );

      window.removeEventListener(
        "sepulchria:sanctions-changed",
        refresh,
      );

      const current =
        listenersByCapability.get(
          capability,
        );

      current?.delete(setState);

      if (current?.size === 0) {
        listenersByCapability.delete(
          capability,
        );
      }

      maybeStopCapabilityPolling(
        capability,
      );
    };
  }, [capability]);

  return state;
}

export function SanctionRestrictionNotice({
  message,
  compact = false,
}: {
  message: string | null;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <span
        title={
          message ??
          "This action is currently restricted."
        }
        aria-label={
          message ??
          "This action is currently restricted."
        }
        className="inline-flex h-8 w-8 items-center justify-center border border-[rgb(var(--sep-colour-8f4f44))]/65 bg-[rgb(var(--sep-colour-2b1714))] text-[13px] text-[rgb(var(--sep-colour-dc9789))]"
      >
        ⚠
      </span>
    );
  }

  return (
    <div
      role="status"
      className="border-l-2 border-[rgb(var(--sep-colour-9a5147))]/75 bg-[rgb(var(--sep-colour-291613))]/80 px-4 py-3 text-xs leading-6 text-[rgb(var(--sep-colour-d9a092))]"
    >
      {message ??
        "This action is currently restricted."}
    </div>
  );
}
'''

sanctions.write_text(
    new_sanctions,
    encoding="utf-8",
    newline="\n",
)

# 2) POLLS
polls_text = polls.read_text(encoding="utf-8")

if 'const REFRESH_MS = 15_000;' not in polls_text:
    raise SystemExit(
        "\nPATCH STOPPED: poll-unread-badge.tsx does not match commit 49c6319 structure.\n"
    )

new_polls = '''"use client";

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
'''

polls.write_text(
    new_polls,
    encoding="utf-8",
    newline="\n",
)

# 3) NOTIFICATION BELL
bell_text = bell.read_text(encoding="utf-8")

anchor = '''  const knownNotificationIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const [open, setOpen] =
'''

replacement = '''  const knownNotificationIdsRef =
    useRef<Set<string>>(
      new Set(),
    );

  const lastMissionSyncAtRef =
    useRef(0);

  const missionSyncRunningRef =
    useRef(false);

  const [open, setOpen] =
'''

count = bell_text.count(anchor)

if count != 1:
    raise SystemExit(
        f"\nPATCH STOPPED: notification ref anchor expected 1 match, found {count}.\n"
    )

bell_text = bell_text.replace(
    anchor,
    replacement,
    1,
)

old = '''  const load = useCallback(
    async () => {
      await fetch(
        "/api/missions/notifications/sync",
        {
          method: "POST",
          cache: "no-store",
        },
      ).catch(() => null);

      const { data, error } =
'''

new = '''  const load = useCallback(
    async () => {
      const now = Date.now();

      if (
        !missionSyncRunningRef.current &&
        now -
          lastMissionSyncAtRef.current >=
          60_000
      ) {
        missionSyncRunningRef.current =
          true;

        lastMissionSyncAtRef.current =
          now;

        try {
          await fetch(
            "/api/missions/notifications/sync",
            {
              method: "POST",
              cache: "no-store",
            },
          ).catch(() => null);
        } finally {
          missionSyncRunningRef.current =
            false;
        }
      }

      const { data, error } =
'''

count = bell_text.count(old)

if count != 1:
    raise SystemExit(
        f"\nPATCH STOPPED: notification load anchor expected 1 match, found {count}.\n"
    )

bell_text = bell_text.replace(
    old,
    new,
    1,
)

bell.write_text(
    bell_text,
    encoding="utf-8",
    newline="\n",
)

print("✓ Sanctions: shared 15s polling instead of 2.5s per component.")
print("✓ Polls: desktop/mobile share one 30s unread poller.")
print("✓ Notifications: heavy mission sync max once per minute.")
print("✓ Immediate focus/event refreshes remain.")
print("\\nPATCH COMPLETE")
print("\\nRun: npm run build")
