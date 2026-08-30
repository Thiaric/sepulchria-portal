import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createDailyMilestoneDefinition,
  createDailyMissionDefinition,
  updateDailyMilestoneDefinition,
  updateDailyMissionDefinition,
} from "./actions";
import {
  AdminMissionForm,
} from "@/components/admin/admin-mission-form";
import {
  DailyMissionRewardPoolEditor,
} from "@/components/admin/daily-mission-reward-pool-editor";

export const dynamic = "force-dynamic";

const MISSION_FAMILIES = [
  "Gathering",
  "Crafting",
  "Odd Jobs",
  "House of Chances",
  "Market",
  "Private Messages",
  "Instant Chat",
  "Location Chat",
  "Remnants",
];

const OBJECTIVES = [
  ["gather_attempts", "Gathering attempts"],
  [
    "gather_specific_location",
    "Specific Gathering location",
  ],
  [
    "gather_distinct_locations",
    "Different Gathering locations",
  ],
  [
    "gather_ingredients",
    "Ingredients found through Gathering",
  ],
  ["craft_item", "Craft Items"],
  ["odd_job", "Odd Jobs completed"],
  ["chance_play", "House of Chances plays"],
  ["chance_win", "House of Chances wins"],
  ["market_buy", "Market purchases"],
  ["market_sell", "Market sales"],
  [
    "private_message",
    "Private Messages sent",
  ],
  [
    "instant_chat_messages",
    "Instant Chat messages",
  ],
  [
    "instant_chat_distinct_players",
    "Different Instant Chat players",
  ],
  [
    "location_chat_actions",
    "Qualifying Location Chat actions",
  ],
  ["remnants_earned", "Remnants earned"],
  ["remnants_spent", "Remnants spent"],
] as const;

const inputClass =
  "mt-1 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 normal-case tracking-normal text-sm text-[rgb(var(--sep-colour-c0af95))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]";

const labelClass =
  "text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8f7858))]";

