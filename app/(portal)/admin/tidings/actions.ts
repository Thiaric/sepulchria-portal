"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_PRIORITIES = [
  "normal",
  "important",
  "urgent",
] as const;

function expiryFromDuration(value: string) {
  if (value === "never") return null;

  const hours = Number(value);

  if (
    !Number.isFinite(hours) ||
    hours <= 0 ||
    hours > 24 * 30
  ) {
    throw new Error("Invalid Tidings expiry duration.");
  }

  return new Date(
    Date.now() + hours * 60 * 60 * 1000,
  ).toISOString();
}

export async function createTidingAction(
  formData: FormData,
) {
  const staff = await requireStaff();
  const supabase = await createClient();

  const title = String(
    formData.get("title") ?? "",
  ).trim();

  const message = String(
    formData.get("message") ?? "",
  ).trim();

  const priority = String(
    formData.get("priority") ?? "normal",
  );

  const duration = String(
    formData.get("duration") ?? "24",
  );

  if (!title || title.length > 80) {
    throw new Error("Tidings title must be between 1 and 80 characters.");
  }

  if (!message || message.length > 300) {
    throw new Error("Tidings message must be between 1 and 300 characters.");
  }

  if (
    !ALLOWED_PRIORITIES.includes(
      priority as (typeof ALLOWED_PRIORITIES)[number],
    )
  ) {
    throw new Error("Invalid Tidings priority.");
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("tidings")
    .insert({
      title,
      message,
      priority,
      priority_rank:
        priority === "urgent"
          ? 2
          : priority === "important"
            ? 1
            : 0,
      is_active: true,
      starts_at: now,
      expires_at: expiryFromDuration(duration),
      created_by: staff.userId,
      updated_at: now,
    });

  if (error) {
    throw new Error(`Unable to publish Tidings: ${error.message}`);
  }

  revalidatePath("/", "layout");
  redirect("/admin/tidings?created=1");
}

export async function toggleTidingAction(
  formData: FormData,
) {
  await requireStaff();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const nextActive =
    String(formData.get("nextActive") ?? "false") === "true";

  if (!id) {
    throw new Error("Missing Tidings entry.");
  }

  const { error } = await supabase
    .from("tidings")
    .update({
      is_active: nextActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Unable to update Tidings: ${error.message}`);
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/tidings");
}

export async function deleteTidingAction(
  formData: FormData,
) {
  await requireStaff();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Missing Tidings entry.");
  }

  const { error } = await supabase
    .from("tidings")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Unable to delete Tidings: ${error.message}`);
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/tidings");
}
