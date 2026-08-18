import { AdminActionForm } from "@/components/admin/admin-action-form";
import {
  addOrderMember,
  updateOrderMember,
} from "@/app/(portal)/admin/orders/membership-actions";
import { AdminOrderMemberRemoveButton } from "@/components/admin/admin-order-member-remove-button";

import { createClient } from "@/lib/supabase/server";

type Level = {
  id: string;
  level: number;
  jobs:
    | {
        id: string;
        name: string;
        sort_order: number;
      }[]
    | null;
};

type Membership = {
  id: string;
  joined_at: string;
  order_level_id: string;
  order_job_id: string | null;
  character:
    | {
        id: string;
        display_name: string;
        portrait_url: string | null;
      }
    | {
        id: string;
        display_name: string;
        portrait_url: string | null;
      }[]
    | null;
  level:
    | {
        id: string;
        level: number;
      }
    | {
        id: string;
        level: number;
      }[]
    | null;
  job:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

function single<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export async function OrderMembershipManager({
  orderId,
}: {
  orderId: string;
}) {
  const supabase =
    await createClient();

  const [
    levelsResult,
    membershipsResult,
    charactersResult,
  ] = await Promise.all([
    supabase
      .from("order_levels")
      .select(`
        id,
        level,
        jobs:order_jobs(
          id,
          name,
          sort_order
        )
      `)
      .eq("order_id", orderId)
      .order("level", {
        ascending: false,
      }),

    supabase
      .from("order_memberships")
      .select(`
        id,
        joined_at,
        order_level_id,
        order_job_id,
        character:characters(
          id,
          display_name,
          portrait_url
        ),
        level:order_levels!order_memberships_order_level_id_fkey(
          id,
          level
        ),
        job:order_jobs!order_memberships_order_job_id_fkey(
          id,
          name
        )
      `)
      .eq("order_id", orderId)
      .order("joined_at", {
        ascending: true,
      }),

    supabase
      .from("characters")
      .select(
        "id, display_name",
      )
      .order("display_name", {
        ascending: true,
      }),
  ]);

  if (levelsResult.error) {
    return (
      <ErrorPanel
        message={`Unable to load Order levels: ${levelsResult.error.message}`}
      />
    );
  }

  if (membershipsResult.error) {
    return (
      <ErrorPanel
        message={`Unable to load Order members: ${membershipsResult.error.message}`}
      />
    );
  }

  if (charactersResult.error) {
    return (
      <ErrorPanel
        message={`Unable to load characters: ${charactersResult.error.message}`}
      />
    );
  }

  const levels =
    (levelsResult.data ??
      []) as unknown as Level[];

  for (const level of levels) {
    level.jobs = [
      ...(level.jobs ?? []),
    ].sort(
      (a, b) =>
        a.sort_order -
          b.sort_order ||
        a.name.localeCompare(
          b.name,
        ),
    );
  }

  const memberships =
    (membershipsResult.data ??
      []) as unknown as Membership[];

  memberships.sort(
    (a, b) => {
      const levelA =
        single(a.level)?.level ??
        -1;

      const levelB =
        single(b.level)?.level ??
        -1;

      if (levelA !== levelB) {
        return levelB - levelA;
      }

      const nameA =
        single(a.character)
          ?.display_name ?? "";

      const nameB =
        single(b.character)
          ?.display_name ?? "";

      return nameA.localeCompare(
        nameB,
      );
    },
  );

  const existingCharacterIds =
    new Set(
      memberships
        .map(
          (membership) =>
            single(
              membership.character,
            )?.id,
        )
        .filter(
          (
            value,
          ): value is string =>
            Boolean(value),
        ),
    );

  const availableCharacters =
    (charactersResult.data ??
      []).filter(
        (character) =>
          !existingCharacterIds.has(
            character.id,
          ),
      );

  return (
    <section className="mt-8 border-t border-[#60482e]/35 pt-6">
      <div>
        <p className="text-[8px] uppercase tracking-[0.24em] text-[#806b50]">
          Order membership
        </p>

        <h4 className="mt-1 font-serif text-2xl text-[#dec69a]">
          Members
        </h4>

        <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[#8f8271]">
          Staff can place characters
          into this Order and assign
          their current level and job.
        </p>
      </div>

      <div className="mt-5 space-y-2">
        {memberships.map(
          (membership) => {
            const character =
              single(
                membership.character,
              );

            const currentLevel =
              single(
                membership.level,
              );

            const currentRole =
              single(
                membership.job,
              );

            if (!character) {
              return null;
            }

            return (
              <AdminActionForm
                key={
                  membership.id
                }
                action={
                  updateOrderMember
                }
                className="border border-[#59432c]/40 bg-[#100c09] p-3"
              >
                <input
                  type="hidden"
                  name="orderId"
                  value={orderId}
                />

                <input
                  type="hidden"
                  name="membershipId"
                  value={
                    membership.id
                  }
                />

                <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_140px_minmax(180px,1fr)_auto] lg:items-end">
                  <div>
                    <p className="text-[7px] uppercase tracking-[0.14em] text-[#756958]">
                      Character
                    </p>

                    <p className="mt-1 font-serif text-sm text-[#d8bf91]">
                      {
                        character.display_name
                      }
                    </p>
                  </div>

                  <label>
                    <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[#756958]">
                      Level
                    </span>

                    <select
                      name="levelId"
                      defaultValue={
                        membership.order_level_id
                      }
                      className="w-full border border-[#60482e]/50 bg-[#15100d] px-2 py-2 text-xs text-[#d7c4a5] outline-none"
                    >
                      {levels.map(
                        (level) => (
                          <option
                            key={
                              level.id
                            }
                            value={
                              level.id
                            }
                          >
                            Level{" "}
                            {
                              level.level
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label>
                    <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[#756958]">
                      Role
                    </span>

                    <select
                      name="jobId"
                      required
                      defaultValue={
                        membership.order_job_id ??
                        ""
                      }
                      className="w-full border border-[#60482e]/50 bg-[#15100d] px-2 py-2 text-xs text-[#d7c4a5] outline-none"
                    >
                      <option value="" disabled>
                        Select Role
                      </option>

                      {levels.map(
                        (level) =>
                          (
                            level.jobs ??
                            []
                          ).map(
                            (job) => (
                              <option
                                key={
                                  job.id
                                }
                                value={
                                  job.id
                                }
                              >
                                L{
                                  level.level
                                } —{" "}
                                {
                                  job.name
                                }
                              </option>
                            ),
                          ),
                      )}
                    </select>
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="border border-[#765937]/55 bg-[#261b12] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[#ccb083]"
                    >
                      Save
                    </button>

                    <AdminOrderMemberRemoveButton
                      characterName={
                        character.display_name
                      }
                      orderId={orderId}
                      membershipId={membership.id}
                    />
                  </div>
                </div>

                {currentLevel ? (
                  <p className="mt-2 text-[8px] text-[#716554]">
                    Current: Level{" "}
                    {
                      currentLevel.level
                    }
                    {currentRole
                      ? ` · ${currentRole.name}`
                      : ""}
                  </p>
                ) : null}
              </AdminActionForm>
            );
          },
        )}

        {memberships.length ===
        0 ? (
          <p className="border border-[#59432c]/25 bg-[#100c09] p-4 text-[10px] italic text-[#746858]">
            This Order has no members
            yet.
          </p>
        ) : null}
      </div>

      <AdminActionForm
        action={addOrderMember}
        className="mt-4 border border-dashed border-[#765937]/45 bg-[#100c09] p-4"
      >
        <input
          type="hidden"
          name="orderId"
          value={orderId}
        />

        <p className="text-[8px] uppercase tracking-[0.18em] text-[#806b50]">
          Add member
        </p>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_140px_minmax(200px,1fr)_auto] lg:items-end">
          <label>
            <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[#756958]">
              Character
            </span>

            <select
              name="characterId"
              required
              defaultValue=""
              className="w-full border border-[#60482e]/50 bg-[#15100d] px-2 py-2 text-xs text-[#d7c4a5] outline-none"
            >
              <option
                value=""
                disabled
              >
                Select character
              </option>

              {availableCharacters.map(
                (character) => (
                  <option
                    key={
                      character.id
                    }
                    value={
                      character.id
                    }
                  >
                    {
                      character.display_name
                    }
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[#756958]">
              Level
            </span>

            <select
              name="levelId"
              required
              defaultValue={
                levels.find(
                  (level) =>
                    level.level ===
                    1,
                )?.id ??
                levels[
                  levels.length - 1
                ]?.id ??
                ""
              }
              className="w-full border border-[#60482e]/50 bg-[#15100d] px-2 py-2 text-xs text-[#d7c4a5] outline-none"
            >
              {levels.map(
                (level) => (
                  <option
                    key={
                      level.id
                    }
                    value={
                      level.id
                    }
                  >
                    Level{" "}
                    {level.level}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[#756958]">
              Role
            </span>

            <select
              name="jobId"
              required
              defaultValue=""
              className="w-full border border-[#60482e]/50 bg-[#15100d] px-2 py-2 text-xs text-[#d7c4a5] outline-none"
            >
              <option value="" disabled>
                Select Role
              </option>

              {levels.map(
                (level) =>
                  (
                    level.jobs ??
                    []
                  ).map((job) => (
                    <option
                      key={job.id}
                      value={job.id}
                    >
                      L
                      {
                        level.level
                      }{" "}
                      —{" "}
                      {job.name}
                    </option>
                  )),
              )}
            </select>
          </label>

          <button
            type="submit"
            disabled={
              availableCharacters.length ===
              0
            }
            className="border border-[#987344] bg-[#3b2919] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[#efd6a8] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add member
          </button>
        </div>
      </AdminActionForm>
    </section>
  );
}

function ErrorPanel({
  message,
}: {
  message: string;
}) {
  return (
    <div className="mt-7 border border-red-900/50 bg-red-950/15 p-4 text-sm text-red-300">
      {message}
    </div>
  );
}
