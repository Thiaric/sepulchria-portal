"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DailyRewardClaimState = {
  success: boolean;
  message: string;
};

export async function claimDailyMission(
  _previousState: DailyRewardClaimState,
  formData: FormData,
): Promise<DailyRewardClaimState> {
  const assignmentId = String(
    formData.get("assignment_id") ?? "",
  ).trim();

  if (!assignmentId) {
    return {
      success: false,
      message: "Daily Mission is required.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "claim_my_daily_mission",
    {
      p_assignment_id: assignmentId,
    },
  );

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  revalidatePath("/missions");
  revalidatePath("/character");

  return {
    success: true,
    message: "Reward received.",
  };
}

export async function claimDailyMilestone(
  _previousState: DailyRewardClaimState,
  formData: FormData,
): Promise<DailyRewardClaimState> {
  const claimId = String(
    formData.get("claim_id") ?? "",
  ).trim();

  if (!claimId) {
    return {
      success: false,
      message: "Daily Milestone is required.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "claim_my_daily_mission_milestone",
    {
      p_claim_id: claimId,
    },
  );

  if (error) {
    return {
      success: false,
      message: error.message,
    };
  }

  revalidatePath("/missions");
  revalidatePath("/character");

  return {
    success: true,
    message: "Reward received.",
  };
}
