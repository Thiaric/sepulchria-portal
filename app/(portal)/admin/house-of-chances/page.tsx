import { AdminActionForm } from "@/components/admin/admin-action-form";
import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatRemnants } from "@/lib/economy/currency";

import {
  addHouseOfChancesReward,
  createHouseOfChancesRule,
  deleteHouseOfChancesReward,
  deleteHouseOfChancesRule,
  updateHouseOfChancesRule,
  updateHouseOfChancesSettings,
} from "./actions";

type Settings = {
  id: number;
  is_open: boolean;
  play_cost: number;
  daily_play_limit: number;
  room_slug: string;
};

type Item = {
  id: string;
  name: string;
  quality: string;
  is_active: boolean;
};

type Reward = {
  id: string;
  rule_id: string;
  reward_type: "remnants" | "item";
  remnants_amount: number | null;
  item_id: string | null;
  quantity: number;
  sort_order: number;
  item:
    | { name: string; quality: string }
    | { name: string; quality: string }[]
    | null;
};

type Rule = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  sort_order: number;
  match_type:
    | "exact"
    | "all_equal"
    | "all_in_range"
    | "total_range"
    | "ordered_ranges";
  roll_1_min: number | null;
  roll_1_max: number | null;
  roll_2_min: number | null;
  roll_2_max: number | null;
  roll_3_min: number | null;
  roll_3_max: number | null;
  total_min: number | null;
  total_max: number | null;
};

