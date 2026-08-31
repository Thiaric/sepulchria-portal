import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  claimDailyMilestone,
  claimDailyMission,
} from "./actions";
import {
  MissionsLiveSync,
} from "@/components/missions/missions-live-sync";
import {
  DailyRewardClaim,
} from "@/components/missions/daily-reward-claim";

export const dynamic = "force-dynamic";

type MissionRow = {
  id: string;
  code_snapshot: string;
  family_snapshot: string;
  name_snapshot: string;
  description_snapshot: string;
  target_snapshot: number;
  criteria_snapshot: Record<string, unknown>;
  difficulty_snapshot: string;
  reward_remnants_snapshot: number;
  reward_item_name_snapshot: string | null;
  reward_item_quantity_snapshot: number;
  counts_toward_milestones: boolean;
  progress: number;
  completed_at: string | null;
  claimed_at: string | null;
  sort_order: number;
};

type MilestoneRow = {
  id: string;
  milestone_key: string;
  name_snapshot: string;
  description_snapshot: string;
  target_count_snapshot: number | null;
  is_all_snapshot: boolean;
  reward_remnants_snapshot: number;
  reward_item_name_snapshot: string | null;
  reward_item_quantity_snapshot: number;
  claimed_at: string | null;
};

function Reward({
  remnants,
  itemName,
  itemQuantity,
}: {
  remnants: number;
  itemName: string | null;
  itemQuantity: number;
}) {
  const parts: string[] = [];
  if (remnants > 0) parts.push(`${remnants} Remnants`);
  if (itemName && itemQuantity > 0) {
    parts.push(`${itemQuantity} × ${itemName}`);
  }

  return (
    <span className="text-sm text-[rgb(var(--sep-colour-c0af95))]">
      {parts.length ? parts.join(" · ") : "No reward configured"}
    </span>
  );
}

function ProgressBeads({
  progress,
  target,
}: {
  progress: number;
  target: number;
}) {
  const safeTarget = Math.max(1, target);
  const segments = Math.min(safeTarget, 20);
  const filled = Math.min(
    segments,
    Math.floor((Math.min(progress, safeTarget) / safeTarget) * segments),
  );

  return (
    <div className="mt-3 flex items-center gap-3">
      <div
        className="flex min-w-0 flex-1 gap-[3px]"
        aria-label={`${Math.min(progress, safeTarget)} of ${safeTarget}`}
      >
        {Array.from({ length: segments }).map((_, index) => (
          <span
            key={index}
            data-progress-bead
            className={[
              "h-2.5 min-w-[5px] flex-1 border text-[rgb(var(--sep-colour-e6cfaa))]",
              index < filled
                ? "border-current bg-current"
                : "border-current bg-transparent opacity-55",
            ].join(" ")}
          />
        ))}
      </div>

      <span
        data-progress-count
        className="shrink-0 font-mono text-[11px] tabular-nums text-[rgb(var(--sep-colour-d3bd97))]"
      >
        {Math.min(progress, safeTarget)} / {safeTarget}
      </span>
    </div>
  );
}

