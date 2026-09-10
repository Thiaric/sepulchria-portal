

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { GiftEffectFormLogic } from "@/components/admin/gift-effect-form-logic";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

import {
  assignGiftToCharacter,
  createGift,
  deleteGift,
  removeGiftFromCharacter,
  updateGift,
} from "./actions";

type Race = { id: string; name: string };
type Character = { id: string; display_name: string };

type Gift = {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  is_general: boolean;
  effect_mode: "none" | "passive" | "temporary";
  target_mode: "self" | "other" | "either";
  damage_dice: string | null;
  damage_type: string | null;
  success_die: number | null;
  success_threshold: number | null;
  success_attribute:
    | "muscles"
    | "reflexes"
    | "vigor"
    | "brains"
    | "shrewd"
    | "presence_score"
    | null;
  duration_minutes: number | null;
  cooldown_minutes: number;
  health_delta: number;
  max_health_modifier: number;
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  shrewd_modifier: number;
  brains_modifier: number;
  presence_modifier: number;
  warping_affinity_modifier: number;
  warps_per_day_modifier: number;
  sort_order: number;
  races: { race_id: string }[] | null;
  roles: { order_job_id: string }[] | null;
  assignments: {
    id: string;
    character_id: string;
    acquisition_source: "ancestry" | "order" | "staff";
    expires_at: string | null;
  }[] | null;
};

type LevelRow = {
  level: number;
  order: { id: string; name: string } | { id: string; name: string }[] | null;
  roles: { id: string; name: string; sort_order: number }[] | null;
};

