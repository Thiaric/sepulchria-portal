import {
  GatheringCreateLocationForm,
  GatheringLocationCard,
  type GatheringAdminItem,
  type GatheringAdminLocation,
  type GatheringAdminRoom,
} from "@/components/admin/gathering-admin-ui";
import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const availableRooms: GatheringAdminRoom[] = rooms
    .filter((room) => !configuredRoomIds.has(room.id))
    .map((room) => ({ id: room.id, label: roomLabel(room) }));

  const rewardItems: GatheringAdminItem[] = items
    .filter((item) => {
      const category = one(item.category);
      return category?.slug !== "container" && item.use_behaviour !== "limited_charges";
    })
    .map((item) => ({
      id: item.id,
      name: item.name,
      teachesRecipe: Boolean(item.teaches_recipe_id),
    }));

  const editorLocations: GatheringAdminLocation[] = locations.map((location) => ({
    id: location.id,
    roomLabel: gatheringRoomLabel(location.room),
    name: location.name,
    description: location.description ?? "",
    nothingChance: Number(location.nothing_chance),
    active: location.is_active,
    rewards: (location.rewards ?? []).map((reward) => {
      const item = one(reward.item);
      return {
        id: reward.id,
        rewardType: reward.reward_type,
        itemId: reward.item_id,
        itemName: item?.name ?? null,
        quantityMin: reward.quantity_min,
        quantityMax: reward.quantity_max,
        remnantsMin: reward.remnants_min,
        remnantsMax: reward.remnants_max,
        weight: Number(reward.weight),
        active: reward.is_active,
        sortOrder: reward.sort_order,
      };
    }),
  }));

  const activeLocations = locations.filter((location) => location.is_active).length;
  const activeRewards = locations.reduce(
    (total, location) =>
      total + (location.rewards ?? []).filter((reward) => reward.is_active).length,
    0,
  );

  return (
    <main>
      <div data-sep-ui-ignore="true" className="mx-auto max-w-7xl">
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

        <section
          data-sep-interaction-fixed="true"
          className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4"
        >
          <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8c704b))]">
            Enable a Location
          </p>
          <p className="mt-1 max-w-3xl text-[10px] leading-5 text-[rgb(var(--sep-colour-807464))]">
            The 15 daily attempts remain shared globally across all Gathering Locations. Nothing chance may be 0–10%.
          </p>
          <GatheringCreateLocationForm rooms={availableRooms} />
        </section>

        <section className="mt-5 space-y-4">
          {editorLocations.map((location) => (
            <GatheringLocationCard
              key={location.id}
              location={location}
              items={rewardItems}
            />
          ))}

          {editorLocations.length === 0 ? (
            <div
              data-sep-interaction-fixed="true"
              className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-6 text-center text-xs text-[rgb(var(--sep-colour-807464))]"
            >
              No Gathering Locations have been configured yet.
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      data-sep-interaction-fixed="true"
      className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3"
    >
      <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-7d6c55))]">
        {label}
      </p>
      <p className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-d8c29a))]">
        {value}
      </p>
    </div>
  );
}
