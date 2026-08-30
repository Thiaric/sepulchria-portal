import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  claimDailyMilestone,
  claimDailyMission,
} from "./actions";

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
    <span className="text-[11px] text-[rgb(var(--sep-colour-bda67f))]">
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
            className={[
              "h-2.5 min-w-[5px] flex-1 border",
              index < filled
                ? "border-[rgb(var(--sep-colour-a67d47))] bg-[rgb(var(--sep-colour-8f6738))]"
                : "border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-17110d))]",
            ].join(" ")}
          />
        ))}
      </div>

      <span className="shrink-0 font-mono text-[11px] tabular-nums text-[rgb(var(--sep-colour-d3bd97))]">
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
      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/45 pb-5">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8b704e))]">
          Daily activity
        </p>
        <h1 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-e2cda4))]">
          Daily Missions
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--sep-colour-ae9b7d))]">
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
          <p className="text-xs text-[rgb(var(--sep-colour-9e8b70))]">
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
                className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
              >
                <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                  Milestone
                </p>
                <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-dac49a))]">
                  {milestone.name_snapshot}
                </h3>
                <p className="mt-2 min-h-10 text-xs leading-5 text-[rgb(var(--sep-colour-9f9079))]">
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

                <form action={claimDailyMilestone} className="mt-3">
                  <input type="hidden" name="claim_id" value={milestone.id} />
                  <button
                    type="submit"
                    disabled={!complete || milestone.claimed_at !== null}
                    className="w-full border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d9c092))] transition-colors enabled:hover:border-[rgb(var(--sep-colour-a07945))] enabled:hover:bg-[rgb(var(--sep-colour-302116))] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {milestone.claimed_at
                      ? "Claimed"
                      : complete
                        ? "Claim Reward"
                        : "In Progress"}
                  </button>
                </form>
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
                      className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                            {mission.difficulty_snapshot}
                            {!mission.counts_toward_milestones
                              ? " · does not count toward milestones"
                              : ""}
                          </p>
                          <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-dac49a))]">
                            {mission.name_snapshot}
                          </h3>
                        </div>
                        {complete ? (
                          <span className="shrink-0 border border-[rgb(var(--sep-colour-80613b))]/60 px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d7bd8f))]">
                            Complete
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-a3957d))]">
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

                        <form action={claimDailyMission}>
                          <input
                            type="hidden"
                            name="assignment_id"
                            value={mission.id}
                          />
                          <button
                            type="submit"
                            disabled={!complete || mission.claimed_at !== null}
                            className="border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d9c092))] transition-colors enabled:hover:border-[rgb(var(--sep-colour-a07945))] enabled:hover:bg-[rgb(var(--sep-colour-302116))] disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {mission.claimed_at
                              ? "Claimed"
                              : complete
                                ? "Claim"
                                : "In Progress"}
                          </button>
                        </form>
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