type Play = {
  id: string;
  roll_1: number;
  roll_2: number;
  roll_3: number;
  cost_paid: number;
  matched_rule_name: string | null;
  created_at: string;
  character:
    | {
        display_name: string | null;
        first_name: string;
        surname: string;
      }
    | {
        display_name: string | null;
        first_name: string;
        surname: string;
      }[]
    | null;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function characterName(play: Play) {
  const character = one(play.character);
  if (!character) return "Unknown character";

  return (
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim() ||
    "Unnamed character"
  );
}

function ruleSummary(rule: Rule) {
  if (rule.match_type === "exact") {
    return `Exactly ${rule.roll_1_min} / ${rule.roll_2_min} / ${rule.roll_3_min}`;
  }

  if (rule.match_type === "all_equal") {
    const range =
      rule.roll_1_min !== null || rule.roll_1_max !== null
        ? ` (${rule.roll_1_min ?? 1}–${rule.roll_1_max ?? 100})`
        : "";
    return `All three equal${range}`;
  }

  if (rule.match_type === "all_in_range") {
    return `All three between ${rule.roll_1_min} and ${rule.roll_1_max}`;
  }

  if (rule.match_type === "total_range") {
    return `Total between ${rule.total_min} and ${rule.total_max}`;
  }

  return `R1 ${rule.roll_1_min}–${rule.roll_1_max} · R2 ${rule.roll_2_min}–${rule.roll_2_max} · R3 ${rule.roll_3_min}–${rule.roll_3_max}`;
}

const inputClass =
  "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]";

const buttonClass =
  "border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:bg-[rgb(var(--sep-colour-4a321e))]";

const dangerClass =
  "border border-red-900/60 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300 transition hover:bg-red-950/40";

function NumberField({
  name,
  placeholder,
  defaultValue,
  min = 1,
  max = 100,
}: {
  name: string;
  placeholder: string;
  defaultValue?: number | null;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      name={name}
      min={min}
      max={max}
      placeholder={placeholder}
      defaultValue={defaultValue ?? ""}
      className={[((inputClass)), "admin_house_of_chances_page_input_field"].filter(Boolean).join(" ")}
    />
  );
}

function RuleFields({ rule }: { rule?: Rule }) {
  return (
    <>
      <input
        name="name"
        required
        defaultValue={rule?.name ?? ""}
        placeholder="Rule name"
        className={[((inputClass)), "admin_house_of_chances_page_input_name"].filter(Boolean).join(" ")}
      />

      <select
        name="matchType"
        required
        defaultValue={rule?.match_type ?? "exact"}
        className={[((inputClass)), "admin_house_of_chances_page_select_match_type"].filter(Boolean).join(" ")}
      >
        <option className="admin_house_of_chances_page_option_exact" value="exact">Exact three rolls</option>
        <option className="admin_house_of_chances_page_option_all_equal" value="all_equal">All three equal</option>
        <option className="admin_house_of_chances_page_option_all_range" value="all_in_range">All three in shared range</option>
        <option className="admin_house_of_chances_page_option_total_range" value="total_range">Combined total range</option>
        <option className="admin_house_of_chances_page_option_ordered_ranges" value="ordered_ranges">Separate range per reel</option>
      </select>

      <input
        type="number"
        name="priority"
        defaultValue={rule?.priority ?? 0}
        min={-100000}
        max={100000}
        placeholder="Priority"
        className={[((inputClass)), "admin_house_of_chances_page_input_priority"].filter(Boolean).join(" ")}
      />

      <input
        type="number"
        name="sortOrder"
        defaultValue={rule?.sort_order ?? 0}
        min={0}
        max={100000}
        placeholder="Sort order"
        className={[((inputClass)), "admin_house_of_chances_page_input_sort_order"].filter(Boolean).join(" ")}
      />

      <textarea
        name="description"
        rows={2}
        defaultValue={rule?.description ?? ""}
        placeholder="Optional staff description"
        className={[((`${inputClass} md:col-span-2 xl:col-span-4`)), "admin_house_of_chances_page_textarea_description"].filter(Boolean).join(" ")}
      />

      <div className="grid gap-2 md:col-span-2 md:grid-cols-3 xl:col-span-4 xl:grid-cols-6 admin_house_of_chances_page_div_container">
        <NumberField name="roll1Min" placeholder="Roll 1 min / exact" defaultValue={rule?.roll_1_min} />
        <NumberField name="roll1Max" placeholder="Roll 1 max" defaultValue={rule?.roll_1_max} />
        <NumberField name="roll2Min" placeholder="Roll 2 min / exact" defaultValue={rule?.roll_2_min} />
        <NumberField name="roll2Max" placeholder="Roll 2 max" defaultValue={rule?.roll_2_max} />
        <NumberField name="roll3Min" placeholder="Roll 3 min / exact" defaultValue={rule?.roll_3_min} />
        <NumberField name="roll3Max" placeholder="Roll 3 max" defaultValue={rule?.roll_3_max} />
      </div>

      <div className="grid gap-2 md:col-span-2 md:grid-cols-2 xl:col-span-4 admin_house_of_chances_page_div_container_2">
        <NumberField name="totalMin" placeholder="Total min" defaultValue={rule?.total_min} min={3} max={300} />
        <NumberField name="totalMax" placeholder="Total max" defaultValue={rule?.total_max} min={3} max={300} />
      </div>

      <label className="flex items-center gap-2 text-xs text-[rgb(var(--sep-colour-aa987e))] admin_house_of_chances_page_label_label">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={rule?.is_active ?? true}
          className="accent-[rgb(var(--sep-colour-8b673d))] admin_house_of_chances_page_input_active"
        />
        Active
      </label>
    </>
  );
}

export default async function AdminHouseOfChancesPage() {
  await requireAdminSection("house_of_chances");
  const supabase = createAdminClient();

  const [settingsResult, rulesResult, rewardsResult, itemsResult, playsResult] =
    await Promise.all([
      supabase
        .from("house_of_chances_settings")
        .select("id, is_open, play_cost, daily_play_limit, room_slug")
        .eq("id", 1)
        .single(),
      supabase
        .from("house_of_chances_prize_rules")
        .select(`
          id,
          name,
          description,
          is_active,
          priority,
          sort_order,
          match_type,
          roll_1_min,
          roll_1_max,
          roll_2_min,
          roll_2_max,
          roll_3_min,
          roll_3_max,
          total_min,
          total_max
        `)
        .order("priority", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("house_of_chances_rule_rewards")
        .select(`
          id,
          rule_id,
          reward_type,
          remnants_amount,
          item_id,
          quantity,
          sort_order,
          item:items(name,quality)
        `)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("items")
        .select("id, name, quality, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("house_of_chances_plays")
        .select(`
          id,
          roll_1,
          roll_2,
          roll_3,
          cost_paid,
          matched_rule_name,
          created_at,
          character:characters(display_name,first_name,surname)
        `)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  const firstError =
    settingsResult.error ??
    rulesResult.error ??
    rewardsResult.error ??
    itemsResult.error ??
    playsResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load House of Chances administration: ${firstError.message}`,
    );
  }

  const settings = settingsResult.data as Settings;
  const rules = (rulesResult.data ?? []) as Rule[];
  const rewards = (rewardsResult.data ?? []) as unknown as Reward[];
  const items = (itemsResult.data ?? []) as Item[];
  const plays = (playsResult.data ?? []) as unknown as Play[];

  return (
    <main className="p-5 sm:p-7 lg:p-9 admin_house_of_chances_page_main_main">
      <div className="mx-auto max-w-7xl admin_house_of_chances_page_div_house_chances">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))] admin_house_of_chances_page_p_house_chances">
          Administration
        </p>
        <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))] admin_house_of_chances_page_h1_house_chances">
          House of Chances
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))] admin_house_of_chances_page_p_house_chances_2">
          Control the House, define winning combinations and decide exactly what fortune pays.
        </p>

        <section id="house-of-chances-settings" className="mt-8 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6 admin_house_of_chances_page_section_house_chances_settings">
          <div className="flex flex-wrap items-start justify-between gap-3 admin_house_of_chances_page_div_house_chances_settings">
            <div className="admin_house_of_chances_page_div_house_settings">
              <p className="text-[9px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] admin_house_of_chances_page_p_house_settings">Global controls</p>
              <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_house_of_chances_page_h2_house_settings">House Settings</h2>
            </div>
            <span className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] admin_house_of_chances_page_span_house_chances_settings">
              Room: {settings.room_slug}
            </span>
          </div>

          <AdminActionForm action={updateHouseOfChancesSettings} className="mt-5 grid gap-3 md:grid-cols-[160px_160px_minmax(180px,1fr)_auto]">
            <label className="admin_house_of_chances_page_label_house_chances_settings">
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] admin_house_of_chances_page_span_house_chances_settings_2">Cost per play</span>
              <input type="number" name="playCost" min={0} defaultValue={settings.play_cost} className={[((inputClass)), "admin_house_of_chances_page_input_play_cost"].filter(Boolean).join(" ")} />
            </label>

            <label className="admin_house_of_chances_page_label_house_chances_settings_2">
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] admin_house_of_chances_page_span_house_chances_settings_3">Daily limit</span>
              <input type="number" name="dailyPlayLimit" min={1} max={100} defaultValue={settings.daily_play_limit} className={[((inputClass)), "admin_house_of_chances_page_input_daily_play_limit"].filter(Boolean).join(" ")} />
            </label>

            <label className="flex items-end gap-2 pb-2 text-xs text-[rgb(var(--sep-colour-aa987e))] admin_house_of_chances_page_label_house_chances_settings_3">
              <input type="checkbox" name="isOpen" defaultChecked={settings.is_open} className="accent-[rgb(var(--sep-colour-8b673d))] admin_house_of_chances_page_input_open" />
              House open to players
            </label>

            <button type="submit" className={[((buttonClass)), "admin_house_of_chances_page_button_save_settings"].filter(Boolean).join(" ")}>Save Settings</button>
          </AdminActionForm>
        </section>

        <section id="house-of-chances-new-rule" className="mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6 admin_house_of_chances_page_section_house_chances_new_rule">
          <p className="text-[9px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] admin_house_of_chances_page_p_house_chances_new_rule">Prize rules</p>
          <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_house_of_chances_page_h2_house_chances_new_rule">Create Winning Rule</h2>
          <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))] admin_house_of_chances_page_p_house_chances_new_rule_2">
            If several rules match the same roll, the highest Priority wins. Exact rules use the three “min / exact” fields. All-equal may optionally use Roll 1 min/max as a permitted range.
          </p>

          <AdminActionForm action={createHouseOfChancesRule} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <RuleFields />
            <div className="flex justify-end md:col-span-2 xl:col-span-3 admin_house_of_chances_page_div_house_chances_new_rule">
              <button type="submit" className={[((buttonClass)), "admin_house_of_chances_page_button_create_rule"].filter(Boolean).join(" ")}>Create Rule</button>
            </div>
          </AdminActionForm>
        </section>

        <div className="mt-6 space-y-5 admin_house_of_chances_page_div_house_chances_2">
          {rules.length ? rules.map((rule) => {
            const ruleRewards = rewards.filter((reward) => reward.rule_id === rule.id);

            return (
              <section
                key={rule.id}
                id={`house-of-chances-rule-${rule.id}`}
                data-house-rule-id={rule.id}
                data-house-rule-name={rule.name}
                data-house-rule-match-type={rule.match_type}
                data-house-rule-priority={rule.priority}
                data-house-rule-roll-1-min={rule.roll_1_min ?? ""}
                data-house-rule-roll-1-max={rule.roll_1_max ?? ""}
                data-house-rule-roll-2-min={rule.roll_2_min ?? ""}
                data-house-rule-roll-2-max={rule.roll_2_max ?? ""}
                data-house-rule-roll-3-min={rule.roll_3_min ?? ""}
                data-house-rule-roll-3-max={rule.roll_3_max ?? ""}
                data-house-rule-total-min={rule.total_min ?? ""}
                data-house-rule-total-max={rule.total_max ?? ""}
                className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6 admin_house_of_chances_page_section_section"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 admin_house_of_chances_page_div_container_3">
                  <div className="admin_house_of_chances_page_div_container_4">
                    <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_house_of_chances_page_p_text">Priority {rule.priority}</p>
                    <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_house_of_chances_page_h2_heading">{rule.name}</h2>
                    <p className="mt-1 text-[10px] text-[rgb(var(--sep-colour-a99578))] admin_house_of_chances_page_p_text_2">{ruleSummary(rule)}</p>
                  </div>

                  <span className={[((["border px-2 py-1 text-[8px] uppercase tracking-[0.14em]", rule.is_active ? "border-emerald-900/50 text-emerald-400" : "border-[rgb(var(--sep-colour-60482e))]/45 text-[rgb(var(--sep-colour-756958))]"].join(" "))), "admin_house_of_chances_page_span_text"].filter(Boolean).join(" ")}>
                    {rule.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <AdminActionForm action={updateHouseOfChancesRule} className="mt-5 grid gap-3 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-5 md:grid-cols-2 xl:grid-cols-4">
                  <input className="admin_house_of_chances_page_input_rule_id" type="hidden" name="ruleId" value={rule.id} />
                  <RuleFields rule={rule} />
                  <div className="flex justify-end md:col-span-2 xl:col-span-3 admin_house_of_chances_page_div_container_5">
                    <button type="submit" className={[((buttonClass)), "admin_house_of_chances_page_button_save_rule"].filter(Boolean).join(" ")}>Save Rule</button>
                  </div>
                </AdminActionForm>

                <div className="mt-6 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-5 admin_house_of_chances_page_div_container_6">
                  <div className="flex flex-wrap items-center justify-between gap-3 admin_house_of_chances_page_div_container_7">
                    <div className="admin_house_of_chances_page_div_container_8">
                      <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_house_of_chances_page_p_text_3">Rewards</p>
                      <p className="mt-1 text-[10px] text-[rgb(var(--sep-colour-8f8271))] admin_house_of_chances_page_p_text_4">A winning rule may grant several rewards together.</p>
                    </div>
                    <span className="text-[8px] text-[rgb(var(--sep-colour-756958))] admin_house_of_chances_page_span_text_2">{ruleRewards.length} reward{ruleRewards.length === 1 ? "" : "s"}</span>
                  </div>

                  {ruleRewards.length ? (
                    <div className="mt-3 space-y-2 admin_house_of_chances_page_div_container_9">
                      {ruleRewards.map((reward) => {
                        const item = one(reward.item);
                        return (
                          <div key={reward.id} className="flex flex-wrap items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 admin_house_of_chances_page_div_container_10">
                            <span className="text-[10px] text-[rgb(var(--sep-colour-c3ad89))] admin_house_of_chances_page_span_text_3">
                              {reward.reward_type === "remnants"
                                ? `${formatRemnants(Number(reward.remnants_amount ?? 0))} Remnants`
                                : `${item?.name ?? "Unknown Item"} × ${reward.quantity}`}
                            </span>
                            <AdminActionForm action={deleteHouseOfChancesReward}>
                              <input className="admin_house_of_chances_page_input_reward_id" type="hidden" name="rewardId" value={reward.id} />
                              <button type="submit" className={[((dangerClass)), "admin_house_of_chances_page_button_remove"].filter(Boolean).join(" ")}>Remove</button>
                            </AdminActionForm>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-[10px] italic text-[rgb(var(--sep-colour-756958))] admin_house_of_chances_page_p_text_5">This rule currently wins nothing.</p>
                  )}

                  <AdminActionForm action={addHouseOfChancesReward} className="mt-4 grid gap-2 lg:grid-cols-[130px_minmax(190px,1fr)_130px_110px_90px_auto]">
                    <input className="admin_house_of_chances_page_input_rule_id_2" type="hidden" name="ruleId" value={rule.id} />

                    <select name="rewardType" defaultValue="remnants" className={[((inputClass)), "admin_house_of_chances_page_select_reward_type"].filter(Boolean).join(" ")}>
                      <option className="admin_house_of_chances_page_option_remnants" value="remnants">Remnants</option>
                      <option className="admin_house_of_chances_page_option_item" value="item">Item / Ingredient</option>
                    </select>

                    <select name="itemId" defaultValue="" className={[((inputClass)), "admin_house_of_chances_page_select_item_id"].filter(Boolean).join(" ")}>
                      <option className="admin_house_of_chances_page_option_item_id" value="">Choose Item when needed</option>
                      {items.map((item) => (
                        <option className="admin_house_of_chances_page_option_option" key={item.id} value={item.id}>{item.name} · {item.quality}</option>
                      ))}
                    </select>

                    <input type="number" name="remnantsAmount" min={1} placeholder="Remnants" className={[((inputClass)), "admin_house_of_chances_page_input_remnants_amount"].filter(Boolean).join(" ")} />
                    <input type="number" name="quantity" min={1} max={9999} defaultValue={1} placeholder="Quantity" className={[((inputClass)), "admin_house_of_chances_page_input_quantity"].filter(Boolean).join(" ")} />
                    <input type="number" name="sortOrder" min={0} defaultValue={0} placeholder="Order" className={[((inputClass)), "admin_house_of_chances_page_input_sort_order_2"].filter(Boolean).join(" ")} />
                    <button type="submit" className={[((buttonClass)), "admin_house_of_chances_page_button_add_reward"].filter(Boolean).join(" ")}>Add Reward</button>
                  </AdminActionForm>
                </div>

                <div className="mt-6 flex justify-end border-t border-red-950/40 pt-4 admin_house_of_chances_page_div_container_11">
                  <AdminActionForm action={deleteHouseOfChancesRule}>
                    <input className="admin_house_of_chances_page_input_rule_id_3" type="hidden" name="ruleId" value={rule.id} />
                    <button type="submit" className={[((dangerClass)), "admin_house_of_chances_page_button_delete_rule"].filter(Boolean).join(" ")}>Delete Rule</button>
                  </AdminActionForm>
                </div>
              </section>
            );
          }) : (
            <div className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] px-5 py-8 text-center text-[10px] text-[rgb(var(--sep-colour-756958))] admin_house_of_chances_page_div_container_12">
              No prize rules yet. Every successful play currently results in no winnings.
            </div>
          )}
        </div>

        <section id="house-of-chances-history" className="mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] admin_house_of_chances_page_section_house_chances_history">
          <div className="border-b border-[rgb(var(--sep-colour-60482e))]/30 p-5 sm:p-6 admin_house_of_chances_page_div_recent_plays">
            <p className="text-[9px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] admin_house_of_chances_page_p_recent_plays">Audit</p>
            <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_house_of_chances_page_h2_recent_plays">Recent Plays</h2>
          </div>

          <div className="max-h-[520px] overflow-y-auto admin_house_of_chances_page_div_house_chances_history">
            {plays.length ? plays.map((play) => (
              <div
                key={play.id}
                id={`house-of-chances-play-${play.id}`}
                data-house-play-id={play.id}
                data-house-play-character={characterName(play)}
                data-house-play-rule={play.matched_rule_name ?? "No winnings"}
                data-house-play-date={new Date(play.created_at).toLocaleString("en-GB")}
                data-house-play-roll-1={play.roll_1}
                data-house-play-roll-2={play.roll_2}
                data-house-play-roll-3={play.roll_3}
                className="scroll-mt-6 grid gap-2 border-b border-[rgb(var(--sep-colour-59432c))]/25 px-4 py-3 last:border-b-0 md:grid-cols-[minmax(180px,1fr)_150px_120px_minmax(150px,1fr)_150px] md:items-center admin_house_of_chances_page_div_container_13"
              >
                <span className="text-[10px] text-[rgb(var(--sep-colour-c3ad89))] admin_house_of_chances_page_span_text_4">{characterName(play)}</span>
                <span className="font-serif text-sm text-[rgb(var(--sep-colour-dfc99f))] admin_house_of_chances_page_span_text_5">{play.roll_1} / {play.roll_2} / {play.roll_3}</span>
                <span className="text-[9px] text-[rgb(var(--sep-colour-a99578))] admin_house_of_chances_page_span_text_6">Cost {formatRemnants(play.cost_paid)}</span>
                <span className="text-[9px] text-[rgb(var(--sep-colour-a99578))] admin_house_of_chances_page_span_text_7">{play.matched_rule_name ?? "No winnings"}</span>
                <time className="text-[8px] text-[rgb(var(--sep-colour-665b4d))] md:text-right">{new Date(play.created_at).toLocaleString("en-GB")}</time>
              </div>
            )) : (
              <p className="px-5 py-8 text-center text-[10px] text-[rgb(var(--sep-colour-756958))] admin_house_of_chances_page_p_text_6">No House of Chances plays recorded yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
