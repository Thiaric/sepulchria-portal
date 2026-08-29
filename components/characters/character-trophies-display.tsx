import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type TrophyDefinition = {
  id: string;
  trophy_key: string;
  category: string;
  name: string;
  description: string;
  metric_key: string;
  threshold: number | string;
  sort_order: number;
  icon_url: string | null;
};

type EarnedTrophy = {
  trophy_id: string;
  progress_value: number | string | null;
  earned_at: string;
};

type MetricRow = {
  metric_key: string;
  metric_value: number | string | null;
};

type TrophyWithState = TrophyDefinition & {
  earned: EarnedTrophy | null;
  currentValue: number;
  thresholdValue: number;
};

function asNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }

  const hours = seconds / 3600;

  if (hours < 10 && !Number.isInteger(hours)) {
    return `${hours.toFixed(1)}h`;
  }

  return `${Math.floor(hours)}h`;
}

function formatMetricValue(
  metricKey: string,
  value: number,
) {
  if (metricKey === "active_portal_seconds") {
    return formatDuration(value);
  }

  if (
    metricKey === "remnants_lifetime_earned" ||
    metricKey === "remnants_lifetime_spent"
  ) {
    return `${formatNumber(value)} Remnants`;
  }

  if (metricKey === "membership_days") {
    return `${formatNumber(value)} days`;
  }

  if (metricKey === "expertise_total") {
    return `${formatNumber(value)} Expertise`;
  }

  return formatNumber(value);
}

function formatProgress(
  metricKey: string,
  current: number,
  threshold: number,
) {
  if (metricKey === "active_portal_seconds") {
    return `${formatDuration(current)} / ${formatDuration(threshold)}`;
  }

  if (
    metricKey === "remnants_lifetime_earned" ||
    metricKey === "remnants_lifetime_spent"
  ) {
    return `${formatNumber(current)} / ${formatNumber(threshold)} Remnants`;
  }

  if (metricKey === "membership_days") {
    return `${formatNumber(current)} / ${formatNumber(threshold)} days`;
  }

  if (metricKey === "expertise_total") {
    return `${formatNumber(current)} / ${formatNumber(threshold)} Expertise`;
  }

  return `${formatNumber(current)} / ${formatNumber(threshold)}`;
}

function formatEarnedDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Earned";
  }

  return `Earned ${new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)}`;
}

function groupByCategory(trophies: TrophyWithState[]) {
  const groups: {
    category: string;
    trophies: TrophyWithState[];
  }[] = [];

  for (const trophy of trophies) {
    const latest = groups.at(-1);

    if (latest?.category === trophy.category) {
      latest.trophies.push(trophy);
      continue;
    }

    groups.push({
      category: trophy.category,
      trophies: [trophy],
    });
  }

  return groups;
}

