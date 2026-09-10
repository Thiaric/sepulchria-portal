"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  ItemImageFrame,
} from "@/components/items/item-image-frame";
import {
  formatRemnants,
} from "@/lib/economy/currency";
import {
  equipInventoryItem,
  unequipInventoryItem,
} from "@/lib/items/equipment-actions";
import {
  moveOwnInventoryItem,
} from "@/lib/items/inventory-move-actions";
import { useInventoryItem } from "@/lib/items/use-actions";
import { discardInventoryItem } from "@/lib/items/player-transfer-actions";

export type InventoryUseTarget = {
  id: string;
  name: string;
};

export type InventoryRequirement = {
  label: string;
  met: boolean;
};

export type InventoryEquipmentBonus = {
  label: string;
  value: number;
};

export type InventoryItemEffect = {
  label: string;
  value: number;
  context: string;
  duration_minutes: number | null;
};

export type InventoryBrowserRow = {
  record_kind:
    | "standard"
    | "unique";
  record_id: string;
  item_id: string;
  item_active: boolean;
  teaches_recipe: boolean;
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
  reference_value: number | null;
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
  success_die:
    | number
    | null;
  success_threshold:
    | number
    | null;
  success_attribute:
    | "muscles"
    | "reflexes"
    | "vigor"
    | "brains"
    | "shrewd"
    | "presence_score"
    | null;
  damage_dice:
    | string
    | null;
  damage_type:
    | string
    | null;
  cooldown_ready_at:
    | string
    | null;
  active_effect_expires_at:
    | string
    | null;
  use_block_reason:
    | string
    | null;
  requirements:
    InventoryRequirement[];
  equipment_bonuses:
    InventoryEquipmentBonus[];
  item_effects:
    InventoryItemEffect[];
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
  return (
    <ItemImageFrame
      src={row.image_url}
      quality={row.quality}
      className={
        size === "small"
          ? "h-8 w-8"
          : "h-14 w-14"
      }
      badgeSize={
        size === "small"
          ? "xs"
          : "sm"
      }
    />
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
    <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2.5 components_characters_character_inventory_browser_div_container">
      <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] components_characters_character_inventory_browser_p_text">
        Requirements
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5 components_characters_character_inventory_browser_div_container_2">
        {requirements.map(
          (requirement) => (
            <span
              key={
                requirement.label
              }
              className={[((`border px-2 py-1 text-[7px] uppercase tracking-[0.1em] ${
                requirement.met
                  ? "border-emerald-900/65 bg-emerald-950/20 text-emerald-400"
                  : "border-red-900/65 bg-red-950/20 text-red-400"
              }`)), "components_characters_character_inventory_browser_span_text"].filter(Boolean).join(" ")}
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
    <div className="flex flex-wrap gap-1.5 components_characters_character_inventory_browser_div_container_3">
      {row.reference_value !== null ? (
        <span className="border border-[rgb(var(--sep-colour-8d6d3e))]/55 bg-[rgb(var(--sep-colour-21180f))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d3b278))] components_characters_character_inventory_browser_span_text_2">
          Reference {formatRemnants(
            row.reference_value,
          )}
        </span>
      ) : null}

      {row.is_equipped ? (
        <span className="border border-[rgb(var(--sep-colour-9a7543))]/65 bg-[rgb(var(--sep-colour-2d2115))] px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-dfbd83))] components_characters_character_inventory_browser_span_text_3">
          Equipped
        </span>
      ) : null}

      {row.is_unique ? (
        <span className="border border-[rgb(var(--sep-colour-8d6d3e))]/55 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-c7a46e))] components_characters_character_inventory_browser_span_text_4">
          Unique
        </span>
      ) : null}

      {row.is_quest_item ? (
        <span className="border border-[rgb(var(--sep-colour-65456f))]/55 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-bda0c7))] components_characters_character_inventory_browser_span_text_5">
          Quest
        </span>
      ) : null}

      {row.is_usable ? (
        <span className="border border-[rgb(var(--sep-colour-49634f))]/55 px-2 py-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-9cbe9f))] components_characters_character_inventory_browser_span_text_6">
          Usable
        </span>
      ) : null}
    </div>
  );
}

function remainingMinutes(
  value: string | null,
) {
  if (!value) {
    return null;
  }

  const timestamp =
    Date.parse(value);

  if (
    !Number.isFinite(timestamp) ||
    timestamp <= Date.now()
  ) {
    return null;
  }

  return Math.max(
    1,
    Math.ceil(
      (timestamp - Date.now()) /
        60_000,
    ),
  );
}

const ITEM_ATTRIBUTE_LABELS: Record<
  NonNullable<InventoryBrowserRow["success_attribute"]>,
  string
> = {
  muscles: "Muscles",
  reflexes: "Reflexes",
  vigor: "Vigour",
  brains: "Brains",
  shrewd: "Shrewd",
  presence_score: "Presence",
};

function ItemMechanics({
  row,
}: {
  row: InventoryBrowserRow;
}) {
  const success =
    row.success_die && row.success_threshold
      ? `d${row.success_die}${
          row.success_attribute
            ? ` + ${ITEM_ATTRIBUTE_LABELS[row.success_attribute]}`
            : ""
        } >= ${row.success_threshold}`
      : "Automatic";

  const damage = row.damage_dice
    ? `${row.damage_dice}${
        row.success_attribute &&
        row.category_name.toLowerCase() === "weapon"
          ? ` + ${ITEM_ATTRIBUTE_LABELS[row.success_attribute]}`
          : ""
      }${
        row.damage_type
          ? ` ${row.damage_type}`
          : ""
      }`
    : "None";

  if (
    success === "Automatic" &&
    damage === "None" &&
    !row.is_usable
  ) {
    return null;
  }

  return (
    <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2 sm:grid-cols-3 components_characters_character_inventory_browser_div_container_4">
      <div className="min-w-0 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2 components_characters_character_inventory_browser_div_container_5">
        <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))] components_characters_character_inventory_browser_p_text_2">
          Target
        </p>
        <p className="mt-1 break-words text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))] components_characters_character_inventory_browser_p_text_3">
          {row.target_mode === "other"
            ? "Other"
            : row.target_mode === "either"
              ? "Self / Other"
              : "Self"}
        </p>
      </div>

      <div className="min-w-0 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2 components_characters_character_inventory_browser_div_container_6">
        <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))] components_characters_character_inventory_browser_p_text_4">
          Success
        </p>
        <p className="mt-1 break-words text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))] components_characters_character_inventory_browser_p_text_5">
          {success}
        </p>
      </div>

      <div className="min-w-0 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2 components_characters_character_inventory_browser_div_container_7">
        <p className="text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806a4c))] components_characters_character_inventory_browser_p_text_6">
          Damage
        </p>
        <p className="mt-1 break-words text-[8px] leading-4 text-[rgb(var(--sep-colour-b8a382))] components_characters_character_inventory_browser_p_text_7">
          {damage}
        </p>
      </div>
    </div>
  );
}

