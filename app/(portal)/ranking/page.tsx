import Link from "next/link";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

type Props = {
  searchParams?: Promise<{
    board?: string;
    embedded?: string;
  }>;
};

type CharacterRow = {
  id: string;
  user_id: string | null;
  display_name: string | null;
  public_slug: string;
};

type MetricRow = {
  metric_key: string;
  metric_value:
    | number
    | string
    | null;
};

type RankingCharacter =
  CharacterRow & {
    metrics: Map<string, number>;
    accountCreatedAt: string | null;
    marketActivity: number;
    breezeDays: number;
    premiumAcquisitions: number;
  };

type BoardDefinition = {
  key: string;
  label: string;
  eyebrow: string;
  description: string;
  metricKeys?: string[];
  hiddenValue?: boolean;
  valueLabel?: string;
  veteran?: boolean;
  directMetric?:
    | "market"
    | "breeze"
    | "premium";
};

const boards: BoardDefinition[] = [
  {
    key: "expertise",
    label: "Most Experienced",
    eyebrow: "Expertise",
    description:
      "Those who have accumulated the greatest total Expertise.",
    metricKeys: ["expertise_total"],
    valueLabel: "Expertise",
  },
  {
    key: "veterans",
    label: "Veterans",
    eyebrow: "Standing",
    description:
      "The longest-standing players of Sepulchria, ordered by account registration.",
    veteran: true,
  },
  {
    key: "earners",
    label: "Top Earners",
    eyebrow: "Economy",
    description:
      "Those who have earned the most Remnants over their lifetime.",
    metricKeys: [
      "remnants_lifetime_earned",
    ],
    hiddenValue: true,
  },
  {
    key: "spenders",
    label: "Biggest Spenders",
    eyebrow: "Economy",
    description:
      "Those who have spent the most Remnants over their lifetime.",
    metricKeys: [
      "remnants_lifetime_spent",
    ],
    hiddenValue: true,
  },
  {
    key: "collectors",
    label: "Collectors",
    eyebrow: "Inventory",
    description:
      "Those who have owned the widest variety of Item types over their lifetime.",
    metricKeys: [
      "inventory_item_types_ever_owned",
      "item_types_ever_owned",
      "inventory_types_ever_owned",
      "distinct_items_ever_owned",
    ],
    valueLabel: "Item types",
  },
  {
    key: "shapes",
    label: "Shape Masters",
    eyebrow: "Warping",
    description:
      "Those who have accumulated the greatest number of Shapes.",
    metricKeys: [
      "shapes_owned",
      "shapes_known",
      "shape_count",
    ],
    valueLabel: "Shapes",
  },
  {
    key: "feats",
    label: "Feat Masters",
    eyebrow: "Feats",
    description:
      "Those who have acquired the greatest number of Feats.",
    metricKeys: [
      "feats_owned",
      "feats_known",
      "feat_count",
    ],
    valueLabel: "Feats",
  },
  {
    key: "recipes",
    label: "Recipe Masters",
    eyebrow: "Crafting",
    description:
      "Those who know the greatest number of crafting Recipes.",
    metricKeys: [
      "recipes_known",
      "recipe_count",
      "known_recipes",
    ],
    valueLabel: "Recipes",
  },
  {
    key: "gathering",
    label: "Gatherers",
    eyebrow: "Gathering",
    description:
      "Those who have made the greatest number of Gathering attempts across Sepulchria.",
    metricKeys: [
      "gathering_attempts_total",
    ],
    valueLabel: "Attempts",
  },
  {
    key: "market",
    label: "Market Regulars",
    eyebrow: "Market",
    description:
      "Those with the greatest lifetime Market activity.",
    directMetric: "market",
    valueLabel: "Transactions",
  },
  {
    key: "odd-jobs",
    label: "Odd Job Workers",
    eyebrow: "Work",
    description:
      "Those who have completed the greatest number of Odd Jobs.",
    metricKeys: [
      "odd_jobs_completed",
      "jobs_completed",
      "odd_job_completions",
    ],
    valueLabel: "Completed",
  },
  {
    key: "gamblers",
    label: "Gamblers",
    eyebrow: "House of Chances",
    description:
      "Those who have played at the House of Chances most often.",
    metricKeys: [
      "chances_plays",
      "house_of_chances_plays",
      "chance_plays",
    ],
    valueLabel: "Plays",
  },
  {
    key: "luckiest",
    label: "Luckiest",
    eyebrow: "House of Chances",
    description:
      "Those with the greatest number of House of Chances wins.",
    metricKeys: [
      "chances_wins",
      "house_of_chances_wins",
      "chance_wins",
    ],
    valueLabel: "Wins",
  },
  {
    key: "breeze",
    label: "Breeze Residents",
    eyebrow: "The Breeze",
    description:
      "Those who have rented rooms at The Breeze for the greatest total number of days.",
    directMetric: "breeze",
    valueLabel: "Days",
  },
  {
    key: "forum",
    label: "Forum Contributors",
    eyebrow: "Forum",
    description:
      "Those who have contributed the greatest number of Forum posts.",
    metricKeys: [
      "forum_posts",
      "forum_posts_total",
      "forum_messages_sent",
    ],
    valueLabel: "Posts",
  },
  {
    key: "correspondents",
    label: "Correspondents",
    eyebrow: "Messages",
    description:
      "Those who have sent the greatest number of private messages.",
    metricKeys: [
      "private_messages_sent",
      "direct_messages_sent",
      "messages_sent",
    ],
    valueLabel: "Messages",
  },
  {
    key: "chatters",
    label: "Instant Chatters",
    eyebrow: "Conversation",
    description:
      "Those with the greatest lifetime instant-chat activity.",
    metricKeys: [
      "instant_chat_messages",
      "instant_chat_messages_sent",
      "chat_messages_sent",
      "room_messages_sent",
    ],
    valueLabel: "Messages",
  },
  {
    key: "premium",
    label: "Premium Collectors",
    eyebrow: "Premium",
    description:
      "Those who have acquired the greatest number of Premium features and skins.",
    directMetric: "premium",
    valueLabel: "Acquisitions",
  },
];