type Props = {
  searchParams?: Promise<{ success?: string; error?: string }>;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

const ADMIN_SUCCESS_ATTRIBUTE_LABELS: Record<
  NonNullable<Gift["success_attribute"]>,
  string
> = {
  muscles: "Muscles",
  reflexes: "Reflexes",
  vigor: "Vigour",
  brains: "Brains",
  shrewd: "Shrewd",
  presence_score: "Presence",
};

function adminTargetLabel(gift: Gift) {
  if (gift.target_mode === "other") return "Other";
  if (gift.target_mode === "either") return "Self / Other";
  return "Self";
}

function adminSuccessLabel(gift: Gift) {
  if (gift.effect_mode === "passive") return "No roll";

  if (!gift.success_die || !gift.success_threshold) {
    return "Automatic";
  }

  const attribute = gift.success_attribute
    ? ` + ${ADMIN_SUCCESS_ATTRIBUTE_LABELS[gift.success_attribute]}`
    : "";

  return `d${gift.success_die}${attribute} ≥ ${gift.success_threshold}`;
}

function adminDurationLabel(gift: Gift) {
  if (gift.effect_mode === "passive") return "Permanent";
  if (gift.effect_mode !== "temporary") return "Instant use";
  if (gift.duration_minutes === 0) return "Instantaneous";

  return gift.duration_minutes
    ? `${gift.duration_minutes} min`
    : "Not set";
}

function adminModifierLabel(gift: Gift) {
  const values = [
    ["Mus", gift.muscles_modifier],
    ["Ref", gift.reflexes_modifier],
    ["Vig", gift.vigour_modifier],
    ["Shr", gift.shrewd_modifier],
    ["Bra", gift.brains_modifier],
    ["Pre", gift.presence_modifier],
    ["Affinity", gift.warping_affinity_modifier],
    ["Shapes/day", gift.warps_per_day_modifier],
  ]
    .filter(([, value]) => Number(value) !== 0)
    .map(([label, value]) => {
      const number = Number(value);
      return `${label} ${number > 0 ? "+" : ""}${number}`;
    });

  return values.length ? values.join(" · ") : "None";
}

export default async function AdminGiftsPage({ searchParams }: Props) {
  await requireAdminSection("gifts");
  const params = (await searchParams) ?? {};
  const supabase = await createClient();

  const [giftsResult, racesResult, levelsResult, charactersResult] =
    await Promise.all([
      supabase
        .from("gifts")
        .select(`
          id, name, description, is_active, is_general, effect_mode,
          target_mode, damage_dice, damage_type,
          success_die, success_threshold, success_attribute,
          duration_minutes, cooldown_minutes, health_delta, max_health_modifier,
          muscles_modifier, reflexes_modifier,
          vigour_modifier, shrewd_modifier, brains_modifier,
          presence_modifier, warping_affinity_modifier, warps_per_day_modifier, sort_order,
          races:gift_races(race_id),
          roles:gift_order_jobs(order_job_id),
          assignments:character_gifts(
            id, character_id, acquisition_source, expires_at
          )
        `)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      supabase
        .from("races")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),

      supabase
        .from("order_levels")
        .select(`
          level,
          order:orders(id, name),
          roles:order_jobs(id, name, sort_order)
        `)
        .order("level", { ascending: false }),

      supabase
        .from("characters")
        .select("id, display_name")
        .eq("status", "approved")
      .eq("is_system", false)
        .order("display_name", { ascending: true }),
    ]);

  const firstError =
    giftsResult.error ??
    racesResult.error ??
    levelsResult.error ??
    charactersResult.error;

  if (firstError) {
    throw new Error(`Unable to load Feat management: ${firstError.message}`);
  }

  const gifts = (giftsResult.data ?? []) as unknown as Gift[];
  const races = (racesResult.data ?? []) as Race[];
  const characters = (charactersResult.data ?? []) as Character[];

  const roles = ((levelsResult.data ?? []) as unknown as LevelRow[])
    .flatMap((level) => {
      const order = one(level.order);
      return (level.roles ?? []).map((role) => ({
        ...role,
        level: level.level,
        orderName: order?.name ?? "Unknown Order",
      }));
    })
    .sort(
      (a, b) =>
        a.orderName.localeCompare(b.orderName) ||
        b.level - a.level ||
        a.sort_order - b.sort_order ||
        a.name.localeCompare(b.name),
    );

  const characterById = new Map(
    characters.map((character) => [character.id, character]),
  );

  return (
    <main className="p-5 sm:p-7 lg:p-9 admin_gifts_page_main_main">
      <div className="mx-auto max-w-7xl admin_gifts_page_div_container">
        <div className="admin_gifts_page_div_feat_management">
          <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))] admin_gifts_page_p_feat_management">
            Administration
          </p>
          <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))] admin_gifts_page_h1_feat_management">
            Feat Management
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))] admin_gifts_page_p_feat_management_2">
            Create Feats, configure Attribute, Health, duration and cooldown effects,
            link Ancestries and Order Roles, and assign Feats directly to characters.
          </p>
        </div>

        {params.success ? (
          <div className="mt-6 border border-emerald-800/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-400 admin_gifts_page_div_container_2">
            {params.success}
          </div>
        ) : null}

        {params.error ? (
          <div className="mt-6 border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-400 admin_gifts_page_div_container_3">
            {params.error}
          </div>
        ) : null}

        <section
          id="gift-new"
          className="mt-8 scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6 admin_gifts_page_section_gift_new"
        >
          <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))] admin_gifts_page_p_gift_new">
            New Feat
          </p>
          <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))] admin_gifts_page_h2_gift_new">
            Create a Feat
          </h2>

          <GiftForm
            action={createGift}
            races={races}
            roles={roles}
          />
        </section>

        <div className="mt-6 space-y-4 admin_gifts_page_div_container_4">
          {gifts.map((gift) => (
            <details
              key={gift.id}
              id={`gift-${gift.id}`}
              className="scroll-mt-6 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] admin_gifts_page_details_details"
            >
              <summary className="cursor-pointer list-none px-4 py-4 admin_gifts_page_summary_summary">
                <div className="flex items-start justify-between gap-3 admin_gifts_page_div_container_5">
                  <div className="min-w-0 admin_gifts_page_div_container_6">
                    <p className="truncate font-serif text-lg text-[rgb(var(--sep-colour-d8bf91))] admin_gifts_page_p_text">
                      {gift.name}
                    </p>
                    <p className="mt-1 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-766956))] admin_gifts_page_p_text_2">
                      {gift.effect_mode === "passive"
                        ? "Passive"
                        : "Activated"}
                      {gift.is_general ? " · General" : ""}
                      {" · "}
                      {gift.assignments?.length ?? 0} owners
                    </p>
                  </div>

                  <span className="shrink-0 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9b8768))] admin_gifts_page_span_text">
                    {gift.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-3 md:grid-cols-3 xl:grid-cols-6 admin_gifts_page_div_container_7">
                  <AdminRecapBox
                    label="Use"
                    value={`${
                      gift.effect_mode === "passive"
                        ? "Passive"
                        : "Activated"
                    } · ${adminTargetLabel(gift)}`}
                  />

                  <AdminRecapBox
                    label="Success"
                    value={adminSuccessLabel(gift)}
                  />

                  <AdminRecapBox
                    label="Timing"
                    value={`${
                      adminDurationLabel(gift)
                    } · ${
                      gift.effect_mode === "temporary"
                        ? gift.cooldown_minutes === 0
                          ? "No cooldown"
                          : `${gift.cooldown_minutes} min cooldown`
                        : "No cooldown"
                    }`}
                  />

                  <AdminRecapBox
                    label="Health / Damage"
                    value={`${
                      gift.damage_dice
                        ? `${gift.damage_dice}${
                            gift.damage_type
                              ? ` ${gift.damage_type}`
                              : ""
                          }`
                        : "No damage"
                    } · HP ${
                      gift.health_delta !== 0
                        ? `${gift.health_delta > 0 ? "+" : ""}${gift.health_delta}`
                        : "—"
                    } · Max ${
                      gift.max_health_modifier !== 0
                        ? `${gift.max_health_modifier > 0 ? "+" : ""}${gift.max_health_modifier}`
                        : "—"
                    }`}
                  />

                  <AdminRecapBox
                    label="Attributes"
                    value={adminModifierLabel(gift)}
                  />

                  <AdminRecapBox
                    label="Access"
                    value={`Ancestries ${
                      gift.races?.length ?? 0
                    } · Roles ${
                      gift.roles?.length ?? 0
                    } · General ${
                      gift.is_general ? "Yes" : "No"
                    }`}
                  />
                </div>
              </summary>

              <div className="border-t border-[rgb(var(--sep-colour-59432c))]/35 p-4 sm:p-5 admin_gifts_page_div_container_8">
                <GiftForm
                  action={updateGift}
                  gift={gift}
                  races={races}
                  roles={roles}
                />

                <div className="mt-6 border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-5 admin_gifts_page_div_container_9">
                  <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] admin_gifts_page_p_text_3">
                    Staff assignment
                  </p>

                  <AdminActionForm
                    action={assignGiftToCharacter}
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    <input className="admin_gifts_page_input_gift_id" type="hidden" name="giftId" value={gift.id} />

                    <select
                      name="characterId"
                      required
                      defaultValue=""
                      className="min-w-[240px] flex-1 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none admin_gifts_page_select_character_id"
                    >
                      <option className="admin_gifts_page_option_character_id" value="" disabled>
                        Select character
                      </option>
                      {characters.map((character) => (
                        <option className="admin_gifts_page_option_option" key={character.id} value={character.id}>
                          {character.display_name}
                        </option>
                      ))}
                    </select>

                    <select
                      name="assignmentMode"
                      required
                      defaultValue="permanent"
                      className="min-w-[150px] border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none admin_gifts_page_select_assignment_mode"
                    >
                      <option className="admin_gifts_page_option_permanent" value="permanent">Permanent</option>
                      <option className="admin_gifts_page_option_temporary" value="temporary">Temporary</option>
                    </select>

                    <input
                      type="number"
                      name="assignmentDays"
                      min={1}
                      step={1}
                      placeholder="Days"
                      aria-label="Temporary assignment duration in days"
                      className="w-[100px] border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none admin_gifts_page_input_assignment_days"
                    />

                    <button
                      type="submit"
                      className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))] admin_gifts_page_button_assign_feat"
                    >
                      Assign Feat
                    </button>
                  </AdminActionForm>

                  {gift.assignments?.length ? (
                    <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3 admin_gifts_page_div_container_10">
                      {gift.assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 admin_gifts_page_div_container_11"
                        >
                          <div className="min-w-0 admin_gifts_page_div_container_12">
                            <p className="truncate font-serif text-sm text-[rgb(var(--sep-colour-cab28a))] admin_gifts_page_p_text_4">
                              {characterById.get(assignment.character_id)?.display_name ??
                                "Unknown character"}
                            </p>
                            <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6e6252))] admin_gifts_page_p_text_5">
                              {assignment.acquisition_source}
                              {assignment.acquisition_source === "staff"
                                ? assignment.expires_at
                                  ? ` · Until ${new Date(assignment.expires_at).toLocaleDateString("en-GB")}`
                                  : " · Permanent"
                                : ""}
                            </p>
                          </div>

                          <AdminActionForm action={removeGiftFromCharacter}>
                            <input className="admin_gifts_page_input_assignment_id"
                              type="hidden"
                              name="assignmentId"
                              value={assignment.id}
                            />
                            <button
                              type="submit"
                              className="text-[7px] uppercase tracking-[0.12em] text-red-300 admin_gifts_page_button_remove"
                            >
                              Remove
                            </button>
                          </AdminActionForm>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-5 admin_gifts_page_div_container_13">
                  <AdminActionForm
  action={deleteGift}
  confirmMessage={`Are you sure you want to permanently delete the Feat "${gift.name}"?`}
  className="flex justify-end"
