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
    <div className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-7 lg:px-9 admin_missions_page_div_container">
      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/45 pb-5 admin_missions_page_header_daily_missions">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))] admin_missions_page_p_daily_missions">
          Mission management
        </p>

        <h2 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))] admin_missions_page_h2_daily_missions">
          Daily Missions
        </h2>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-938673))] admin_missions_page_p_daily_missions_2">
          Configure targets, availability,
          milestone eligibility and rewards.
        </p>
      </header>

      <section className="mt-7 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 admin_missions_page_section_create_daily_mission">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-876a46))] admin_missions_page_p_create_daily_mission">
          Catalogue management
        </p>

        <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dcc59a))] admin_missions_page_h3_create_daily_mission">
          Create Daily Mission
        </h3>

        <p className="mt-1 text-xs leading-5 text-[rgb(var(--sep-colour-938673))] admin_missions_page_p_create_daily_mission_2">
          Active missions are included in
          today&apos;s Daily Mission set.
          After creation, configure its
          curated Item pool on the mission card.
        </p>

        <AdminMissionForm
          action={createDailyMissionDefinition}
          className="mt-4 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-4"
        >
          <div className="grid gap-3 lg:grid-cols-2 admin_missions_page_div_name">
            <label className={[((labelClass)), "admin_missions_page_label_name"].filter(Boolean).join(" ")}>
              Name
              <input
                name="name"
                required
                className={[((inputClass)), "admin_missions_page_input_name"].filter(Boolean).join(" ")}
              />
            </label>

            <label className={[((labelClass)), "admin_missions_page_label_name_2"].filter(Boolean).join(" ")}>
              Description
              <input
                name="description"
                required
                className={[((inputClass)), "admin_missions_page_input_description"].filter(Boolean).join(" ")}
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1.4fr_100px_120px] admin_missions_page_div_family">
            <label className={[((labelClass)), "admin_missions_page_label_family"].filter(Boolean).join(" ")}>
              Family
              <select
                name="family"
                defaultValue="Gathering"
                className={[((inputClass)), "admin_missions_page_select_family"].filter(Boolean).join(" ")}
              >
                {MISSION_FAMILIES.map(
                  (family) => (
                    <option className="admin_missions_page_option_option"
                      key={family}
                      value={family}
                    >
                      {family}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className={[((labelClass)), "admin_missions_page_label_family_2"].filter(Boolean).join(" ")}>
              Objective
              <select
                name="objective_type"
                defaultValue="gather_attempts"
                className={[((inputClass)), "admin_missions_page_select_objective_type"].filter(Boolean).join(" ")}
              >
                {OBJECTIVES.map(
                  ([value, label]) => (
                    <option className="admin_missions_page_option_option_2"
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className={[((labelClass)), "admin_missions_page_label_family_3"].filter(Boolean).join(" ")}>
              Target
              <input
                name="target_value"
                type="number"
                min={1}
                step={1}
                defaultValue={1}
                className={[((inputClass)), "admin_missions_page_input_family"].filter(Boolean).join(" ")}
              />
            </label>

            <label className={[((labelClass)), "admin_missions_page_label_family_4"].filter(Boolean).join(" ")}>
              Difficulty
              <select
                name="difficulty"
                defaultValue="easy"
                className={[((inputClass)), "admin_missions_page_select_difficulty"].filter(Boolean).join(" ")}
              >
                <option className="admin_missions_page_option_easy" value="easy">
                  Easy
                </option>
                <option className="admin_missions_page_option_medium" value="medium">
                  Medium
                </option>
                <option className="admin_missions_page_option_hard" value="hard">
                  Hard
                </option>
              </select>
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[110px_1fr_100px_100px_auto_auto] md:items-end admin_missions_page_div_remnants">
            <label className={[((labelClass)), "admin_missions_page_label_remnants"].filter(Boolean).join(" ")}>
              Remnants
              <input
                name="reward_remnants"
                type="number"
                min={0}
                step={1}
                defaultValue={0}
                className={[((inputClass)), "admin_missions_page_input_reward_remnants"].filter(Boolean).join(" ")}
              />
            </label>

            <label className={[((labelClass)), "admin_missions_page_label_remnants_2"].filter(Boolean).join(" ")}>
              Fixed Reward Item
              <select
                name="reward_item_id"
                defaultValue=""
                className={[((inputClass)), "admin_missions_page_select_reward_item_id"].filter(Boolean).join(" ")}
              >
                <option className="admin_missions_page_option_reward_item_id" value="">
                  None
                </option>

                {items.map((item) => (
                  <option className="admin_missions_page_option_option_3"
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={[((labelClass)), "admin_missions_page_label_remnants_3"].filter(Boolean).join(" ")}>
              Quantity
              <input
                name="reward_item_quantity"
                type="number"
                min={0}
                step={1}
                defaultValue={0}
                className={[((inputClass)), "admin_missions_page_input_reward_item_quantity"].filter(Boolean).join(" ")}
              />
            </label>

            <label className={[((labelClass)), "admin_missions_page_label_remnants_4"].filter(Boolean).join(" ")}>
              Sort
              <input
                name="sort_order"
                type="number"
                min={0}
                step={1}
                defaultValue={1000}
                className={[((inputClass)), "admin_missions_page_input_sort_order"].filter(Boolean).join(" ")}
              />
            </label>

            <label className="flex items-center gap-2 pb-2 text-xs text-[rgb(var(--sep-colour-bca886))] admin_missions_page_label_remnants_5">
              <input className="admin_missions_page_input_counts_toward_milestones"
                name="counts_toward_milestones"
                type="checkbox"
                defaultChecked
              />
              Milestones
            </label>

            <label className="flex items-center gap-2 pb-2 text-xs text-[rgb(var(--sep-colour-bca886))] admin_missions_page_label_remnants_6">
              <input className="admin_missions_page_input_active"
                name="is_active"
                type="checkbox"
                defaultChecked
              />
              Active
            </label>
          </div>
        </AdminMissionForm>
      </section>

      <section className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 admin_missions_page_section_create_daily_milestone">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-876a46))] admin_missions_page_p_create_daily_milestone">
          Completion rewards
        </p>

        <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dcc59a))] admin_missions_page_h3_create_daily_milestone">
          Create Daily Milestone
        </h3>

        <AdminMissionForm
          action={createDailyMilestoneDefinition}
          className="mt-4 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-4"
        >
          <div className="grid gap-3 lg:grid-cols-2 admin_missions_page_div_name_2">
            <label className={[((labelClass)), "admin_missions_page_label_name_3"].filter(Boolean).join(" ")}>
              Name
              <input
                name="name"
                required
                className={[((inputClass)), "admin_missions_page_input_name_2"].filter(Boolean).join(" ")}
              />
            </label>

            <label className={[((labelClass)), "admin_missions_page_label_name_4"].filter(Boolean).join(" ")}>
              Description
              <input
                name="description"
                required
                className={[((inputClass)), "admin_missions_page_input_description_2"].filter(Boolean).join(" ")}
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[130px_110px_1fr_100px_100px_auto] md:items-end admin_missions_page_div_missions_required">
            <label className={[((labelClass)), "admin_missions_page_label_missions_required"].filter(Boolean).join(" ")}>
              Missions Required
              <input
                name="target_count"
                type="number"
                min={1}
                step={1}
                defaultValue={3}
                className={[((inputClass)), "admin_missions_page_input_missions_required"].filter(Boolean).join(" ")}
              />
            </label>

            <label className={[((labelClass)), "admin_missions_page_label_missions_required_2"].filter(Boolean).join(" ")}>
              Remnants
              <input
                name="reward_remnants"
                type="number"
                min={0}
                step={1}
                defaultValue={0}
                className={[((inputClass)), "admin_missions_page_input_reward_remnants_2"].filter(Boolean).join(" ")}
              />
            </label>

            <label className={[((labelClass)), "admin_missions_page_label_missions_required_3"].filter(Boolean).join(" ")}>
              Fixed Reward Item
              <select
                name="reward_item_id"
                defaultValue=""
                className={[((inputClass)), "admin_missions_page_select_reward_item_id_2"].filter(Boolean).join(" ")}
              >
                <option className="admin_missions_page_option_reward_item_id_2" value="">
                  None
                </option>

                {items.map((item) => (
                  <option className="admin_missions_page_option_option_4"
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={[((labelClass)), "admin_missions_page_label_missions_required_4"].filter(Boolean).join(" ")}>
              Quantity
              <input
                name="reward_item_quantity"
                type="number"
                min={0}
                step={1}
                defaultValue={0}
                className={[((inputClass)), "admin_missions_page_input_reward_item_quantity_2"].filter(Boolean).join(" ")}
              />
            </label>

            <label className={[((labelClass)), "admin_missions_page_label_missions_required_5"].filter(Boolean).join(" ")}>
              Sort
              <input
                name="sort_order"
                type="number"
                min={0}
                step={1}
                defaultValue={1000}
                className={[((inputClass)), "admin_missions_page_input_sort_order_2"].filter(Boolean).join(" ")}
              />
            </label>

            <div className="space-y-2 pb-1 admin_missions_page_div_complete_all">
              <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-colour-bca886))] admin_missions_page_label_complete_all">
                <input className="admin_missions_page_input_all"
                  name="is_all"
                  type="checkbox"
                />
                Complete All
              </label>

              <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-colour-bca886))] admin_missions_page_label_complete_all_2">
                <input className="admin_missions_page_input_active_2"
                  name="is_active"
                  type="checkbox"
                  defaultChecked
                />
                Active
              </label>
            </div>
          </div>

          <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-938673))] admin_missions_page_p_create_daily_milestone_2">
            If Complete All is checked,
            Missions Required is ignored by
            completion logic.
          </p>
        </AdminMissionForm>
      </section>

      <section
        id="mission-catalogue"
        className="mt-7 space-y-3 admin_missions_page_section_mission_catalogue"
      >
        <div className="mb-3 admin_missions_page_div_normal_daily_missions">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-876a46))] admin_missions_page_p_normal_daily_missions">
            Catalogue
          </p>

          <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dcc59a))] admin_missions_page_h3_normal_daily_missions">
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
            <input className="admin_missions_page_input_id"
              type="hidden"
              name="id"
              value={mission.id}
            />

            <div className="grid gap-3 lg:grid-cols-[1fr_1.5fr_110px_120px] admin_missions_page_div_name_3">
              <label className={[((labelClass)), "admin_missions_page_label_name_5"].filter(Boolean).join(" ")}>
                Name
                <input
                  name="name"
                  defaultValue={mission.name}
                  className={[((inputClass)), "admin_missions_page_input_name_3"].filter(Boolean).join(" ")}
                />
              </label>

              <label className={[((labelClass)), "admin_missions_page_label_name_6"].filter(Boolean).join(" ")}>
                Description
                <input
                  name="description"
                  defaultValue={
                    mission.description
                  }
                  className={[((inputClass)), "admin_missions_page_input_description_3"].filter(Boolean).join(" ")}
                />
              </label>

              <label className={[((labelClass)), "admin_missions_page_label_name_7"].filter(Boolean).join(" ")}>
                Target
                <input
                  name="target_value"
                  type="number"
                  min={1}
                  step={1}
                  defaultValue={
                    mission.target_value
                  }
                  className={[((inputClass)), "admin_missions_page_input_name_4"].filter(Boolean).join(" ")}
                />
              </label>

              <label className={[((labelClass)), "admin_missions_page_label_name_8"].filter(Boolean).join(" ")}>
                Difficulty
                <select
                  name="difficulty"
                  defaultValue={
                    mission.difficulty
                  }
                  className={[((inputClass)), "admin_missions_page_select_difficulty_2"].filter(Boolean).join(" ")}
                >
                  <option className="admin_missions_page_option_easy_2" value="easy">
                    Easy
                  </option>
                  <option className="admin_missions_page_option_medium_2" value="medium">
                    Medium
                  </option>
                  <option className="admin_missions_page_option_hard_2" value="hard">
                    Hard
                  </option>
                </select>
              </label>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[120px_1fr_110px_auto_auto_auto] md:items-end admin_missions_page_div_remnants_2">
              <label className={[((labelClass)), "admin_missions_page_label_remnants_7"].filter(Boolean).join(" ")}>
                Remnants
                <input
                  name="reward_remnants"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={
                    mission.reward_remnants
                  }
                  className={[((inputClass)), "admin_missions_page_input_reward_remnants_3"].filter(Boolean).join(" ")}
                />
              </label>

              <label className={[((labelClass)), "admin_missions_page_label_remnants_8"].filter(Boolean).join(" ")}>
                Reward Item
                <select
                  name="reward_item_id"
                  defaultValue={
                    mission.reward_item_id ??
                    ""
                  }
                  className={[((inputClass)), "admin_missions_page_select_reward_item_id_3"].filter(Boolean).join(" ")}
                >
                  <option className="admin_missions_page_option_reward_item_id_3" value="">
                    None
                  </option>

                  {items.map((item) => (
                    <option className="admin_missions_page_option_option_5"
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={[((labelClass)), "admin_missions_page_label_remnants_9"].filter(Boolean).join(" ")}>
                Quantity
                <input
                  name="reward_item_quantity"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={
                    mission.reward_item_quantity
                  }
                  className={[((inputClass)), "admin_missions_page_input_reward_item_quantity_3"].filter(Boolean).join(" ")}
                />
              </label>

              <label className="flex items-center gap-2 pb-2 text-xs text-[rgb(var(--sep-colour-bca886))] admin_missions_page_label_remnants_10">
                <input className="admin_missions_page_input_counts_toward_milestones_2"
                  name="counts_toward_milestones"
                  type="checkbox"
                  defaultChecked={
                    mission.counts_toward_milestones
                  }
                />
                Milestones
              </label>

              <label className="flex items-center gap-2 pb-2 text-xs text-[rgb(var(--sep-colour-bca886))] admin_missions_page_label_remnants_11">
                <input className="admin_missions_page_input_active_3"
                  name="is_active"
                  type="checkbox"
                  defaultChecked={
                    mission.is_active
                  }
                />
                Active
              </label>

              <div className="admin_missions_page_div_remnants_3" aria-hidden="true" />
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

            <p className="mt-2 text-[10px] text-[rgb(var(--sep-colour-938673))] admin_missions_page_p_text">
              {mission.family} ·{" "}
              {mission.objective_type} ·{" "}
              {mission.code}
            </p>
          </AdminMissionForm>
        ))}
      </section>

      <section
        id="mission-milestones"
        className="mt-9 admin_missions_page_section_mission_milestones"
      >
        <div className="mb-3 admin_missions_page_div_daily_milestones">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-876a46))] admin_missions_page_p_daily_milestones">
            Completion rewards
          </p>

          <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dcc59a))] admin_missions_page_h3_daily_milestones">
            Daily Milestones
          </h3>
        </div>

        <div className="grid gap-3 lg:grid-cols-2 admin_missions_page_div_mission_milestones">
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
                <input className="admin_missions_page_input_field"
                  type="hidden"
                  name="milestone_key"
                  value={
                    milestone.milestone_key
                  }
                />

                <label
                  className={[((`block ${labelClass}`)), "admin_missions_page_label_label"].filter(Boolean).join(" ")}
                >
                  Name
                  <input
                    name="name"
                    defaultValue={
                      milestone.name
                    }
                    className={[((inputClass)), "admin_missions_page_input_name_5"].filter(Boolean).join(" ")}
                  />
                </label>

                <label
                  className={[((`mt-3 block ${labelClass}`)), "admin_missions_page_label_label_2"].filter(Boolean).join(" ")}
                >
                  Description
                  <input
                    name="description"
                    defaultValue={
                      milestone.description
                    }
                    className={[((inputClass)), "admin_missions_page_input_description_4"].filter(Boolean).join(" ")}
                  />
                </label>

                <div className="mt-3 grid gap-3 md:grid-cols-[130px_110px_1fr_100px_auto_auto] md:items-end admin_missions_page_div_missions_required_2">
                  <label
                    className={[((labelClass)), "admin_missions_page_label_missions_required_6"].filter(Boolean).join(" ")}
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
                      className={[((inputClass)), "admin_missions_page_input_missions_required_2"].filter(Boolean).join(" ")}
                    />
                  </label>

                  <label
                    className={[((labelClass)), "admin_missions_page_label_missions_required_7"].filter(Boolean).join(" ")}
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
                      className={[((inputClass)), "admin_missions_page_input_reward_remnants_4"].filter(Boolean).join(" ")}
                    />
                  </label>

                  <label
                    className={[((labelClass)), "admin_missions_page_label_missions_required_8"].filter(Boolean).join(" ")}
                  >
                    Reward Item
                    <select
                      name="reward_item_id"
                      defaultValue={
                        milestone.reward_item_id ??
                        ""
                      }
                      className={[((inputClass)), "admin_missions_page_select_reward_item_id_4"].filter(Boolean).join(" ")}
                    >
                      <option className="admin_missions_page_option_reward_item_id_4" value="">
                        None
                      </option>

                      {items.map(
                        (item) => (
                          <option className="admin_missions_page_option_option_6"
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
                    className={[((labelClass)), "admin_missions_page_label_missions_required_9"].filter(Boolean).join(" ")}
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
                      className={[((inputClass)), "admin_missions_page_input_reward_item_quantity_4"].filter(Boolean).join(" ")}
                    />
                  </label>

                  <label className="flex items-center gap-2 pb-2 text-xs text-[rgb(var(--sep-colour-bca886))] admin_missions_page_label_missions_required_10">
                    <input className="admin_missions_page_input_all_2"
                      name="is_all"
                      type="checkbox"
                      defaultChecked={
                        milestone.is_all
                      }
                    />
                    Complete All
                  </label>

                  <label className="flex items-center gap-2 pb-2 text-xs text-[rgb(var(--sep-colour-bca886))] admin_missions_page_label_missions_required_11">
                    <input className="admin_missions_page_input_active_4"
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