function asNumber(
  value:
    | number
    | string
    | null
    | undefined,
) {
  const parsed =
    Number(value ?? 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function addToMap(
  map: Map<string, number>,
  key: string | null | undefined,
  amount: number,
) {
  if (!key || !Number.isFinite(amount)) {
    return;
  }

  map.set(
    key,
    (map.get(key) ?? 0) + amount,
  );
}

function findMetric(
  character: RankingCharacter,
  keys: string[] = [],
) {
  for (const key of keys) {
    if (character.metrics.has(key)) {
      return character.metrics.get(key) ?? 0;
    }
  }

  return 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function rankingValue(
  character: RankingCharacter,
  board: BoardDefinition,
) {
  if (board.veteran) {
    if (!character.accountCreatedAt) {
      return Number.POSITIVE_INFINITY;
    }

    return new Date(
      character.accountCreatedAt,
    ).getTime();
  }

  if (board.directMetric === "market") {
    return character.marketActivity;
  }

  if (board.directMetric === "breeze") {
    return character.breezeDays;
  }

  if (board.directMetric === "premium") {
    return character.premiumAcquisitions;
  }

  return findMetric(
    character,
    board.metricKeys,
  );
}

function sortForBoard(
  characters: RankingCharacter[],
  board: BoardDefinition,
) {
  return [...characters]
    .filter((character) => {
      if (board.veteran) {
        return Boolean(
          character.accountCreatedAt,
        );
      }

      return rankingValue(character, board) > 0;
    })
    .sort((a, b) => {
      const aValue =
        rankingValue(a, board);
      const bValue =
        rankingValue(b, board);

      if (board.veteran) {
        return aValue - bValue;
      }

      if (bValue !== aValue) {
        return bValue - aValue;
      }

      return (
        (a.display_name ?? "")
          .localeCompare(
            b.display_name ?? "",
          )
      );
    })
    .slice(0, 100);
}

function rankLabel(index: number) {
  
  return String(index + 1);
}

export const dynamic =
  "force-dynamic";

export default async function RankingPage({
  searchParams,
}: Props) {
  const params =
    (await searchParams) ?? {};

  const board =
    boards.find(
      (entry) =>
        entry.key === params.board,
    ) ??
    boards[0];

  const admin =
    createAdminClient();

  const {
    data: characterData,
    error: characterError,
  } = await admin
    .from("characters")
    .select(
      "id, user_id, display_name, public_slug",
    )
    .eq("status", "approved")
    .eq("is_system", false)
    .order("display_name", {
      ascending: true,
    });

  if (characterError) {
    throw new Error(
      `Unable to load Hall of Renown characters: ${characterError.message}`,
    );
  }

  const characters =
    (characterData ?? []) as CharacterRow[];

  const characterIds =
    characters.map(
      (character) => character.id,
    );

  const userIds =
    characters
      .map(
        (character) =>
          character.user_id,
      )
      .filter(
        (value): value is string =>
          Boolean(value),
      );

  const [
    metricResults,
    featureEntitlementsResult,
    skinEntitlementsResult,
    breezeRentalsResult,
    remnantAuditResult,
  ] = await Promise.all([
    Promise.all(
      characters.map(
        async (character) => {
          const result =
            await admin.rpc(
              "get_character_trophy_metrics",
              {
                p_character_id:
                  character.id,
              },
            );

          if (result.error) {
            console.error(
              `Unable to load ranking metrics for ${character.id}:`,
              result.error.message,
            );

            return {
              characterId:
                character.id,
              metrics:
                new Map<string, number>(),
            };
          }

          const map =
            new Map<string, number>();

          for (
            const row of
            (result.data ?? []) as MetricRow[]
          ) {
            map.set(
              row.metric_key,
              asNumber(
                row.metric_value,
              ),
            );
          }

          return {
            characterId:
              character.id,
            metrics: map,
          };
        },
      ),
    ),

    characterIds.length
      ? admin
          .from(
            "character_feature_entitlements",
          )
          .select(
            "character_id, feature_key, enabled",
          )
          .in(
            "character_id",
            characterIds,
          )
      : Promise.resolve({
          data: [],
          error: null,
        }),

    userIds.length
      ? admin
          .from(
            "user_portal_skin_entitlements",
          )
          .select(
            "user_id, skin_id, enabled",
          )
          .in(
            "user_id",
            userIds,
          )
      : Promise.resolve({
          data: [],
          error: null,
        }),

    characterIds.length
      ? admin
          .from(
            "breeze_lodging_rentals",
          )
          .select(
            "owner_character_id, starts_at, ends_at",
          )
          .in(
            "owner_character_id",
            characterIds,
          )
      : Promise.resolve({
          data: [],
          error: null,
        }),

    characterIds.length
      ? admin
          .from(
            "character_audit_log",
          )
          .select(
            "character_id, source, new_values",
          )
          .eq(
            "entity_type",
            "remnant_ledger",
          )
          .in(
            "character_id",
            characterIds,
          )
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  const directError =
    featureEntitlementsResult.error ??
    skinEntitlementsResult.error ??
    breezeRentalsResult.error ??
    remnantAuditResult.error;

  if (directError) {
    throw new Error(
      `Unable to load Hall of Renown activity: ${directError.message}`,
    );
  }

  const metricsByCharacter =
    new Map(
      metricResults.map(
        (entry) => [
          entry.characterId,
          entry.metrics,
        ],
      ),
    );

  const premiumByCharacter =
    new Map<string, number>();

  for (
    const row of
    featureEntitlementsResult.data ?? []
  ) {
    if (row.enabled === true) {
      addToMap(
        premiumByCharacter,
        row.character_id,
        1,
      );
    }
  }

  const characterByUser =
    new Map(
      characters
        .filter(
          (character) =>
            Boolean(
              character.user_id,
            ),
        )
        .map(
          (character) => [
            character.user_id as string,
            character.id,
          ],
        ),
    );

  for (
    const row of
    skinEntitlementsResult.data ?? []
  ) {
    if (row.enabled !== true) {
      continue;
    }

    addToMap(
      premiumByCharacter,
      characterByUser.get(
        row.user_id,
      ),
      1,
    );
  }

  const breezeByCharacter =
    new Map<string, number>();

  const DAY_MS =
    24 * 60 * 60 * 1000;

  for (
    const row of
    breezeRentalsResult.data ?? []
  ) {
    const start =
      new Date(
        row.starts_at,
      ).getTime();

    const end =
      new Date(
        row.ends_at,
      ).getTime();

    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      end <= start
    ) {
      continue;
    }

    addToMap(
      breezeByCharacter,
      row.owner_character_id,
      Math.max(
        1,
        Math.round(
          (end - start) /
            DAY_MS,
        ),
      ),
    );
  }

  const marketByCharacter =
    new Map<string, number>();

  for (
    const row of
    remnantAuditResult.data ?? []
  ) {
    const values =
      (
        row.new_values ??
        {}
      ) as Record<
        string,
        unknown
      >;

    const marketHaystack =
      [
        row.source,
        values.reason,
        values.source,
        values.source_type,
        values.transaction_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    if (
      !marketHaystack.includes(
        "market",
      )
    ) {
      continue;
    }

    addToMap(
      marketByCharacter,
      row.character_id,
      1,
    );
  }

  const createdAtByUser =
    new Map<string, string>();

  try {
    const {
      data: authUsers,
      error: authUsersError,
    } =
      await admin.auth.admin
        .listUsers({
          page: 1,
          perPage: 1000,
        });

    if (authUsersError) {
      console.error(
        "Unable to load account registration dates:",
        authUsersError.message,
      );
    } else {
      for (
        const user of
        authUsers.users
      ) {
        createdAtByUser.set(
          user.id,
          user.created_at,
        );
      }
    }
  } catch (error) {
    console.error(
      "Unable to load account registration dates:",
      error,
    );
  }

  const rankingCharacters:
    RankingCharacter[] =
    characters.map(
      (character) => ({
        ...character,
        metrics:
          metricsByCharacter.get(
            character.id,
          ) ??
          new Map(),
        accountCreatedAt:
          character.user_id
            ? createdAtByUser.get(
                character.user_id,
              ) ?? null
            : null,
        marketActivity:
          marketByCharacter.get(
            character.id,
          ) ?? 0,
        breezeDays:
          breezeByCharacter.get(
            character.id,
          ) ?? 0,
        premiumAcquisitions:
          premiumByCharacter.get(
            character.id,
          ) ?? 0,
      }),
    );

  const ranked =
    sortForBoard(
      rankingCharacters,
      board,
    );

  return (
    <main className="flex h-full min-h-0 w-full flex-col p-4 sm:p-5">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden border border-[rgb(var(--sep-colour-58432d))]/45 bg-[rgb(var(--sep-colour-15100d))]/82 shadow-[0_10px_26px_rgba(var(--sep-rgb-0-0-0),0.2)]">
        <header className="shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-211a14))] px-4 py-4 sm:px-5">
          <p className="text-[8px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
            The Hall of Renown
          </p>

          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-serif text-3xl text-[rgb(var(--sep-colour-ead5ac))]">
                {board.label}
              </h1>

              <p className="mt-1.5 max-w-3xl text-[11px] leading-5 text-[rgb(var(--sep-colour-9c8d79))]">
                {board.description}
              </p>
            </div>

            <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
              {board.eyebrow} · Top 100
            </span>
          </div>
        </header>

        {ranked.length ? (
          <div
            data-portal-scroll
            className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4"
          >
            <div className="space-y-2">
              {ranked.map(
                (
                  character,
                  index,
                ) => {
                  const value =
                    rankingValue(
                      character,
                      board,
                    );

                  const podium =
                    index < 3;

                  return (
                    <Link
                      key={
                        character.id
                      }
                      href={`/characters/${character.public_slug}`}
                      data-sep-interactive-surface="row"
                      className={`grid min-h-[44px] grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 border px-3 py-2 transition ${
                        podium
                          ? "border-[rgb(var(--sep-colour-80613b))]/55 bg-[rgb(var(--sep-colour-24190f))]"
                          : "border-[rgb(var(--sep-colour-58432d))]/45 bg-[rgb(var(--sep-colour-120d0a))] hover:border-[rgb(var(--sep-colour-80613b))]/55 hover:bg-[rgb(var(--sep-colour-19120d))]"
                      }`}
                    >
                      <div
                        className={`flex h-7 items-center justify-center font-serif ${
                          podium
                            ? "text-lg text-[rgb(var(--sep-colour-e4c47f))]"
                            : "text-sm text-[rgb(var(--sep-colour-82725f))]"
                        }`}
                      >
                        {rankLabel(
                          index,
                        )}
                      </div>

                      <p
                        className={`min-w-0 truncate font-serif ${
                          podium
                            ? "text-[16px] text-[rgb(var(--sep-colour-e5ce9f))]"
                            : "text-[14px] text-[rgb(var(--sep-colour-cbb58f))]"
                        }`}
                      >
                        {character.display_name ??
                          "Unnamed character"}
                      </p>

                      <div className="min-w-[100px] text-right">
                        {board.hiddenValue ? (
                          <p className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-a98d65))]">
                            Recorded
                          </p>
                        ) : board.veteran ? (
                          <p className="text-[10px] text-[rgb(var(--sep-colour-bda375))]">
                            {formatDate(
                              character.accountCreatedAt,
                            )}
                          </p>
                        ) : (
                          <p className="font-serif text-[15px] text-[rgb(var(--sep-colour-d0b27e))]">
                            {formatNumber(
                              value,
                            )}
                            <span className="ml-1.5 font-sans text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-766956))]">
                              {board.valueLabel ??
                                "Total"}
                            </span>
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                },
              )}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-center">
            <p className="font-serif text-lg text-[rgb(var(--sep-colour-a98e68))]">
              No entries yet.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
