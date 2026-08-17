import "server-only";

import {
  equipInventoryItem,
  unequipInventoryItem,
} from "@/lib/items/equipment-actions";
import {
  moveOwnInventoryItem,
} from "@/lib/items/inventory-move-actions";
import { createClient } from "@/lib/supabase/server";

type Relation<T> = T | T[] | null;

type InventoryRow = {
  record_kind: "standard" | "unique";
  record_id: string;
  item_id: string;
  parent_container_id: string | null;
  name: string;
  description: string;
  image_url: string | null;
  category_name: string;
  subcategory_name: string | null;
  quality: string;
  quantity: number;
  is_unique: boolean;
  is_quest_item: boolean;
  transfer_policy: string;
  container_capacity: number | null;
  is_usable: boolean;
  is_equippable: boolean;
  is_equipped: boolean;
  equipped_slot: string | null;
  equipped_layer: string | null;
  hands_required: number;
};

type CharacterState = {
  display_name: string | null;
  first_name: string;
  surname: string;
  race_id: string | null;
  muscles: number | null;
  reflexes: number | null;
  vigor: number | null;
  shrewd: number | null;
  brains: number | null;
  presence_score: number | null;
};

type MembershipState = {
  order_job_id: string;
  role: Relation<{
    id: string;
    name: string;
    level: Relation<{
      level: number;
      order: Relation<{
        id: string;
        name: string;
      }>;
    }>;
  }>;
};

type ItemRequirementRow = {
  id: string;
  min_muscles: number | null;
  min_reflexes: number | null;
  min_vigour: number | null;
  min_shrewd: number | null;
  min_brains: number | null;
  min_presence: number | null;
  min_order_level: number | null;
  races: { race_id: string; race: Relation<{ name: string }> }[] | null;
  orders: { order_id: string; order: Relation<{ name: string }> }[] | null;
  jobs: {
    order_job_id: string;
    job: Relation<{
      name: string;
      level: Relation<{
        level: number;
        order: Relation<{ name: string }>;
      }>;
    }>;
  }[] | null;
};

type Requirement = {
  label: string;
  met: boolean;
};

