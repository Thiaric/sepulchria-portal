import type { ReactNode } from "react";

import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  addGatheringReward,
  createGatheringLocation,
  deleteGatheringReward,
  updateGatheringLocation,
  updateGatheringReward,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AreaRelation = { name: string };
type ItemCategoryRelation = { slug: string };

type RoomRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  areas: AreaRelation | AreaRelation[] | null;
};

type ItemRow = {
  id: string;
  name: string;
  slug: string;
  quality: string;
  use_behaviour: string | null;
  is_active: boolean;
  teaches_recipe_id: string | null;
  category: ItemCategoryRelation | ItemCategoryRelation[] | null;
};

type RewardItem = {
  id: string;
  name: string;
  slug: string;
  quality: string;
  teaches_recipe_id: string | null;
};

type GatheringReward = {
  id: string;
  reward_type: "item" | "remnants";
  item_id: string | null;
  quantity_min: number | null;
  quantity_max: number | null;
  remnants_min: number | null;
  remnants_max: number | null;
  weight: number | string;
  is_active: boolean;
  sort_order: number;
  item: RewardItem | RewardItem[] | null;
};

type GatheringRoom = {
  id: string;
  name: string;
  slug: string;
  areas: AreaRelation | AreaRelation[] | null;
};

type GatheringLocation = {
  id: string;
  room_id: string;
  name: string;
  description: string | null;
  nothing_chance: number | string;
  is_active: boolean;
  room: GatheringRoom | GatheringRoom[] | null;
  rewards: GatheringReward[];
};

const inputClass =
  "w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[11px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]";

const labelClass =
  "text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-8b765a))]";

const buttonClass =
  "border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:bg-[rgb(var(--sep-colour-4a321e))] disabled:cursor-not-allowed disabled:opacity-50";

const dangerButtonClass =
  "border border-red-900/55 bg-red-950/15 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300 transition hover:border-red-700 hover:bg-red-950/30";

function one<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

function roomLabel(room: RoomRow) {
  const area = one(room.areas);
  return area ? `${area.name} — ${room.name}` : room.name;
}

function gatheringRoomLabel(room: GatheringRoom | GatheringRoom[] | null) {
  const resolved = one(room);
  if (!resolved) return "Unknown Location";
  const area = one(resolved.areas);
  return area ? `${area.name} — ${resolved.name}` : resolved.name;
}

