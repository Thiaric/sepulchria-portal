import { cache, type ReactNode } from "react";

import { updateItemEquipment } from "@/app/(portal)/admin/items/equipment-actions";
import { createClient } from "@/lib/supabase/server";

type Relation<T> = T | T[] | null;

type ItemRow = {
  id: string;
  is_equippable: boolean;
  equip_slot: string | null;
  equip_layer: string | null;
  hands_required: number;
  min_muscles: number | null;
  min_reflexes: number | null;
  min_vigour: number | null;
  min_shrewd: number | null;
  min_brains: number | null;
  min_presence: number | null;
  min_order_level: number | null;
  races: { race_id: string }[] | null;
  orders: { order_id: string }[] | null;
  jobs: { order_job_id: string }[] | null;
};

type RaceRow = { id: string; name: string };
type OrderRow = { id: string; name: string };

type JobRow = {
  id: string;
  name: string;
  level: Relation<{
    level: number;
    order: Relation<{
      id: string;
      name: string;
    }>;
  }>;
};

function one<T>(value: Relation<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

const inputClass =
  "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]";

const getEquipmentOptions = cache(async () => {
  const supabase = await createClient();

  const [racesResult, ordersResult, jobsResult] = await Promise.all([
    supabase.from("races").select("id, name").order("name"),
    supabase.from("orders").select("id, name").order("name"),
    supabase
      .from("order_jobs")
      .select(`
        id,
        name,
        level:order_levels(
          level,
          order:orders(
            id,
            name
          )
        )
      `)
      .order("name"),
  ]);

  const error =
    racesResult.error ?? ordersResult.error ?? jobsResult.error;

  if (error) {
    throw new Error(error.message);
  }

  return {
    races: (racesResult.data ?? []) as RaceRow[],
    orders: (ordersResult.data ?? []) as OrderRow[],
    jobs: (jobsResult.data ?? []) as unknown as JobRow[],
  };
});

export async function ItemEquipmentForm({
  itemId,
}: {
  itemId: string;
}) {
  const supabase = await createClient();

  const [itemResult, options] = await Promise.all([
    supabase
      .from("items")
      .select(`
        id,
        is_equippable,
        equip_slot,
        equip_layer,
        hands_required,
        min_muscles,
        min_reflexes,
        min_vigour,
        min_shrewd,
        min_brains,
        min_presence,
        min_order_level,
        races:item_equipment_races(race_id),
        orders:item_equipment_orders(order_id),
        jobs:item_equipment_jobs(order_job_id)
      `)
      .eq("id", itemId)
      .maybeSingle(),
    getEquipmentOptions(),
  ]);

  if (itemResult.error) {
    return (
      <div className="mt-5 border border-red-900/50 bg-red-950/15 p-4 text-xs text-red-300 components_admin_item_equipment_form_div_container">
        Unable to load Equipment configuration: {itemResult.error.message}
      </div>
    );
  }

  if (!itemResult.data) return null;

  const item = itemResult.data as unknown as ItemRow;

  const selectedRaces = new Set(
    (item.races ?? []).map((entry) => entry.race_id),
  );
  const selectedOrders = new Set(
    (item.orders ?? []).map((entry) => entry.order_id),
  );
  const selectedJobs = new Set(
    (item.jobs ?? []).map((entry) => entry.order_job_id),
  );

  return (
    <details className="mt-6 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))] components_admin_item_equipment_form_details_details">
      <summary className="cursor-pointer list-none px-4 py-3 components_admin_item_equipment_form_summary_summary">
        <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_admin_item_equipment_form_p_text">
          Equipment
        </p>
        <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-d8bf91))] components_admin_item_equipment_form_p_text_2">
          Slot, layer & requirements
        </p>
      </summary>

      <form
        action={updateItemEquipment}
        className="border-t border-[rgb(var(--sep-colour-59432c))]/30 p-4 components_admin_item_equipment_form_form_update_item_equipment"
      >
        <input className="components_admin_item_equipment_form_input_item_id" type="hidden" name="itemId" value={item.id} />

        <label className="flex items-center gap-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9d896a))] components_admin_item_equipment_form_label_equippable">
          <input className="components_admin_item_equipment_form_input_equippable"
            type="checkbox"
            name="isEquippable"
            defaultChecked={item.is_equippable}
          />
          Equippable
        </label>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 components_admin_item_equipment_form_div_equippable">
          <Field label="Slot">
            <select
              name="equipSlot"
              defaultValue={item.equip_slot ?? "torso"}
              className={[((inputClass)), "components_admin_item_equipment_form_select_equip_slot"].filter(Boolean).join(" ")}
            >
              <option className="components_admin_item_equipment_form_option_head" value="head">Head</option>
              <option className="components_admin_item_equipment_form_option_neck" value="neck">Neck</option>
              <option className="components_admin_item_equipment_form_option_shoulders" value="shoulders">Shoulders</option>
              <option className="components_admin_item_equipment_form_option_torso" value="torso">Torso</option>
              <option className="components_admin_item_equipment_form_option_back" value="back">Back</option>
              <option className="components_admin_item_equipment_form_option_arms" value="arms">Arms</option>
              <option className="components_admin_item_equipment_form_option_hands" value="hands">Hands</option>
              <option className="components_admin_item_equipment_form_option_waist" value="waist">Waist</option>
              <option className="components_admin_item_equipment_form_option_legs" value="legs">Legs</option>
              <option className="components_admin_item_equipment_form_option_feet" value="feet">Feet</option>
              <option className="components_admin_item_equipment_form_option_main_hand" value="main_hand">Main Hand</option>
              <option className="components_admin_item_equipment_form_option_off_hand" value="off_hand">Off Hand</option>
            </select>
          </Field>

          <Field label="Layer">
            <select
              name="equipLayer"
              defaultValue={item.equip_layer ?? "clothing"}
              className={[((inputClass)), "components_admin_item_equipment_form_select_equip_layer"].filter(Boolean).join(" ")}
            >
              <option className="components_admin_item_equipment_form_option_base" value="base">Base</option>
              <option className="components_admin_item_equipment_form_option_clothing" value="clothing">Clothing</option>
              <option className="components_admin_item_equipment_form_option_armour" value="armour">Armour</option>
              <option className="components_admin_item_equipment_form_option_outer" value="outer">Outer</option>
              <option className="components_admin_item_equipment_form_option_accessory" value="accessory">Accessory</option>
              <option className="components_admin_item_equipment_form_option_held" value="held">Held</option>
            </select>
          </Field>

          <Field label="Hands required">
            <select
              name="handsRequired"
              defaultValue={String(item.hands_required)}
              className={[((inputClass)), "components_admin_item_equipment_form_select_hands_required"].filter(Boolean).join(" ")}
            >
              <option className="components_admin_item_equipment_form_option_0" value="0">Not hand-held</option>
              <option className="components_admin_item_equipment_form_option_1" value="1">One hand</option>
              <option className="components_admin_item_equipment_form_option_2" value="2">Two hands</option>
            </select>
          </Field>

          <Field label="Minimum Order Level">
            <input
              type="number"
              min={0}
              name="minOrderLevel"
              defaultValue={item.min_order_level ?? ""}
              placeholder="None"
              className={[((inputClass)), "components_admin_item_equipment_form_input_none"].filter(Boolean).join(" ")}
            />
          </Field>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6 components_admin_item_equipment_form_div_equippable_2">
          {[
            ["Muscles", "minMuscles", item.min_muscles],
            ["Reflexes", "minReflexes", item.min_reflexes],
            ["Vigour", "minVigour", item.min_vigour],
            ["Shrewd", "minShrewd", item.min_shrewd],
            ["Brains", "minBrains", item.min_brains],
            ["Presence", "minPresence", item.min_presence],
          ].map(([label, name, value]) => (
            <Field key={String(name)} label={String(label)}>
              <input
                type="number"
                min={0}
                name={String(name)}
                defaultValue={value ?? ""}
                placeholder="None"
                className={[((inputClass)), "components_admin_item_equipment_form_input_none_2"].filter(Boolean).join(" ")}
              />
            </Field>
          ))}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3 components_admin_item_equipment_form_div_equippable_3">
          <MultiSelect
            label="Allowed Ancestries"
            help="Choose 'Any Ancestry' by itself to remove the restriction."
            name="raceIds"
            defaultValue={
              selectedRaces.size ? Array.from(selectedRaces) : [""]
            }
          >
            <option className="components_admin_item_equipment_form_option_equippable" value="">Any Ancestry — no restriction</option>
            {options.races.map((race) => (
              <option className="components_admin_item_equipment_form_option_option" key={race.id} value={race.id}>
                {race.name}
              </option>
            ))}
          </MultiSelect>

          <MultiSelect
            label="Allowed Orders"
            help="Choose 'Any Order' by itself to remove the restriction."
            name="orderIds"
            defaultValue={
              selectedOrders.size ? Array.from(selectedOrders) : [""]
            }
          >
            <option className="components_admin_item_equipment_form_option_equippable_2" value="">Any Order — no restriction</option>
            {options.orders.map((order) => (
              <option className="components_admin_item_equipment_form_option_option_2" key={order.id} value={order.id}>
                {order.name}
              </option>
            ))}
          </MultiSelect>

          <MultiSelect
            label="Allowed Order Roles"
            help="Choose 'Any Role' by itself to remove the restriction."
            name="jobIds"
            defaultValue={
              selectedJobs.size ? Array.from(selectedJobs) : [""]
            }
          >
            <option className="components_admin_item_equipment_form_option_equippable_3" value="">Any Role — no restriction</option>
            {options.jobs.map((job) => {
              const level = one(job.level);
              const order = level ? one(level.order) : null;

              return (
                <option className="components_admin_item_equipment_form_option_option_3" key={job.id} value={job.id}>
                  {[order?.name, level ? `L${level.level}` : null, job.name]
                    .filter(Boolean)
                    .join(" · ")}
                </option>
              );
            })}
          </MultiSelect>
        </div>

        <div className="mt-5 flex justify-end border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-4 components_admin_item_equipment_form_div_equippable_4">
          <button
            type="submit"
            className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))] components_admin_item_equipment_form_button_save_equipment"
          >
            Save Equipment
          </button>
        </div>
      </form>
    </details>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block components_admin_item_equipment_form_label_label">
      <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] components_admin_item_equipment_form_span_text">
        {label}
      </span>
      {children}
    </label>
  );
}

function MultiSelect({
  label,
  help,
  name,
  defaultValue,
  children,
}: {
  label: string;
  help: string;
  name: string;
  defaultValue: string[];
  children: ReactNode;
}) {
  return (
    <label className="block components_admin_item_equipment_form_label_label_2">
      <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] components_admin_item_equipment_form_span_text_2">
        {label}
      </span>

      <select
        multiple
        name={name}
        defaultValue={defaultValue}
        className={[((`${inputClass} min-h-36`)), "components_admin_item_equipment_form_select_select"].filter(Boolean).join(" ")}
      >
        {children}
      </select>

      <span className="mt-1.5 block text-[8px] leading-4 text-[rgb(var(--sep-colour-6f6252))] components_admin_item_equipment_form_span_text_3">
        {help}
      </span>
    </label>
  );
}
