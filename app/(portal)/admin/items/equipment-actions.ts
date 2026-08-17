"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

const EQUIP_SLOTS = [
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

const EQUIP_LAYERS = [
  "base",
  "clothing",
  "armour",
  "outer",
  "accessory",
  "held",
] as const;

function requiredText(
  formData: FormData,
  name: string,
  label: string,
) {
  const value = formData.get(name);

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function optionalText(
  formData: FormData,
  name: string,
) {
  const value = formData.get(name);

  return typeof value === "string"
    ? value.trim() || null
    : null;
}

function integer(
  formData: FormData,
  name: string,
  fallback: number | null = null,
) {
  const value = formData.get(name);

  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return fallback;
  }

  const parsed = Number.parseInt(
    value,
    10,
  );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function checkbox(
  formData: FormData,
  name: string,
) {
  return formData.get(name) === "on";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function ids(
  formData: FormData,
  name: string,
) {
  return formData
    .getAll(name)
    .filter(
      (value): value is string =>
        typeof value === "string" &&
        isUuid(value),
    );
}

function fail(message: string): never {
  const params =
    new URLSearchParams();

  params.set("error", message);

  redirect(
    `/admin/items?${params.toString()}`,
  );
}

export async function updateItemEquipment(
  formData: FormData,
) {
  await requireStaff();

  const supabase =
    await createClient();

  try {
    const itemId =
      requiredText(
        formData,
        "itemId",
        "Item",
      );

    if (!isUuid(itemId)) {
      throw new Error(
        "Invalid Item.",
      );
    }

    const isEquippable =
      checkbox(
        formData,
        "isEquippable",
      );

    const raceIds =
      ids(
        formData,
        "raceIds",
      );

    const orderIds =
      ids(
        formData,
        "orderIds",
      );

    const jobIds =
      ids(
        formData,
        "jobIds",
      );

    if (!isEquippable) {
      const {
        error: itemError,
      } = await supabase
        .from("items")
        .update({
          is_equippable:
            false,
          equip_slot:
            null,
          equip_layer:
            null,
          hands_required:
            0,
          min_muscles:
            null,
          min_reflexes:
            null,
          min_vigour:
            null,
          min_shrewd:
            null,
          min_brains:
            null,
          min_presence:
            null,
          min_order_level:
            null,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", itemId);

      if (itemError) {
        throw new Error(
          itemError.message,
        );
      }

      await Promise.all([
        supabase
          .from(
            "item_equipment_races",
          )
          .delete()
          .eq(
            "item_id",
            itemId,
          ),
        supabase
          .from(
            "item_equipment_orders",
          )
          .delete()
          .eq(
            "item_id",
            itemId,
          ),
        supabase
          .from(
            "item_equipment_jobs",
          )
          .delete()
          .eq(
            "item_id",
            itemId,
          ),
      ]);

      revalidatePath(
        "/admin/items",
      );

      return;
    }

    const slot =
      requiredText(
        formData,
        "equipSlot",
        "Equipment slot",
      );

    const layer =
      requiredText(
        formData,
        "equipLayer",
        "Equipment layer",
      );

    if (
      !EQUIP_SLOTS.includes(
        slot as
          (typeof EQUIP_SLOTS)[number],
      )
    ) {
      throw new Error(
        "Invalid equipment slot.",
      );
    }

    if (
      !EQUIP_LAYERS.includes(
        layer as
          (typeof EQUIP_LAYERS)[number],
      )
    ) {
      throw new Error(
        "Invalid equipment layer.",
      );
    }

    let hands =
      integer(
        formData,
        "handsRequired",
        0,
      ) ?? 0;

    const handSlot =
      slot === "main_hand" ||
      slot === "off_hand";

    if (handSlot) {
      if (
        ![1, 2].includes(
          hands,
        )
      ) {
        throw new Error(
          "Hand-held Items must require 1 or 2 hands.",
        );
      }

      if (layer !== "held") {
        throw new Error(
          "Hand-held Items must use the Held layer.",
        );
      }

      if (
        hands === 2 &&
        slot !== "main_hand"
      ) {
        throw new Error(
          "Two-handed Items must use Main Hand.",
        );
      }
    } else {
      hands = 0;

      if (layer === "held") {
        throw new Error(
          "Only hand-held Items can use the Held layer.",
        );
      }
    }

    const minimum = (
      field: string,
      label: string,
    ) => {
      const value =
        integer(
          formData,
          field,
          null,
        );

      if (
        value !== null &&
        value < 0
      ) {
        throw new Error(
          `${label} cannot be negative.`,
        );
      }

      return value;
    };

    const {
      data: item,
      error: itemLoadError,
    } = await supabase
      .from("items")
      .select(
        "stackable",
      )
      .eq("id", itemId)
      .maybeSingle();

    if (
      itemLoadError ||
      !item
    ) {
      throw new Error(
        itemLoadError?.message ??
          "Item not found.",
      );
    }

    if (item.stackable) {
      throw new Error(
        "Stackable Items cannot be equippable. Disable Stackable first.",
      );
    }

    const {
      error: itemError,
    } = await supabase
      .from("items")
      .update({
        is_equippable:
          true,
        equip_slot:
          slot,
        equip_layer:
          layer,
        hands_required:
          hands,
        min_muscles:
          minimum(
            "minMuscles",
            "Minimum Muscles",
          ),
        min_reflexes:
          minimum(
            "minReflexes",
            "Minimum Reflexes",
          ),
        min_vigour:
          minimum(
            "minVigour",
            "Minimum Vigour",
          ),
        min_shrewd:
          minimum(
            "minShrewd",
            "Minimum Shrewd",
          ),
        min_brains:
          minimum(
            "minBrains",
            "Minimum Brains",
          ),
        min_presence:
          minimum(
            "minPresence",
            "Minimum Presence",
          ),
        min_order_level:
          minimum(
            "minOrderLevel",
            "Minimum Order Level",
          ),
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", itemId);

    if (itemError) {
      throw new Error(
        itemError.message,
      );
    }

    const [
      deleteRaces,
      deleteOrders,
      deleteJobs,
    ] = await Promise.all([
      supabase
        .from(
          "item_equipment_races",
        )
        .delete()
        .eq(
          "item_id",
          itemId,
        ),
      supabase
        .from(
          "item_equipment_orders",
        )
        .delete()
        .eq(
          "item_id",
          itemId,
        ),
      supabase
        .from(
          "item_equipment_jobs",
        )
        .delete()
        .eq(
          "item_id",
          itemId,
        ),
    ]);

    const deleteError =
      deleteRaces.error ??
      deleteOrders.error ??
      deleteJobs.error;

    if (deleteError) {
      throw new Error(
        deleteError.message,
      );
    }

    const inserts = [];

    if (raceIds.length) {
      inserts.push(
        supabase
          .from(
            "item_equipment_races",
          )
          .insert(
            raceIds.map(
              (raceId) => ({
                item_id:
                  itemId,
                race_id:
                  raceId,
              }),
            ),
          ),
      );
    }

    if (orderIds.length) {
      inserts.push(
        supabase
          .from(
            "item_equipment_orders",
          )
          .insert(
            orderIds.map(
              (orderId) => ({
                item_id:
                  itemId,
                order_id:
                  orderId,
              }),
            ),
          ),
      );
    }

    if (jobIds.length) {
      inserts.push(
        supabase
          .from(
            "item_equipment_jobs",
          )
          .insert(
            jobIds.map(
              (jobId) => ({
                item_id:
                  itemId,
                order_job_id:
                  jobId,
              }),
            ),
          ),
      );
    }

    const results =
      await Promise.all(
        inserts,
      );

    const insertError =
      results.find(
        (result) =>
          result.error,
      )?.error;

    if (insertError) {
      throw new Error(
        insertError.message,
      );
    }
  } catch (error) {
    fail(
      error instanceof Error
        ? error.message
        : "Unable to update equipment configuration.",
    );
  }

  revalidatePath(
    "/admin/items",
  );
  revalidatePath(
    "/character",
  );
  revalidatePath(
    "/characters",
  );
}