export default async function AdminGatheringPage() {
  await requireAdminSection("gathering");
  const supabase = createAdminClient();

  const [locationsResult, roomsResult, itemsResult] = await Promise.all([
    supabase
      .from("gathering_locations")
      .select(`
        id, room_id, name, description, nothing_chance, is_active,
        room:rooms(id, name, slug, areas(name)),
        rewards:gathering_rewards(
          id, reward_type, item_id, quantity_min, quantity_max,
          remnants_min, remnants_max, weight, is_active, sort_order,
          item:items(id, name, slug, quality, teaches_recipe_id)
        )
      `)
      .order("created_at", { ascending: true }),

    supabase
      .from("rooms")
      .select(`id, name, slug, is_active, areas(name)`)
      .eq("is_active", true)
      .order("name", { ascending: true }),

    supabase
      .from("items")
      .select(`
        id, name, slug, quality, use_behaviour, is_active, teaches_recipe_id,
        category:item_categories(slug)
      `)
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  if (locationsResult.error) {
    throw new Error(`Unable to load Gathering locations: ${locationsResult.error.message}`);
  }
  if (roomsResult.error) {
    throw new Error(`Unable to load Locations: ${roomsResult.error.message}`);
  }
  if (itemsResult.error) {
    throw new Error(`Unable to load Items: ${itemsResult.error.message}`);
  }

  const locations = (locationsResult.data ?? []) as unknown as GatheringLocation[];
  const rooms = (roomsResult.data ?? []) as unknown as RoomRow[];
  const items = (itemsResult.data ?? []) as unknown as ItemRow[];

  const configuredRoomIds = new Set(locations.map((location) => location.room_id));
  const availableRooms = rooms.filter((room) => !configuredRoomIds.has(room.id));

  const rewardItems = items.filter((item) => {
    const category = one(item.category);
    return category?.slug !== "container" && item.use_behaviour !== "limited_charges";
  });

  const activeLocations = locations.filter((location) => location.is_active).length;
  const activeRewards = locations.reduce(
    (total, location) =>
      total + (location.rewards ?? []).filter((reward) => reward.is_active).length,
    0,
  );

  return (
    <main>
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
            Administration
          </p>
          <h2 className="mt-1 font-serif text-3xl text-[rgb(var(--sep-colour-ead5ac))]">
            Gathering
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[rgb(var(--sep-colour-928674))]">
            Enable Gathering in Locations and configure their weighted Item and Remnant reward pools.
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Gathering Locations" value={locations.length} />
          <Stat label="Active Locations" value={activeLocations} />
          <Stat label="Active Rewards" value={activeRewards} />
        </div>

        <section className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4">
          <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">
            Enable a Location
          </p>
          <p className="mt-1 max-w-3xl text-[10px] leading-5 text-[rgb(var(--sep-colour-807464))]">
            The 15 daily attempts remain shared globally across all Gathering Locations. Nothing chance may be 0–10%.
          </p>

          {availableRooms.length > 0 ? (
            <form action={createGatheringLocation} className="mt-4 grid gap-3 lg:grid-cols-6">
              <Field label="Location" className="lg:col-span-2">
                <select name="roomId" required className={inputClass} defaultValue="">
                  <option value="" disabled>Choose Location</option>
                  {availableRooms.map((room) => (
                    <option key={room.id} value={room.id}>{roomLabel(room)}</option>
                  ))}
                </select>
              </Field>

              <Field label="Panel name" className="lg:col-span-2">
                <input name="name" required defaultValue="Gathering" className={inputClass} />
              </Field>

              <Field label="Nothing chance %">
                <input
                  name="nothingChance"
                  type="number"
                  min="0"
                  max="10"
                  step="0.01"
                  required
                  defaultValue="8"
                  className={inputClass}
                />
              </Field>

              <label className="flex items-end gap-2 pb-2">
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 accent-[rgb(var(--sep-colour-9a7543))]"
                />
                <span className={labelClass}>Active</span>
              </label>

              <Field label="Description" className="lg:col-span-5">
                <textarea name="description" rows={2} className={`${inputClass} resize-y`} />
              </Field>

              <div className="flex items-end justify-end">
                <button type="submit" className={buttonClass}>Enable Gathering</button>
              </div>
            </form>
          ) : (
            <p className="mt-4 text-[10px] text-[rgb(var(--sep-colour-807464))]">
              Every active Location is already configured for Gathering.
            </p>
          )}
        </section>

        <section className="mt-5 space-y-4">
          {locations.map((location) => (
            <GatheringLocationEditor
              key={location.id}
              location={location}
              items={rewardItems}
            />
          ))}

          {locations.length === 0 ? (
            <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-6 text-center text-xs text-[rgb(var(--sep-colour-807464))]">
              No Gathering Locations have been configured yet.
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function GatheringLocationEditor({
  location,
  items,
}: {
  location: GatheringLocation;
  items: ItemRow[];
}) {
  const rewards = [...(location.rewards ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id),
  );

  const totalWeight = rewards
    .filter((reward) => reward.is_active)
    .reduce((sum, reward) => sum + Number(reward.weight), 0);

  return (
    <article className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120d0a))] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/30 pb-4">
        <div>
          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            {gatheringRoomLabel(location.room)}
          </p>
          <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dbc396))]">
            {location.name}
          </h3>
          <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-756958))]">
            Active reward weight: {totalWeight.toFixed(4)}
          </p>
        </div>

        <span
          className={`border px-2 py-1 text-[7px] uppercase tracking-[0.14em] ${
            location.is_active
              ? "border-[rgb(var(--sep-colour-56754f))]/55 text-[rgb(var(--sep-colour-9dc294))]"
              : "border-[rgb(var(--sep-colour-6a5046))]/55 text-[rgb(var(--sep-colour-9a8178))]"
          }`}
        >
          {location.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      <form action={updateGatheringLocation} className="mt-4 grid gap-3 lg:grid-cols-6">
        <input type="hidden" name="locationId" value={location.id} />

        <Field label="Panel name" className="lg:col-span-2">
          <input name="name" required defaultValue={location.name} className={inputClass} />
        </Field>

        <Field label="Description" className="lg:col-span-3">
          <input
            name="description"
            defaultValue={location.description ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Nothing chance %">
          <input
            name="nothingChance"
            type="number"
            min="0"
            max="10"
            step="0.01"
            required
            defaultValue={String(location.nothing_chance)}
            className={inputClass}
          />
        </Field>

        <label className="flex items-center gap-2 lg:col-span-2">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={location.is_active}
            className="h-4 w-4 accent-[rgb(var(--sep-colour-9a7543))]"
          />
          <span className={labelClass}>Gathering active</span>
        </label>

        <div className="flex justify-end lg:col-span-4">
          <button type="submit" className={buttonClass}>Save Location</button>
        </div>
      </form>

      <div className="mt-5 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-4">
        <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">
          Reward Pool
        </p>
        <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-807464))]">
          Weights are relative. Recipe and Pattern Items are ordinary Item rewards and may be found more than once.
        </p>

        <div className="mt-3 space-y-2">
          {rewards.map((reward) => (
            <RewardEditor key={reward.id} reward={reward} items={items} />
          ))}
        </div>

        <AddRewardForm
          locationId={location.id}
          items={items}
          suggestedSortOrder={
            rewards.length > 0
              ? Math.max(...rewards.map((reward) => reward.sort_order)) + 10
              : 10
          }
        />
      </div>
    </article>
  );
}