function ActiveUseTimers({
  row,
}: {
  row: InventoryBrowserRow;
}) {
  const durationRemaining =
    remainingMinutes(
      row.active_effect_expires_at,
    );

  const cooldownRemaining =
    remainingMinutes(
      row.cooldown_ready_at,
    );

  if (
    durationRemaining === null &&
    cooldownRemaining === null
  ) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-1.5 components_characters_character_inventory_browser_div_container_8">
      {durationRemaining !== null ? (
        <p className="border border-emerald-900/45 bg-emerald-950/10 px-3 py-2 text-[8px] uppercase tracking-[0.1em] text-emerald-400 components_characters_character_inventory_browser_p_text_8">
          Effect active — {durationRemaining} min remaining
        </p>
      ) : null}

      {cooldownRemaining !== null ? (
        <p className="border border-amber-900/45 bg-amber-950/10 px-3 py-2 text-[8px] uppercase tracking-[0.1em] text-amber-400 components_characters_character_inventory_browser_p_text_9">
          On cooldown — ready in {cooldownRemaining} min
        </p>
      ) : null}
    </div>
  );
}

function UseControl({
  row,
  targets,
  compact = false,
}: {
  row: InventoryBrowserRow;
  targets: InventoryUseTarget[];
  compact?: boolean;
}) {
  const router = useRouter();

  const [pending, startTransition] =
    useTransition();

  const [message, setMessage] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState(false);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId =
      window.setTimeout(
        () => {
          setMessage(null);
        },
        5_000,
      );

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [message]);

  if (!row.is_usable) {
    return null;
  }

  const targetMode =
    row.target_mode ?? "self";

  const inventoryCannotUse =
    targetMode === "other";

  if (
    row.record_kind === "unique" &&
    row.max_charges !== null
  ) {
    const remaining =
      row.charges_remaining ??
      row.max_charges;

    if (remaining <= 0) {
      return (
        <p className="mt-3 border border-red-900/45 bg-red-950/10 px-3 py-2 text-[8px] uppercase tracking-[0.1em] text-red-400 components_characters_character_inventory_browser_p_text_10">
          No charges remaining.
        </p>
      );
    }
  }

  if (row.use_block_reason) {
    return (
      <p className="mt-3 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[8px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a6947b))] components_characters_character_inventory_browser_p_text_11">
        {row.use_block_reason}
      </p>
    );
  }

  const cooldownRemaining =
    remainingMinutes(
      row.cooldown_ready_at,
    );

  if (
    cooldownRemaining !== null
  ) {
    return (
      <ActiveUseTimers
        row={row}
      />
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

    // Inventory use is deliberately self-only.
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

  if (inventoryCannotUse) {
    return (
      <p className="mt-3 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[8px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a6947b))] components_characters_character_inventory_browser_p_text_12">
        This Item targets another character. Use it from the chat.
      </p>
    );
  }

  return (
    <div className={[((compact ? "min-w-0" : "mt-3")), "components_characters_character_inventory_browser_div_container_9"].filter(Boolean).join(" ")}>
      <ActiveUseTimers
        row={row}
      />

      <div className="flex flex-wrap items-center gap-2 components_characters_character_inventory_browser_div_container_10">
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="border border-[rgb(var(--sep-colour-6f7545))] bg-[rgb(var(--sep-colour-202615))] px-3 py-1.5 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-cbd39a))] transition hover:bg-[rgb(var(--sep-colour-293019))] disabled:cursor-wait disabled:opacity-50 components_characters_character_inventory_browser_button_run"
        >
          {pending
            ? row.teaches_recipe
              ? "Learning..."
              : "Using..."
            : row.teaches_recipe
              ? "Learn Recipe"
              : "Use"}
        </button>

        {remaining !== null ? (
          <span className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-80735f))] components_characters_character_inventory_browser_span_text_7">
            {remaining} / {row.max_charges} charges
          </span>
        ) : null}
      </div>

      {message ? (
        <p
          className={[((`mt-2 text-[8px] leading-5 ${
            success
              ? "text-emerald-400"
              : "text-red-400"
          }`)), "components_characters_character_inventory_browser_p_text_13"].filter(Boolean).join(" ")}
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
  compact = false,
}: {
  row: InventoryBrowserRow;
  containers:
    InventoryBrowserRow[];
  compact?: boolean;
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
      className={[((compact
          ? "flex min-w-[220px] flex-1 gap-2"
          : "mt-3 flex flex-wrap gap-2")), "components_characters_character_inventory_browser_form_move_own_inventory_item"].filter(Boolean).join(" ")}
    >
      <input className="components_characters_character_inventory_browser_input_record_kind"
        type="hidden"
        name="recordKind"
        value={
          row.record_kind
        }
      />
      <input className="components_characters_character_inventory_browser_input_record_id"
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
        className="min-w-[150px] flex-1 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-1.5 text-[9px] text-[rgb(var(--sep-colour-cdbb9d))] outline-none focus:border-[rgb(var(--sep-colour-987344))] components_characters_character_inventory_browser_select_select"
      >
        <option className="components_characters_character_inventory_browser_option_option" value="">
          Loose Inventory
        </option>

        {containers.map(
          (container) => (
            <option className="components_characters_character_inventory_browser_option_option_2"
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
        className="border border-[rgb(var(--sep-colour-6f5639))]/60 bg-[rgb(var(--sep-colour-1b140f))] px-3 py-1.5 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-bca483))] transition hover:border-[rgb(var(--sep-colour-987344))] hover:text-[rgb(var(--sep-colour-e2c99f))] components_characters_character_inventory_browser_button_move"
      >
        Move
      </button>
    </form>
  );
}

function DiscardControl({
  row,
  compact = false,
}: {
  row: InventoryBrowserRow;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] =
    useTransition();
  const [message, setMessage] =
    useState<string | null>(null);

  const [discardQuantity, setDiscardQuantity] =
    useState(1);

  if (
    row.is_equipped ||
    row.parent_container_id ||
    row.is_quest_item
  ) {
    return null;
  }

  const run = () => {
    const availableQuantity =
      Math.max(1, row.quantity);

    const quantity =
      row.record_kind === "standard"
        ? Math.min(
            availableQuantity,
            Math.max(1, discardQuantity),
          )
        : 1;

    const warning =
      row.record_kind === "unique"
        ? `Return "${row.name}" to the Admin Vault?`
        : quantity > 1
          ? `Discard ${quantity} × ${row.name}? This cannot be undone.`
          : `Discard "${row.name}"? This cannot be undone.`;

    if (!window.confirm(warning)) {
      return;
    }

    const data = new FormData();
    data.set("recordKind", row.record_kind);
    data.set("recordId", row.record_id);
    data.set("quantity", String(quantity));

    setMessage(null);

    startTransition(async () => {
      const result =
        await discardInventoryItem(data);

      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  };

  return (
    <div className={[((compact ? "min-w-0" : "mt-3")), "components_characters_character_inventory_browser_div_container_11"].filter(Boolean).join(" ")}>
      <div className="flex flex-wrap items-center gap-2 components_characters_character_inventory_browser_div_container_12">
        {row.record_kind === "standard" && row.quantity > 1 ? (
          <label className="flex items-center gap-2 components_characters_character_inventory_browser_label_label">
            <span className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-80735f))] components_characters_character_inventory_browser_span_text_8">
              Qty
            </span>

            <select
              value={discardQuantity}
              onChange={(event) =>
                setDiscardQuantity(
                  Number.parseInt(event.target.value, 10),
                )
              }
              disabled={pending}
              className="h-8 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 text-[9px] text-[rgb(var(--sep-colour-cdbb9d))] outline-none focus:border-[rgb(var(--sep-colour-987344))] disabled:opacity-45 components_characters_character_inventory_browser_select_select_2"
            >
              {Array.from(
                { length: Math.max(1, row.quantity) },
                (_, index) => index + 1,
              ).map((value) => (
                <option className="components_characters_character_inventory_browser_option_option_3" key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="border border-red-900/55 bg-red-950/10 px-3 py-1.5 text-[8px] uppercase tracking-[0.14em] text-red-400 transition hover:bg-red-950/20 disabled:cursor-wait disabled:opacity-45 components_characters_character_inventory_browser_button_run_2"
        >
          {pending ? "Discarding..." : "Discard"}
        </button>
      </div>

      {message ? (
        <p className="mt-2 text-[8px] leading-4 text-[rgb(var(--sep-colour-9b8768))] components_characters_character_inventory_browser_p_text_14">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function ItemEffects({
  effects,
}: {
  effects: InventoryItemEffect[];
}) {
  if (!effects.length) {
    return null;
  }

  return (
    <div className="mt-2 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2 components_characters_character_inventory_browser_div_container_13">
      <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] components_characters_character_inventory_browser_p_text_15">
        Effects
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5 components_characters_character_inventory_browser_div_container_14">
        {effects.map((effect, index) => (
          <span
            key={`${effect.context}-${effect.label}-${index}`}
            className={[((`border px-2 py-1 text-[7px] uppercase tracking-[0.1em] ${
              effect.value > 0
                ? "border-emerald-900/65 bg-emerald-950/20 text-emerald-400"
                : "border-red-900/65 bg-red-950/20 text-red-400"
            }`)), "components_characters_character_inventory_browser_span_text_9"].filter(Boolean).join(" ")}
          >
            {effect.context} · {effect.label}{" "}
            {effect.value > 0 ? "+" : ""}
            {effect.value}
            {effect.duration_minutes !== null
              ? ` · ${effect.duration_minutes} min`
              : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function ItemCard({
  row,
  containers,
  characterName,
  own,
  useTargets,
  compact = false,
}: {
  row: InventoryBrowserRow;
  containers:
    InventoryBrowserRow[];
  characterName: string;
  own: boolean;
  useTargets: InventoryUseTarget[];
  compact?: boolean;
}) {
  const eligible =
    meetsAllRequirements(
      row,
    );

  return (
    <article
      data-sep-interactive-surface="card"
      className={[((`border ${
        row.is_equipped
          ? "border-[rgb(var(--sep-colour-8d6d3e))]/65 bg-[rgb(var(--sep-colour-18110c))]"
          : "border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-120e0b))]"
      } ${
        compact
          ? "p-3"
          : "p-4"
      }`)), "components_characters_character_inventory_browser_article_article"].filter(Boolean).join(" ")}
    >
      <div className="flex gap-3 components_characters_character_inventory_browser_div_container_15">
        <ItemThumbnail
          row={row}
          size={
            compact
              ? "small"
              : "normal"
          }
        />

        <div className="min-w-0 flex-1 components_characters_character_inventory_browser_div_container_16">
          <div className="flex flex-wrap items-start justify-between gap-2 components_characters_character_inventory_browser_div_container_17">
            <div className="min-w-0 components_characters_character_inventory_browser_div_container_18">
              <p className="font-serif text-base text-[rgb(var(--sep-colour-dec89f))] components_characters_character_inventory_browser_p_text_16">
                {row.name}

                {row.quantity >
                1 ? (
                  <span className="ml-2 font-sans text-[10px] text-[rgb(var(--sep-colour-9b8768))] components_characters_character_inventory_browser_span_text_10">
                    ×
                    {
                      row.quantity
                    }
                  </span>
                ) : null}
              </p>

              <p className="mt-1 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-776957))] components_characters_character_inventory_browser_p_text_17">
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
                <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-9b815d))] components_characters_character_inventory_browser_p_text_18">
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
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[rgb(var(--sep-colour-9f927f))] components_characters_character_inventory_browser_p_text_19">
              {
                row.description
              }
            </p>
          ) : null}

          <ItemMechanics row={row} />

          <ItemEffects effects={row.item_effects} />

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
                className="mt-3 components_characters_character_inventory_browser_form_unequip_inventory_item"
              >
                <input className="components_characters_character_inventory_browser_input_record_kind_2"
                  type="hidden"
                  name="recordKind"
                  value={
                    row.record_kind
                  }
                />
                <input className="components_characters_character_inventory_browser_input_record_id_2"
                  type="hidden"
                  name="recordId"
                  value={
                    row.record_id
                  }
                />

                <button
                  type="submit"
                  className="border border-[rgb(var(--sep-colour-6a5136))]/60 bg-[rgb(var(--sep-colour-1b140f))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-aa9577))] transition hover:border-[rgb(var(--sep-colour-8e6d46))] hover:text-[rgb(var(--sep-colour-dfc79c))] components_characters_character_inventory_browser_button_unequip"
                >
                  Unequip
                </button>
              </form>
            ) : !row.item_active ? (
              <p className="mt-3 border border-red-900/45 bg-red-950/10 px-3 py-2 text-[8px] leading-5 uppercase tracking-[0.1em] text-red-400 components_characters_character_inventory_browser_p_text_20">
                This Item is inactive and cannot be equipped.
              </p>
            ) : eligible ? (
              <form
                action={
                  equipInventoryItem
                }
                className="mt-3 components_characters_character_inventory_browser_form_equip_inventory_item"
              >
                <input className="components_characters_character_inventory_browser_input_record_kind_3"
                  type="hidden"
                  name="recordKind"
                  value={
                    row.record_kind
                  }
                />
                <input className="components_characters_character_inventory_browser_input_record_id_3"
                  type="hidden"
                  name="recordId"
                  value={
                    row.record_id
                  }
                />

                <button
                  type="submit"
                  className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:bg-[rgb(var(--sep-colour-4a321e))] components_characters_character_inventory_browser_button_equip"
                >
                  Equip
                </button>
              </form>
            ) : (
              <p className="mt-3 border border-red-900/45 bg-red-950/10 px-3 py-2 text-[8px] leading-5 uppercase tracking-[0.1em] text-red-400 components_characters_character_inventory_browser_p_text_21">
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
            <div className="mt-3 flex flex-wrap items-start gap-2 components_characters_character_inventory_browser_div_container_19">
              <UseControl
                row={row}
                targets={useTargets}
                compact
              />

              <MoveControls
                row={row}
                containers={containers}
                compact
              />

              <DiscardControl
                row={row}
                compact
              />
            </div>
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
      className="absolute left-1/2 top-1/2 h-[520px] w-[300px] -translate-x-1/2 -translate-y-1/2 components_characters_character_inventory_browser_div_container_20"
    >
      <img
        src="/character-sheet/human.png"
        alt=""
        className="h-full w-full object-contain opacity-80 components_characters_character_inventory_browser_img_image"
      />
    </div>
  );
}

function EquipmentCandidate({
  row,
}: {
  row: InventoryBrowserRow;
}) {
  const eligible =
    meetsAllRequirements(row);

  return (
    <div className="mt-2 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2 components_characters_character_inventory_browser_div_container_21">
      <div className="flex gap-2 components_characters_character_inventory_browser_div_container_22">
        <ItemThumbnail row={row} size="small" />

        <div className="min-w-0 flex-1 components_characters_character_inventory_browser_div_container_23">
          <p className="font-serif text-[12px] text-[rgb(var(--sep-colour-d8c095))] components_characters_character_inventory_browser_p_text_22">
            {row.name}
          </p>

          {row.description?.trim() ? (
            <p className="mt-1 line-clamp-3 text-[8px] leading-4 text-[rgb(var(--sep-colour-8f8271))] components_characters_character_inventory_browser_p_text_23">
              {row.description}
            </p>
          ) : null}
        </div>
      </div>

      {row.equipment_bonuses.length ? (
        <div className="mt-2 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-2 components_characters_character_inventory_browser_div_container_24">
          <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] components_characters_character_inventory_browser_p_text_24">
            Bonuses
          </p>

          <div className="mt-1.5 flex flex-wrap gap-1.5 components_characters_character_inventory_browser_div_container_25">
            {row.equipment_bonuses.map((bonus) => (
              <span
                key={bonus.label}
                className="border border-[rgb(var(--sep-colour-49634f))]/55 bg-[rgb(var(--sep-colour-132016))] px-2 py-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-9cbe9f))] components_characters_character_inventory_browser_span_text_11"
              >
                {bonus.label}{" "}
                {bonus.value > 0 ? "+" : ""}
                {bonus.value}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <Requirements requirements={row.requirements} />

      {!row.item_active ? (
        <p className="mt-2 border border-red-900/45 bg-red-950/10 px-2 py-2 text-[7px] uppercase tracking-[0.1em] text-red-400 components_characters_character_inventory_browser_p_text_25">
          This Item is inactive and cannot be equipped.
        </p>
      ) : eligible ? (
        <form action={equipInventoryItem} className="mt-2 components_characters_character_inventory_browser_form_equip_inventory_item_2">
          <input className="components_characters_character_inventory_browser_input_record_kind_4" type="hidden" name="recordKind" value={row.record_kind} />
          <input className="components_characters_character_inventory_browser_input_record_id_4" type="hidden" name="recordId" value={row.record_id} />
          <button
            type="submit"
            className="w-full border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:bg-[rgb(var(--sep-colour-4a321e))] components_characters_character_inventory_browser_button_equip_2"
          >
            Equip
          </button>
        </form>
      ) : (
        <p className="mt-2 border border-red-900/45 bg-red-950/10 px-2 py-2 text-[7px] uppercase tracking-[0.1em] text-red-400 components_characters_character_inventory_browser_p_text_26">
          Requirements not met
        </p>
      )}
    </div>
  );
}

function EquipmentSlotCard({
  slot,
  rows,
  available,
  own,
}: {
  slot: string;
  rows: InventoryBrowserRow[];
  available: InventoryBrowserRow[];
  own: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");

  const [mobileItem, setMobileItem] =
  useState<InventoryBrowserRow | null>(null);

  const opensUp =
  slot === "feet" ||
  slot === "legs" ||
  slot === "waist" ||
  slot === "main_hand" ||
  slot === "off_hand";

const isRightSide =
  slot === "neck" ||
  slot === "torso" ||
  slot === "hands" ||
  slot === "off_hand" ||
  slot === "waist";

  const sorted = [...rows].sort(
    (a, b) =>
      LAYER_ORDER.indexOf(
        a.equipped_layer as (typeof LAYER_ORDER)[number],
      ) -
      LAYER_ORDER.indexOf(
        b.equipped_layer as (typeof LAYER_ORDER)[number],
      ),
  );

  const selected =
    available.find(
      (row) =>
        `${row.record_kind}:${row.record_id}` === selectedId,
    ) ?? null;

  return (
    <div
  className={[((`group/slot relative border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120d09))]/95 p-2.5 shadow-[0_8px_24px_rgba(var(--sep-rgb-0-0-0),0.18)] ${
    open ? "z-[400]" : "z-0"
  } hover:z-[350] focus-within:z-[350]`)), "components_characters_character_inventory_browser_div_container_26"].filter(Boolean).join(" ")}
>
      <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-876f4f))] components_characters_character_inventory_browser_p_text_27">
        {SLOT_LABELS[slot]}
      </p>

      {sorted.length ? (
        <div className="mt-2 space-y-2 components_characters_character_inventory_browser_div_container_27">
         {sorted.map((row) => (
  <div
    key={`${row.record_kind}-${row.record_id}`}
    className="group/equipped relative flex items-center gap-2 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-2 first:border-t-0 first:pt-0 components_characters_character_inventory_browser_div_container_28"
  >
    <button
  type="button"
  onClick={() =>
    setMobileItem(row)
  }
  className="flex min-w-0 flex-1 cursor-help items-center gap-2 text-left outline-none md:cursor-help components_characters_character_inventory_browser_button_action"
>
      <ItemThumbnail
        row={row}
        size="small"
      />

      <div className="min-w-0 flex-1 components_characters_character_inventory_browser_div_container_29">
        <p className="truncate font-serif text-[12px] text-[rgb(var(--sep-colour-d8c095))] components_characters_character_inventory_browser_p_text_28">
          {row.name}
        </p>

        <p className="mt-0.5 text-[6px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756957))] components_characters_character_inventory_browser_p_text_29">
          {titleCase(
            row.equipped_layer ??
              "equipped",
          )}
        </p>
      </div>

      <div
        data-sep-equipment-popup="true"
        className={[(([
          "pointer-events-none absolute z-[500] hidden w-[420px] max-w-[calc(100vw-32px)]",
          "hidden md:group-hover/equipped:block md:group-focus-within/equipped:block",
          opensUp
            ? "bottom-full mb-2"
            : "top-full mt-2",
          isRightSide
            ? "right-0"
            : "left-0",
        ].join(" "))), "components_characters_character_inventory_browser_div_container_30"].filter(Boolean).join(" ")}
      >
        <div className="pointer-events-auto shadow-[0_20px_55px_rgba(var(--sep-rgb-0-0-0),0.6)] components_characters_character_inventory_browser_div_container_31">
          <ItemCard
            row={row}
            containers={[]}
            characterName=""
            own={false}
            useTargets={[]}
          />
        </div>
      </div>
    </button>

    {own ? (
      <form className="components_characters_character_inventory_browser_form_unequip_inventory_item_2" action={unequipInventoryItem}>
        <input className="components_characters_character_inventory_browser_input_record_kind_5"
          type="hidden"
          name="recordKind"
          value={row.record_kind}
        />

        <input className="components_characters_character_inventory_browser_input_record_id_5"
          type="hidden"
          name="recordId"
          value={row.record_id}
        />

        <button
          type="submit"
          title={`Unequip ${row.name}`}
          className="px-1 text-[13px] text-[rgb(var(--sep-colour-806d55))] transition hover:text-[rgb(var(--sep-colour-d7b77f))] components_characters_character_inventory_browser_button_action_2"
        >
          ×
        </button>
      </form>
    ) : null}
  </div>
))}
        </div>
      ) : own ? (
        <div className="relative mt-2 components_characters_character_inventory_browser_div_container_32">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="w-full border border-dashed border-[rgb(var(--sep-colour-6d5336))]/55 bg-[rgb(var(--sep-colour-17110d))] px-3 py-3 text-left transition hover:border-[rgb(var(--sep-colour-9b7548))] hover:bg-[rgb(var(--sep-colour-1c140e))] components_characters_character_inventory_browser_button_action_3"
          >
            <span className="block text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-947c5b))] components_characters_character_inventory_browser_span_text_12">
              Empty
            </span>
            <span className="mt-1 block text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-665b4c))] components_characters_character_inventory_browser_span_text_13">
              Click to equip
            </span>
          </button>

          {open ? (
  <div
  className={[((`absolute z-[200] w-[280px] border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-0e0a08))] p-2 shadow-2xl ${
    opensUp
      ? "bottom-full mb-2"
      : "top-full mt-2"
  } ${
    isRightSide
      ? "right-0"
      : "left-0"
  }`)), "components_characters_character_inventory_browser_div_container_33"].filter(Boolean).join(" ")}
>
              {available.length ? (
                <>
                  <select
                    value={selectedId}
                    onChange={(event) => setSelectedId(event.target.value)}
                    className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-[9px] text-[rgb(var(--sep-colour-cdb894))] outline-none focus:border-[rgb(var(--sep-colour-987344))] components_characters_character_inventory_browser_select_select_3"
                  >
                    <option className="components_characters_character_inventory_browser_option_option_4" value="">Choose Item...</option>
                    {available.map((row) => (
                      <option className="components_characters_character_inventory_browser_option_option_5"
                        key={`${row.record_kind}:${row.record_id}`}
                        value={`${row.record_kind}:${row.record_id}`}
                      >
                        {row.name}
                        {!row.item_active ? " (Inactive)" : ""}
                        {row.quantity > 1 ? ` ×${row.quantity}` : ""}
                      </option>
                    ))}
                  </select>

                  {selected ? <EquipmentCandidate row={selected} /> : null}
                </>
              ) : (
                <p className="text-[8px] italic leading-4 text-[rgb(var(--sep-colour-665b4c))] components_characters_character_inventory_browser_p_text_30">
                  No available Items for this slot.
                </p>
              )}
            </div>
          ) : null}
        </div>
            ) : (
        <p className="mt-2 text-[9px] italic text-[rgb(var(--sep-colour-665b4c))] components_characters_character_inventory_browser_p_text_31">
          Empty
        </p>
      )}

      {mobileItem ? (
        <>
          <button
            type="button"
            aria-label="Close item details"
            onClick={() =>
              setMobileItem(null)
            }
            className="fixed inset-0 z-[900] bg-black/75 backdrop-blur-[2px] md:hidden components_characters_character_inventory_browser_button_close_item_details"
          />

          <div
            role="dialog"
            data-sep-equipment-popup="true"
            aria-modal="true"
            aria-label={`${mobileItem.name} details`}
            className="fixed inset-x-3 top-1/2 z-[910] max-h-[calc(100dvh-32px)] -translate-y-1/2 overflow-hidden md:hidden components_characters_character_inventory_browser_div_dialog"
          >
            <div className="relative max-h-[calc(100dvh-32px)] overflow-y-auto border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0e0a08))] shadow-[0_24px_70px_rgba(var(--sep-rgb-0-0-0),0.75)] components_characters_character_inventory_browser_div_container_34">
              <button
                type="button"
                aria-label="Close item details"
                onClick={() =>
                  setMobileItem(null)
                }
                className="sticky top-2 z-[920] ml-auto mr-2 mt-2 flex h-9 w-9 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-17120f))] text-lg text-[rgb(var(--sep-colour-bca47e))] components_characters_character_inventory_browser_button_close_item_details_2"
              >
                ×
              </button>

              <div
  data-sep-equipment-popup="true"
  className="-mt-11 pt-11 components_characters_character_inventory_browser_div_container_35"
>
                <ItemCard
                  row={mobileItem}
                  containers={[]}
                  characterName=""
                  own={false}
                  useTargets={[]}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

const DESKTOP_POSITIONS:
  Record<string, string> = {
    head:
      "left-1/2 top-[1%] w-[175px] -translate-x-1/2",

    neck:
      "right-[19%] top-[13%] w-[175px]",

    shoulders:
      "left-[19%] top-[18%] w-[175px]",

    back:
      "left-[17%] top-[34%] w-[175px]",

    torso:
      "right-[17%] top-[34%] w-[175px]",

    arms:
      "left-[15%] top-[50%] w-[175px]",

    hands:
      "right-[15%] top-[50%] w-[175px]",

    main_hand:
      "left-[17%] top-[66%] w-[175px]",

    off_hand:
      "right-[17%] top-[66%] w-[175px]",

    waist:
      "right-[23%] top-[80%] w-[165px]",

    legs:
      "left-[23%] top-[80%] w-[165px]",

    feet:
      "left-1/2 bottom-[1%] w-[175px] -translate-x-1/2",
  };

function EquipmentFigure({
  equipped,
  inventory,
  own,
  collapsed,
  onToggle,
}: {
  equipped:
    InventoryBrowserRow[];
  inventory:
    InventoryBrowserRow[];
  own: boolean;
  collapsed: boolean;
  onToggle: () => void;
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

  const availableBySlot =
    new Map<
      string,
      InventoryBrowserRow[]
    >();

  for (const row of inventory) {
    if (
      !row.is_equippable ||
      row.is_equipped ||
      row.parent_container_id ||
      !row.configured_slot
    ) {
      continue;
    }

    const values =
      availableBySlot.get(
        row.configured_slot,
      ) ?? [];

    values.push(row);

    availableBySlot.set(
      row.configured_slot,
      values,
    );
  }

  return (
    <section className="relative z-10 mt-5 overflow-visible border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] components_characters_character_inventory_browser_section_section">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="block w-full border-b border-[rgb(var(--sep-colour-59432c))]/35 px-4 py-3 text-left transition hover:bg-[rgb(var(--sep-colour-17100c))] sm:px-5 components_characters_character_inventory_browser_button_toggle"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 components_characters_character_inventory_browser_div_container_36">
          <div className="components_characters_character_inventory_browser_div_equipment">
            <p className="text-[7px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))] components_characters_character_inventory_browser_p_equipment">
              Worn &
              carried
            </p>
            <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d9c094))] components_characters_character_inventory_browser_h3_equipment">
              Equipment
            </h3>
          </div>

          <div className="flex items-center gap-3 components_characters_character_inventory_browser_div_container_37">
            <p className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))] components_characters_character_inventory_browser_p_text_32">
              {
                equipped.length
              }{" "}
              equipped
            </p>
            <span className="font-serif text-lg text-[rgb(var(--sep-colour-8f7757))] components_characters_character_inventory_browser_span_text_14">
              {collapsed ? "+" : "−"}
            </span>
          </div>
        </div>
      </button>

      {!collapsed ? (
        <>
      <div className="relative hidden min-h-[800px] overflow-visible md:block components_characters_character_inventory_browser_div_container_38">
        <div className="absolute inset-x-[24%] top-[10%] bottom-[8%] rounded-[45%] bg-[radial-gradient(circle_at_center,rgba(var(--sep-rgb-92-68-42),0.10),transparent_68%)] components_characters_character_inventory_browser_div_container_39" />

        <Silhouette />

        {SLOT_ORDER.map(
          (slot) => (
            <div
              key={slot}
              className={[((`absolute ${DESKTOP_POSITIONS[slot]}`)), "components_characters_character_inventory_browser_div_container_40"].filter(Boolean).join(" ")}
            >
              <EquipmentSlotCard
                slot={slot}
                rows={
                  bySlot.get(
                    slot,
                  ) ?? []
                }
                available={
                  availableBySlot.get(
                    slot,
                  ) ?? []
                }
                own={own}
              />
            </div>
          ),
        )}

        
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-2 md:hidden components_characters_character_inventory_browser_div_container_41">
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
              available={
                availableBySlot.get(
                  slot,
                ) ?? []
              }
              own={own}
            />
          ),
        )}
      </div>
        </>
      ) : null}
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
    "border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-[9px] text-[rgb(var(--sep-colour-cbb89a))] outline-none transition focus:border-[rgb(var(--sep-colour-987344))]";

  return (
    <div className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-120e0b))] p-3 sm:p-4 components_characters_character_inventory_browser_div_container_42">
      <div className="grid gap-2 xl:grid-cols-[minmax(220px,2fr)_repeat(6,minmax(0,1fr))] components_characters_character_inventory_browser_div_container_43">
        <input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target
                .value,
            )
          }
          placeholder="Search Items by name..."
          className={[((control)), "components_characters_character_inventory_browser_input_search_items_name"].filter(Boolean).join(" ")}
        />

        <select
          value={category}
          onChange={(event) =>
            setCategory(
              event.target
                .value,
            )
          }
          className={[((control)), "components_characters_character_inventory_browser_select_select_4"].filter(Boolean).join(" ")}
        >
          <option className="components_characters_character_inventory_browser_option_option_6" value="">
            All Categories
          </option>
          {categories.map(
            (value) => (
              <option className="components_characters_character_inventory_browser_option_option_7"
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
          className={[((control)), "components_characters_character_inventory_browser_select_select_5"].filter(Boolean).join(" ")}
        >
          <option className="components_characters_character_inventory_browser_option_option_8" value="">
            All
            Subcategories
          </option>
          {subcategories.map(
            (value) => (
              <option className="components_characters_character_inventory_browser_option_option_9"
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
          className={[((control)), "components_characters_character_inventory_browser_select_select_6"].filter(Boolean).join(" ")}
        >
          <option className="components_characters_character_inventory_browser_option_option_10" value="">
            All Qualities
          </option>
          {qualities.map(
            (value) => (
              <option className="components_characters_character_inventory_browser_option_option_11"
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
          className={[((control)), "components_characters_character_inventory_browser_select_select_7"].filter(Boolean).join(" ")}
        >
          <option className="components_characters_character_inventory_browser_option_option_12" value="">
            All Body Slots
          </option>
          {SLOT_ORDER.map(
            (value) => (
              <option className="components_characters_character_inventory_browser_option_option_13"
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
          className={[((control)), "components_characters_character_inventory_browser_select_select_8"].filter(Boolean).join(" ")}
        >
          <option className="components_characters_character_inventory_browser_option_all" value="all">
            All Statuses
          </option>
          <option className="components_characters_character_inventory_browser_option_equipped" value="equipped">
            Equipped
          </option>
          <option className="components_characters_character_inventory_browser_option_equippable" value="equippable">
            Equippable
          </option>
          <option className="components_characters_character_inventory_browser_option_not_equippable" value="not_equippable">
            Not Equippable
          </option>
          <option className="components_characters_character_inventory_browser_option_loose" value="loose">
            Loose Inventory
          </option>
          <option className="components_characters_character_inventory_browser_option_container" value="container">
            In a Container
          </option>
          <option className="components_characters_character_inventory_browser_option_usable" value="usable">
            Usable
          </option>
          <option className="components_characters_character_inventory_browser_option_unique" value="unique">
            Unique
          </option>
          <option className="components_characters_character_inventory_browser_option_quest" value="quest">
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
            className={[((control)), "components_characters_character_inventory_browser_select_select_9"].filter(Boolean).join(" ")}
          >
            <option className="components_characters_character_inventory_browser_option_all_2" value="all">
              All
              Requirements
            </option>
            <option className="components_characters_character_inventory_browser_option_met" value="met">
              Requirements
              Met
            </option>
            <option className="components_characters_character_inventory_browser_option_not_met" value="not_met">
              Requirements
              Not Met
            </option>
          </select>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-3 components_characters_character_inventory_browser_div_container_44">
        <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6252))] components_characters_character_inventory_browser_p_text_33">
          Filters update
          instantly
        </p>

        <button
          type="button"
          onClick={reset}
          className="border border-[rgb(var(--sep-colour-60482e))]/45 px-3 py-2 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9d896a))] transition hover:border-[rgb(var(--sep-colour-987344))] hover:text-[rgb(var(--sep-colour-dec89f))] components_characters_character_inventory_browser_button_reset_filters"
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
  useTargets = [],
  showInventoryItems = true,
}: {
  rows:
    InventoryBrowserRow[];
  characterName: string;
  own?: boolean;
  useTargets?: InventoryUseTarget[];
  showInventoryItems?: boolean;
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

  const [
    equipmentCollapsed,
    setEquipmentCollapsed,
  ] = useState(false);

  const filtersActive =
    Boolean(search.trim()) ||
    Boolean(category) ||
    Boolean(subcategory) ||
    Boolean(quality) ||
    Boolean(slot) ||
    status !== "all" ||
    (own && requirement !== "all");

  useEffect(() => {
    setEquipmentCollapsed(filtersActive);
  }, [
    search,
    category,
    subcategory,
    quality,
    slot,
    status,
    requirement,
    own,
    filtersActive,
  ]);

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

  if (!showInventoryItems) {
    return (
      <section className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-130f0c))] p-4 sm:p-5 components_characters_character_inventory_browser_section_section_2">
        <div className="flex flex-wrap items-end justify-between gap-3 components_characters_character_inventory_browser_div_container_45">
          <div className="components_characters_character_inventory_browser_div_inventory">
            <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] components_characters_character_inventory_browser_p_inventory">
              Possessions
            </p>

            <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc79c))] components_characters_character_inventory_browser_h2_inventory">
              Inventory
            </h2>
          </div>

          <p className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))] components_characters_character_inventory_browser_p_text_34">
            Private
          </p>
        </div>

        <EquipmentFigure
          equipped={equipped}
          inventory={[]}
          own={false}
          collapsed={equipmentCollapsed}
          onToggle={() =>
            setEquipmentCollapsed(
              (value) => !value,
            )
          }
        />

        <div className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-5 py-6 text-center components_characters_character_inventory_browser_div_container_46">
          <p className="font-serif text-lg text-[rgb(var(--sep-colour-bda681))] components_characters_character_inventory_browser_p_text_35">
            Inventory hidden by this character
          </p>

      
        </div>
      </section>
    );
  }

  if (!rows.length) {
    return (
      <section className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-130f0c))] p-6 components_characters_character_inventory_browser_section_inventory">
        <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-dfc79c))] components_characters_character_inventory_browser_h2_inventory_2">
          Inventory
        </h2>
        <p className="mt-3 text-sm italic text-[rgb(var(--sep-colour-817565))] components_characters_character_inventory_browser_p_inventory_2">
          This character is
          not carrying any
          recorded Items.
        </p>
      </section>
    );
  }

  return (
    <section className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-130f0c))] p-4 sm:p-5 components_characters_character_inventory_browser_section_section_3">
      <div className="flex flex-wrap items-end justify-between gap-3 components_characters_character_inventory_browser_div_container_47">
        <div className="components_characters_character_inventory_browser_div_inventory_2">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] components_characters_character_inventory_browser_p_inventory_3">
            Possessions
          </p>

          <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc79c))] components_characters_character_inventory_browser_h2_inventory_3">
            Inventory
          </h2>
        </div>

        <p className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))] components_characters_character_inventory_browser_p_text_36">
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
        inventory={rows}
        own={own}
        collapsed={equipmentCollapsed}
        onToggle={() =>
          setEquipmentCollapsed(
            (value) => !value,
          )
        }
      />

      <div className="mt-5 space-y-3 components_characters_character_inventory_browser_div_container_48">
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
                className="overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] components_characters_character_inventory_browser_section_section_4"
              >
                <button
                  type="button"
                  onClick={() =>
                    toggleCategory(
                      categoryName,
                    )
                  }
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-[rgb(var(--sep-colour-17100c))] components_characters_character_inventory_browser_button_action_4"
                >
                  <div className="components_characters_character_inventory_browser_div_container_49">
                    <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_characters_character_inventory_browser_p_text_37">
                      Category
                    </p>
                    <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-d9c094))] components_characters_character_inventory_browser_h3_heading">
                      {
                        categoryName
                      }
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 components_characters_character_inventory_browser_div_container_50">
                    <span className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))] components_characters_character_inventory_browser_span_text_15">
                      {
                        categoryRows.length
                      }{" "}
                      item
                      {categoryRows.length ===
                      1
                        ? ""
                        : "s"}
                    </span>

                    <span className="font-serif text-lg text-[rgb(var(--sep-colour-8f7757))] components_characters_character_inventory_browser_span_text_16">
                      {isCollapsed
                        ? "+"
                        : "−"}
                    </span>
                  </div>
                </button>

                {!isCollapsed ? (
                  <div className="grid gap-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 p-3 md:grid-cols-2 components_characters_character_inventory_browser_div_container_51">
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
                          useTargets={
                            useTargets
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
          <section className="overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] components_characters_character_inventory_browser_section_section_5">
            <button
              type="button"
              onClick={() =>
                toggleCategory(
                  "__containers__",
                )
              }
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-[rgb(var(--sep-colour-17100c))] components_characters_character_inventory_browser_button_action_5"
            >
              <div className="components_characters_character_inventory_browser_div_containers">
                <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_characters_character_inventory_browser_p_containers">
                  Category
                </p>
                <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-d9c094))] components_characters_character_inventory_browser_h3_containers">
                  Containers
                </h3>
              </div>

              <div className="flex items-center gap-3 components_characters_character_inventory_browser_div_container_52">
                <span className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))] components_characters_character_inventory_browser_span_text_17">
                  {
                    visibleContainers.length
                  }{" "}
                  container
                  {visibleContainers.length ===
                  1
                    ? ""
                    : "s"}
                </span>

                <span className="font-serif text-lg text-[rgb(var(--sep-colour-8f7757))] components_characters_character_inventory_browser_span_text_18">
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
              <div className="space-y-3 border-t border-[rgb(var(--sep-colour-59432c))]/30 p-3 components_characters_character_inventory_browser_div_container_53">
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
                        className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-120e0b))] p-3 components_characters_character_inventory_browser_div_container_54"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 components_characters_character_inventory_browser_div_container_55">
                          <div className="flex items-center gap-3 components_characters_character_inventory_browser_div_container_56">
                            <ItemThumbnail
                              row={
                                container
                              }
                            />

                            <div className="components_characters_character_inventory_browser_div_container_57">
                              <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] components_characters_character_inventory_browser_p_text_38">
                                Container
                              </p>
                              <h4 className="mt-1 font-serif text-base text-[rgb(var(--sep-colour-dec89f))] components_characters_character_inventory_browser_h4_heading">
                                {
                                  container.name
                                }
                              </h4>
                            </div>
                          </div>

                          <span className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))] components_characters_character_inventory_browser_span_text_19">
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
                          <p className="mt-3 text-xs leading-5 text-[rgb(var(--sep-colour-8f8271))] components_characters_character_inventory_browser_p_text_39">
                            {
                              container.description
                            }
                          </p>
                        ) : null}

                        {children.length ? (
                          <div className="mt-3 grid gap-2 md:grid-cols-2 components_characters_character_inventory_browser_div_container_58">
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
                                  useTargets={
                                    useTargets
                                  }
                                  compact
                                />
                              ),
                            )}
                          </div>
                        ) : totalChildren ? (
                          <p className="mt-3 text-[9px] italic text-[rgb(var(--sep-colour-756958))] components_characters_character_inventory_browser_p_text_40">
                            No
                            contained
                            Items match
                            the current
                            filters.
                          </p>
                        ) : (
                          <p className="mt-3 text-[9px] italic text-[rgb(var(--sep-colour-756958))] components_characters_character_inventory_browser_p_text_41">
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
          <div className="border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-5 py-8 text-center components_characters_character_inventory_browser_div_container_59">
            <p className="font-serif text-lg text-[rgb(var(--sep-colour-bda681))] components_characters_character_inventory_browser_p_text_42">
              No Items match
              these filters.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8f7757))] underline decoration-[rgb(var(--sep-colour-60482e))] underline-offset-4 components_characters_character_inventory_browser_button_reset_filters_2"
            >
              Reset filters
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}