"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  equipInventoryItem,
  unequipInventoryItem,
} from "@/lib/items/equipment-actions";
import {
  moveOwnInventoryItem,
} from "@/lib/items/inventory-move-actions";
import { useInventoryItem } from "@/lib/items/use-actions";

export type InventoryRequirement = {
  label: string;
  met: boolean;
};

export type InventoryBrowserRow = {
  record_kind:
    | "standard"
    | "unique";
  record_id: string;
  item_id: string;
  parent_container_id:
    | string
    | null;
  name: string;
  description: string;
  image_url:
    | string
    | null;
  category_name: string;
  subcategory_name:
    | string
    | null;
  quality: string;
  quantity: number;
  is_unique: boolean;
  is_quest_item: boolean;
  transfer_policy: string;
  container_capacity:
    | number
    | null;
  is_usable: boolean;
  is_equippable: boolean;
  is_equipped: boolean;
  equipped_slot:
    | string
    | null;
  equipped_layer:
    | string
    | null;
  configured_slot:
    | string
    | null;
  hands_required: number;
  use_behaviour:
    | string
    | null;
  target_mode:
    | string
    | null;
  max_charges:
    | number
    | null;
  charges_remaining:
    | number
    | null;
  cooldown_minutes:
    | number
    | null;
  cooldown_ready_at:
    | string
    | null;
  use_block_reason:
    | string
    | null;
  requirements:
    InventoryRequirement[];
};

type StatusFilter =
  | "all"
  | "equipped"
  | "equippable"
  | "not_equippable"
  | "loose"
  | "container"
  | "usable"
  | "unique"
  | "quest";

type RequirementFilter =
  | "all"
  | "met"
  | "not_met";

const SLOT_ORDER = [
  "head",
  "neck",
  "shoulders",
  "torso",
  "back",
  "arms",
  "hands",
  "waist",
  "legs",
  "feet",
  "main_hand",
  "off_hand",
] as const;

const LAYER_ORDER = [
  "base",
  "clothing",
  "armour",
  "outer",
  "accessory",
  "held",
] as const;

const SLOT_LABELS:
  Record<string, string> = {
    head: "Head",
    neck: "Neck",
    shoulders:
      "Shoulders",
    torso: "Torso",
    back: "Back",
    arms: "Arms",
    hands: "Hands",
    waist: "Waist",
    legs: "Legs",
    feet: "Feet",
    main_hand:
      "Main Hand",
    off_hand:
      "Off Hand",
  };

