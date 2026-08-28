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

function integer(
  formData: FormData,
  key: string,
  minimum: number,
  maximum?: number,
) {
  const raw = text(formData, key);
  const value = Number(raw);

  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    (maximum !== undefined && value > maximum)
  ) {
    throw new Error(`${key} must be a valid whole number.`);
  }

  return value;
}

function optionalInteger(
  formData: FormData,
  key: string,
  minimum: number,
  maximum: number,
) {
  const raw = text(formData, key);
  if (!raw) return null;

  const value = Number(raw);

  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(`${key} must be between ${minimum} and ${maximum}.`);
  }

  return value;
}

function uuid(value: string, label: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new Error(`${label} is invalid.`);
  }

  return value;
}

function refreshHouse() {
  revalidatePath("/admin/house-of-chances");
  revalidatePath("/game");
  revalidatePath("/character");
}

const MATCH_TYPES = [
  "exact",
  "all_equal",
  "all_in_range",
  "total_range",
  "ordered_ranges",
] as const;

function rulePayload(formData: FormData) {
  const name = text(formData, "name");
  const description = text(formData, "description") || null;
  const matchType = text(formData, "matchType");
  const priority = integer(formData, "priority", -100000, 100000);
  const sortOrder = integer(formData, "sortOrder", 0, 100000);
  const isActive = checkbox(formData, "isActive");

  if (name.length < 2) {
    throw new Error("Prize rule name is required.");
  }

  if (!MATCH_TYPES.includes(matchType as (typeof MATCH_TYPES)[number])) {
    throw new Error("Invalid prize rule match type.");
  }

  const roll1Min = optionalInteger(formData, "roll1Min", 1, 100);
  const roll1Max = optionalInteger(formData, "roll1Max", 1, 100);
  const roll2Min = optionalInteger(formData, "roll2Min", 1, 100);
  const roll2Max = optionalInteger(formData, "roll2Max", 1, 100);
  const roll3Min = optionalInteger(formData, "roll3Min", 1, 100);
  const roll3Max = optionalInteger(formData, "roll3Max", 1, 100);
  const totalMin = optionalInteger(formData, "totalMin", 3, 300);
  const totalMax = optionalInteger(formData, "totalMax", 3, 300);

  if (roll1Min !== null && roll1Max !== null && roll1Min > roll1Max) {
    throw new Error("Roll 1 minimum cannot exceed its maximum.");
  }
  if (roll2Min !== null && roll2Max !== null && roll2Min > roll2Max) {
    throw new Error("Roll 2 minimum cannot exceed its maximum.");
  }
  if (roll3Min !== null && roll3Max !== null && roll3Min > roll3Max) {
    throw new Error("Roll 3 minimum cannot exceed its maximum.");
  }
  if (totalMin !== null && totalMax !== null && totalMin > totalMax) {
    throw new Error("Total minimum cannot exceed its maximum.");
  }

  if (matchType === "exact") {
    if (roll1Min === null || roll2Min === null || roll3Min === null) {
      throw new Error("Exact rules require a value for all three rolls.");
    }
  }

  if (matchType === "all_in_range") {
    if (roll1Min === null || roll1Max === null) {
      throw new Error("All-in-range rules require a shared minimum and maximum.");
    }
  }

  if (matchType === "total_range") {
    if (totalMin === null || totalMax === null) {
      throw new Error("Total-range rules require a total minimum and maximum.");
    }
  }

  if (matchType === "ordered_ranges") {
    if (
      roll1Min === null ||
      roll1Max === null ||
      roll2Min === null ||
      roll2Max === null ||
      roll3Min === null ||
      roll3Max === null
    ) {
      throw new Error("Ordered-range rules require minimum and maximum values for all three rolls.");
    }
  }

  return {
    name,
    description,
    match_type: matchType,
    priority,
    sort_order: sortOrder,
    is_active: isActive,
    roll_1_min: roll1Min,
    roll_1_max: roll1Max,
    roll_2_min: roll2Min,
    roll_2_max: roll2Max,
    roll_3_min: roll3Min,
    roll_3_max: roll3Max,
    total_min: totalMin,
    total_max: totalMax,
  };
}

