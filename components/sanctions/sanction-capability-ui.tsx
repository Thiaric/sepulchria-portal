"use client";

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
