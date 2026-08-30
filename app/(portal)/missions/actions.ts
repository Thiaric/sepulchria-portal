"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function claimDailyMission(formData: FormData) {
  const assignmentId = String(formData.get("assignment_id") ?? "").trim();
  if (!assignmentId) throw new Error("Daily Mission is required.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_my_daily_mission", {
    p_assignment_id: assignmentId,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/missions");
  revalidatePath("/character");
}

export async function claimDailyMilestone(formData: FormData) {
  const claimId = String(formData.get("claim_id") ?? "").trim();
  if (!claimId) throw new Error("Daily Milestone is required.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_my_daily_mission_milestone", {
    p_claim_id: claimId,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/missions");
  revalidatePath("/character");
}
