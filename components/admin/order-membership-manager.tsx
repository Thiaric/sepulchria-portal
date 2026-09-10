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
    <section className="mt-8 border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-6 components_admin_order_membership_manager_section_section">
      <div className="components_admin_order_membership_manager_div_members">
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))] components_admin_order_membership_manager_p_members">
          Order membership
        </p>

        <h4 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dec69a))] components_admin_order_membership_manager_h4_members">
          Members
        </h4>

        <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))] components_admin_order_membership_manager_p_members_2">
          Staff can place characters
          into this Order and assign
          their current level and job.
        </p>
      </div>

      <div className="mt-5 space-y-2 components_admin_order_membership_manager_div_container">
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
                className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-3"
              >
                <input className="components_admin_order_membership_manager_input_order_id"
                  type="hidden"
                  name="orderId"
                  value={orderId}
                />

                <input className="components_admin_order_membership_manager_input_membership_id"
                  type="hidden"
                  name="membershipId"
                  value={
                    membership.id
                  }
                />

                <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_140px_minmax(180px,1fr)_auto] lg:items-end components_admin_order_membership_manager_div_container_2">
                  <div className="components_admin_order_membership_manager_div_container_3">
                    <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] components_admin_order_membership_manager_p_text">
                      Character
                    </p>

                    <p className="mt-1 font-serif text-sm text-[rgb(var(--sep-colour-d8bf91))] components_admin_order_membership_manager_p_text_2">
                      {
                        character.display_name
                      }
                    </p>
                  </div>

                  <label className="components_admin_order_membership_manager_label_label">
                    <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] components_admin_order_membership_manager_span_text">
                      Level
                    </span>

                    <select
                      name="levelId"
                      defaultValue={
                        membership.order_level_id
                      }
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-15100d))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none components_admin_order_membership_manager_select_level_id"
                    >
                      {levels.map(
                        (level) => (
                          <option className="components_admin_order_membership_manager_option_option"
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

                  <label className="components_admin_order_membership_manager_label_label_2">
                    <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] components_admin_order_membership_manager_span_text_2">
                      Role
                    </span>

                    <select
                      name="jobId"
                      required
                      defaultValue={
                        membership.order_job_id ??
                        ""
                      }
                      className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-15100d))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none components_admin_order_membership_manager_select_job_id"
                    >
                      <option className="components_admin_order_membership_manager_option_job_id" value="" disabled>
                        Select Role
                      </option>

                      {levels.map(
                        (level) =>
                          (
                            level.jobs ??
                            []
                          ).map(
                            (job) => (
                              <option className="components_admin_order_membership_manager_option_option_2"
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

                  <div className="flex gap-2 components_admin_order_membership_manager_div_container_4">
                    <button
                      type="submit"
                      className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-261b12))] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-ccb083))] components_admin_order_membership_manager_button_save"
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
                  <p className="mt-2 text-[8px] text-[rgb(var(--sep-colour-716554))] components_admin_order_membership_manager_p_text_3">
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
          <p className="border border-[rgb(var(--sep-colour-59432c))]/25 bg-[rgb(var(--sep-colour-100c09))] p-4 text-[10px] italic text-[rgb(var(--sep-colour-746858))] components_admin_order_membership_manager_p_text_4">
            This Order has no members
            yet.
          </p>
        ) : null}
      </div>

      <AdminActionForm
        action={addOrderMember}
        className="mt-4 border border-dashed border-[rgb(var(--sep-colour-765937))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4"
      >
        <input className="components_admin_order_membership_manager_input_order_id_2"
          type="hidden"
          name="orderId"
          value={orderId}
        />

        <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_admin_order_membership_manager_p_text_5">
          Add member
        </p>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_140px_minmax(200px,1fr)_auto] lg:items-end components_admin_order_membership_manager_div_container_5">
          <label className="components_admin_order_membership_manager_label_label_3">
            <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] components_admin_order_membership_manager_span_text_3">
              Character
            </span>

            <select
              name="characterId"
              required
              defaultValue=""
              className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-15100d))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none components_admin_order_membership_manager_select_character_id"
            >
              <option className="components_admin_order_membership_manager_option_character_id"
                value=""
                disabled
              >
                Select character
              </option>

              {availableCharacters.map(
                (character) => (
                  <option className="components_admin_order_membership_manager_option_option_3"
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

          <label className="components_admin_order_membership_manager_label_label_4">
            <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] components_admin_order_membership_manager_span_text_4">
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
              className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-15100d))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none components_admin_order_membership_manager_select_level_id_2"
            >
              {levels.map(
                (level) => (
                  <option className="components_admin_order_membership_manager_option_option_4"
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

          <label className="components_admin_order_membership_manager_label_label_5">
            <span className="mb-1 block text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] components_admin_order_membership_manager_span_text_5">
              Role
            </span>

            <select
              name="jobId"
              required
              defaultValue=""
              className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-15100d))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none components_admin_order_membership_manager_select_job_id_2"
            >
              <option className="components_admin_order_membership_manager_option_job_id_2" value="" disabled>
                Select Role
              </option>

              {levels.map(
                (level) =>
                  (
                    level.jobs ??
                    []
                  ).map((job) => (
                    <option className="components_admin_order_membership_manager_option_option_5"
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
            className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd6a8))] disabled:cursor-not-allowed disabled:opacity-40 components_admin_order_membership_manager_button_add_member"
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
    <div className="mt-7 border border-red-900/50 bg-red-950/15 p-4 text-sm text-red-300 components_admin_order_membership_manager_div_container_6">
      {message}
    </div>
  );
}
