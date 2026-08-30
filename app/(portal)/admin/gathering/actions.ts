"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function uuid(value: string, label: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function integer(formData: FormData, key: string, min: number, max: number) {
  const value = Number(text(formData, key));
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${key} must be a whole number between ${min} and ${max}.`);
  }
  return value;
}

function decimal(formData: FormData, key: string, min: number, max: number) {
  const value = Number(text(formData, key));
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${key} must be between ${min} and ${max}.`);
  }
  return value;
}

function refreshGathering() {
  revalidatePath("/admin/gathering");
  revalidatePath("/game");
  revalidatePath("/character");
  revalidatePath("/crafting");
}

async function validateStandardGatheringItem(itemId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("items")
    .select(`id, is_active, use_behaviour, category:item_categories(slug)`)
    .eq("id", itemId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Item not found.");
  if (!data.is_active) throw new Error("Inactive Items cannot be used as Gathering rewards.");

  const category = Array.isArray(data.category) ? data.category[0] ?? null : data.category;

  if (category?.slug === "container" || data.use_behaviour === "limited_charges") {
    throw new Error(
      "Gathering can only award standard inventory Items. Containers and limited-charge Items are not supported.",
    );
  }
}

export async function createGatheringLocation(formData: FormData) {
  await requireAdminSection("gathering");

  const roomId = uuid(text(formData, "roomId"), "Location");
  const name = text(formData, "name");
  const description = text(formData, "description") || null;
  const nothingChance = decimal(formData, "nothingChance", 0, 10);
  const isActive = checkbox(formData, "isActive");

  if (name.length < 2) throw new Error("Gathering panel name is required.");

  const supabase = createAdminClient();
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", roomId)
    .maybeSingle();

  if (roomError) throw new Error(roomError.message);
  if (!room) throw new Error("Location not found.");

  const { error } = await supabase.from("gathering_locations").insert({
    room_id: roomId,
    name,
    description,
    nothing_chance: nothingChance,
    is_active: isActive,
  });

  if (error) throw new Error(error.message);
  refreshGathering();
}

export async function updateGatheringLocation(formData: FormData) {
  await requireAdminSection("gathering");

  const locationId = uuid(text(formData, "locationId"), "Gathering location");
  const name = text(formData, "name");
  const description = text(formData, "description") || null;
  const nothingChance = decimal(formData, "nothingChance", 0, 10);
  const isActive = checkbox(formData, "isActive");

  if (name.length < 2) throw new Error("Gathering panel name is required.");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("gathering_locations")
    .update({
      name,
      description,
      nothing_chance: nothingChance,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", locationId);

  if (error) throw new Error(error.message);
  refreshGathering();
}

function rewardValues(formData: FormData) {
  const rewardType = text(formData, "rewardType");
  const weight = decimal(formData, "weight", 0.0001, 1000000);
  const sortOrder = integer(formData, "sortOrder", 0, 100000);
  const isActive = checkbox(formData, "isActive");

  if (rewardType !== "item" && rewardType !== "remnants") {
    throw new Error("Invalid Gathering reward type.");
  }

  return { rewardType, weight, sortOrder, isActive };
}

async function rewardPayload(formData: FormData) {
  const { rewardType, weight, sortOrder, isActive } = rewardValues(formData);

  if (rewardType === "item") {
    const itemId = uuid(text(formData, "itemId"), "Item");
    const quantityMin = integer(formData, "quantityMin", 1, 9999);
    const quantityMax = integer(formData, "quantityMax", 1, 9999);

    if (quantityMin > quantityMax) {
      throw new Error("Minimum Item quantity cannot exceed maximum quantity.");
    }

    await validateStandardGatheringItem(itemId);

    return {
      reward_type: "item",
      item_id: itemId,
      quantity_min: quantityMin,
      quantity_max: quantityMax,
      remnants_min: null,
      remnants_max: null,
      weight,
      is_active: isActive,
      sort_order: sortOrder,
    };
  }

  const remnantsMin = integer(formData, "remnantsMin", 1, 100000000);
  const remnantsMax = integer(formData, "remnantsMax", 1, 100000000);

  if (remnantsMin > remnantsMax) {
    throw new Error("Minimum Remnants cannot exceed maximum Remnants.");
  }

  return {
    reward_type: "remnants",
    item_id: null,
    quantity_min: null,
    quantity_max: null,
    remnants_min: remnantsMin,
    remnants_max: remnantsMax,
    weight,
    is_active: isActive,
    sort_order: sortOrder,
  };
}

export async function addGatheringReward(formData: FormData) {
  await requireAdminSection("gathering");
  const locationId = uuid(text(formData, "locationId"), "Gathering location");
  const payload = await rewardPayload(formData);

  const supabase = createAdminClient();
  const { error } = await supabase.from("gathering_rewards").insert({
    gathering_location_id: locationId,
    ...payload,
  });

  if (error) throw new Error(error.message);
  refreshGathering();
}

export async function updateGatheringReward(formData: FormData) {
  await requireAdminSection("gathering");
  const rewardId = uuid(text(formData, "rewardId"), "Gathering reward");
  const payload = await rewardPayload(formData);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("gathering_rewards")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rewardId);

  if (error) throw new Error(error.message);
  refreshGathering();
}

export async function deleteGatheringReward(formData: FormData) {
  await requireAdminSection("gathering");
  const rewardId = uuid(text(formData, "rewardId"), "Gathering reward");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("gathering_rewards")
    .delete()
    .eq("id", rewardId);

  if (error) throw new Error(error.message);
  refreshGathering();
}
