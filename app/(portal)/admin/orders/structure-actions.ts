"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth/require-staff";
import { adjustHealthForVigourModifier } from "@/lib/characters/adjust-health-for-vigour-modifier";
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

function refreshStructure() {
  revalidatePath("/admin/orders");
  revalidatePath("/orders");
  revalidatePath("/orders/manage");
  revalidatePath("/admin/characters");
  revalidatePath("/characters");
  revalidatePath("/character");
  revalidatePath("/game");
}

export async function updateOrderLevel(formData: FormData) {
  await requireStaff();
  const orderId = requiredString(formData, "orderId", "Order");
  const levelId = requiredString(formData, "levelId", "Level");
  if (!isUuid(orderId) || !isUuid(levelId)) {
    throw new Error("Invalid Order level.");
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("order_levels")
    .select("id, level")
    .eq("id", levelId)
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) redirectBack(orderId, "error", error.message);
  if (!data) redirectBack(orderId, "error", "The selected level no longer exists.");
  refreshStructure();
  redirectBack(orderId, "success", `Level ${data.level} verified.`);
}

export async function createOrderJob(formData: FormData) {
  await requireStaff();
  const orderId = requiredString(formData, "orderId", "Order");
  const levelId = requiredString(formData, "levelId", "Level");
  const name = requiredString(formData, "name", "Role title").slice(0, 120);
  if (!isUuid(orderId) || !isUuid(levelId)) throw new Error("Invalid Order level.");

  const descriptionValue = formData.get("description");
  const description = typeof descriptionValue === "string"
    ? descriptionValue.trim() || null
    : null;
  const sortOrder = integer(formData, "sortOrder", -9999, 9999);
  const modifiers: Record<string, number> = {};
  for (const attribute of ATTRIBUTE_FIELDS) {
    modifiers[`${attribute}_modifier`] = integer(
      formData,
      `${attribute}Modifier`,
      -10,
      10,
    );
  }

  const supabase = await createClient();
  const { data: level, error: levelError } = await supabase
    .from("order_levels")
    .select("id")
    .eq("id", levelId)
    .eq("order_id", orderId)
    .maybeSingle();
  if (levelError) redirectBack(orderId, "error", levelError.message);
  if (!level) redirectBack(orderId, "error", "The selected Order level does not exist.");

  const { error } = await supabase.from("order_jobs").insert({
    order_level_id: levelId,
    name,
    description,
    sort_order: sortOrder,
    ...modifiers,
  });
  if (error) redirectBack(orderId, "error", error.message);
  refreshStructure();
  redirectBack(orderId, "success", `${name} added.`);
}

export async function updateOrderJob(formData: FormData) {
  await requireStaff();
  const orderId = requiredString(formData, "orderId", "Order");
  const jobId = requiredString(formData, "jobId", "Role");
  const name = requiredString(formData, "name", "Role title").slice(0, 120);
  if (!isUuid(orderId) || !isUuid(jobId)) throw new Error("Invalid Order role.");

  const descriptionValue = formData.get("description");
  const description = typeof descriptionValue === "string"
    ? descriptionValue.trim() || null
    : null;
  const sortOrder = integer(formData, "sortOrder", -9999, 9999);
  const updates: Record<string, string | number | null> = {
    name,
    description,
    sort_order: sortOrder,
  };
  for (const attribute of ATTRIBUTE_FIELDS) {
    updates[`${attribute}_modifier`] = integer(
      formData,
      `${attribute}Modifier`,
      -10,
      10,
    );
  }

  const supabase = await createClient();
  const { data: job, error: jobError } = await supabase
    .from("order_jobs")
    .select(`
      id,
      vigour_modifier,
      order_level:order_levels!order_jobs_order_level_id_fkey(order_id)
    `)
    .eq("id", jobId)
    .maybeSingle();
  if (jobError) redirectBack(orderId, "error", jobError.message);

  const relation = Array.isArray(job?.order_level)
    ? job?.order_level[0]
    : job?.order_level;
  if (!job || !relation || relation.order_id !== orderId) {
    redirectBack(orderId, "error", "The selected role does not belong to this Order.");
  }

  const oldVigour = job.vigour_modifier ?? 0;
  const newVigour = Number(updates.vigour_modifier ?? 0);

  let affected: Array<{
    character_id: string;
    character: { current_health: number | null } | { current_health: number | null }[] | null;
  }> = [];

  if (oldVigour !== newVigour) {
    const { data, error } = await supabase
      .from("order_memberships")
      .select(`
        character_id,
        character:characters!order_memberships_character_id_fkey(current_health)
      `)
      .eq("order_job_id", jobId);
    if (error) redirectBack(orderId, "error", error.message);
    affected = (data ?? []) as typeof affected;
  }

  const { error } = await supabase
    .from("order_jobs")
    .update(updates)
    .eq("id", jobId);
  if (error) redirectBack(orderId, "error", error.message);

  if (oldVigour !== newVigour) {
    for (const membership of affected) {
      const character = Array.isArray(membership.character)
        ? membership.character[0] ?? null
        : membership.character;
      if (!character) continue;
      const currentHealth = adjustHealthForVigourModifier({
        currentHealth: character.current_health,
        oldModifier: oldVigour,
        newModifier: newVigour,
      });
      const { error: healthError } = await supabase
        .from("characters")
        .update({ current_health: currentHealth })
        .eq("id", membership.character_id);
      if (healthError) {
        redirectBack(orderId, "error", `Role updated, but Current Health could not be synchronised: ${healthError.message}`);
      }
      revalidatePath(`/admin/characters/${membership.character_id}`);
    }
  }

  refreshStructure();
  redirectBack(orderId, "success", `${name} updated.`);
}