function titleCase(
  value: string,
) {
  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function uniqueSorted(
  values: (
    | string
    | null
    | undefined
  )[],
) {
  return [
    ...new Set(
      values.filter(
        (
          value,
        ): value is string =>
          Boolean(value),
      ),
    ),
  ].sort((a, b) =>
    a.localeCompare(b),
  );
}

function meetsAllRequirements(
  row: InventoryBrowserRow,
) {
  return row.requirements.every(
    (requirement) =>
      requirement.met,
  );
}

function ItemThumbnail({
  row,
  size = "normal",
}: {
  row: InventoryBrowserRow;
  size?: "small" | "normal";
}) {
  const sizeClass =
    size === "small"
      ? "h-8 w-8"
      : "h-14 w-14";

  return (
    <div
      className={`shrink-0 overflow-hidden border border-[#60482e]/45 bg-[#0d0907] ${sizeClass}`}
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
  );
}

function Requirements({
  requirements,
}: {
  requirements:
    InventoryRequirement[];
}) {
  if (!requirements.length) {
    return null;
  }

  return (
    <div className="mt-3 border-t border-[#59432c]/30 pt-2.5">
      <p className="text-[7px] uppercase tracking-[0.16em] text-[#806b50]">
        Requirements
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {requirements.map(
          (requirement) => (
            <span
              key={
                requirement.label
              }
              className={`border px-2 py-1 text-[7px] uppercase tracking-[0.1em] ${
                requirement.met
                  ? "border-emerald-900/65 bg-emerald-950/20 text-emerald-400"
                  : "border-red-900/65 bg-red-950/20 text-red-400"
              }`}
            >
              {
                requirement.label
              }
            </span>
          ),
        )}
      </div>
    </div>
  );
}

function Badges({
  row,
}: {
  row: InventoryBrowserRow;
}) {
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

function UseControl({
  row,
}: {
  row: InventoryBrowserRow;
}) {
  const router = useRouter();

  const [pending, startTransition] =
    useTransition();

  const [message, setMessage] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState(false);

  if (!row.is_usable) {
    return null;
  }

  const targetMode =
    row.target_mode ?? "self";

  if (targetMode !== "self") {
    return (
      <p className="mt-3 border border-[#59432c]/40 bg-[#100c09] px-3 py-2 text-[8px] uppercase tracking-[0.1em] text-[#8d7d68]">
        This Item requires a target. Targeted use is coming in the next D5 step.
      </p>
    );
  }

  if (
    row.record_kind === "unique" &&
    row.max_charges !== null
  ) {
    const remaining =
      row.charges_remaining ??
      row.max_charges;

    if (remaining <= 0) {
      return (
        <p className="mt-3 border border-red-900/45 bg-red-950/10 px-3 py-2 text-[8px] uppercase tracking-[0.1em] text-red-400">
          No charges remaining.
        </p>
      );
    }
  }

  if (row.use_block_reason) {
    return (
      <p className="mt-3 border border-[#59432c]/40 bg-[#100c09] px-3 py-2 text-[8px] uppercase tracking-[0.1em] text-[#a6947b]">
        {row.use_block_reason}
      </p>
    );
  }

  const readyAt =
    row.cooldown_ready_at
      ? Date.parse(row.cooldown_ready_at)
      : Number.NaN;

  const onCooldown =
    Number.isFinite(readyAt) &&
    readyAt > Date.now();

  if (onCooldown) {
    const minutes = Math.max(
      1,
      Math.ceil(
        (readyAt - Date.now()) /
          60_000,
      ),
    );

    return (
      <p className="mt-3 border border-amber-900/45 bg-amber-950/10 px-3 py-2 text-[8px] uppercase tracking-[0.1em] text-amber-400">
        On cooldown — ready in {minutes} min
      </p>
    );
  }

  const remaining =
    row.record_kind === "unique" &&
    row.max_charges !== null
      ? row.charges_remaining ??
        row.max_charges
      : null;

  const run = () => {
    const data = new FormData();

    data.set(
      "recordKind",
      row.record_kind,
    );
    data.set(
      "recordId",
      row.record_id,
    );

    setMessage(null);

    startTransition(async () => {
      const result =
        await useInventoryItem(data);

      setSuccess(result.ok);
      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  };

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="border border-[#6f7545] bg-[#202615] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[#cbd39a] transition hover:bg-[#293019] disabled:cursor-wait disabled:opacity-50"
        >
          {pending ? "Using..." : "Use"}
        </button>

        {remaining !== null ? (
          <span className="text-[7px] uppercase tracking-[0.12em] text-[#80735f]">
            {remaining} / {row.max_charges} charges
          </span>
        ) : null}
      </div>

      {message ? (
        <p
          className={`mt-2 text-[8px] leading-5 ${
            success
              ? "text-emerald-400"
              : "text-red-400"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

function MoveControls({
  row,
  containers,
}: {
  row: InventoryBrowserRow;
  containers:
    InventoryBrowserRow[];
}) {
  if (
    row.record_kind ===
      "unique" &&
    row.container_capacity !==
      null
  ) {
    return null;
  }

  return (
    <form
      action={
        moveOwnInventoryItem
      }
      className="mt-3 flex flex-wrap gap-2"
    >
      <input
        type="hidden"
        name="recordKind"
        value={
          row.record_kind
        }
      />
      <input
        type="hidden"
        name="recordId"
        value={row.record_id}
      />

      <select
        name="targetContainerId"
        defaultValue={
          row.parent_container_id ??
          ""
        }
        className="min-w-[150px] flex-1 border border-[#60482e]/55 bg-[#100c09] px-3 py-2 text-[9px] text-[#cdbb9d] outline-none focus:border-[#987344]"
      >
        <option value="">
          Loose Inventory
        </option>

        {containers.map(
          (container) => (
            <option
              key={
                container.record_id
              }
              value={
                container.record_id
              }
            >
              {
                container.name
              }
            </option>
          ),
        )}
      </select>

      <button
        type="submit"
        className="border border-[#6f5639]/60 bg-[#1b140f] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[#bca483] transition hover:border-[#987344] hover:text-[#e2c99f]"
      >
        Move
      </button>
    </form>
  );
}

function ItemCard({
  row,
  containers,
  characterName,
  own,
  compact = false,
}: {
  row: InventoryBrowserRow;
  containers:
    InventoryBrowserRow[];
  characterName: string;
  own: boolean;
  compact?: boolean;
}) {
  const eligible =
    meetsAllRequirements(
      row,
    );

  return (
    <article
      className={`border ${
        row.is_equipped
          ? "border-[#8d6d3e]/65 bg-[#18110c]"
          : "border-[#59432c]/40 bg-[#120e0b]"
      } ${
        compact
          ? "p-3"
          : "p-4"
      }`}
    >
      <div className="flex gap-3">
        <ItemThumbnail
          row={row}
          size={
            compact
              ? "small"
              : "normal"
          }
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-serif text-base text-[#dec89f]">
                {row.name}

                {row.quantity >
                1 ? (
                  <span className="ml-2 font-sans text-[10px] text-[#9b8768]">
                    ×
                    {
                      row.quantity
                    }
                  </span>
                ) : null}
              </p>

              <p className="mt-1 text-[7px] uppercase tracking-[0.14em] text-[#776957]">
                {
                  row.category_name
                }
                {row.subcategory_name
                  ? ` · ${row.subcategory_name}`
                  : ""}
                {" · "}
                {titleCase(
                  row.quality,
                )}
              </p>

              {row.is_equipped &&
              row.equipped_slot &&
              row.equipped_layer ? (
                <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[#9b815d]">
                  {titleCase(
                    row.equipped_slot,
                  )}
                  {" · "}
                  {titleCase(
                    row.equipped_layer,
                  )}
                  {row.hands_required ===
                  2
                    ? " · Two-handed"
                    : ""}
                </p>
              ) : null}
            </div>

            <Badges row={row} />
          </div>

          {!compact &&
          row.description?.trim() ? (
            <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-[#9f927f]">
              {
                row.description
              }
            </p>
          ) : null}

          <Requirements
            requirements={
              row.requirements
            }
          />

          {own &&
          row.is_equippable &&
          !row.parent_container_id ? (
            row.is_equipped ? (
              <form
                action={
                  unequipInventoryItem
                }
                className="mt-3"
              >
                <input
                  type="hidden"
                  name="recordKind"
                  value={
                    row.record_kind
                  }
                />
                <input
                  type="hidden"
                  name="recordId"
                  value={
                    row.record_id
                  }
                />

                <button
                  type="submit"
                  className="border border-[#6a5136]/60 bg-[#1b140f] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[#aa9577] transition hover:border-[#8e6d46] hover:text-[#dfc79c]"
                >
                  Unequip
                </button>
              </form>
            ) : eligible ? (
              <form
                action={
                  equipInventoryItem
                }
                className="mt-3"
              >
                <input
                  type="hidden"
                  name="recordKind"
                  value={
                    row.record_kind
                  }
                />
                <input
                  type="hidden"
                  name="recordId"
                  value={
                    row.record_id
                  }
                />

                <button
                  type="submit"
                  className="border border-[#987344] bg-[#3b2919] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[#efd6a8] transition hover:bg-[#4a321e]"
                >
                  Equip
                </button>
              </form>
            ) : (
              <p className="mt-3 border border-red-900/45 bg-red-950/10 px-3 py-2 text-[8px] leading-5 uppercase tracking-[0.1em] text-red-400">
                {
                  characterName
                }{" "}
                does not meet
                the
                requirements to
                equip this Item.
              </p>
            )
          ) : null}

          {own ? (
            <UseControl row={row} />
          ) : null}

          {own ? (
            <MoveControls
              row={row}
              containers={
                containers
              }
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Silhouette() {
  return (
    <div
      aria-hidden="true"
      className="absolute left-1/2 top-1/2 h-[480px] w-[190px] -translate-x-1/2 -translate-y-1/2 opacity-70"
    >
      <div className="absolute left-1/2 top-0 h-20 w-20 -translate-x-1/2 rounded-full border border-[#806442]/55 bg-[#1a130e]" />

      <div className="absolute left-1/2 top-[86px] h-[190px] w-[108px] -translate-x-1/2 rounded-[46%_46%_30%_30%] border border-[#806442]/55 bg-[#17100c]" />

      <div className="absolute left-[12px] top-[105px] h-[195px] w-8 rotate-[8deg] rounded-full border border-[#806442]/45 bg-[#15100c]" />

      <div className="absolute right-[12px] top-[105px] h-[195px] w-8 -rotate-[8deg] rounded-full border border-[#806442]/45 bg-[#15100c]" />

      <div className="absolute bottom-0 left-[48px] h-[210px] w-9 rotate-[2deg] rounded-full border border-[#806442]/45 bg-[#15100c]" />

      <div className="absolute bottom-0 right-[48px] h-[210px] w-9 -rotate-[2deg] rounded-full border border-[#806442]/45 bg-[#15100c]" />

      <div className="absolute left-1/2 top-[70px] h-[390px] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#8b6940]/25 to-transparent" />
    </div>
  );
}

function EquipmentSlotCard({
  slot,
  rows,
  own,
}: {
  slot: string;
  rows:
    InventoryBrowserRow[];
  own: boolean;
}) {
  const sorted = [
    ...rows,
  ].sort(
    (a, b) =>
      LAYER_ORDER.indexOf(
        a.equipped_layer as
          (typeof LAYER_ORDER)[number],
      ) -
      LAYER_ORDER.indexOf(
        b.equipped_layer as
          (typeof LAYER_ORDER)[number],
      ),
  );

  return (
    <div className="border border-[#60482e]/45 bg-[#120d09]/95 p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
      <p className="text-[7px] uppercase tracking-[0.18em] text-[#876f4f]">
        {
          SLOT_LABELS[
            slot
          ]
        }
      </p>

      {sorted.length ? (
        <div className="mt-2 space-y-2">
          {sorted.map(
            (row) => (
              <div
                key={`${row.record_kind}-${row.record_id}`}
                className="flex items-center gap-2 border-t border-[#59432c]/25 pt-2 first:border-t-0 first:pt-0"
              >
                <ItemThumbnail
                  row={row}
                  size="small"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-[12px] text-[#d8c095]">
                    {
                      row.name
                    }
                  </p>
                  <p className="mt-0.5 text-[6px] uppercase tracking-[0.12em] text-[#756957]">
                    {titleCase(
                      row.equipped_layer ??
                        "equipped",
                    )}
                  </p>
                </div>

                {own ? (
                  <form
                    action={
                      unequipInventoryItem
                    }
                  >
                    <input
                      type="hidden"
                      name="recordKind"
                      value={
                        row.record_kind
                      }
                    />
                    <input
                      type="hidden"
                      name="recordId"
                      value={
                        row.record_id
                      }
                    />
                    <button
                      type="submit"
                      title={`Unequip ${row.name}`}
                      className="px-1 text-[13px] text-[#806d55] transition hover:text-[#d7b77f]"
                    >
                      ×
                    </button>
                  </form>
                ) : null}
              </div>
            ),
          )}
        </div>
      ) : (
        <p className="mt-2 text-[9px] italic text-[#665b4c]">
          Empty
        </p>
      )}
    </div>
  );
}

const DESKTOP_POSITIONS:
  Record<string, string> = {
    head:
      "left-1/2 top-0 w-[190px] -translate-x-1/2",
    neck:
      "right-[5%] top-[12%] w-[185px]",
    shoulders:
      "left-[5%] top-[17%] w-[185px]",
    back:
      "left-[2%] top-[34%] w-[185px]",
    torso:
      "right-[2%] top-[34%] w-[185px]",
    arms:
      "left-[1%] top-[51%] w-[185px]",
    hands:
      "right-[1%] top-[51%] w-[185px]",
    main_hand:
      "left-[4%] top-[68%] w-[185px]",
    off_hand:
      "right-[4%] top-[68%] w-[185px]",
    waist:
      "right-[18%] top-[80%] w-[175px]",
    legs:
      "left-[18%] top-[80%] w-[175px]",
    feet:
      "left-1/2 bottom-0 w-[190px] -translate-x-1/2",
  };

function EquipmentFigure({
  equipped,
  own,
}: {
  equipped:
    InventoryBrowserRow[];
  own: boolean;
}) {
  const bySlot =
    new Map<
      string,
      InventoryBrowserRow[]
    >();

  for (const row of equipped) {
    if (!row.equipped_slot) {
      continue;
    }

    const values =
      bySlot.get(
        row.equipped_slot,
      ) ?? [];

    values.push(row);

    bySlot.set(
      row.equipped_slot,
      values,
    );
  }

  return (
    <section className="mt-5 overflow-hidden border border-[#60482e]/45 bg-[#100c09]">
      <div className="border-b border-[#59432c]/35 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[7px] uppercase tracking-[0.2em] text-[#806b50]">
              Worn &
              carried
            </p>
            <h3 className="mt-1 font-serif text-xl text-[#d9c094]">
              Equipment
            </h3>
          </div>

          <p className="text-[8px] uppercase tracking-[0.12em] text-[#756958]">
            {
              equipped.length
            }{" "}
            equipped
          </p>
        </div>
      </div>

      <div className="relative hidden min-h-[760px] md:block">
        <div className="absolute inset-x-[24%] top-[10%] bottom-[8%] rounded-[45%] border border-[#60482e]/15 bg-[radial-gradient(circle_at_center,rgba(92,68,42,0.10),transparent_68%)]" />

        <Silhouette />

        {SLOT_ORDER.map(
          (slot) => (
            <div
              key={slot}
              className={`absolute ${DESKTOP_POSITIONS[slot]}`}
            >
              <EquipmentSlotCard
                slot={slot}
                rows={
                  bySlot.get(
                    slot,
                  ) ?? []
                }
                own={own}
              />
            </div>
          ),
        )}
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-2 md:hidden">
        <div className="col-span-full mx-auto mb-3 h-[220px] w-[110px]">
          <div className="relative h-full w-full scale-[0.46] origin-top">
            <Silhouette />
          </div>
        </div>

        {SLOT_ORDER.map(
          (slot) => (
            <EquipmentSlotCard
              key={slot}
              slot={slot}
              rows={
                bySlot.get(
                  slot,
                ) ?? []
              }
              own={own}
            />
          ),
        )}
      </div>
    </section>
  );
}

function FilterBar({
  search,
  setSearch,
  category,
  setCategory,
  subcategory,
  setSubcategory,
  quality,
  setQuality,
  slot,
  setSlot,
  status,
  setStatus,
  requirement,
  setRequirement,
  categories,
  subcategories,
  qualities,
  own,
  reset,
}: {
  search: string;
  setSearch:
    (value: string) => void;
  category: string;
  setCategory:
    (value: string) => void;
  subcategory: string;
  setSubcategory:
    (value: string) => void;
  quality: string;
  setQuality:
    (value: string) => void;
  slot: string;
  setSlot:
    (value: string) => void;
  status: StatusFilter;
  setStatus:
    (value: StatusFilter) =>
      void;
  requirement:
    RequirementFilter;
  setRequirement:
    (
      value:
        RequirementFilter,
    ) => void;
  categories: string[];
  subcategories: string[];
  qualities: string[];
  own: boolean;
  reset: () => void;
}) {
  const control =
    "border border-[#60482e]/50 bg-[#100c09] px-3 py-2.5 text-[9px] text-[#cbb89a] outline-none transition focus:border-[#987344]";

  return (
    <div className="mt-5 border border-[#60482e]/40 bg-[#120e0b] p-3 sm:p-4">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target
                .value,
            )
          }
          placeholder="Search Items by name..."
          className={`${control} sm:col-span-2`}
        />

        <select
          value={category}
          onChange={(event) =>
            setCategory(
              event.target
                .value,
            )
          }
          className={control}
        >
          <option value="">
            All Categories
          </option>
          {categories.map(
            (value) => (
              <option
                key={value}
                value={value}
              >
                {value}
              </option>
            ),
          )}
        </select>

        <select
          value={
            subcategory
          }
          onChange={(event) =>
            setSubcategory(
              event.target
                .value,
            )
          }
          className={control}
        >
          <option value="">
            All
            Subcategories
          </option>
          {subcategories.map(
            (value) => (
              <option
                key={value}
                value={value}
              >
                {value}
              </option>
            ),
          )}
        </select>

        <select
          value={quality}
          onChange={(event) =>
            setQuality(
              event.target
                .value,
            )
          }
          className={control}
        >
          <option value="">
            All Qualities
          </option>
          {qualities.map(
            (value) => (
              <option
                key={value}
                value={value}
              >
                {titleCase(
                  value,
                )}
              </option>
            ),
          )}
        </select>

        <select
          value={slot}
          onChange={(event) =>
            setSlot(
              event.target
                .value,
            )
          }
          className={control}
        >
          <option value="">
            All Body Slots
          </option>
          {SLOT_ORDER.map(
            (value) => (
              <option
                key={value}
                value={value}
              >
                {
                  SLOT_LABELS[
                    value
                  ]
                }
              </option>
            ),
          )}
        </select>

        <select
          value={status}
          onChange={(event) =>
            setStatus(
              event.target
                .value as StatusFilter,
            )
          }
          className={control}
        >
          <option value="all">
            All Statuses
          </option>
          <option value="equipped">
            Equipped
          </option>
          <option value="equippable">
            Equippable
          </option>
          <option value="not_equippable">
            Not Equippable
          </option>
          <option value="loose">
            Loose Inventory
          </option>
          <option value="container">
            In a Container
          </option>
          <option value="usable">
            Usable
          </option>
          <option value="unique">
            Unique
          </option>
          <option value="quest">
            Quest Items
          </option>
        </select>

        {own ? (
          <select
            value={
              requirement
            }
            onChange={(
              event,
            ) =>
              setRequirement(
                event.target
                  .value as RequirementFilter,
              )
            }
            className={control}
          >
            <option value="all">
              All
              Requirements
            </option>
            <option value="met">
              Requirements
              Met
            </option>
            <option value="not_met">
              Requirements
              Not Met
            </option>
          </select>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#59432c]/25 pt-3">
        <p className="text-[7px] uppercase tracking-[0.12em] text-[#6f6252]">
          Filters update
          instantly
        </p>

        <button
          type="button"
          onClick={reset}
          className="border border-[#60482e]/45 px-3 py-2 text-[7px] uppercase tracking-[0.14em] text-[#9d896a] transition hover:border-[#987344] hover:text-[#dec89f]"
        >
          Reset filters
        </button>
      </div>
    </div>
  );
}

export function CharacterInventoryBrowser({
  rows,
  characterName,
  own = false,
}: {
  rows:
    InventoryBrowserRow[];
  characterName: string;
  own?: boolean;
}) {
  const [
    search,
    setSearch,
  ] = useState("");

  const [
    category,
    setCategory,
  ] = useState("");

  const [
    subcategory,
    setSubcategory,
  ] = useState("");

  const [
    quality,
    setQuality,
  ] = useState("");

  const [
    slot,
    setSlot,
  ] = useState("");

  const [
    status,
    setStatus,
  ] =
    useState<StatusFilter>(
      "all",
    );

  const [
    requirement,
    setRequirement,
  ] =
    useState<RequirementFilter>(
      "all",
    );

  const [
    collapsed,
    setCollapsed,
  ] = useState<
    Set<string>
  >(() => new Set());

  const categories =
    useMemo(
      () =>
        uniqueSorted(
          rows.map(
            (row) =>
              row.category_name,
          ),
        ),
      [rows],
    );

  const subcategories =
    useMemo(
      () =>
        uniqueSorted(
          rows.map(
            (row) =>
              row.subcategory_name,
          ),
        ),
      [rows],
    );

  const qualities =
    useMemo(
      () =>
        uniqueSorted(
          rows.map(
            (row) =>
              row.quality,
          ),
        ),
      [rows],
    );

  const containers =
    useMemo(
      () =>
        rows.filter(
          (row) =>
            row.record_kind ===
              "unique" &&
            row.container_capacity !==
              null &&
            !row.parent_container_id,
        ),
      [rows],
    );

  const equipped =
    useMemo(
      () =>
        rows.filter(
          (row) =>
            row.is_equipped,
        ),
      [rows],
    );

  const filteredRows =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLocaleLowerCase();

      return rows.filter(
        (row) => {
          if (
            query &&
            !row.name
              .toLocaleLowerCase()
              .includes(
                query,
              )
          ) {
            return false;
          }

          if (
            category &&
            row.category_name !==
              category
          ) {
            return false;
          }

          if (
            subcategory &&
            row.subcategory_name !==
              subcategory
          ) {
            return false;
          }

          if (
            quality &&
            row.quality !==
              quality
          ) {
            return false;
          }

          if (
            slot &&
            row.configured_slot !==
              slot
          ) {
            return false;
          }

          if (
            status ===
              "equipped" &&
            !row.is_equipped
          ) {
            return false;
          }

          if (
            status ===
              "equippable" &&
            !row.is_equippable
          ) {
            return false;
          }

          if (
            status ===
              "not_equippable" &&
            row.is_equippable
          ) {
            return false;
          }

          if (
            status ===
              "loose" &&
            row.parent_container_id
          ) {
            return false;
          }

          if (
            status ===
              "container" &&
            !row.parent_container_id
          ) {
            return false;
          }

          if (
            status ===
              "usable" &&
            !row.is_usable
          ) {
            return false;
          }

          if (
            status ===
              "unique" &&
            !row.is_unique
          ) {
            return false;
          }

          if (
            status ===
              "quest" &&
            !row.is_quest_item
          ) {
            return false;
          }

          if (
            own &&
            requirement ===
              "met" &&
            !meetsAllRequirements(
              row,
            )
          ) {
            return false;
          }

          if (
            own &&
            requirement ===
              "not_met" &&
            meetsAllRequirements(
              row,
            )
          ) {
            return false;
          }

          return true;
        },
      );
    }, [
      rows,
      search,
      category,
      subcategory,
      quality,
      slot,
      status,
      requirement,
      own,
    ]);

  const filteredById =
    useMemo(
      () =>
        new Set(
          filteredRows.map(
            (row) =>
              row.record_id,
          ),
        ),
      [filteredRows],
    );

  const rootForCategories =
    filteredRows.filter(
      (row) =>
        !row.parent_container_id,
    );

  const normalRoot =
    rootForCategories.filter(
      (row) =>
        !(
          row.record_kind ===
            "unique" &&
          row.container_capacity !==
            null
        ),
    );

  const categoryGroups =
    useMemo(() => {
      const map =
        new Map<
          string,
          InventoryBrowserRow[]
        >();

      for (const row of normalRoot) {
        const values =
          map.get(
            row.category_name,
          ) ?? [];

        values.push(row);

        map.set(
          row.category_name,
          values,
        );
      }

      return [
        ...map.entries(),
      ].sort(([a], [b]) =>
        a.localeCompare(b),
      );
    }, [normalRoot]);

  const visibleContainers =
    containers.filter(
      (container) => {
        if (
          filteredById.has(
            container.record_id,
          )
        ) {
          return true;
        }

        return rows.some(
          (row) =>
            row.parent_container_id ===
              container.record_id &&
            filteredById.has(
              row.record_id,
            ),
        );
      },
    );

  const toggleCategory = (
    name: string,
  ) => {
    setCollapsed(
      (current) => {
        const next =
          new Set(current);

        if (
          next.has(name)
        ) {
          next.delete(name);
        } else {
          next.add(name);
        }

        return next;
      },
    );
  };

  const reset = () => {
    setSearch("");
    setCategory("");
    setSubcategory("");
    setQuality("");
    setSlot("");
    setStatus("all");
    setRequirement("all");
  };

  if (!rows.length) {
    return (
      <section className="border border-[#60482e]/35 bg-[#130f0c] p-6">
        <h2 className="font-serif text-xl text-[#dfc79c]">
          Inventory
        </h2>
        <p className="mt-3 text-sm italic text-[#817565]">
          This character is
          not carrying any
          recorded Items.
        </p>
      </section>
    );
  }

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
          {
            rows.length
          }{" "}
          record
          {rows.length === 1
            ? ""
            : "s"}
        </p>
      </div>

      <FilterBar
        search={search}
        setSearch={
          setSearch
        }
        category={
          category
        }
        setCategory={
          setCategory
        }
        subcategory={
          subcategory
        }
        setSubcategory={
          setSubcategory
        }
        quality={
          quality
        }
        setQuality={
          setQuality
        }
        slot={slot}
        setSlot={setSlot}
        status={
          status
        }
        setStatus={
          setStatus
        }
        requirement={
          requirement
        }
        setRequirement={
          setRequirement
        }
        categories={
          categories
        }
        subcategories={
          subcategories
        }
        qualities={
          qualities
        }
        own={own}
        reset={reset}
      />

      <EquipmentFigure
        equipped={
          equipped
        }
        own={own}
      />

      <div className="mt-5 space-y-3">
        {categoryGroups.map(
          ([
            categoryName,
            categoryRows,
          ]) => {
            const isCollapsed =
              collapsed.has(
                categoryName,
              );

            return (
              <section
                key={
                  categoryName
                }
                className="overflow-hidden border border-[#60482e]/40 bg-[#100c09]"
              >
                <button
                  type="button"
                  onClick={() =>
                    toggleCategory(
                      categoryName,
                    )
                  }
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-[#17100c]"
                >
                  <div>
                    <p className="text-[7px] uppercase tracking-[0.18em] text-[#806b50]">
                      Category
                    </p>
                    <h3 className="mt-1 font-serif text-lg text-[#d9c094]">
                      {
                        categoryName
                      }
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[8px] uppercase tracking-[0.12em] text-[#756958]">
                      {
                        categoryRows.length
                      }{" "}
                      item
                      {categoryRows.length ===
                      1
                        ? ""
                        : "s"}
                    </span>

                    <span className="font-serif text-lg text-[#8f7757]">
                      {isCollapsed
                        ? "+"
                        : "−"}
                    </span>
                  </div>
                </button>

                {!isCollapsed ? (
                  <div className="grid gap-3 border-t border-[#59432c]/30 p-3 md:grid-cols-2">
                    {categoryRows.map(
                      (row) => (
                        <ItemCard
                          key={`${row.record_kind}-${row.record_id}`}
                          row={
                            row
                          }
                          containers={
                            containers
                          }
                          characterName={
                            characterName
                          }
                          own={
                            own
                          }
                        />
                      ),
                    )}
                  </div>
                ) : null}
              </section>
            );
          },
        )}

        {visibleContainers.length ? (
          <section className="overflow-hidden border border-[#60482e]/40 bg-[#100c09]">
            <button
              type="button"
              onClick={() =>
                toggleCategory(
                  "__containers__",
                )
              }
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-[#17100c]"
            >
              <div>
                <p className="text-[7px] uppercase tracking-[0.18em] text-[#806b50]">
                  Category
                </p>
                <h3 className="mt-1 font-serif text-lg text-[#d9c094]">
                  Containers
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[8px] uppercase tracking-[0.12em] text-[#756958]">
                  {
                    visibleContainers.length
                  }{" "}
                  container
                  {visibleContainers.length ===
                  1
                    ? ""
                    : "s"}
                </span>

                <span className="font-serif text-lg text-[#8f7757]">
                  {collapsed.has(
                    "__containers__",
                  )
                    ? "+"
                    : "−"}
                </span>
              </div>
            </button>

            {!collapsed.has(
              "__containers__",
            ) ? (
              <div className="space-y-3 border-t border-[#59432c]/30 p-3">
                {visibleContainers.map(
                  (
                    container,
                  ) => {
                    const children =
                      rows
                        .filter(
                          (row) =>
                            row.parent_container_id ===
                              container.record_id &&
                            filteredById.has(
                              row.record_id,
                            ),
                        )
                        .sort(
                          (a, b) =>
                            a.name.localeCompare(
                              b.name,
                            ),
                        );

                    const totalChildren =
                      rows.filter(
                        (row) =>
                          row.parent_container_id ===
                          container.record_id,
                      ).length;

                    return (
                      <div
                        key={
                          container.record_id
                        }
                        className="border border-[#59432c]/35 bg-[#120e0b] p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <ItemThumbnail
                              row={
                                container
                              }
                            />

                            <div>
                              <p className="text-[7px] uppercase tracking-[0.16em] text-[#806b50]">
                                Container
                              </p>
                              <h4 className="mt-1 font-serif text-base text-[#dec89f]">
                                {
                                  container.name
                                }
                              </h4>
                            </div>
                          </div>

                          <span className="text-[8px] uppercase tracking-[0.12em] text-[#756958]">
                            {
                              totalChildren
                            }{" "}
                            /{" "}
                            {
                              container.container_capacity
                            }{" "}
                            slots
                          </span>
                        </div>

                        {container.description?.trim() ? (
                          <p className="mt-3 text-xs leading-5 text-[#8f8271]">
                            {
                              container.description
                            }
                          </p>
                        ) : null}

                        {children.length ? (
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            {children.map(
                              (
                                row,
                              ) => (
                                <ItemCard
                                  key={`${row.record_kind}-${row.record_id}`}
                                  row={
                                    row
                                  }
                                  containers={
                                    containers
                                  }
                                  characterName={
                                    characterName
                                  }
                                  own={
                                    own
                                  }
                                  compact
                                />
                              ),
                            )}
                          </div>
                        ) : totalChildren ? (
                          <p className="mt-3 text-[9px] italic text-[#756958]">
                            No
                            contained
                            Items match
                            the current
                            filters.
                          </p>
                        ) : (
                          <p className="mt-3 text-[9px] italic text-[#756958]">
                            Empty.
                          </p>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            ) : null}
          </section>
        ) : null}

        {!categoryGroups.length &&
        !visibleContainers.length ? (
          <div className="border border-[#60482e]/35 bg-[#100c09] px-5 py-8 text-center">
            <p className="font-serif text-lg text-[#bda681]">
              No Items match
              these filters.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-3 text-[8px] uppercase tracking-[0.14em] text-[#8f7757] underline decoration-[#60482e] underline-offset-4"
            >
              Reset filters
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
