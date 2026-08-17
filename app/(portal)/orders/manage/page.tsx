import { redirect } from "next/navigation";

import { OrderHeadAddMemberForm } from "@/components/orders/order-head-add-member-form";
import {
  OrderHeadGiftManager,
  type OrderGiftOption,
  type OrderGiftOwnership,
} from "@/components/orders/order-head-gift-manager";
import {
  OrderHeadMemberForm,
  type OrderHeadLevelOption,
} from "@/components/orders/order-head-member-form";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

type Relation<T> =
  | T
  | T[]
  | null;

function one<T>(
  value: Relation<T>,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

type LeadershipRow = {
  order_id: string;
  order: Relation<{
    id: string;
    name: string;
    colour: string | null;
  }>;
  level: Relation<{
    level: number;
  }>;
};

type MemberRow = {
  id: string;
  character_id: string;
  order_level_id: string;
  order_job_id: string | null;
  character: Relation<{
    id: string;
    display_name: string;
  }>;
  level: Relation<{
    level: number;
  }>;
  job: Relation<{
    id: string;
    name: string;
  }>;
};

export default async function ManageOrdersPage({
  searchParams,
}: Props) {
  const params =
    (await searchParams) ?? {};

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/homepage");
  }

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select("id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    characterError ||
    !character
  ) {
    redirect("/");
  }

  const {
    data: leadershipData,
    error: leadershipError,
  } = await supabase
    .from("order_memberships")
    .select(`
      order_id,
      order:orders(
        id,
        name,
        colour
      ),
      level:order_levels!order_memberships_order_level_id_fkey(
        level
      )
    `)
    .eq(
      "character_id",
      character.id,
    );

  if (leadershipError) {
    throw new Error(
      leadershipError.message,
    );
  }

  const leaderships =
    (
      (leadershipData ??
        []) as unknown as LeadershipRow[]
    ).filter(
      (membership) =>
        one(
          membership.level,
        )?.level === 6,
    );

  if (!leaderships.length) {
    redirect("/");
  }

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-6xl">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[#8c704b]">
          Order leadership
        </p>

        <h1 className="mt-2 font-serif text-4xl text-[#ead5ac]">
          Manage Your Order
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#a99b89]">
          Admit members, assign jobs
          and manage Levels 1–5.
          Appointment or removal of a
          Level 6 Head remains a staff
          responsibility.
        </p>

        {params.success ? (
          <Notice
            text={params.success}
          />
        ) : null}

        {params.error ? (
          <Notice
            text={params.error}
            error
          />
        ) : null}

        <div className="mt-8 space-y-8">
          {await Promise.all(
            leaderships.map(
              async (
                leadership,
              ) => {
                const order =
                  one(
                    leadership.order,
                  );

                if (!order) {
                  return null;
                }

                const [
                  levelsResult,
                  membersResult,
                  charactersResult,
                  linksResult,
                  giftsResult,
                ] =
                  await Promise.all([
                    supabase
                      .from(
                        "order_levels",
                      )
                      .select(`
                        id,
                        level,
                        jobs:order_jobs(
                          id,
                          name,
                          sort_order
                        )
                      `)
                      .eq(
                        "order_id",
                        order.id,
                      )
                      .lt(
                        "level",
                        6,
                      )
                      .order(
                        "level",
                        {
                          ascending:
                            false,
                        },
                      ),

                    supabase
                      .from(
                        "order_memberships",
                      )
                      .select(`
                        id,
                        character_id,
                        order_level_id,
                        order_job_id,
                        character:characters(
                          id,
                          display_name
                        ),
                        level:order_levels!order_memberships_order_level_id_fkey(
                          level
                        ),
                        job:order_jobs!order_memberships_order_job_id_fkey(
                          id,
                          name
                        )
                      `)
                      .eq(
                        "order_id",
                        order.id,
                      ),

                    supabase
                      .from(
                        "characters",
                      )
                      .select(
                        "id, display_name",
                      )
                      .order(
                        "display_name",
                        {
                          ascending:
                            true,
                        },
                      ),

                    supabase
                      .from(
                        "order_job_links",
                      )
                      .select(
                        "from_job_id, to_job_id",
                      ),

                    supabase
                      .from("gifts")
                      .select(`
                        id,
                        name,
                        description,
                        roles:gift_order_jobs(
                          order_job_id
                        )
                      `)
                      .eq("is_active", true)
                      .order("sort_order", {
                        ascending: true,
                      })
                      .order("name", {
                        ascending: true,
                      }),
                  ]);

                if (
                  levelsResult.error ||
                  membersResult.error ||
                  charactersResult.error ||
                  linksResult.error ||
                  giftsResult.error
                ) {
                  return (
                    <Notice
                      key={
                        order.id
                      }
                      error
                      text={`Unable to load ${order.name}.`}
                    />
                  );
                }

                const rawLevels =
                  levelsResult.data ?? [];

                const rawJobs =
                  rawLevels.flatMap(
                    (level) =>
                      (level.jobs ?? []).map(
                        (job) => ({
                          id: job.id,
                          name: job.name,
                          sort_order:
                            job.sort_order,
                          level:
                            level.level,
                        }),
                      ),
                  );

                const jobById =
                  new Map(
                    rawJobs.map(
                      (job) => [
                        job.id,
                        job,
                      ],
                    ),
                  );

                const orderJobIds =
                  new Set(
                    rawJobs.map(
                      (job) => job.id,
                    ),
                  );

                const orderLinks =
                  (
                    linksResult.data ??
                    []
                  ).filter(
                    (link) =>
                      orderJobIds.has(
                        link.from_job_id,
                      ) &&
                      orderJobIds.has(
                        link.to_job_id,
                      ),
                  );

                const levels =
                  rawLevels.map(
                    (level) => ({
                      id: level.id,
                      level:
                        level.level,
                      jobs: [
                        ...(level.jobs ??
                          []),
                      ]
                        .sort(
                          (a, b) =>
                            a.sort_order -
                              b.sort_order ||
                            a.name.localeCompare(
                              b.name,
                            ),
                        )
                        .map(
                          (job) => {
                            const before =
                              orderLinks
                                .filter(
                                  (link) =>
                                    link.to_job_id ===
                                    job.id,
                                )
                                .map(
                                  (link) =>
                                    jobById.get(
                                      link.from_job_id,
                                    )?.name,
                                )
                                .filter(
                                  (
                                    name,
                                  ): name is string =>
                                    Boolean(name),
                                );

                            const after =
                              orderLinks
                                .filter(
                                  (link) =>
                                    link.from_job_id ===
                                    job.id,
                                )
                                .map(
                                  (link) =>
                                    jobById.get(
                                      link.to_job_id,
                                    )?.name,
                                )
                                .filter(
                                  (
                                    name,
                                  ): name is string =>
                                    Boolean(name),
                                );

                            return {
                              id: job.id,
                              name:
                                job.name,
                              before,
                              after,
                            };
                          },
                        ),
                    }),
                  ) as OrderHeadLevelOption[];

                const members =
                  (
                    membersResult.data ??
                    []
                  ) as unknown as MemberRow[];

                members.sort(
                  (a, b) => {
                    const levelA =
                      one(
                        a.level,
                      )?.level ??
                      -1;

                    const levelB =
                      one(
                        b.level,
                      )?.level ??
                      -1;

                    if (
                      levelA !==
                      levelB
                    ) {
                      return (
                        levelB -
                        levelA
                      );
                    }

                    return (
                      one(
                        a.character,
                      )?.display_name ??
                      ""
                    ).localeCompare(
                      one(
                        b.character,
                      )?.display_name ??
                        "",
                    );
                  },
                );

                const giftOptions =
                  (
                    giftsResult.data ??
                    []
                  )
                    .map((gift) => ({
                      id: gift.id,
                      name: gift.name,
                      description:
                        gift.description ?? "",
                      roleIds:
                        (gift.roles ?? []).map(
                          (entry) =>
                            entry.order_job_id,
                        ),
                    }))
                    .filter((gift) =>
                      gift.roleIds.some(
                        (roleId) =>
                          orderJobIds.has(
                            roleId,
                          ),
                      ),
                    ) satisfies OrderGiftOption[];

                const memberIds =
                  new Set(
                    members.map(
                      (
                        member,
                      ) =>
                        member.character_id,
                    ),
                  );

                const {
                  data: giftOwnershipRows,
                  error: giftOwnershipError,
                } = memberIds.size
                  ? await supabase
                      .from("character_gifts")
                      .select(`
                        id,
                        character_id,
                        gift_id,
                        acquisition_source,
                        source_order_job_id
                      `)
                      .in(
                        "character_id",
                        Array.from(memberIds),
                      )
                  : {
                      data: [],
                      error: null,
                    };

                if (giftOwnershipError) {
                  return (
                    <Notice
                      key={order.id}
                      error
                      text={`Unable to load Gifts for ${order.name}.`}
                    />
                  );
                }

                const ownershipByCharacter =
                  new Map<
                    string,
                    OrderGiftOwnership[]
                  >();

                for (
                  const row
                  of giftOwnershipRows ?? []
                ) {
                  const current =
                    ownershipByCharacter.get(
                      row.character_id,
                    ) ?? [];

                  current.push({
                    assignmentId: row.id,
                    giftId: row.gift_id,
                    source:
                      row.acquisition_source as
                        | "ancestry"
                        | "order"
                        | "staff",
                    sourceOrderJobId:
                      row.source_order_job_id,
                  });

                  ownershipByCharacter.set(
                    row.character_id,
                    current,
                  );
                }

                const available =
                  (
                    charactersResult.data ??
                    []
                  ).filter(
                    (
                      possible,
                    ) =>
                      !memberIds.has(
                        possible.id,
                      ),
                  );

                return (
                  <section
                    key={
                      order.id
                    }
                    id={`managed-order-${order.id}`}
                    className="scroll-mt-6 overflow-hidden border border-[#60482e]/45 bg-[#15100d]"

                    style={
                      order.colour
                        ? {
                            boxShadow: `inset 4px 0 0 ${order.colour}`,
                          }
                        : undefined
                    }
                  >
                    <div className="border-b border-[#60482e]/35 px-5 py-5 sm:px-6">
                      <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
                        Level 6 · Head
                      </p>

                      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <h2 className="font-serif text-3xl text-[#dfc99f]">
                            {
                              order.name
                            }
                          </h2>

                          <p className="mt-1 text-[10px] text-[#8f8271]">
                            Managed by{" "}
                            <span className="text-[#c4a97f]">
                              {
                                character.display_name
                              }
                            </span>
                          </p>
                        </div>

                        <span className="border border-[#765937]/45 bg-[#100c09] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[#a98c65]">
                          {
                            members.length
                          }{" "}
                          {members.length ===
                          1
                            ? "member"
                            : "members"}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 sm:p-6">
                      <div className="space-y-2">
                        {members.map(
                          (
                            member,
                          ) => {
                            const c =
                              one(
                                member.character,
                              );

                            const currentLevel =
                              one(
                                member.level,
                              )?.level ??
                              -1;

                            const currentJob =
                              one(
                                member.job,
                              )?.name ??
                              null;

                            if (!c) {
                              return null;
                            }

                            if (
                              currentLevel ===
                              6
                            ) {
                              return (
                                <div
                                  key={
                                    member.id
                                  }
                                  className="grid gap-3 border border-[#765937]/45 bg-[#18110d] p-3 lg:grid-cols-[minmax(180px,1fr)_130px_minmax(190px,1fr)_auto] lg:items-center"
                                >
                                  <div>
                                    <p className="text-[7px] uppercase tracking-[0.14em] text-[#756958]">
                                      Character
                                    </p>

                                    <p className="mt-1 font-serif text-sm text-[#e0c798]">
                                      {
                                        c.display_name
                                      }
                                      {member.character_id ===
                                      character.id
                                        ? " — You"
                                        : ""}
                                    </p>
                                  </div>

                                  <p className="text-xs text-[#b49b74]">
                                    Level 6
                                  </p>

                                  <p className="text-xs text-[#b49b74]">
                                    {currentJob ??
                                      "Head"}
                                  </p>

                                  <span className="text-[7px] uppercase tracking-[0.14em] text-[#756958]">
                                    Staff
                                    controlled
                                  </span>
                                </div>
                              );
                            }

                            const currentRoleId =
                              member.order_job_id;

                            return (
                              <div
                                key={member.id}
                                className="border border-[#59432c]/40 bg-[#100c09] p-3"
                              >
                                <OrderHeadMemberForm
                                  orderId={
                                    order.id
                                  }
                                  membershipId={
                                    member.id
                                  }
                                  characterName={
                                    c.display_name
                                  }
                                  initialLevelId={
                                    member.order_level_id
                                  }
                                  initialJobId={
                                    currentRoleId
                                  }
                                  levels={
                                    levels
                                  }
                                  embedded
                                />

                                {currentRoleId ? (
                                  <OrderHeadGiftManager
                                    orderId={
                                      order.id
                                    }
                                    membershipId={
                                      member.id
                                    }
                                    currentRoleId={
                                      currentRoleId
                                    }
                                    gifts={
                                      giftOptions
                                    }
                                    ownership={
                                      ownershipByCharacter.get(
                                        member.character_id,
                                      ) ?? []
                                    }
                                  />
                                ) : null}
                              </div>
                            );
                          },
                        )}
                      </div>

                      <OrderHeadAddMemberForm
                        orderId={
                          order.id
                        }
                        characters={
                          available
                        }
                        levels={
                          levels
                        }
                      />
                    </div>
                  </section>
                );
              },
            ),
          )}
        </div>
      </div>
    </main>
  );
}

function Notice({
  text,
  error = false,
}: {
  text: string;
  error?: boolean;
}) {
  return (
    <div
      className={`mt-5 border px-4 py-3 text-sm ${
        error
          ? "border-red-900/60 bg-red-950/20 text-red-400"
          : "border-emerald-800/50 bg-emerald-950/20 text-emerald-400"
      }`}
    >
      {text}
    </div>
  );
}
