"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { createClient } from "@/lib/supabase/client";

type MissionLiveRow = {
  id: string;
  code_snapshot: string;
  progress: number;
  target_snapshot: number;
  completed_at: string | null;
  claimed_at: string | null;
  counts_toward_milestones: boolean;
};

type MilestoneLiveRow = {
  id: string;
  milestone_key: string;
  target_count_snapshot: number | null;
  is_all_snapshot: boolean;
  claimed_at: string | null;
};

function setText(
  root: HTMLElement,
  selector: string,
  value: string,
) {
  const node =
    root.querySelector<HTMLElement>(selector);

  if (node && node.textContent !== value) {
    node.textContent = value;
  }
}

function setHidden(
  root: HTMLElement,
  selector: string,
  hidden: boolean,
) {
  const node =
    root.querySelector<HTMLElement>(selector);

  if (node && node.hidden !== hidden) {
    node.hidden = hidden;
  }
}

function updateBeads(
  root: HTMLElement,
  progress: number,
  target: number,
) {
  const safeTarget = Math.max(1, target);

  const beads =
    root.querySelectorAll<HTMLElement>(
      "[data-progress-bead]",
    );

  const segments = beads.length;

  const filled = Math.min(
    segments,
    Math.floor(
      (Math.min(progress, safeTarget) / safeTarget) *
        segments,
    ),
  );

  beads.forEach((bead, index) => {
    const active = index < filled;

    bead.classList.toggle(
      "bg-current",
      active,
    );
    bead.classList.toggle(
      "bg-transparent",
      !active,
    );
    bead.classList.toggle(
      "opacity-55",
      !active,
    );
  });
}

export function MissionsLiveSync({
  dayId,
}: {
  dayId: string;
}) {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const previousRef =
    useRef<string>("");

  const sync = useCallback(async () => {
    const { error: refreshError } =
      await supabase.rpc(
        "refresh_my_daily_mission_progress",
      );

    if (refreshError) {
      console.warn(
        "Daily Missions refresh:",
        refreshError.message,
      );
      return;
    }

    const [missionResult, milestoneResult] =
      await Promise.all([
        supabase
          .from("daily_mission_assignments")
          .select(
            "id, code_snapshot, progress, target_snapshot, completed_at, claimed_at, counts_toward_milestones",
          )
          .eq("day_id", dayId)
          .order("sort_order", {
            ascending: true,
          }),
        supabase
          .from("daily_mission_milestone_claims")
          .select(
            "id, milestone_key, target_count_snapshot, is_all_snapshot, claimed_at",
          )
          .eq("day_id", dayId),
      ]);

    if (
      missionResult.error ||
      milestoneResult.error
    ) {
      console.warn(
        "Daily Missions live sync:",
        missionResult.error?.message ??
          milestoneResult.error?.message,
      );
      return;
    }

    const missions =
      (missionResult.data ?? []) as MissionLiveRow[];

    const milestones =
      (milestoneResult.data ?? []) as MilestoneLiveRow[];

    const signature =
      JSON.stringify({
        missions,
        milestones,
      });

    if (previousRef.current === signature) {
      return;
    }

    previousRef.current = signature;

    for (const mission of missions) {
      const root =
        document.querySelector<HTMLElement>(
          `[data-mission-card="${mission.code_snapshot}"]`,
        );

      if (!root) continue;

      const progress = Math.min(
        mission.progress,
        mission.target_snapshot,
      );

      setText(
        root,
        "[data-progress-count]",
        `${progress} / ${mission.target_snapshot}`,
      );

      updateBeads(
        root,
        progress,
        mission.target_snapshot,
      );

      setHidden(
        root,
        "[data-mission-complete]",
        !mission.completed_at,
      );

      setHidden(
        root,
        "[data-mission-excluded]",
        mission.counts_toward_milestones,
      );

      const button =
        root.querySelector<HTMLButtonElement>(
          "[data-mission-claim]",
        );

      if (button) {
        button.disabled =
          !mission.completed_at ||
          Boolean(mission.claimed_at);

        button.textContent =
          mission.claimed_at
            ? "Claimed"
            : mission.completed_at
              ? "Claim"
              : "In Progress";
      }
    }

    const countable = missions.filter(
      (mission) =>
        mission.counts_toward_milestones,
    );

    const completed = countable.filter(
      (mission) =>
        mission.completed_at !== null,
    ).length;

    const total = countable.length;

    const summary =
      document.querySelector<HTMLElement>(
        "[data-mission-summary]",
      );

    if (summary) {
      summary.textContent =
        `${completed} / ${total} missions complete`;
    }

    for (const milestone of milestones) {
      const root =
        document.querySelector<HTMLElement>(
          `[data-milestone-card="${milestone.milestone_key}"]`,
        );

      if (!root) continue;

      const required =
        milestone.is_all_snapshot
          ? total
          : Number(
              milestone.target_count_snapshot ?? 0,
            );

      const safeRequired =
        Math.max(required, 1);

      const progress =
        Math.min(completed, safeRequired);

      setText(
        root,
        "[data-progress-count]",
        `${progress} / ${safeRequired}`,
      );

      updateBeads(
        root,
        progress,
        safeRequired,
      );

      const complete =
        required > 0 &&
        completed >= required;

      const button =
        root.querySelector<HTMLButtonElement>(
          "[data-milestone-claim]",
        );

      if (button) {
        button.disabled =
          !complete ||
          Boolean(milestone.claimed_at);

        button.textContent =
          milestone.claimed_at
            ? "Claimed"
            : complete
              ? "Claim Reward"
              : "In Progress";
      }
    }

    window.dispatchEvent(
      new CustomEvent(
        "sepulchria:missions-live-updated",
      ),
    );
  }, [dayId, supabase]);

  useEffect(() => {
    void sync();

    const timer =
      window.setInterval(
        () => {
          void sync();
        },
        30_000,
      );

    return () =>
      window.clearInterval(timer);
  }, [sync]);

  return null;
}
