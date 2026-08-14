"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

const ATTRIBUTE_FIELDS = [
  "muscles",
  "reflexes",
  "vigour",
  "shrewd",
  "brains",
  "presence",
] as const;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function requiredString(formData: FormData, field: string, label: string) {
  const value = formData.get(field);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function integer(
  formData: FormData,
  field: string,
  min: number,
  max: number,
  fallback = 0,
) {
  const value = formData.get(field);

  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed)) {
    throw new Error(`${field} must be a whole number.`);
  }

  return Math.max(min, Math.min(max, parsed));
}

function redirectBack(
  orderId: string,
  type: "success" | "error",
  message: string,
): never {
  const params = new URLSearchParams();
  params.set(type, message);
  redirect(`/admin/orders?${params.toString()}#order-${orderId}`);
}

export async function updateOrderLevel(formData: FormData) {
  await requireStaff();

  const orderId = requiredString(formData, "orderId", "Order");
  const levelId = requiredString(formData, "levelId", "Level");

  if (!isUuid(orderId) || !isUuid(levelId)) {
    throw new Error("Invalid Order level.");
  }

  const level = integer(formData, "level", 0, 5);

  const updates: Record<string, number> = {};

  for (const attribute of ATTRIBUTE_FIELDS) {
    updates[`${attribute}_modifier`] = integer(
      formData,
      `${attribute}Modifier`,
      -10,
      10,
    );
  }

  const supabase = await createClient();

  const { data: existing, error: readError } = await supabase
    .from("order_levels")
    .select("id, order_id, level")
    .eq("id", levelId)
    .eq("order_id", orderId)
    .maybeSingle();

  if (readError) {
    redirectBack(orderId, "error", readError.message);
  }

  if (!existing) {
    redirectBack(orderId, "error", "The selected level no longer exists.");
  }

  if (existing.level !== level) {
    redirectBack(orderId, "error", "The Order level could not be verified.");
  }

  const { error } = await supabase
    .from("order_levels")
    .update(updates)
    .eq("id", levelId);

  if (error) {
    redirectBack(orderId, "error", error.message);
  }

  revalidatePath("/admin/orders");
  redirectBack(orderId, "success", `Level ${level} updated.`);
}

export async function createOrderJob(formData: FormData) {
  await requireStaff();

  const orderId = requiredString(formData, "orderId", "Order");
  const levelId = requiredString(formData, "levelId", "Level");
  const name = requiredString(formData, "name", "Job title").slice(0, 120);

  if (!isUuid(orderId) || !isUuid(levelId)) {
    throw new Error("Invalid Order level.");
  }

  const descriptionValue = formData.get("description");
  const description =
    typeof descriptionValue === "string"
      ? descriptionValue.trim() || null
      : null;

  const sortOrder = integer(formData, "sortOrder", -9999, 9999);
  const supabase = await createClient();

  const { data: level, error: levelError } = await supabase
    .from("order_levels")
    .select("id")
    .eq("id", levelId)
    .eq("order_id", orderId)
    .maybeSingle();

  if (levelError) {
    redirectBack(orderId, "error", levelError.message);
  }

  if (!level) {
    redirectBack(orderId, "error", "The selected Order level does not exist.");
  }

  const { error } = await supabase.from("order_jobs").insert({
    order_level_id: levelId,
    name,
    description,
    sort_order: sortOrder,
  });

  if (error) {
    redirectBack(orderId, "error", error.message);
  }

  revalidatePath("/admin/orders");
  redirectBack(orderId, "success", `${name} added.`);
}

export async function updateOrderJob(formData: FormData) {
  await requireStaff();

  const orderId = requiredString(formData, "orderId", "Order");
  const jobId = requiredString(formData, "jobId", "Job");
  const name = requiredString(formData, "name", "Job title").slice(0, 120);

  if (!isUuid(orderId) || !isUuid(jobId)) {
    throw new Error("Invalid Order job.");
  }

  const descriptionValue = formData.get("description");
  const description =
    typeof descriptionValue === "string"
      ? descriptionValue.trim() || null
      : null;

  const sortOrder = integer(formData, "sortOrder", -9999, 9999);
  const supabase = await createClient();

  const { data: job, error: jobError } = await supabase
    .from("order_jobs")
    .select("id, order_level:order_levels!order_jobs_order_level_id_fkey(order_id)")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    redirectBack(orderId, "error", jobError.message);
  }

  const relation = Array.isArray(job?.order_level)
    ? job?.order_level[0]
    : job?.order_level;

  if (!job || !relation || relation.order_id !== orderId) {
    redirectBack(orderId, "error", "The selected job does not belong to this Order.");
  }

  const { error } = await supabase
    .from("order_jobs")
    .update({
      name,
      description,
      sort_order: sortOrder,
    })
    .eq("id", jobId);

  if (error) {
    redirectBack(orderId, "error", error.message);
  }

  revalidatePath("/admin/orders");
  redirectBack(orderId, "success", `${name} updated.`);
}

export async function deleteOrderJob(formData: FormData) {
  await requireStaff();

  const orderId = requiredString(formData, "orderId", "Order");
  const jobId = requiredString(formData, "jobId", "Job");

  if (!isUuid(orderId) || !isUuid(jobId)) {
    throw new Error("Invalid Order job.");
  }

  const supabase = await createClient();

  const { data: job, error: readError } = await supabase
    .from("order_jobs")
    .select("id, name, order_level:order_levels!order_jobs_order_level_id_fkey(order_id)")
    .eq("id", jobId)
    .maybeSingle();

  if (readError) {
    redirectBack(orderId, "error", readError.message);
  }

  const relation = Array.isArray(job?.order_level)
    ? job?.order_level[0]
    : job?.order_level;

  if (!job || !relation || relation.order_id !== orderId) {
    redirectBack(orderId, "error", "The selected job does not belong to this Order.");
  }

  const { error } = await supabase
    .from("order_jobs")
    .delete()
    .eq("id", jobId);

  if (error) {
    redirectBack(orderId, "error", error.message);
  }

  revalidatePath("/admin/orders");
  redirectBack(orderId, "success", `${job.name} deleted.`);
}