export async function deleteOrderJob(formData: FormData) {
  await requireStaff();
  const orderId = requiredString(formData, "orderId", "Order");
  const jobId = requiredString(formData, "jobId", "Role");
  if (!isUuid(orderId) || !isUuid(jobId)) throw new Error("Invalid Order role.");
  const supabase = await createClient();

  const { data: job, error: readError } = await supabase
    .from("order_jobs")
    .select(`id, name, order_level:order_levels!order_jobs_order_level_id_fkey(order_id)`)
    .eq("id", jobId)
    .maybeSingle();
  if (readError) redirectBack(orderId, "error", readError.message);
  const relation = Array.isArray(job?.order_level) ? job?.order_level[0] : job?.order_level;
  if (!job || !relation || relation.order_id !== orderId) {
    redirectBack(orderId, "error", "The selected role does not belong to this Order.");
  }

  const { count, error: countError } = await supabase
    .from("order_memberships")
    .select("id", { count: "exact", head: true })
    .eq("order_job_id", jobId);
  if (countError) redirectBack(orderId, "error", countError.message);
  if ((count ?? 0) > 0) {
    redirectBack(orderId, "error", "Move every member out of this role before deleting it.");
  }

  const { error } = await supabase.from("order_jobs").delete().eq("id", jobId);
  if (error) redirectBack(orderId, "error", error.message);
  refreshStructure();
  redirectBack(orderId, "success", `${job.name} deleted.`);
}

export async function createOrderJobLink(formData: FormData) {
  await requireStaff();
  const orderId = requiredString(formData, "orderId", "Order");
  const fromJobId = requiredString(formData, "fromJobId", "From role");
  const toJobId = requiredString(formData, "toJobId", "To role");
  if (!isUuid(orderId) || !isUuid(fromJobId) || !isUuid(toJobId)) {
    throw new Error("Invalid role progression link.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("order_job_links")
    .insert({ from_job_id: fromJobId, to_job_id: toJobId });
  if (error) redirectBack(orderId, "error", error.message);
  refreshStructure();
  redirectBack(orderId, "success", "Role progression link added.");
}

export async function deleteOrderJobLink(formData: FormData) {
  await requireStaff();
  const orderId = requiredString(formData, "orderId", "Order");
  const linkId = requiredString(formData, "linkId", "Link");
  if (!isUuid(orderId) || !isUuid(linkId)) throw new Error("Invalid role progression link.");
  const supabase = await createClient();
  const { error } = await supabase.from("order_job_links").delete().eq("id", linkId);
  if (error) redirectBack(orderId, "error", error.message);
  refreshStructure();
  redirectBack(orderId, "success", "Role progression link removed.");
}
