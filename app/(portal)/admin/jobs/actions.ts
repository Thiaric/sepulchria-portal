"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function validateJob(name: string, description: string) {
  if (name.length < 2) throw new Error("Job name is required.");
  if (name.length > 120) throw new Error("Job name is too long.");
  if (description.length < 3) throw new Error("Job description is required.");
  if (description.length > 1000) throw new Error("Job description is too long.");
}

export async function createOddJob(formData: FormData) {
  await requireAdminSection("jobs");

  const name = readText(formData, "name");
  const description = readText(formData, "description");

  validateJob(name, description);

  const supabase = createAdminClient();

  const { data: lastJob, error: sortError } = await supabase
    .from("odd_jobs")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sortError) throw new Error(sortError.message);

  const sortOrder = Number(lastJob?.sort_order ?? 0) + 10;

  const { error } = await supabase.from("odd_jobs").insert({
    name,
    description,
    is_active: true,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("A job with this name already exists.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/admin/jobs");
  revalidatePath("/game");
}

export async function updateOddJob(formData: FormData) {
  await requireAdminSection("jobs");

  const jobId = readText(formData, "jobId");
  const name = readText(formData, "name");
  const description = readText(formData, "description");

  if (!jobId) throw new Error("Job is required.");

  validateJob(name, description);

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("odd_jobs")
    .update({
      name,
      description,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    if (error.code === "23505") {
      throw new Error("A job with this name already exists.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/admin/jobs");
  revalidatePath("/game");
}