export async function CharacterTrophiesDisplay({
  characterId,
  own = false,
}: {
  characterId: string;
  own?: boolean;
}) {
  const admin = createAdminClient();

  const [
    definitionsResult,
    earnedResult,
  ] = await Promise.all([
    admin
      .from("trophy_definitions")
      .select(
        "id, trophy_key, category, name, description, metric_key, threshold, sort_order, icon_url",
      )
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      }),
    admin
      .from("character_trophies")
      .select(
        "trophy_id, progress_value, earned_at",
      )
      .eq("character_id", characterId),
  ]);

  if (definitionsResult.error) {
    throw new Error(
      `Unable to load Trophy definitions: ${definitionsResult.error.message}`,
    );
  }

  if (earnedResult.error) {
    throw new Error(
      `Unable to load character Trophies: ${earnedResult.error.message}`,
    );
  }

  const definitions =
    (definitionsResult.data ?? []) as TrophyDefinition[];

  const earnedRows =
    (earnedResult.data ?? []) as EarnedTrophy[];

  const earnedById = new Map(
    earnedRows.map((entry) => [
      entry.trophy_id,
      entry,
    ]),
  );

  const metricValues = new Map<string, number>();

  if (own) {
    const metricsResult = await admin.rpc(
      "get_character_trophy_metrics",
      {
        p_character_id: characterId,
      },
    );

    if (metricsResult.error) {
      throw new Error(
        `Unable to load Trophy progress: ${metricsResult.error.message}`,
      );
    }

    for (
      const metric of
      (metricsResult.data ?? []) as MetricRow[]
    ) {
      metricValues.set(
        metric.metric_key,
        asNumber(metric.metric_value),
      );
    }
  }

  const allWithState: TrophyWithState[] =
    definitions.map((definition) => {
      const earned =
        earnedById.get(definition.id) ??
        null;

      const thresholdValue =
        asNumber(definition.threshold);

      const currentValue = earned
        ? Math.max(
            asNumber(earned.progress_value),
            thresholdValue,
          )
        : metricValues.get(
            definition.metric_key,
          ) ?? 0;

      return {
        ...definition,
        earned,
        currentValue,
        thresholdValue,
      };
    });

  const visibleTrophies = own
    ? allWithState
    : allWithState.filter(
        (trophy) => trophy.earned,
      );

  const earnedCount = allWithState.filter(
    (trophy) => trophy.earned,
  ).length;

  const groups =
    groupByCategory(visibleTrophies);

  return (
    <section className="bg-[rgb(var(--sep-colour-120d0a))]">
      <header className="bg-[rgb(var(--sep-colour-17110d))] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-846b4a))]">
              Achievements
            </p>

            <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-e4cfaa))]">
              Trophies
            </h2>

            <p className="mt-2 max-w-2xl text-[11px] leading-5 text-[rgb(var(--sep-colour-958772))]">
              {own
                ? "Permanent milestones earned through your life and activity in Sepulchria."
                : "Permanent milestones this character has earned in Sepulchria."}
            </p>
          </div>

          <div className="bg-[rgb(var(--sep-colour-0e0a08))] px-4 py-2 text-right">
            <p className="text-[7px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-776449))]">
              Earned
            </p>

            <p className="mt-0.5 font-serif text-lg text-[rgb(var(--sep-colour-d8bd8c))]">
              {own
                ? `${earnedCount} / ${definitions.length}`
                : earnedCount}
            </p>
          </div>
        </div>
      </header>

      {groups.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="font-serif text-lg text-[rgb(var(--sep-colour-a99472))]">
            No Trophies earned yet.
          </p>

          <p className="mt-2 text-[11px] text-[rgb(var(--sep-colour-746958))]">
            New milestones will appear here as they are achieved.
          </p>
        </div>
      ) : (
        <div className="space-y-5 p-3 sm:p-4">
          {groups.map((group) => {
            const categoryEarned =
              group.trophies.filter(
                (trophy) => trophy.earned,
              ).length;

            return (
              <section
                key={group.category}
                className="bg-[rgb(var(--sep-colour-15100d))]"
              >
                <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
                  <h3 className="font-serif text-base text-[rgb(var(--sep-colour-d1b583))]">
                    {group.category}
                  </h3>

                  <span className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-78684f))]">
                    {categoryEarned}
                    {own
                      ? ` / ${group.trophies.length}`
                      : " earned"}
                  </span>
                </div>

                <div className="grid gap-2 p-2.5 sm:grid-cols-2 sm:p-3 xl:grid-cols-3">
                  {group.trophies.map(
                    (trophy) => {
                      const earned =
                        trophy.earned !== null;

                      const percentage =
                        trophy.thresholdValue > 0
                          ? Math.min(
                              100,
                              Math.max(
                                0,
                                (trophy.currentValue /
                                  trophy.thresholdValue) *
                                  100,
                              ),
                            )
                          : earned
                            ? 100
                            : 0;

                      return (
                        <article
                          key={trophy.id}
                          data-sep-interactive-surface="card"
                          className={`relative overflow-hidden p-3 transition-transform duration-200 ${
                            earned
                              ? "bg-[rgb(var(--sep-colour-21170f))]"
                              : "bg-[rgb(var(--sep-colour-100c09))] opacity-75"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 gap-3">
                              <div
                                aria-hidden="true"
                                className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden ${
                                  earned
                                    ? "bg-[rgb(var(--sep-colour-100c09))]"
                                    : "bg-[rgb(var(--sep-colour-0b0807))]"
                                }`}
                              >
                                {trophy.icon_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={trophy.icon_url}
                                    alt=""
                                    className="h-full w-full object-contain p-1"
                                  />
                                ) : (
                                  <span className="font-serif text-lg text-[rgb(var(--sep-colour-685a49))]">
                                    ?
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0">
                              <p
                                className={`font-serif text-[15px] leading-5 ${
                                  earned
                                    ? "text-[rgb(var(--sep-colour-e0c796))]"
                                    : "text-[rgb(var(--sep-colour-8f806b))]"
                                }`}
                              >
                                {trophy.name}
                              </p>

                              <p className="mt-1 text-[10px] leading-4 text-[rgb(var(--sep-colour-8f8270))]">
                                {trophy.description}
                              </p>
                              </div>
                            </div>

                            <span
                              className={`shrink-0 px-2 py-1 text-[7px] uppercase tracking-[0.14em] ${
                                earned
                                  ? "bg-[rgb(var(--sep-colour-2a1d12))] text-[rgb(var(--sep-colour-d1ae72))]"
                                  : "bg-[rgb(var(--sep-colour-0b0807))] text-[rgb(var(--sep-colour-6f6559))]"
                              }`}
                            >
                              {earned
                                ? "Earned"
                                : "Locked"}
                            </span>
                          </div>

                          {own ? (
                            <div className="mt-3">
                              <div className="flex items-center justify-between gap-3 text-[8px]">
                                <span className="uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-6f6250))]">
                                  Progress
                                </span>

                                <span
                                  className={
                                    earned
                                      ? "text-[rgb(var(--sep-colour-bda170))]"
                                      : "text-[rgb(var(--sep-colour-827563))]"
                                  }
                                >
                                  {earned
                                    ? "Completed"
                                    : formatProgress(
                                        trophy.metric_key,
                                        trophy.currentValue,
                                        trophy.thresholdValue,
                                      )}
                                </span>
                              </div>

                              <div className="mt-1.5 h-1 overflow-hidden bg-[rgb(var(--sep-colour-090706))]">
                                <div
                                  className="h-full bg-[rgb(var(--sep-colour-9b7545))]"
                                  style={{
                                    width: `${earned ? 100 : percentage}%`,
                                  }}
                                />
                              </div>

                              {earned &&
                              trophy.earned ? (
                                <p className="mt-2 text-[8px] text-[rgb(var(--sep-colour-6f6456))]">
                                  {formatEarnedDate(
                                    trophy.earned.earned_at,
                                  )}
                                </p>
                              ) : (
                                <p className="mt-2 text-[8px] text-[rgb(var(--sep-colour-655c50))]">
                                  Current:{" "}
                                  {formatMetricValue(
                                    trophy.metric_key,
                                    trophy.currentValue,
                                  )}
                                </p>
                              )}
                            </div>
                          ) : trophy.earned ? (
                            <p className="mt-3 text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-6f6456))]">
                              {formatEarnedDate(
                                trophy.earned.earned_at,
                              )}
                            </p>
                          ) : null}
                        </article>
                      );
                    },
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
