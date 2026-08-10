"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { createClient } from "@/lib/supabase/client";
import type { WorldState } from "@/lib/world/types";

type WorldContextValue = {
  state: WorldState;
  gameDate: Date;
  syncWorldState: () => Promise<void>;
};

const WorldContext =
  createContext<WorldContextValue | null>(
    null,
  );

const WORLD_ROW_ID = "aureth";
const RESYNC_INTERVAL_MS = 10_000;

function isSameWorldState(
  current: WorldState,
  next: WorldState,
) {
  return (
    current.id === next.id &&
    current.game_datetime ===
      next.game_datetime &&
    current.automatic_time ===
      next.automatic_time &&
    current.time_scale ===
      next.time_scale &&
    current.weather === next.weather &&
    current.weather_intensity ===
      next.weather_intensity &&
    current.temperature_c ===
      next.temperature_c &&
    current.updated_at ===
      next.updated_at
  );
}

export function WorldStateProvider({
  initialState,
  children,
}: {
  initialState: WorldState;
  children: ReactNode;
}) {
  const [state, setState] =
    useState(initialState);

  /*
   * One local tick drives the in-game clock.
   * Because gameDate is exposed through context,
   * WorldIndicator and every AtmosphericImage
   * re-render as time advances.
   */
  const [now, setNow] = useState(
    () => Date.now(),
  );

  const mountedRef = useRef(true);

  const applyState = useCallback(
    (nextState: WorldState) => {
      if (!mountedRef.current) {
        return;
      }

      setState((current) =>
        isSameWorldState(
          current,
          nextState,
        )
          ? current
          : nextState,
      );
    },
    [],
  );

  const syncWorldState =
    useCallback(async () => {
      const supabase =
        createClient();

      const { data, error } =
        await supabase
          .from("world_state")
          .select(
            `
              id,
              game_datetime,
              automatic_time,
              time_scale,
              weather,
              weather_intensity,
              temperature_c,
              updated_at
            `,
          )
          .eq("id", WORLD_ROW_ID)
          .maybeSingle();

      if (
        error ||
        !data ||
        !mountedRef.current
      ) {
        return;
      }

      applyState(data as WorldState);
    }, [applyState]);

  useEffect(() => {
    mountedRef.current = true;

    const timer =
      window.setInterval(() => {
        setNow(Date.now());
      }, 1_000);

    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const supabase =
      createClient();

    /*
     * Primary path:
     * Supabase Realtime pushes staff/world
     * changes to every connected portal.
     *
     * Important: all callbacks are added
     * BEFORE subscribe().
     */
    const channel = supabase
      .channel(
        "sepulchria-world-state-live-v2",
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "world_state",
          filter: `id=eq.${WORLD_ROW_ID}`,
        },
        (payload) => {
          if (
            payload.eventType ===
              "DELETE" ||
            !payload.new
          ) {
            void syncWorldState();
            return;
          }

          applyState(
            payload.new as WorldState,
          );
        },
      )
      .subscribe((status) => {
        /*
         * Resync immediately once the socket
         * is genuinely live. This closes the
         * gap between SSR and subscription.
         */
        if (status === "SUBSCRIBED") {
          void syncWorldState();
        }
      });

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [applyState, syncWorldState]);

  useEffect(() => {
    /*
     * Realtime is the fast path.
     * This polling fallback guarantees that
     * weather/time never remains stale if a
     * websocket sleeps or Realtime misses an
     * event. It does not reload the page.
     */
    const timer =
      window.setInterval(() => {
        void syncWorldState();
      }, RESYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [syncWorldState]);

  useEffect(() => {
    const handleFocus = () => {
      void syncWorldState();
    };

    const handleVisibility = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        setNow(Date.now());
        void syncWorldState();
      }
    };

    const handleOnline = () => {
      void syncWorldState();
    };

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
      handleVisibility,
    );

    return () => {
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
        handleVisibility,
      );
    };
  }, [syncWorldState]);

  const gameDate = useMemo(() => {
    const baseGameTime =
      Date.parse(state.game_datetime);

    if (
      Number.isNaN(baseGameTime)
    ) {
      return new Date();
    }

    if (!state.automatic_time) {
      return new Date(baseGameTime);
    }

    const anchorRealTime =
      Date.parse(state.updated_at);

    const elapsedRealMs =
      Number.isNaN(anchorRealTime)
        ? 0
        : Math.max(
            0,
            now - anchorRealTime,
          );

    const scale = Math.max(
      0,
      Number(state.time_scale) || 0,
    );

    return new Date(
      baseGameTime +
        elapsedRealMs * scale,
    );
  }, [now, state]);

  const value = useMemo(
    () => ({
      state,
      gameDate,
      syncWorldState,
    }),
    [
      state,
      gameDate,
      syncWorldState,
    ],
  );

  return (
    <WorldContext.Provider
      value={value}
    >
      {children}
    </WorldContext.Provider>
  );
}

export function useWorldState() {
  const value =
    useContext(WorldContext);

  if (!value) {
    throw new Error(
      "WorldStateProvider missing.",
    );
  }

  return value;
}
