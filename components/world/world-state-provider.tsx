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

function isSameState(
  a: WorldState,
  b: WorldState,
) {
  return (
    a.id === b.id &&
    a.game_datetime ===
      b.game_datetime &&
    a.automatic_time ===
      b.automatic_time &&
    a.time_scale === b.time_scale &&
    a.weather === b.weather &&
    a.weather_intensity ===
      b.weather_intensity &&
    a.temperature_c ===
      b.temperature_c &&
    a.automatic_weather ===
      b.automatic_weather &&
    a.next_weather_change_game ===
      b.next_weather_change_game &&
    a.weather_override_until_game ===
      b.weather_override_until_game &&
    a.weather_last_changed_game ===
      b.weather_last_changed_game &&
    a.updated_at === b.updated_at
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

  const [now, setNow] =
    useState(() => Date.now());

  const mounted = useRef(true);

  const applyState = useCallback(
    (next: WorldState) => {
      if (!mounted.current) {
        return;
      }

      setState((current) =>
        isSameState(current, next)
          ? current
          : next,
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
          .select(`
            id,
            game_datetime,
            automatic_time,
            time_scale,
            weather,
            weather_intensity,
            temperature_c,
            automatic_weather,
            next_weather_change_game,
            weather_override_until_game,
            weather_last_changed_game,
            updated_at
          `)
          .eq("id", WORLD_ROW_ID)
          .maybeSingle();

      if (
        error ||
        !data ||
        !mounted.current
      ) {
        return;
      }

      applyState(
        data as WorldState,
      );
    }, [applyState]);

  useEffect(() => {
    mounted.current = true;

    const timer =
      window.setInterval(() => {
        setNow(Date.now());
      }, 1_000);

    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const supabase =
      createClient();

    const channel = supabase
      .channel(
        "sepulchria-world-state-live-v3",
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
        if (
          status === "SUBSCRIBED"
        ) {
          void syncWorldState();
        }
      });

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    applyState,
    syncWorldState,
  ]);

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        void syncWorldState();
      }, RESYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [syncWorldState]);

  useEffect(() => {
    const resync = () => {
      setNow(Date.now());
      void syncWorldState();
    };

    const visibility = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        resync();
      }
    };

    window.addEventListener(
      "focus",
      resync,
    );

    window.addEventListener(
      "online",
      resync,
    );

    document.addEventListener(
      "visibilitychange",
      visibility,
    );

    return () => {
      window.removeEventListener(
        "focus",
        resync,
      );

      window.removeEventListener(
        "online",
        resync,
      );

      document.removeEventListener(
        "visibilitychange",
        visibility,
      );
    };
  }, [syncWorldState]);

  const gameDate =
    useMemo(() => {
      const base =
        Date.parse(
          state.game_datetime,
        );

      if (Number.isNaN(base)) {
        return new Date();
      }

      if (!state.automatic_time) {
        return new Date(base);
      }

      const anchor =
        Date.parse(state.updated_at);

      const elapsed =
        Number.isNaN(anchor)
          ? 0
          : Math.max(
              0,
              now - anchor,
            );

      return new Date(
        base +
          elapsed *
            Math.max(
              0,
              Number(
                state.time_scale,
              ) || 0,
            ),
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
