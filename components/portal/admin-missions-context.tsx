"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type MissionLink = {
  id: string;
  code: string;
  family: string;
  name: string;
  sort_order: number;
};

type MilestoneLink = {
  milestone_key: string;
  name: string;
  sort_order: number;
};

export function AdminMissionsContext() {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [missions, setMissions] =
    useState<MissionLink[]>([]);

  const [milestones, setMilestones] =
    useState<MilestoneLink[]>([]);

  const [search, setSearch] =
    useState("");

  const load = useCallback(async () => {
    const [missionResult, milestoneResult] =
      await Promise.all([
        supabase
          .from("daily_mission_definitions")
          .select("id, code, family, name, sort_order")
          .order("sort_order", { ascending: true }),
        supabase
          .from("daily_mission_milestone_definitions")
          .select("milestone_key, name, sort_order")
          .order("sort_order", { ascending: true }),
      ]);

    if (!missionResult.error) {
      setMissions(
        (missionResult.data ?? []) as MissionLink[],
      );
    }

    if (!milestoneResult.error) {
      setMilestones(
        (milestoneResult.data ?? []) as MilestoneLink[],
      );
    }
  }, [supabase]);

  useEffect(() => {
    void load();

    const handleChanged = () => {
      void load();
    };

    window.addEventListener(
      "sepulchria:admin-data-changed",
      handleChanged,
    );

    return () => {
      window.removeEventListener(
        "sepulchria:admin-data-changed",
        handleChanged,
      );
    };
  }, [load]);

  const query = search.trim().toLocaleLowerCase();

  const visibleMissions = missions.filter(
    (mission) =>
      !query ||
      `${mission.family} ${mission.name}`
        .toLocaleLowerCase()
        .includes(query),
  );

  const visibleMilestones = milestones.filter(
    (milestone) =>
      !query ||
      milestone.name
        .toLocaleLowerCase()
        .includes(query),
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div>
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-a88658))]">
          Mission management
        </p>

        <h2 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-d6bd91))]">
          Daily Missions
        </h2>
      </div>

      <div className="mt-4 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3">
        <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Daily rules
        </p>

        <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-948672))]">
          Reset: midnight UTC. Unclaimed rewards expire.
          Mission rewards never create Daily Mission progress.
        </p>
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) =>
          setSearch(event.target.value)
        }
        placeholder="Search missions..."
        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-655c50))] focus:border-[rgb(var(--sep-colour-8a673f))]"
      />

      <div className="my-4 h-px bg-[rgb(var(--sep-colour-59432c))]/35" />

      <p className="mb-2 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))]">
        Missions · {visibleMissions.length}
      </p>

      <div
        data-portal-scroll
        className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1"
      >
        {visibleMissions.map((mission) => (
          <Link
            key={mission.id}
            href={`/admin/missions#mission-${mission.code}`}
            className="block border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[rgb(var(--sep-colour-a7977f))] transition-colors hover:border-[rgb(var(--sep-colour-80613b))]/50 hover:bg-[rgb(var(--sep-colour-17110d))] hover:text-[rgb(var(--sep-colour-d8c19a))]"
          >
            <span className="block text-[7px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-735f45))]">
              {mission.family}
            </span>

            <span className="mt-0.5 block truncate font-serif text-[13px]">
              {mission.name}
            </span>
          </Link>
        ))}

        {visibleMilestones.length > 0 ? (
          <>
            <div className="my-3 h-px bg-[rgb(var(--sep-colour-59432c))]/35" />

            <p className="mb-2 px-1 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))]">
              Daily Milestones
            </p>

            {visibleMilestones.map((milestone) => (
              <Link
                key={milestone.milestone_key}
                href={`/admin/missions#milestone-${milestone.milestone_key}`}
                className="block border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[rgb(var(--sep-colour-a7977f))] transition-colors hover:border-[rgb(var(--sep-colour-80613b))]/50 hover:bg-[rgb(var(--sep-colour-17110d))] hover:text-[rgb(var(--sep-colour-d8c19a))]"
              >
                <span className="block text-[7px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-735f45))]">
                  Milestone
                </span>

                <span className="mt-0.5 block truncate font-serif text-[13px]">
                  {milestone.name}
                </span>
              </Link>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}