>
                    <input className="admin_gifts_page_input_gift_id_2" type="hidden" name="giftId" value={gift.id} />
                    <button
                      type="submit"
                      className="border border-red-900/55 bg-red-950/20 px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300 admin_gifts_page_button_delete_feat"
                    >
                      Delete Feat
                    </button>
                  </AdminActionForm>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}

function AdminRecapBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))] px-2.5 py-2 admin_gifts_page_div_container_14">
      <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))] admin_gifts_page_p_text_6">
        {label}
      </p>
      <p className="mt-1 min-w-0 break-words text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))] admin_gifts_page_p_text_7">
        {value}
      </p>
    </div>
  );
}

const inputClass =
  "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]";

function GiftForm({
  action,
  gift,
  races,
  roles,
}: {
  action: typeof createGift | typeof updateGift;
  gift?: Gift;
  races: Race[];
  roles: {
    id: string;
    name: string;
    level: number;
    orderName: string;
  }[];
}) {
  const selectedRaces = new Set(gift?.races?.map((item) => item.race_id) ?? []);
  const selectedRoles = new Set(gift?.roles?.map((item) => item.order_job_id) ?? []);

  return (
    <AdminActionForm action={action} className="mt-5">
      {gift ? <input className="admin_gifts_page_input_gift_id_3" type="hidden" name="giftId" value={gift.id} /> : null}

      <GiftEffectFormLogic />

      <div className="grid gap-4 md:grid-cols-2 admin_gifts_page_div_container_15">
        <Field label="Name">
          <input
            name="name"
            required
            defaultValue={gift?.name ?? ""}
            className={[((inputClass)), "admin_gifts_page_input_name"].filter(Boolean).join(" ")}
          />
        </Field>

        <Field label="Sort order">
          <input
            type="number"
            name="sortOrder"
            defaultValue={gift?.sort_order ?? 0}
            className={[((inputClass)), "admin_gifts_page_input_sort_order"].filter(Boolean).join(" ")}
          />
        </Field>

        <div className="md:col-span-2 admin_gifts_page_div_container_16">
          <Field label="Description">
            <textarea
              name="description"
              rows={5}
              defaultValue={gift?.description ?? ""}
              className={[((inputClass)), "admin_gifts_page_textarea_description"].filter(Boolean).join(" ")}
            />
          </Field>
        </div>

        <Field label="Effect mode">
          <select
            name="effectMode"
            defaultValue={
              gift?.effect_mode === "passive"
                ? "passive"
                : "temporary"
            }
            className={[((inputClass)), "admin_gifts_page_select_effect_mode"].filter(Boolean).join(" ")}
          >
            <option className="admin_gifts_page_option_passive" value="passive">Passive</option>
            <option className="admin_gifts_page_option_temporary_2" value="temporary">Activated</option>
          </select>
        </Field>

        <Field label="Target">
          <select
            name="targetMode"
            defaultValue={gift?.target_mode ?? "self"}
            className={[((inputClass)), "admin_gifts_page_select_select"].filter(Boolean).join(" ")}
          >
            <option className="admin_gifts_page_option_self" value="self">Self</option>
            <option className="admin_gifts_page_option_other" value="other">Other character</option>
            <option className="admin_gifts_page_option_either" value="either">Self or other character</option>
          </select>
        </Field>

        <Field label="Activated duration">
          <select
            name="durationMode"
            defaultValue={
              !gift ||
              gift.effect_mode === "none" ||
              (
                gift.effect_mode === "temporary" &&
                gift.duration_minutes === 0
              )
                ? "instantaneous"
                : "minutes"
            }
            className={[((inputClass)), "admin_gifts_page_select_duration_mode"].filter(Boolean).join(" ")}
          >
            <option className="admin_gifts_page_option_instantaneous" value="instantaneous">Instantaneous</option>
            <option className="admin_gifts_page_option_minutes" value="minutes">Timed</option>
          </select>
        </Field>

        <Field label="Duration (minutes)">
          <input
            type="number"
            min={1}
            step={1}
            name="durationMinutes"
            placeholder="Required when Timed"
            defaultValue={
              gift?.duration_minutes && gift.duration_minutes > 0
                ? gift.duration_minutes
                : ""
            }
            className={[((inputClass)), "admin_gifts_page_input_duration_minutes"].filter(Boolean).join(" ")}
          />
        </Field>

        <Field label="Cooldown (minutes)">
          <input
            type="number"
            min={0}
            step={1}
            name="cooldownMinutes"
            list="feat-cooldown-options"
            defaultValue={gift?.cooldown_minutes ?? 360}
            className={[((inputClass)), "admin_gifts_page_input_cooldown_minutes"].filter(Boolean).join(" ")}
          />
          <datalist id="feat-cooldown-options">
            <option className="admin_gifts_page_option_0" value="0" label="No cooldown" />
            <option className="admin_gifts_page_option_30" value="30" label="30 minutes" />
            <option className="admin_gifts_page_option_60" value="60" label="1 hour" />
            <option className="admin_gifts_page_option_120" value="120" label="2 hours" />
            <option className="admin_gifts_page_option_240" value="240" label="4 hours" />
            <option className="admin_gifts_page_option_360" value="360" label="6 hours" />
            <option className="admin_gifts_page_option_720" value="720" label="12 hours" />
            <option className="admin_gifts_page_option_1440" value="1440" label="24 hours" />
          </datalist>
        </Field>

        <Field label="Current Health change on use">
          <input
            type="number"
            name="healthDelta"
            defaultValue={gift?.health_delta ?? 0}
            className={[((inputClass)), "admin_gifts_page_input_health_delta"].filter(Boolean).join(" ")}
          />
        </Field>

        <Field label="Success Die">
          <select
            name="successDie"
            defaultValue={gift?.success_die ?? ""}
            className={[((inputClass)), "admin_gifts_page_select_success_die"].filter(Boolean).join(" ")}
          >
            <option className="admin_gifts_page_option_success_die" value="">Automatic success</option>
            <option className="admin_gifts_page_option_4" value="4">d4</option>
            <option className="admin_gifts_page_option_6" value="6">d6</option>
            <option className="admin_gifts_page_option_8" value="8">d8</option>
            <option className="admin_gifts_page_option_10" value="10">d10</option>
            <option className="admin_gifts_page_option_12" value="12">d12</option>
            <option className="admin_gifts_page_option_20" value="20">d20</option>
            <option className="admin_gifts_page_option_100" value="100">d100</option>
          </select>
        </Field>

        <Field label="Success threshold">
          <input
            type="number"
            min={1}
            step={1}
            name="successThreshold"
            placeholder="e.g. 12"
            defaultValue={gift?.success_threshold ?? ""}
            className={[((inputClass)), "admin_gifts_page_input_success_threshold"].filter(Boolean).join(" ")}
          />
        </Field>

        <Field label="Defining Attribute">
          <select
            name="successAttribute"
            defaultValue={gift?.success_attribute ?? ""}
            className={[((inputClass)), "admin_gifts_page_select_success_attribute"].filter(Boolean).join(" ")}
          >
            <option className="admin_gifts_page_option_success_attribute" value="">None - pure die</option>
            <option className="admin_gifts_page_option_muscles" value="muscles">Muscles</option>
            <option className="admin_gifts_page_option_reflexes" value="reflexes">Reflexes</option>
            <option className="admin_gifts_page_option_vigor" value="vigor">Vigour</option>
            <option className="admin_gifts_page_option_brains" value="brains">Brains</option>
            <option className="admin_gifts_page_option_shrewd" value="shrewd">Shrewd</option>
            <option className="admin_gifts_page_option_presence_score" value="presence_score">Presence</option>
          </select>
        </Field>

        <div className="flex items-end border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3 text-[9px] leading-5 text-[rgb(var(--sep-colour-8f8271))] admin_gifts_page_div_container_17">
          No Success Die means automatic success. If a Defining Attribute is
          selected, its current effective value is added to the roll.
        </div>

        <Field label="Damage dice">
          <input
            name="damageDice"
            placeholder="e.g. 1d4"
            defaultValue={gift?.damage_dice ?? ""}
            className={[((inputClass)), "admin_gifts_page_input_damage_dice"].filter(Boolean).join(" ")}
          />
        </Field>

        <Field label="Damage type">
          <input
            name="damageType"
            placeholder="e.g. Lightning"
            defaultValue={gift?.damage_type ?? ""}
            className={[((inputClass)), "admin_gifts_page_input_damage_type"].filter(Boolean).join(" ")}
          />
        </Field>

        <Field label="Maximum Health modifier">
          <input
            type="number"
            name="maxHealthModifier"
            defaultValue={gift?.max_health_modifier ?? 0}
            className={[((inputClass)), "admin_gifts_page_input_field"].filter(Boolean).join(" ")}
          />
        </Field>

        <div className="md:col-span-2 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3 text-[9px] leading-5 text-[rgb(var(--sep-colour-8f8271))] admin_gifts_page_div_container_18">
          <strong className="text-[rgb(var(--sep-colour-c7ad83))] admin_gifts_page_strong_emphasis">Effect rules:</strong>{" "}
          Passive Feats are always Self-only and always active while owned. They may
          provide persistent Attribute, Maximum Health or Warping modifiers. Activated
          Feats may be Instantaneous or Timed. Instantaneous Feats may mechanically
          change Current Health or deal Damage; other narrative effects belong in the
          description. Timed Activated Feats may also apply persistent modifiers for
          their duration. Cooldown and Success Roll settings apply only to Activated Feats.
        </div>

        <div className="md:col-span-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 admin_gifts_page_div_container_19">
          {[
            ["Muscles", "musclesModifier", gift?.muscles_modifier ?? 0],
            ["Reflexes", "reflexesModifier", gift?.reflexes_modifier ?? 0],
            ["Vigour", "vigourModifier", gift?.vigour_modifier ?? 0],
            ["Shrewd", "shrewdModifier", gift?.shrewd_modifier ?? 0],
            ["Brains", "brainsModifier", gift?.brains_modifier ?? 0],
            ["Presence", "presenceModifier", gift?.presence_modifier ?? 0],
            ["Warping Affinity +", "warpingAffinityModifier", gift?.warping_affinity_modifier ?? 0],
            ["Shapes / day +", "warpsPerDayModifier", gift?.warps_per_day_modifier ?? 0],
          ].map(([label, name, value]) => (
            <Field key={String(name)} label={String(label)}>
              <input
                type="number"
                min={-10}
                max={10}
                name={String(name)}
                defaultValue={Number(value)}
                className={[((inputClass)), "admin_gifts_page_input_field_2"].filter(Boolean).join(" ")}
              />
            </Field>
          ))}
        </div>

        <Eligibility
          title="Ancestries"
          items={races.map((race) => ({
            id: race.id,
            label: race.name,
            checked: selectedRaces.has(race.id),
          }))}
          name="raceIds"
        />

        <Eligibility
          title="Order Roles"
          items={roles.map((role) => ({
            id: role.id,
            label: `${role.orderName} · L${role.level} · ${role.name}`,
            checked: selectedRoles.has(role.id),
          }))}
          name="roleIds"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 admin_gifts_page_div_container_20">
        <div className="flex flex-wrap gap-5 admin_gifts_page_div_container_21">
          <Check
            name="isActive"
            label="Active"
            checked={gift?.is_active ?? true}
          />
          <Check
            name="isGeneral"
            label="General / staff route"
            checked={gift?.is_general ?? false}
          />
        </div>

        <button
          type="submit"
          className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] admin_gifts_page_button_action"
        >
          {gift ? "Save Feat" : "Create Feat"}
        </button>
      </div>
    </AdminActionForm>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="admin_gifts_page_label_label">
      <span className="mb-2 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-756958))] admin_gifts_page_span_text_2">
        {label}
      </span>
      {children}
    </label>
  );
}

function Check({
  name,
  label,
  checked,
}: {
  name: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-[10px] text-[rgb(var(--sep-colour-b6a58d))] admin_gifts_page_label_label_2">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))] admin_gifts_page_input_field_3"
      />
      {label}
    </label>
  );
}

function Eligibility({
  title,
  items,
  name,
}: {
  title: string;
  name: string;
  items: { id: string; label: string; checked: boolean }[];
}) {
  return (
    <div className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-0d0a08))] p-4 admin_gifts_page_div_container_22">
      <p className="font-serif text-base text-[rgb(var(--sep-colour-d3ba8c))] admin_gifts_page_p_text_8">{title}</p>
      <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-1 admin_gifts_page_div_container_23">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-2 text-[10px] text-[rgb(var(--sep-colour-b6a58d))] admin_gifts_page_label_label_3"
          >
            <input
              type="checkbox"
              name={name}
              value={item.id}
              defaultChecked={item.checked}
              className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))] admin_gifts_page_input_field_4"
            />
            {item.label}
          </label>
        ))}
      </div>
    </div>
  );

}