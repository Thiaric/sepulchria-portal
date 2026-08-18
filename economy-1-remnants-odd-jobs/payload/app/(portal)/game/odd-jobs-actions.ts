"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function workOddJob(jobId: string) {
  if (!jobId) return { ok: false, message: "Choose a job." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_odd_job", {
    p_job_id: jobId,
  });

  if (error) return { ok: false, message: error.message };

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) return { ok: false, message: "The payment could not be confirmed." };

  revalidatePath("/game");
  revalidatePath("/character");

  return {
    ok: true,
    message: `${result.job_name} completed. +${result.paid} Remnants.`,
  };
}
