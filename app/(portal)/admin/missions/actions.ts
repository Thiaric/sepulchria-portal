"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AdminMissionActionState,
} from "@/components/admin/admin-mission-form";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function success(message: string): AdminMissionActionState {
  return { ok: true, message };
}

function failure(message: string): AdminMissionActionState {
  return { ok: false, message };
}

export async function updateDailyMissionDefinition(
  _previousState: AdminMissionActionState,
  formData: FormData,
): Promise<AdminMissionActionState> {
  await requireAdminSection("missions");

  try {
    const admin = createAdminClient();

    const id = text(formData, "id");
    const targetValue = Number(text(formData, "target_value"));
    const rewardRemnants = Number(text(formData, "reward_remnants"));
    const rewardItemQuantity = Number(text(formData, "reward_item_quantity"));
    const rewardItemId = text(formData, "reward_item_id") || null;
    const isActive = formData.get("is_active") === "on";
    const countsToward =
      formData.get("counts_toward_milestones") === "on";

    if (!id) return failure("Mission is required.");

    if (!Number.isSafeInteger(targetValue) || targetValue < 1) {
      return failure("Target must be a positive whole number.");
    }

    if (!Number.isSafeInteger(rewardRemnants) || rewardRemnants < 0) {
      return failure("Remnant reward must be zero or more.");
    }

    if (
      !Number.isSafeInteger(rewardItemQuantity) ||
      rewardItemQuantity < 0
    ) {
      return failure("Item quantity must be zero or more.");
    }

    const missionName =
      text(formData, "name") || "Daily Mission";

    const { error } = await admin
      .from("daily_mission_definitions")
      .update({
        name: missionName,
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

    if (error) return failure(error.message);

    if (!isActive) {
      const today = new Date().toISOString().slice(0, 10);

      const { data: dayRows, error: dayError } = await admin
        .from("daily_mission_days")
        .select("id")
        .eq("mission_date", today);

      if (dayError) return failure(dayError.message);

      const dayIds = (dayRows ?? []).map((row) => row.id);

      if (dayIds.length > 0) {
        const { error: assignmentError } = await admin
          .from("daily_mission_assignments")
          .update({
            counts_toward_milestones: false,
          })
          .eq("mission_definition_id", id)
          .in("day_id", dayIds);

        if (assignmentError) {
          return failure(assignmentError.message);
        }
      }
    }

    revalidatePath("/admin/missions");
    revalidatePath("/missions");

    return success(`${missionName} saved.`);
  } catch (error) {
    return failure(
      error instanceof Error
        ? error.message
        : "Could not save mission.",
    );
  }
}

export async function updateDailyMilestoneDefinition(
  _previousState: AdminMissionActionState,
  formData: FormData,
): Promise<AdminMissionActionState> {
  await requireAdminSection("missions");

  try {
    const admin = createAdminClient();

    const milestoneKey = text(formData, "milestone_key");
    const rewardRemnants = Number(text(formData, "reward_remnants"));
    const rewardItemQuantity = Number(
      text(formData, "reward_item_quantity"),
    );
    const rewardItemId = text(formData, "reward_item_id") || null;

    if (!milestoneKey) return failure("Milestone is required.");

    if (!Number.isSafeInteger(rewardRemnants) || rewardRemnants < 0) {
      return failure("Remnant reward must be zero or more.");
    }

    if (
      !Number.isSafeInteger(rewardItemQuantity) ||
      rewardItemQuantity < 0
    ) {
      return failure("Item quantity must be zero or more.");
    }

    const milestoneName =
      text(formData, "name") || "Daily Milestone";

    const { error } = await admin
      .from("daily_mission_milestone_definitions")
      .update({
        name: milestoneName,
        description: text(formData, "description"),
        reward_remnants: rewardRemnants,
        reward_item_id: rewardItemId,
        reward_item_quantity: rewardItemId ? rewardItemQuantity : 0,
        is_active: formData.get("is_active") === "on",
      })
      .eq("milestone_key", milestoneKey);

    if (error) return failure(error.message);

    revalidatePath("/admin/missions");
    revalidatePath("/missions");

    return success(`${milestoneName} saved.`);
  } catch (error) {
    return failure(
      error instanceof Error
        ? error.message
        : "Could not save milestone.",
    );
  }
}
