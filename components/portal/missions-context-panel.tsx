"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type MissionJumpRow = {
  id: string;
  code_snapshot: string;
  family_snapshot: string;
  name_snapshot: string;
  completed_at: string | null;
  claimed_at: string | null;
  sort_order: number;
};

export function MissionsContextPanel() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [missions, setMissions] =
    useState<MissionJumpRow[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const loadMissions = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMissions([]);
      setLoading(false);
      return;
    }

    const { data: character } = await supabase
      .from("characters")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!character || character.status !== "approved") {
      setMissions([]);
      setLoading(false);
      return;
    }

    const {
      data: dayId,
      error: dayError,
    } = await supabase.rpc(
      "ensure_my_daily_mission_day",
    );

    if (dayError || !dayId) {
      console.error(
        "Unable to load Daily Missions context:",
        dayError?.message,
      );
      setMissions([]);
      setLoading(false);
      return;
    }

    await supabase.rpc(
      "refresh_my_daily_mission_progress",
    );

    const {
      data,
      error,
    } = await supabase
      .from("daily_mission_assignments")
      .select(
        "id, code_snapshot, family_snapshot, name_snapshot, completed_at, claimed_at, sort_order",
      )
      .eq("day_id", dayId)
      .order("sort_order", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Unable to load Daily Missions context:",
        error.message,
      );
      setMissions([]);
    } else {
      setMissions(
        (data ?? []) as MissionJumpRow[],
      );
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadMissions();

    function handleFocus() {
      void loadMissions();
    }

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void loadMissions();
      }
    }

    function handleMissionStateChanged() {
      void loadMissions();
    }

    window.addEventListener(
      "focus",
      handleFocus,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    window.addEventListener(
      "sepulchria:notifications-changed",
      handleMissionStateChanged,
    );

    const refreshInterval =
      window.setInterval(() => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void loadMissions();
        }
      }, 5_000);

    return () => {
      window.clearInterval(
        refreshInterval,
      );

      window.removeEventListener(
        "focus",
        handleFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );

      window.removeEventListener(
        "sepulchria:notifications-changed",
        handleMissionStateChanged,
      );
    };
  }, [loadMissions]);

  const query =
    search
      .trim()
      .toLocaleLowerCase();

  const visibleMissions =
    missions.filter((mission) => {
      if (!query) {
        return true;
      }

      const statusSearch =
        mission.claimed_at
          ? "claimed"
          : mission.completed_at
            ? "ready reward ready"
            : "";

      return (
        `${mission.family_snapshot} ${mission.name_snapshot} ${statusSearch}`
          .toLocaleLowerCase()
          .includes(query)
      );
    });

  function jumpToMission(
    event: React.MouseEvent<HTMLAnchorElement>,
    code: string,
  ) {
    event.preventDefault();

    const id = `mission-${code}`;
    const target =
      document.getElementById(id);

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      window.history.replaceState(
        null,
        "",
        `#${id}`,
      );
      return;
    }

    window.location.hash = id;
  }

  return (
    <div className="flex h-full min-h-0 flex-col components_portal_missions_context_panel_div_container">
      <div className="components_portal_missions_context_panel_div_today_apos_s_missions">
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-a88658))] components_portal_missions_context_panel_p_today_apos_s_missions">
          Daily Missions
        </p>

        <h2 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-d6bd91))] components_portal_missions_context_panel_h2_today_apos_s_missions">
          Today&apos;s Missions
        </h2>
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) =>
          setSearch(
            event.target.value,
          )
        }
        placeholder="Search missions..."
        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-655c50))] focus:border-[rgb(var(--sep-colour-8a673f))] components_portal_missions_context_panel_input_search_missions"
      />

      <div className="my-4 h-px bg-[rgb(var(--sep-colour-59432c))]/35 components_portal_missions_context_panel_div_container_2" />

      <p className="mb-2 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))] components_portal_missions_context_panel_p_text">
        Missions · {visibleMissions.length}
      </p>

      <div
        data-portal-scroll
        className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 components_portal_missions_context_panel_div_container_3"
      >
        {loading ? (
          <p className="px-2 py-3 text-xs text-[rgb(var(--sep-colour-8f826f))] components_portal_missions_context_panel_p_text_2">
            Loading missions...
          </p>
        ) : null}

        {!loading &&
        visibleMissions.length === 0 ? (
          <p className="px-2 py-3 text-xs text-[rgb(var(--sep-colour-8f826f))] components_portal_missions_context_panel_p_text_3">
            No matching missions.
          </p>
        ) : null}

        {visibleMissions.map(
          (mission) => {
            const complete =
              mission.completed_at !== null;

            const claimed =
              mission.claimed_at !== null;

            return (
              <Link
                key={mission.id}
                href={`/missions#mission-${mission.code_snapshot}`}
                onClick={(event) =>
                  jumpToMission(
                    event,
                    mission.code_snapshot,
                  )
                }
                className="block border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-[rgb(var(--sep-colour-cbb28a))] transition-colors hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))] "
              >
                <span className="flex items-center justify-between gap-2 components_portal_missions_context_panel_span_text">
                  <span className="block min-w-0 components_portal_missions_context_panel_span_text_2">
                    <span className="block text-[7px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-756550))] components_portal_missions_context_panel_span_text_3">
                      {mission.family_snapshot}
                    </span>

                    <span className="mt-0.5 block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] components_portal_missions_context_panel_span_text_4">
                      {mission.name_snapshot}
                    </span>
                  </span>

                  {claimed ? (
                    <span className="shrink-0 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-766b59))] components_portal_missions_context_panel_span_text_5">
                      Claimed
                    </span>
                  ) : complete ? (
                    <span className="shrink-0 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-bb9764))] components_portal_missions_context_panel_span_text_6">
                      Reward Ready
                    </span>
                  ) : null}
                </span>
              </Link>
            );
          },
        )}
      </div>
    </div>
  );
}