export default async function MissionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: character } = await supabase
    .from("characters")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!character) redirect("/character/create");
  if (character.status !== "approved") redirect("/character");

  const { data: dayId, error: dayError } = await supabase.rpc(
    "ensure_my_daily_mission_day",
  );
  if (dayError) throw new Error(dayError.message);

  const { error: refreshError } = await supabase.rpc(
    "refresh_my_daily_mission_progress",
  );
  if (refreshError) throw new Error(refreshError.message);

  const [missionResult, milestoneResult] = await Promise.all([
    supabase
      .from("daily_mission_assignments")
      .select(
        "id, code_snapshot, family_snapshot, name_snapshot, description_snapshot, target_snapshot, criteria_snapshot, difficulty_snapshot, reward_remnants_snapshot, reward_item_name_snapshot, reward_item_quantity_snapshot, counts_toward_milestones, progress, completed_at, claimed_at, sort_order",
      )
      .eq("day_id", dayId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("daily_mission_milestone_claims")
      .select(
        "id, milestone_key, name_snapshot, description_snapshot, target_count_snapshot, is_all_snapshot, reward_remnants_snapshot, reward_item_name_snapshot, reward_item_quantity_snapshot, claimed_at",
      )
      .eq("day_id", dayId),
  ]);

  if (missionResult.error) throw new Error(missionResult.error.message);
  if (milestoneResult.error) throw new Error(milestoneResult.error.message);

  const missions = (missionResult.data ?? []) as MissionRow[];
  const milestones = (milestoneResult.data ?? []) as MilestoneRow[];

  const countableMissions = missions.filter(
    (mission) => mission.counts_toward_milestones,
  );
  const completedCount = countableMissions.filter(
    (mission) => mission.completed_at !== null,
  ).length;
  const countableTotal = countableMissions.length;

  const familyOrder = Array.from(
    new Set(missions.map((mission) => mission.family_snapshot)),
  );

  const sortedMilestones = [...milestones].sort((a, b) => {
    const order = ["complete-3", "complete-5", "complete-10", "complete-all"];
    return order.indexOf(a.milestone_key) - order.indexOf(b.milestone_key);
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-7 lg:px-9">
      <MissionsLiveSync dayId={String(dayId)} />
      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/45 pb-5">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
          Daily activity
        </p>
        <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">
          Daily Missions
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]">
          Complete as many as you wish before midnight UTC. Rewards must be
          claimed here before the daily reset.
        </p>
      </header>

      <section id="daily-milestones" className="mt-7">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-876a46))]">
              Daily Milestones
            </p>
            <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dcc59a))]">
              A Day&apos;s Progress
            </h2>
          </div>
          <p
            data-mission-summary
            className="text-sm text-[rgb(var(--sep-colour-c0af95))]"
          >
            {completedCount} / {countableTotal} missions complete
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {sortedMilestones.map((milestone) => {
            const required = milestone.is_all_snapshot
              ? countableTotal
              : Number(milestone.target_count_snapshot ?? 0);
            const complete = required > 0 && completedCount >= required;

            return (
              <article
                key={milestone.id}
                data-milestone-card={milestone.milestone_key}
                data-claim-ready={
                  complete &&
                  milestone.claimed_at === null
                    ? "true"
                    : "false"
                }
                className={[
                  "border p-4 transition-all duration-200",
                  complete &&
                  milestone.claimed_at === null
                    ? "border-[rgb(var(--sep-colour-b98c50))] bg-[rgb(var(--sep-colour-21170f))] shadow-[0_0_18px_rgba(var(--sep-rgb-185-140-80),0.16)]"
                    : "border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]",
                ].join(" ")}
              >
                <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                  Milestone
                </p>
                <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-cbb28a))]">
                  {milestone.name_snapshot}
                </h3>
                <p className="mt-2 min-h-10 text-sm leading-6 text-[rgb(var(--sep-colour-c0af95))]">
                  {milestone.description_snapshot}
                </p>

                <ProgressBeads
                  progress={completedCount}
                  target={Math.max(required, 1)}
                />

                <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-3">
                  <Reward
                    remnants={milestone.reward_remnants_snapshot}
                    itemName={milestone.reward_item_name_snapshot}
                    itemQuantity={milestone.reward_item_quantity_snapshot}
                  />
                </div>

                <DailyRewardClaim
                  action={claimDailyMilestone}
                  claimField="claim_id"
                  claimId={milestone.id}
                  complete={complete}
                  claimed={milestone.claimed_at !== null}
                  remnants={milestone.reward_remnants_snapshot}
                  itemName={milestone.reward_item_name_snapshot}
                  itemQuantity={milestone.reward_item_quantity_snapshot}
                />
              </article>
            );
          })}
        </div>
      </section>

      <section id="daily-missions" className="mt-9">
        {familyOrder.map((family) => (
          <div
            key={family}
            id={`family-${family.toLowerCase().replaceAll(" ", "-")}`}
            className="mb-8"
          >
            <div className="mb-3 border-b border-[rgb(var(--sep-colour-59432c))]/35 pb-2">
              <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-876a46))]">
                Daily Missions
              </p>
              <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dcc59a))]">
                {family}
              </h2>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {missions
                .filter((mission) => mission.family_snapshot === family)
                .map((mission) => {
                  const complete = mission.completed_at !== null;
                  const locationName =
                    mission.code_snapshot === "gather-specific"
                      ? String(mission.criteria_snapshot.location_name ?? "")
                      : "";

                  return (
                    <article
                      key={mission.id}
                      id={`mission-${mission.code_snapshot}`}
                      data-mission-card={mission.code_snapshot}
                      data-claim-ready={
                        complete &&
                        mission.claimed_at === null
                          ? "true"
                          : "false"
                      }
                      className={[
                        "scroll-mt-6 border p-4 transition-all duration-200",
                        complete &&
                        mission.claimed_at === null
                          ? "border-[rgb(var(--sep-colour-b98c50))] bg-[rgb(var(--sep-colour-21170f))] shadow-[0_0_18px_rgba(var(--sep-rgb-185-140-80),0.16)]"
                          : "border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                            {mission.difficulty_snapshot}
                          </p>
                          <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-cbb28a))]">
                            {mission.name_snapshot}
                          </h3>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span
                            data-mission-excluded
                            hidden={mission.counts_toward_milestones}
                            className="border border-red-700/70 bg-red-950/45 px-2.5 py-1 text-[8px] uppercase tracking-[0.14em] text-red-300"
                          >
                            Does not count toward milestones
                          </span>

                          <span
                            data-mission-complete
                            hidden={!complete}
                            className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]"
                          >
                            Complete
                          </span>
                        </div>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-c0af95))]">
                        {mission.description_snapshot}
                        {locationName ? ` Today: ${locationName}.` : ""}
                      </p>

                      <ProgressBeads
                        progress={mission.progress}
                        target={mission.target_snapshot}
                      />

                      <div className="mt-3 flex items-center justify-between gap-4 border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-3">
                        <Reward
                          remnants={mission.reward_remnants_snapshot}
                          itemName={mission.reward_item_name_snapshot}
                          itemQuantity={mission.reward_item_quantity_snapshot}
                        />

                        <DailyRewardClaim
                          action={claimDailyMission}
                          claimField="assignment_id"
                          claimId={mission.id}
                          complete={complete}
                          claimed={mission.claimed_at !== null}
                          remnants={mission.reward_remnants_snapshot}
                          itemName={mission.reward_item_name_snapshot}
                          itemQuantity={mission.reward_item_quantity_snapshot}
                          compact
                        />
                      </div>
                    </article>
                  );
                })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
