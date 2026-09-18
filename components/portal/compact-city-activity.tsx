"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

const REFRESH_INTERVAL_MS =
  20_000;

const WINDOW_MS =
  60_000;

type CityActivityRow = {
  id: string;
  first_name: string;
  event_type:
    | "entered"
    | "left";
  occurred_at: string;
};

export function CompactCityActivity() {
  const [rows, setRows] =
    useState<CityActivityRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(false);

  const refresh =
    useCallback(async () => {
      const supabase =
        createClient();

      const since =
        new Date(
          Date.now() -
            WINDOW_MS,
        ).toISOString();

      const {
        data,
        error: queryError,
      } = await supabase
        .from(
          "portal_presence_events",
        )
        .select(
          "id, first_name, event_type, occurred_at",
        )
        .gte(
          "occurred_at",
          since,
        )
        .order(
          "occurred_at",
          {
            ascending:
              true,
          },
        );

      if (queryError) {
        setError(true);
        setLoading(false);
        return;
      }

      setRows(
        (data ??
          []) as CityActivityRow[],
      );
      setError(false);
      setLoading(false);
    }, []);

  useEffect(() => {
    void refresh();

    const supabase =
      createClient();

    /*
     * General City Activity is stored in portal_presence_events.
     *
     * character_presence changes provide an immediate signal that
     * somebody has entered or left the active portal presence system,
     * so refresh the City Activity feed immediately.
     *
     * The 20-second timer remains as a fallback/resync.
     */
    const channel =
      supabase
        .channel(
          "portal-compact-city-activity",
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "character_presence",
          },
          () => {
            void refresh();
          },
        )
        .subscribe();

    const timer =
      window.setInterval(
        () => {
          void refresh();
        },
        REFRESH_INTERVAL_MS,
      );

    const resync = () => {
      void refresh();
    };

    const handleVisibilityChange =
      () => {
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
      handleVisibilityChange,
    );

    return () => {
      window.clearInterval(
        timer,
      );

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
        handleVisibilityChange,
      );

      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    refresh,
  ]);

  return (
    <section className="max-h-28 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))]/70 px-2.5 py-2 components_portal_compact_city_activity_section">
      <p className="text-[7px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-876a46))] components_portal_compact_city_activity_heading">
        City Activity
      </p>

      <div className="mt-1.5 max-h-20 space-y-0.5 overflow-y-auto overscroll-contain pr-0.5 components_portal_compact_city_activity_list">
        {loading ? (
          <p className="text-[9px] leading-4 text-[rgb(var(--sep-colour-766b5d))]">
            Updating...
          </p>
        ) : error ? (
          <p className="text-[9px] leading-4 text-[rgb(var(--sep-colour-a07068))]">
            Activity unavailable.
          </p>
        ) : rows.length ? (
          rows.map(
            (row) => (
              <p
                key={
                  row.id
                }
                className="truncate text-[9px] leading-4 text-[rgb(var(--sep-colour-ae9c82))] components_portal_compact_city_activity_row"
              >
                <span
                  className="mr-1 text-[rgb(var(--sep-colour-80684b))]"
                  aria-hidden="true"
                >
                  {row.event_type ===
                  "entered"
                    ? "◆"
                    : "◇"}
                </span>

                <span className="text-[rgb(var(--sep-skin-c1))]">
                  {row.first_name}
                </span>

                {row.event_type ===
                "entered"
                  ? " has entered Sepulchria"
                  : " has left Sepulchria"}
              </p>
            ),
          )
        ) : (
          <p className="text-[9px] leading-4 text-[rgb(var(--sep-colour-766b5d))]">
            
          </p>
        )}
      </div>
    </section>
  );
}
