"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

const PRESENCE_ACTIVE_MINUTES = 3;
const REFRESH_INTERVAL_MS = 30_000;

type ActiveCityCounterProps = {
  initialCount: number;
};

export function ActiveCityCounter({
  initialCount,
}: ActiveCityCounterProps) {
  const [count, setCount] =
    useState(initialCount);

  const refreshCount = useCallback(
    async () => {
      const supabase = createClient();

      const activeSince = new Date(
        Date.now() -
          PRESENCE_ACTIVE_MINUTES *
            60_000,
      ).toISOString();

      const {
        count: activeCount,
        error,
      } = await supabase
        .from("character_presence")
        .select("character_id", {
          count: "exact",
          head: true,
        })
        .gte(
          "last_seen_at",
          activeSince,
        );

      if (error) {
        console.error(
          "Unable to refresh active character count:",
          error.message,
        );

        return;
      }

      setCount(activeCount ?? 0);
    },
    [],
  );

  useEffect(() => {
    const supabase = createClient();

    void refreshCount();

    const channel = supabase
      .channel("active-city-counter")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "character_presence",
        },
        () => {
          void refreshCount();
        },
      )
      .subscribe();

    const intervalId =
      window.setInterval(() => {
        void refreshCount();
      }, REFRESH_INTERVAL_MS);

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void refreshCount();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.clearInterval(intervalId);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      void supabase.removeChannel(
        channel,
      );
    };
  }, [refreshCount]);

  return (
    <div
      title={`${count} active character${
        count === 1 ? "" : "s"
      }`}
      className="hidden h-10 items-center gap-3 border border-[#614b31] bg-[#17120f] px-3 md:flex"
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#788d5e] shadow-[0_0_10px_rgba(120,141,94,0.55)]" />

      <div className="flex items-baseline gap-2">
        <span className="font-serif text-lg text-[#d8bf91]">
          {count}
        </span>

        <span className="hidden text-[8px] uppercase tracking-[0.18em] text-[#81725f] lg:inline">
          Active in the city
        </span>
      </div>
    </div>
  );
}