export default async function AdminMissionsPage() {
  await requireAdminSection("missions");
  const admin = createAdminClient();

  const [
    missionResult,
    milestoneResult,
    itemResult,
    rewardPoolResult,
  ] = await Promise.all([
    admin
      .from("daily_mission_definitions")
      .select("*")
      .order("sort_order", {
        ascending: true,
      }),
    admin
      .from(
        "daily_mission_milestone_definitions",
      )
      .select("*")
      .order("sort_order", {
        ascending: true,
      }),
    admin
      .from("items")
      .select("id, name")
      .eq("is_active", true)
      .order("name", {
        ascending: true,
      }),
    admin
      .from(
        "daily_mission_reward_pool_entries",
      )
      .select(
        "id, mission_definition_id, milestone_key, item_id, chance_pct, quantity, sort_order, is_active",
      )
      .order("sort_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      }),
  ]);

  if (missionResult.error) {
    throw new Error(
      missionResult.error.message,
    );
  }

  if (milestoneResult.error) {
    throw new Error(
      milestoneResult.error.message,
    );
  }

  if (itemResult.error) {
    throw new Error(
      itemResult.error.message,
    );
  }

  if (rewardPoolResult.error) {
    throw new Error(
      rewardPoolResult.error.message,
    );
  }

  const missions =
    missionResult.data ?? [];

  const milestones =
    milestoneResult.data ?? [];

  const items =
    itemResult.data ?? [];

  const rewardPoolEntries =
    rewardPoolResult.data ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-7 lg:px-9">
      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/45 pb-5">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
          Mission management
        </p>

        <h2 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">
          Daily Missions
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-938673))]">
          Configure targets, availability,
          milestone eligibility and rewards.
        </p>
      </header>

      <section className="mt-7 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-876a46))]">
          Catalogue management
        </p>

        <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dcc59a))]">
          Create Daily Mission
        </h3>

        <p className="mt-1 text-xs leading-5 text-[rgb(var(--sep-colour-938673))]">
          Active missions are included in
          today&apos;s Daily Mission set.
          After creation, configure its
          curated Item pool on the mission card.
        </p>

        <AdminMissionForm
          action={createDailyMissionDefinition}
          className="mt-4 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-4"
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <label className={labelClass}>
              Name
              <input
                name="name"
                required
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Description
              <input
                name="description"
                required
                className={inputClass}
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1.4fr_100px_120px]">
            <label className={labelClass}>
              Family
              <select
                name="family"
                defaultValue="Gathering"
                className={inputClass}
              >
                {MISSION_FAMILIES.map(
                  (family) => (
                    <option
                      key={family}
                      value={family}
                    >
                      {family}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className={labelClass}>
              Objective
              <select
                name="objective_type"
                defaultValue="gather_attempts"
                className={inputClass}
              >
                {OBJECTIVES.map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className={labelClass}>
              Target
              <input
                name="target_value"
                type="number"
                min={1}
                step={1}
                defaultValue={1}
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Difficulty
              <select
                name="difficulty"
                defaultValue="easy"
                className={inputClass}
              >
                <option value="easy">
                  Easy
                </option>
                <option value="medium">
                  Medium
                </option>
                <option value="hard">
                  Hard
                </option>
              </select>
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[110px_1fr_100px_100px_auto_auto] md:items-end">
            <label className={labelClass}>
              Remnants
              <input
                name="reward_remnants"
                type="number"
                min={0}
                step={1}
                defaultValue={0}
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Fixed Reward Item
              <select
                name="reward_item_id"
                defaultValue=""
                className={inputClass}
              >
                <option value="">
                  None
                </option>

                {items.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              Quantity
              <input
                name="reward_item_quantity"
                type="number"
                min={0}
                step={1}
                defaultValue={0}
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Sort
              <input
                name="sort_order"
                type="number"
                min={0}
                step={1}
                defaultValue={1000}
                className={inputClass}
              />
            </label>

            <label className="flex items-center gap-2 pb-2 text-xs text-[rgb(var(--sep-colour-bca886))]">
              <input
                name="counts_toward_milestones"
                type="checkbox"
                defaultChecked
              />
              Milestones
            </label>

            <label className="flex items-center gap-2 pb-2 text-xs text-[rgb(var(--sep-colour-bca886))]">
              <input
                name="is_active"
                type="checkbox"
                defaultChecked
              />
              Active
            </label>
          </div>
        </AdminMissionForm>
      </section>

      <section className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-876a46))]">
          Completion rewards
        </p>

        <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dcc59a))]">
          Create Daily Milestone
        </h3>

        <AdminMissionForm
          action={createDailyMilestoneDefinition}
          className="mt-4 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-4"
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <label className={labelClass}>
              Name
              <input
                name="name"
                required
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Description
              <input
                name="description"
                required
                className={inputClass}
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[130px_110px_1fr_100px_100px_auto] md:items-end">
            <label className={labelClass}>
              Missions Required
              <input
                name="target_count"
                type="number"
                min={1}
                step={1}
                defaultValue={3}
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Remnants
              <input
                name="reward_remnants"
                type="number"
                min={0}
                step={1}
                defaultValue={0}
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Fixed Reward Item
              <select
                name="reward_item_id"
                defaultValue=""
                className={inputClass}
              >
                <option value="">
                  None
                </option>

                {items.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              Quantity
              <input
                name="reward_item_quantity"
                type="number"
                min={0}
                step={1}
                defaultValue={0}
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Sort
              <input
                name="sort_order"
                type="number"
                min={0}
                step={1}
                defaultValue={1000}
                className={inputClass}
              />
            </label>

            <div className="space-y-2 pb-1">
              <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-colour-bca886))]">
                <input
                  name="is_all"
                  type="checkbox"
                />
                Complete All
              </label>

              <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-colour-bca886))]">
                <input
                  name="is_active"
                  type="checkbox"
                  defaultChecked
                />
                Active
              </label>
            </div>
          </div>

          <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-938673))]">
            If Complete All is checked,
            Missions Required is ignored by
            completion logic.
          </p>
        </AdminMissionForm>
      </section>

      <section
        id="mission-catalogue"
        className="mt-7 space-y-3"
      >
        <div className="mb-3">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-876a46))]">
            Catalogue
          </p>

          <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dcc59a))]">
            Normal Daily Missions
          </h3>
        </div>

        {missions.map((mission) => (
          <AdminMissionForm
            key={mission.id}
            id={`mission-${mission.code}`}
            action={
              updateDailyMissionDefinition
            }
            className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
          >
            <input
              type="hidden"
              name="id"
              value={mission.id}
            />

            <div className="grid gap-3 lg:grid-cols-[1fr_1.5fr_110px_120px]">
              <label className={labelClass}>
                Name
                <input
                  name="name"
                  defaultValue={mission.name}
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Description
                <input
                  name="description"
                  defaultValue={
                    mission.description
                  }
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Target
                <input
                  name="target_value"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={
                    mission.target_value
                  }
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Difficulty
                <select
                  name="difficulty"
                  defaultValue={
                    mission.difficulty
                  }
                  className={inputClass}
                >
                  <option value="easy">
                    Easy
                  </option>
                  <option value="medium">
                    Medium
                  </option>
                  <option value="hard">
                    Hard
                  </option>
                </select>
              </label>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[120px_1fr_110px_auto_auto_auto] md:items-end">
              <label className={labelClass}>
                Remnants
                <input
                  name="reward_remnants"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={
                    mission.reward_remnants
                  }
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Reward Item
                <select
                  name="reward_item_id"
                  defaultValue={
                    mission.reward_item_id ??
                    ""
                  }
                  className={inputClass}
                >
                  <option value="">
                    None
                  </option>

                  {items.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                Quantity
                <input
                  name="reward_item_quantity"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={
                    mission.reward_item_quantity
                  }
                  className={inputClass}
                />
              </label>

              <label className="flex items-center gap-2 pb-2 text-xs text-[rgb(var(--sep-colour-bca886))]">
                <input
                  name="counts_toward_milestones"
                  type="checkbox"
                  defaultChecked={
                    mission.counts_toward_milestones
                  }
                />
                Milestones
              </label>

              <label className="flex items-center gap-2 pb-2 text-xs text-[rgb(var(--sep-colour-bca886))]">
                <input
                  name="is_active"
                  type="checkbox"
                  defaultChecked={
                    mission.is_active
                  }
                />
                Active
              </label>

              <div aria-hidden="true" />
            </div>

            <DailyMissionRewardPoolEditor
              owner={{
                type: "mission",
                id: mission.id,
              }}
              items={items}
              entries={rewardPoolEntries.filter(
                (entry) =>
                  entry.mission_definition_id ===
                  mission.id,
              )}
            />

            <p className="mt-2 text-[10px] text-[rgb(var(--sep-colour-938673))]">
              {mission.family} ·{" "}
              {mission.objective_type} ·{" "}
              {mission.code}
            </p>
          </AdminMissionForm>
        ))}
      </section>

      <section
        id="mission-milestones"
        className="mt-9"
      >
        <div className="mb-3">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-876a46))]">
            Completion rewards
          </p>

          <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dcc59a))]">
            Daily Milestones
          </h3>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {milestones.map(
            (milestone) => (
              <AdminMissionForm
                key={
                  milestone.milestone_key
                }
                id={`milestone-${milestone.milestone_key}`}
                action={
                  updateDailyMilestoneDefinition
                }
                className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
              >
                <input
                  type="hidden"
                  name="milestone_key"
                  value={
                    milestone.milestone_key
                  }
                />

                <label
                  className={`block ${labelClass}`}
                >
                  Name
                  <input
                    name="name"
                    defaultValue={
                      milestone.name
                    }
                    className={inputClass}
                  />
                </label>

                <label
                  className={`mt-3 block ${labelClass}`}
                >
                  Description
                  <input
                    name="description"
                    defaultValue={
                      milestone.description
                    }
                    className={inputClass}
                  />
                </label>

                <div className="mt-3 grid gap-3 md:grid-cols-[130px_110px_1fr_100px_auto_auto] md:items-end">
                  <label
                    className={
                      labelClass
                    }
                  >
                    Missions Required
                    <input
                      name="target_count"
                      type="number"
                      min={1}
                      step={1}
                      defaultValue={
                        milestone.target_count ??
                        1
                      }
                      className={
                        inputClass
                      }
                    />
                  </label>

                  <label
                    className={
                      labelClass
                    }
                  >
                    Remnants
                    <input
                      name="reward_remnants"
                      type="number"
                      min={0}
                      step={1}
                      defaultValue={
                        milestone.reward_remnants
                      }
                      className={
                        inputClass
                      }
                    />
                  </label>

                  <label
                    className={
                      labelClass
                    }
                  >
                    Reward Item
                    <select
                      name="reward_item_id"
                      defaultValue={
                        milestone.reward_item_id ??
                        ""
                      }
                      className={
                        inputClass
                      }
                    >
                      <option value="">
                        None
                      </option>

                      {items.map(
                        (item) => (
                          <option
                            key={
                              item.id
                            }
                            value={
                              item.id
                            }
                          >
                            {
                              item.name
                            }
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label
                    className={
                      labelClass
                    }
                  >
                    Quantity
                    <input
                      name="reward_item_quantity"
                      type="number"
                      min={0}
                      step={1}
                      defaultValue={
                        milestone.reward_item_quantity
                      }
                      className={
                        inputClass
                      }
                    />
                  </label>

                  <label className="flex items-center gap-2 pb-2 text-xs text-[rgb(var(--sep-colour-bca886))]">
                    <input
                      name="is_all"
                      type="checkbox"
                      defaultChecked={
                        milestone.is_all
                      }
                    />
                    Complete All
                  </label>

                  <label className="flex items-center gap-2 pb-2 text-xs text-[rgb(var(--sep-colour-bca886))]">
                    <input
                      name="is_active"
                      type="checkbox"
                      defaultChecked={
                        milestone.is_active
                      }
                    />
                    Active
                  </label>
                </div>

                <DailyMissionRewardPoolEditor
                  owner={{
                    type: "milestone",
                    id:
                      milestone.milestone_key,
                  }}
                  items={items}
                  entries={rewardPoolEntries.filter(
                    (entry) =>
                      entry.milestone_key ===
                      milestone.milestone_key,
                  )}
                />
              </AdminMissionForm>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