export async function updateHouseOfChancesSettings(formData: FormData) {
  const staff = await requireAdminSection("house_of_chances");

  const isOpen = checkbox(formData, "isOpen");
  const playCost = integer(formData, "playCost", 0, 1000000);
  const dailyPlayLimit = integer(formData, "dailyPlayLimit", 1, 100);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("house_of_chances_settings")
    .update({
      is_open: isOpen,
      play_cost: playCost,
      daily_play_limit: dailyPlayLimit,
      updated_by: staff.userId,
    })
    .eq("id", 1);

  if (error) throw new Error(error.message);

  refreshHouse();
}

export async function createHouseOfChancesRule(formData: FormData) {
  const staff = await requireAdminSection("house_of_chances");
  const payload = rulePayload(formData);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("house_of_chances_prize_rules")
    .insert({
      ...payload,
      created_by: staff.userId,
      updated_by: staff.userId,
    });

  if (error) throw new Error(error.message);

  refreshHouse();
}

export async function updateHouseOfChancesRule(formData: FormData) {
  const staff = await requireAdminSection("house_of_chances");
  const ruleId = uuid(text(formData, "ruleId"), "Prize rule");
  const payload = rulePayload(formData);

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("house_of_chances_prize_rules")
    .update({
      ...payload,
      updated_by: staff.userId,
    })
    .eq("id", ruleId);

  if (error) throw new Error(error.message);

  refreshHouse();
}

export async function deleteHouseOfChancesRule(formData: FormData) {
  await requireAdminSection("house_of_chances");
  const ruleId = uuid(text(formData, "ruleId"), "Prize rule");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("house_of_chances_prize_rules")
    .delete()
    .eq("id", ruleId);

  if (error) throw new Error(error.message);

  refreshHouse();
}

export async function addHouseOfChancesReward(formData: FormData) {
  await requireAdminSection("house_of_chances");

  const ruleId = uuid(text(formData, "ruleId"), "Prize rule");
  const rewardType = text(formData, "rewardType");
  const quantity = integer(formData, "quantity", 1, 9999);
  const sortOrder = integer(formData, "sortOrder", 0, 100000);

  if (!["remnants", "item"].includes(rewardType)) {
    throw new Error("Invalid reward type.");
  }

  const supabase = createAdminClient();

  if (rewardType === "remnants") {
    const amount = integer(formData, "remnantsAmount", 1, 100000000);

    const { error } = await supabase
      .from("house_of_chances_rule_rewards")
      .insert({
        rule_id: ruleId,
        reward_type: "remnants",
        remnants_amount: amount,
        item_id: null,
        quantity: 1,
        sort_order: sortOrder,
      });

    if (error) throw new Error(error.message);
  } else {
    const itemId = uuid(text(formData, "itemId"), "Item");

    const { data: item, error: itemError } = await supabase
      .from("items")
      .select("id, is_active")
      .eq("id", itemId)
      .maybeSingle();

    if (itemError) throw new Error(itemError.message);
    if (!item) throw new Error("Item not found.");
    if (!item.is_active) throw new Error("Inactive Items cannot be used as prizes.");

    const { error } = await supabase
      .from("house_of_chances_rule_rewards")
      .insert({
        rule_id: ruleId,
        reward_type: "item",
        remnants_amount: null,
        item_id: itemId,
        quantity,
        sort_order: sortOrder,
      });

    if (error) throw new Error(error.message);
  }

  refreshHouse();
}

export async function deleteHouseOfChancesReward(formData: FormData) {
  await requireAdminSection("house_of_chances");
  const rewardId = uuid(text(formData, "rewardId"), "Reward");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("house_of_chances_rule_rewards")
    .delete()
    .eq("id", rewardId);

  if (error) throw new Error(error.message);

  refreshHouse();
}
