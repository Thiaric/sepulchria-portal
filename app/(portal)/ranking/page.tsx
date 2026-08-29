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
      "Those who have earned the most Remnants over their lifetime. Exact amounts remain private.",
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
      "Those who have spent the most Remnants over their lifetime. Exact amounts remain private.",
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
    key: "market",
    label: "Market Regulars",
    eyebrow: "Market",
    description:
      "Those with the greatest lifetime Market activity.",
    metricKeys: [
      "market_transactions",
      "market_transactions_total",
      "market_activity_total",
      "market_actions_total",
    ],
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
    metricKeys: [
      "breeze_days_rented",
      "breeze_rental_days",
      "lodging_days_rented",
    ],
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
      "Those who have acquired the greatest number of Premium features and entitlements.",
    metricKeys: [
      "premium_features_ever_owned",
      "premium_acquisitions",
      "premium_features_owned",
      "premium_entitlements_ever",
    ],
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

function findMetric(
  character: RankingCharacter,
  keys: string[] = [],
) {
  for (const key of keys) {
    if (
      character.metrics.has(key)
    ) {
      return (
        character.metrics.get(key) ??
        0
      );
    }
  }

  return 0;
}

function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
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
    if (
      !character.accountCreatedAt
    ) {
      return Number.POSITIVE_INFINITY;
    }

    return new Date(
      character.accountCreatedAt,
    ).getTime();
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

      return (
        rankingValue(
          character,
          board,
        ) > 0
      );
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
        (
          a.display_name ??
          ""
        ).localeCompare(
          b.display_name ?? "",
        )
      );
    })
    .slice(0, 10);
}

function rankLabel(index: number) {
  if (index === 0) return "I";
  if (index === 1) return "II";
  if (index === 2) return "III";
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
        entry.key ===
        params.board,
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
    (characterData ??
      []) as CharacterRow[];

  const metricResults =
    await Promise.all(
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
                new Map<
                  string,
                  number
                >(),
            };
          }

          const map =
            new Map<
              string,
              number
            >();

          for (
            const row of
            (result.data ??
              []) as MetricRow[]
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
    );

  const metricsByCharacter =
    new Map(
      metricResults.map(
        (entry) => [
          entry.characterId,
          entry.metrics,
        ],
      ),
    );

  const createdAtByUser =
    new Map<
      string,
      string
    >();

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
      }),
    );

  const ranked =
    sortForBoard(
      rankingCharacters,
      board,
    );

  return (
    <main
      data-sep-interaction-ignore="true"
      className="flex h-full min-h-0 w-full flex-col p-3 sm:p-4"
    >
      <header className="shrink-0 bg-[rgb(var(--sep-colour-17110d))] px-4 py-4 sm:px-5">
        <p className="text-[8px] uppercase tracking-[0.3em] text-[rgb(var(--sep-colour-8c704b))]">
          Sepulchria remembers
        </p>

        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl text-[rgb(var(--sep-colour-ead5ac))]">
              The Hall of Renown
            </h1>

            <p className="mt-1.5 max-w-3xl text-[10px] leading-5 text-[rgb(var(--sep-colour-928674))]">
              The deeds, achievements
              and standing of those
              whose lives leave their
              mark upon Sepulchria.
            </p>
          </div>
        </div>
      </header>

      <section className="mt-3 flex min-h-0 flex-1 flex-col bg-[rgb(var(--sep-colour-120d0a))]">
        <header className="shrink-0 bg-[rgb(var(--sep-colour-17110d))] px-4 py-3">
          <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-836b4a))]">
            {board.eyebrow}
          </p>

          <div className="mt-0.5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-e1c99c))]">
                {board.label}
              </h2>

              <p className="mt-1 max-w-3xl text-[10px] leading-4 text-[rgb(var(--sep-colour-8f816e))]">
                {board.description}
              </p>
            </div>

            <span className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-6f604d))]">
              Top 10
            </span>
          </div>
        </header>

        {ranked.length ? (
          <div
            data-portal-scroll
            className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3"
          >
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
                    className={`grid min-h-[46px] grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 transition ${
                      podium
                        ? "bg-[rgb(var(--sep-colour-24190f))]"
                        : "bg-[rgb(var(--sep-colour-15100d))]"
                    }`}
                  >
                    <div
                      className={`flex h-8 items-center justify-center font-serif ${
                        podium
                          ? "text-lg text-[rgb(var(--sep-colour-e4c47f))]"
                          : "text-sm text-[rgb(var(--sep-colour-82725f))]"
                      }`}
                    >
                      {rankLabel(
                        index,
                      )}
                    </div>

                    <div className="min-w-0">
                      <p
                        className={`truncate font-serif ${
                          podium
                            ? "text-[16px] text-[rgb(var(--sep-colour-e5ce9f))]"
                            : "text-[14px] text-[rgb(var(--sep-colour-cbb58f))]"
                        }`}
                      >
                        {character.display_name ??
                          "Unnamed character"}
                      </p>
                    </div>

                    <div className="min-w-[100px] text-right">
                      {board.hiddenValue ? (
                        <p className="text-[9px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-bda375))]">
                          Recorded
                        </p>
                      ) : board.veteran ? (
                        <p className="text-[9px] text-[rgb(var(--sep-colour-bda375))]">
                          {formatDate(
                            character.accountCreatedAt,
                          )}
                        </p>
                      ) : (
                        <p className="font-serif text-[15px] text-[rgb(var(--sep-colour-d0b27e))]">
                          {formatNumber(
                            value,
                          )}
                          <span className="ml-1 font-sans text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-766956))]">
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
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-10 text-center">
            <div>
              <p className="font-serif text-xl text-[rgb(var(--sep-colour-a98e68))]">
                No names have yet been
                entered into this record.
              </p>

              <p className="mt-2 text-[10px] text-[rgb(var(--sep-colour-706554))]">
                The Hall will update as
                characters leave their
                mark upon Sepulchria.
              </p>
            </div>
          </div>
        )}
      </section>

      <p className="mt-2 shrink-0 text-center text-[7px] leading-4 text-[rgb(var(--sep-colour-62594e))]">
        Current Remnant balances are
        never displayed. Lifetime
        economy records reveal standing
        only where amounts are private.
      </p>
    </main>
  );
}
