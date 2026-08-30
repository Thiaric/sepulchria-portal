"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function updateDailyMissionDefinition(formData: FormData) {
  await requireAdminSection("missions");
  const admin = createAdminClient();

  const id = text(formData, "id");
  const targetValue = Number(text(formData, "target_value"));
  const rewardRemnants = Number(text(formData, "reward_remnants"));
  const rewardItemQuantity = Number(text(formData, "reward_item_quantity"));
  const rewardItemId = text(formData, "reward_item_id") || null;
  const isActive = formData.get("is_active") === "on";
  const countsToward = formData.get("counts_toward_milestones") === "on";

  if (!id) throw new Error("Mission is required.");
  if (!Number.isSafeInteger(targetValue) || targetValue < 1) {
    throw new Error("Target must be a positive whole number.");
  }
  if (!Number.isSafeInteger(rewardRemnants) || rewardRemnants < 0) {
    throw new Error("Remnant reward must be zero or more.");
  }
  if (!Number.isSafeInteger(rewardItemQuantity) || rewardItemQuantity < 0) {
    throw new Error("Item quantity must be zero or more.");
  }

  const { error } = await admin
    .from("daily_mission_definitions")
    .update({
      name: text(formData, "name"),
      description: text(formData, "description"),
      target_value: targetValue,
      difficulty: text(formData, "difficulty"),
      reward_remnants: rewardRemnants,
      reward_item_id: rewardItemId,
      reward_item_quantity: rewardItemId ? rewardItemQuantity : 0,
      is_active: isActive,
      counts_toward_milestones: countsToward,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  if (!isActive) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: dayRows, error: dayError } = await admin
      .from("daily_mission_days")
      .select("id")
      .eq("mission_date", today);

    if (dayError) throw new Error(dayError.message);

    const dayIds = (dayRows ?? []).map((row) => row.id);
    if (dayIds.length > 0) {
      const { error: assignmentError } = await admin
        .from("daily_mission_assignments")
        .update({ counts_toward_milestones: false })
        .eq("mission_definition_id", id)
        .in("day_id", dayIds);

      if (assignmentError) throw new Error(assignmentError.message);
    }
  }

  revalidatePath("/admin/missions");
  revalidatePath("/missions");
}

export async function updateDailyMilestoneDefinition(formData: FormData) {
  await requireAdminSection("missions");
  const admin = createAdminClient();

  const milestoneKey = text(formData, "milestone_key");
  const rewardRemnants = Number(text(formData, "reward_remnants"));
  const rewardItemQuantity = Number(text(formData, "reward_item_quantity"));
  const rewardItemId = text(formData, "reward_item_id") || null;

  if (!milestoneKey) throw new Error("Milestone is required.");
  if (!Number.isSafeInteger(rewardRemnants) || rewardRemnants < 0) {
    throw new Error("Remnant reward must be zero or more.");
  }
  if (!Number.isSafeInteger(rewardItemQuantity) || rewardItemQuantity < 0) {
    throw new Error("Item quantity must be zero or more.");
  }

  const { error } = await admin
    .from("daily_mission_milestone_definitions")
    .update({
      name: text(formData, "name"),
      description: text(formData, "description"),
      reward_remnants: rewardRemnants,
      reward_item_id: rewardItemId,
      reward_item_quantity: rewardItemId ? rewardItemQuantity : 0,
      is_active: formData.get("is_active") === "on",
    })
    .eq("milestone_key", milestoneKey);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/missions");
  revalidatePath("/missions");
}