function one<T>(value: Relation<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function requirementList(
  item: ItemRequirementRow | undefined,
  character: CharacterState | null,
  membership: MembershipState | null,
): Requirement[] {
  if (!item || !character) return [];

  const role = one(membership?.role ?? null);
  const level = one(role?.level ?? null);
  const order = one(level?.order ?? null);

  const requirements: Requirement[] = [];

  const attribute = (
    label: string,
    minimum: number | null,
    actual: number | null,
  ) => {
    if (minimum === null) return;
    requirements.push({
      label: `${label} ${minimum}+`,
      met: (actual ?? 0) >= minimum,
    });
  };

  attribute("Muscles", item.min_muscles, character.muscles);
  attribute("Reflexes", item.min_reflexes, character.reflexes);
  attribute("Vigour", item.min_vigour, character.vigor);
  attribute("Shrewd", item.min_shrewd, character.shrewd);
  attribute("Brains", item.min_brains, character.brains);
  attribute("Presence", item.min_presence, character.presence_score);

  const races = item.races ?? [];
  if (races.length) {
    requirements.push({
      label: `Ancestry: ${races
        .map((entry) => one(entry.race)?.name)
        .filter(Boolean)
        .join(" / ")}`,
      met: races.some((entry) => entry.race_id === character.race_id),
    });
  }

  const orders = item.orders ?? [];
  if (orders.length) {
    requirements.push({
      label: `Order: ${orders
        .map((entry) => one(entry.order)?.name)
        .filter(Boolean)
        .join(" / ")}`,
      met: orders.some((entry) => entry.order_id === order?.id),
    });
  }

  const jobs = item.jobs ?? [];
  if (jobs.length) {
    requirements.push({
      label: `Role: ${jobs
        .map((entry) => {
          const job = one(entry.job);
          const jobLevel = one(job?.level ?? null);
          const jobOrder = one(jobLevel?.order ?? null);
          return job
            ? `${jobOrder?.name ?? "Order"} — L${jobLevel?.level ?? "?"} ${job.name}`
            : null;
        })
        .filter(Boolean)
        .join(" / ")}`,
      met: jobs.some(
        (entry) => entry.order_job_id === membership?.order_job_id,
      ),
    });
  }

  if (item.min_order_level !== null) {
    requirements.push({
      label: `Order Level ${item.min_order_level}+`,
      met: (level?.level ?? -1) >= item.min_order_level,
    });
  }

  return requirements;
}

function Requirements({
  requirements,
}: {
  requirements: Requirement[];
}) {
  if (!requirements.length) return null;

  return (
    <div className="mt-3 border-t border-[#59432c]/30 pt-2.5">
      <p className="text-[7px] uppercase tracking-[0.16em] text-[#806b50]">
        Requirements
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {requirements.map((requirement) => (
          <span
            key={requirement.label}
            className={`border px-2 py-1 text-[7px] uppercase tracking-[0.1em] ${
              requirement.met
                ? "border-emerald-900/65 bg-emerald-950/20 text-emerald-400"
                : "border-red-900/65 bg-red-950/20 text-red-400"
            }`}
          >
            {requirement.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ItemBadges({ row }: { row: InventoryRow }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {row.is_equipped ? (
        <span className="border border-[#9a7543]/65 bg-[#2d2115] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[#dfbd83]">
          Equipped
        </span>
      ) : null}
      {row.is_unique ? (
        <span className="border border-[#8d6d3e]/55 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[#c7a46e]">
          Unique
        </span>
      ) : null}
      {row.is_quest_item ? (
        <span className="border border-[#65456f]/55 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[#bda0c7]">
          Quest
        </span>
      ) : null}
      {row.is_usable ? (
        <span className="border border-[#49634f]/55 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[#9cbe9f]">
          Usable
        </span>
      ) : null}
    </div>
  );
}

function MoveControls({
  row,
  containers,
}: {
  row: InventoryRow;
  containers: InventoryRow[];
}) {
  if (
    row.record_kind === "unique" &&
    row.container_capacity !== null
  ) {
    return null;
  }

  return (
    <form
      action={moveOwnInventoryItem}
      className="mt-3 flex flex-wrap gap-2"
    >
      <input type="hidden" name="recordKind" value={row.record_kind} />
      <input type="hidden" name="recordId" value={row.record_id} />

      <select
        name="targetContainerId"
        defaultValue={row.parent_container_id ?? ""}
        className="min-w-[150px] flex-1 border border-[#60482e]/55 bg-[#100c09] px-3 py-2 text-[9px] text-[#cdbb9d] outline-none"
      >
        <option value="">Loose Inventory</option>
        {containers.map((container) => (
          <option
            key={container.record_id}
            value={container.record_id}
          >
            {container.name}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="border border-[#6f5639]/60 bg-[#1b140f] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[#bca483]"
      >
        Move
      </button>
    </form>
  );
}

function InventoryCard({
  row,
  requirements,
  containers,
  characterName,
  compact = false,
  own = false,
}: {
  row: InventoryRow;
  requirements: Requirement[];
  containers: InventoryRow[];
  characterName: string;
  compact?: boolean;
  own?: boolean;
}) {
  return (
    <article
      className={`border ${
        row.is_equipped
          ? "border-[#8d6d3e]/65 bg-[#18110c]"
          : "border-[#59432c]/40 bg-[#120e0b]"
      } ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex gap-3">
        <div
          className={`shrink-0 overflow-hidden border border-[#60482e]/45 bg-[#0d0907] ${
            compact ? "h-10 w-10" : "h-14 w-14"
          }`}
        >
          {row.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center font-serif text-[#756247]">
              ◇
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-serif text-base text-[#dec89f]">
                {row.name}
                {row.quantity > 1 ? (
                  <span className="ml-2 font-sans text-[10px] text-[#9b8768]">
                    ×{row.quantity}
                  </span>
                ) : null}
              </p>

              <p className="mt-1 text-[7px] uppercase tracking-[0.14em] text-[#776957]">
                {row.category_name}
                {row.subcategory_name ? ` · ${row.subcategory_name}` : ""}
                {" · "}
                {titleCase(row.quality)}
              </p>

              {row.is_equipped &&
              row.equipped_slot &&
              row.equipped_layer ? (
                <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[#9b815d]">
                  {titleCase(row.equipped_slot)}
                  {" · "}
                  {titleCase(row.equipped_layer)}
                  {row.hands_required === 2 ? " · Two-handed" : ""}
                </p>
              ) : null}
            </div>

            <ItemBadges row={row} />
          </div>

          {!compact && row.description?.trim() ? (
            <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-[#9f927f]">
              {row.description}
            </p>
          ) : null}

          <Requirements requirements={requirements} />

          {own && row.is_equippable && !row.parent_container_id ? (
            row.is_equipped ? (
              <form
                action={unequipInventoryItem}
                className="mt-3"
              >
                <input
                  type="hidden"
                  name="recordKind"
                  value={row.record_kind}
                />
                <input
                  type="hidden"
                  name="recordId"
                  value={row.record_id}
                />

                <button
                  type="submit"
                  className="border border-[#6a5136]/60 bg-[#1b140f] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[#aa9577]"
                >
                  Unequip
                </button>
              </form>
            ) : requirements.every((requirement) => requirement.met) ? (
              <form
                action={equipInventoryItem}
                className="mt-3"
              >
                <input
                  type="hidden"
                  name="recordKind"
                  value={row.record_kind}
                />
                <input
                  type="hidden"
                  name="recordId"
                  value={row.record_id}
                />

                <button
                  type="submit"
                  className="border border-[#987344] bg-[#3b2919] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[#efd6a8]"
                >
                  Equip
                </button>
              </form>
            ) : (
              <p className="mt-3 border border-red-900/45 bg-red-950/10 px-3 py-2 text-[8px] leading-5 uppercase tracking-[0.1em] text-red-400">
                {characterName} does not meet the requirements to equip this Item.
              </p>
            )
          ) : null}

          {own ? (
            <MoveControls
              row={row}
              containers={containers}
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

export async function CharacterInventoryDisplay({
  characterId,
  own = false,
}: {
  characterId: string;
  own?: boolean;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_public_character_inventory",
    {
      p_character_id: characterId,
    },
  );

  if (error) {
    throw new Error(
      `Unable to load character Inventory: ${error.message}`,
    );
  }

  const rows = (data ?? []) as unknown as InventoryRow[];
  const itemIds = [...new Set(rows.map((row) => row.item_id))];

  const [
    characterResult,
    membershipResult,
    requirementsResult,
  ] = await Promise.all([
    supabase
      .from("characters")
      .select(
        "display_name, first_name, surname, race_id, muscles, reflexes, vigor, shrewd, brains, presence_score",
      )
      .eq("id", characterId)
      .maybeSingle(),

    supabase
      .from("order_memberships")
      .select(`
        order_job_id,
        role:order_jobs(
          id,
          name,
          level:order_levels(
            level,
            order:orders(
              id,
              name
            )
          )
        )
      `)
      .eq("character_id", characterId)
      .limit(1)
      .maybeSingle(),

    itemIds.length
      ? supabase
          .from("items")
          .select(`
            id,
            min_muscles,
            min_reflexes,
            min_vigour,
            min_shrewd,
            min_brains,
            min_presence,
            min_order_level,
            races:item_equipment_races(
              race_id,
              race:races(name)
            ),
            orders:item_equipment_orders(
              order_id,
              order:orders(name)
            ),
            jobs:item_equipment_jobs(
              order_job_id,
              job:order_jobs(
                name,
                level:order_levels(
                  level,
                  order:orders(name)
                )
              )
            )
          `)
          .in("id", itemIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  const stateError =
    characterResult.error ??
    membershipResult.error ??
    requirementsResult.error;

  if (stateError) {
    throw new Error(
      `Unable to load Item requirements: ${stateError.message}`,
    );
  }

  const character =
    (characterResult.data ?? null) as CharacterState | null;

  const characterName =
    character?.display_name?.trim() ||
    [character?.first_name, character?.surname]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "This character";

  const membership =
    (membershipResult.data ?? null) as unknown as MembershipState | null;

  const requirementRows =
    (requirementsResult.data ?? []) as unknown as ItemRequirementRow[];

  const requirementByItem = new Map(
    requirementRows.map((row) => [row.id, row]),
  );

  const rowRequirements = (row: InventoryRow) =>
    row.is_equippable
      ? requirementList(
          requirementByItem.get(row.item_id),
          character,
          membership,
        )
      : [];

  if (!rows.length) {
    return (
      <section className="border border-[#60482e]/35 bg-[#130f0c] p-6">
        <h2 className="font-serif text-xl text-[#dfc79c]">
          Inventory
        </h2>
        <p className="mt-3 text-sm italic text-[#817565]">
          This character is not carrying any recorded Items.
        </p>
      </section>
    );
  }

  const byContainer = new Map<string, InventoryRow[]>();

  for (const row of rows) {
    if (!row.parent_container_id) continue;
    const existing =
      byContainer.get(row.parent_container_id) ?? [];
    existing.push(row);
    byContainer.set(row.parent_container_id, existing);
  }

  const containerIds = new Set(
    rows
      .filter(
        (row) =>
          row.record_kind === "unique" &&
          row.container_capacity !== null,
      )
      .map((row) => row.record_id),
  );

  const rootRows = rows.filter(
    (row) =>
      !row.parent_container_id ||
      !containerIds.has(row.parent_container_id),
  );

  const equippedRows = rootRows.filter((row) => row.is_equipped);

  const containers = rootRows.filter(
    (row) =>
      row.record_kind === "unique" &&
      row.container_capacity !== null,
  );

  const looseItems = rootRows.filter(
    (row) =>
      !row.is_equipped &&
      !(
        row.record_kind === "unique" &&
        row.container_capacity !== null
      ),
  );

  const sortRows = (values: InventoryRow[]) =>
    [...values].sort(
      (a, b) =>
        (a.equipped_slot ?? "").localeCompare(
          b.equipped_slot ?? "",
        ) ||
        a.category_name.localeCompare(b.category_name) ||
        a.name.localeCompare(b.name),
    );

  return (
    <section className="border border-[#60482e]/35 bg-[#130f0c] p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
            Possessions
          </p>
          <h2 className="mt-1 font-serif text-2xl text-[#dfc79c]">
            Inventory
          </h2>
        </div>

        <p className="text-[8px] uppercase tracking-[0.12em] text-[#756958]">
          {rows.length} record{rows.length === 1 ? "" : "s"}
        </p>
      </div>

      {equippedRows.length ? (
        <section className="mt-5 border border-[#6b5032]/50 bg-[#100c09] p-3 sm:p-4">
          <div>
            <p className="text-[7px] uppercase tracking-[0.18em] text-[#806b50]">
              Worn & carried
            </p>
            <h3 className="mt-1 font-serif text-lg text-[#d9c094]">
              Equipment
            </h3>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {sortRows(equippedRows).map((row) => (
              <InventoryCard
                key={`${row.record_kind}-${row.record_id}`}
                row={row}
                requirements={rowRequirements(row)}
                containers={containers}
                characterName={characterName}
                compact
                own={own}
              />
            ))}
          </div>
        </section>
      ) : null}

      {looseItems.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {sortRows(looseItems).map((row) => (
            <InventoryCard
              key={`${row.record_kind}-${row.record_id}`}
              row={row}
              requirements={rowRequirements(row)}
              containers={containers}
              characterName={characterName}
              own={own}
            />
          ))}
        </div>
      ) : null}

      {containers.length ? (
        <div
          className={`space-y-4 ${
            looseItems.length || equippedRows.length ? "mt-5" : "mt-4"
          }`}
        >
          {sortRows(containers).map((container) => {
            const children = sortRows(
              byContainer.get(container.record_id) ?? [],
            );

            return (
              <section
                key={container.record_id}
                className="border border-[#6b5032]/45 bg-[#100c09] p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[7px] uppercase tracking-[0.18em] text-[#806b50]">
                      Container
                    </p>
                    <h3 className="mt-1 font-serif text-lg text-[#d9c094]">
                      {container.name}
                    </h3>
                  </div>

                  <span className="text-[8px] uppercase tracking-[0.12em] text-[#766957]">
                    {children.length} / {container.container_capacity} slots
                  </span>
                </div>

                {children.length ? (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {children.map((row) => (
                      <InventoryCard
                        key={`${row.record_kind}-${row.record_id}`}
                        row={row}
                        requirements={rowRequirements(row)}
                        containers={containers}
                        characterName={characterName}
                        compact
                        own={own}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-xs italic text-[#756958]">
                    Empty.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