function RewardEditor({
  reward,
  items,
}: {
  reward: GatheringReward;
  items: ItemRow[];
}) {
  const rewardItem = one(reward.item);

  return (
    <div className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3">
      <form action={updateGatheringReward} className="grid gap-3 xl:grid-cols-12 xl:items-end">
        <input type="hidden" name="rewardId" value={reward.id} />

        <Field label="Type" className="xl:col-span-2">
          <select name="rewardType" defaultValue={reward.reward_type} className={inputClass}>
            <option value="item">Item</option>
            <option value="remnants">Remnants</option>
          </select>
        </Field>

        <Field label="Item" className="xl:col-span-3">
          <select name="itemId" defaultValue={reward.item_id ?? ""} className={inputClass}>
            <option value="">Not an Item reward</option>
            {rewardItem && !items.some((item) => item.id === rewardItem.id) ? (
              <option value={rewardItem.id}>{rewardItem.name}</option>
            ) : null}
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}{item.teaches_recipe_id ? " · Recipe Item" : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Item min">
          <input name="quantityMin" type="number" min="1" max="9999" defaultValue={reward.quantity_min ?? 1} className={inputClass} />
        </Field>
        <Field label="Item max">
          <input name="quantityMax" type="number" min="1" max="9999" defaultValue={reward.quantity_max ?? 1} className={inputClass} />
        </Field>
        <Field label="Remnants min">
          <input name="remnantsMin" type="number" min="1" defaultValue={reward.remnants_min ?? 1} className={inputClass} />
        </Field>
        <Field label="Remnants max">
          <input name="remnantsMax" type="number" min="1" defaultValue={reward.remnants_max ?? 1} className={inputClass} />
        </Field>
        <Field label="Weight">
          <input name="weight" type="number" min="0.0001" step="0.0001" required defaultValue={String(reward.weight)} className={inputClass} />
        </Field>
        <Field label="Order">
          <input name="sortOrder" type="number" min="0" required defaultValue={reward.sort_order} className={inputClass} />
        </Field>

        <label className="flex items-center gap-2 pb-2">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={reward.is_active}
            className="h-4 w-4 accent-[rgb(var(--sep-colour-9a7543))]"
          />
          <span className={labelClass}>Active</span>
        </label>

        <div className="flex justify-end xl:col-span-12">
          <button type="submit" className={buttonClass}>Save Reward</button>
        </div>
      </form>

      <form action={deleteGatheringReward} className="mt-2 flex justify-end">
        <input type="hidden" name="rewardId" value={reward.id} />
        <button type="submit" className={dangerButtonClass}>Delete Reward</button>
      </form>
    </div>
  );
}

function AddRewardForm({
  locationId,
  items,
  suggestedSortOrder,
}: {
  locationId: string;
  items: ItemRow[];
  suggestedSortOrder: number;
}) {
  return (
    <form action={addGatheringReward} className="mt-3 grid gap-3 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] p-3 xl:grid-cols-12 xl:items-end">
      <input type="hidden" name="locationId" value={locationId} />

      <Field label="New reward type" className="xl:col-span-2">
        <select name="rewardType" defaultValue="item" className={inputClass}>
          <option value="item">Item</option>
          <option value="remnants">Remnants</option>
        </select>
      </Field>

      <Field label="Item" className="xl:col-span-3">
        <select name="itemId" defaultValue={items[0]?.id ?? ""} className={inputClass}>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}{item.teaches_recipe_id ? " · Recipe Item" : ""}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Item min">
        <input name="quantityMin" type="number" min="1" max="9999" defaultValue="1" className={inputClass} />
      </Field>
      <Field label="Item max">
        <input name="quantityMax" type="number" min="1" max="9999" defaultValue="1" className={inputClass} />
      </Field>
      <Field label="Remnants min">
        <input name="remnantsMin" type="number" min="1" defaultValue="1" className={inputClass} />
      </Field>
      <Field label="Remnants max">
        <input name="remnantsMax" type="number" min="1" defaultValue="1" className={inputClass} />
      </Field>
      <Field label="Weight">
        <input name="weight" type="number" min="0.0001" step="0.0001" required defaultValue="1" className={inputClass} />
      </Field>
      <Field label="Order">
        <input name="sortOrder" type="number" min="0" required defaultValue={suggestedSortOrder} className={inputClass} />
      </Field>

      <label className="flex items-center gap-2 pb-2">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked
          className="h-4 w-4 accent-[rgb(var(--sep-colour-9a7543))]"
        />
        <span className={labelClass}>Active</span>
      </label>

      <div className="flex justify-end xl:col-span-12">
        <button type="submit" className={buttonClass}>Add Reward</button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={labelClass}>{label}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3">
      <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-7d6c55))]">{label}</p>
      <p className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-d8c29a))]">{value}</p>
    </div>
  );
}
