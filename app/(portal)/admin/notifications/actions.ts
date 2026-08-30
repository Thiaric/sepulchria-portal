"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(formData: FormData, name: string, required = true) {
  const raw = formData.get(name);
  const value = typeof raw === "string" ? raw.trim() : "";

  if (required && !value) {
    throw new Error(`${name} is required.`);
  }

  return value || null;
}

function uuid(value: string | null, label: string) {
  if (!value || !UUID_RE.test(value)) {
    throw new Error(`${label} is invalid.`);
  }
  return value;
}

function utc(value: string | null, label: string, required = false) {
  if (!value) {
    if (required) throw new Error(`${label} is required.`);
    return null;
  }

  const parsed = new Date(
    /(?:Z|[+-]\d\d:\d\d)$/.test(value)
      ? value
      : `${value}:00Z`,
  );

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} is invalid.`);
  }

  return parsed.toISOString();
}

function audience(formData: FormData) {
  const targetType = String(text(formData, "targetType"));

  if (!["global", "staff", "user", "character"].includes(targetType)) {
    throw new Error("Audience is invalid.");
  }

  if (targetType === "global" || targetType === "staff") {
    return { targetType, targetId: null };
  }

  const raw =
    targetType === "character"
      ? text(formData, "characterTargetId", false)
      : text(formData, "userTargetId", false);

  return {
    targetType,
    targetId: uuid(raw, targetType === "character" ? "Character" : "User"),
  };
}

function refresh() {
  revalidatePath("/admin/notifications");
  revalidatePath("/", "layout");
}

export async function createNotification(formData: FormData) {
  const staff = await requireAdminSection("notifications");
  const admin = createAdminClient();
  const target = audience(formData);
  const startsAt = utc(text(formData, "startsAt"), "Visible from", true);
  const expiresAt = utc(text(formData, "expiresAt"), "Expiry", true);

  const { data: notification, error } = await admin
    .from("notifications")
    .insert({
      type: text(formData, "type"),
      title: text(formData, "title"),
      body: text(formData, "body"),
      href: text(formData, "href", false),
      starts_at: startsAt,
      expires_at: expiresAt,
      expires_game_at: null,
      created_by: staff.userId,
      is_automatic: false,
      is_active: formData.get("isActive") === "on",
    })
    .select("id")
    .single();

  if (error || !notification) {
    throw new Error(`Unable to create notification: ${error?.message ?? "Unknown error"}`);
  }

  const { error: targetError } = await admin
    .from("notification_targets")
    .insert({
      notification_id: notification.id,
      target_type: target.targetType,
      target_id: target.targetId,
    });

  if (targetError) {
    await admin.from("notifications").delete().eq("id", notification.id);
    throw new Error(`Unable to create audience: ${targetError.message}`);
  }

  refresh();
}

export async function updateNotification(formData: FormData) {
  await requireAdminSection("notifications");
  const admin = createAdminClient();
  const notificationId = uuid(text(formData, "notificationId"), "Notification");
  const target = audience(formData);

  const { data: existing, error: existingError } = await admin
    .from("notifications")
    .select("is_automatic")
    .eq("id", notificationId)
    .single();

  if (existingError || !existing) {
    throw new Error("Notification was not found.");
  }

  const startsAt = utc(text(formData, "startsAt"), "Visible from", true);
  const expiresAt = utc(text(formData, "expiresAt", false), "Real expiry");
  const expiresGameAt = utc(text(formData, "expiresGameAt", false), "Game expiry");

  if (!expiresAt && !expiresGameAt) {
    throw new Error("At least one expiry is required.");
  }

  const { error } = await admin
    .from("notifications")
    .update({
      type: text(formData, "type"),
      title: text(formData, "title"),
      body: text(formData, "body"),
      href: text(formData, "href", false),
      starts_at: startsAt,
      expires_at: expiresAt,
      expires_game_at: expiresGameAt,
      is_active: formData.get("isActive") === "on",
      staff_overridden: existing.is_automatic ? true : false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", notificationId);

  if (error) {
    throw new Error(`Unable to update notification: ${error.message}`);
  }

  await admin
    .from("notification_targets")
    .delete()
    .eq("notification_id", notificationId);

  const { error: targetError } = await admin
    .from("notification_targets")
    .insert({
      notification_id: notificationId,
      target_type: target.targetType,
      target_id: target.targetId,
    });

  if (targetError) {
    throw new Error(`Unable to update audience: ${targetError.message}`);
  }

  refresh();
}

export async function toggleNotification(formData: FormData) {
  await requireAdminSection("notifications");
  const admin = createAdminClient();
  const notificationId = uuid(text(formData, "notificationId"), "Notification");
  const nextActive = text(formData, "nextActive") === "true";

  const { data: existing } = await admin
    .from("notifications")
    .select("is_automatic")
    .eq("id", notificationId)
    .single();

  const { error } = await admin
    .from("notifications")
    .update({
      is_active: nextActive,
      staff_overridden: existing?.is_automatic ? true : false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", notificationId);

  if (error) {
    throw new Error(`Unable to change notification state: ${error.message}`);
  }

  refresh();
}

export async function deleteNotification(formData: FormData) {
  const staff = await requireAdminSection("notifications");
  const admin = createAdminClient();
  const notificationId = uuid(text(formData, "notificationId"), "Notification");

  const { data: existing, error: loadError } = await admin
    .from("notifications")
    .select("is_automatic, source_type, source_id, source_trigger")
    .eq("id", notificationId)
    .single();

  if (loadError || !existing) {
    throw new Error("Notification was not found.");
  }

  if (
    existing.is_automatic &&
    existing.source_type &&
    existing.source_id &&
    existing.source_trigger
  ) {
    const { error: suppressionError } = await admin
      .from("notification_suppressions")
      .upsert(
        {
          source_type: existing.source_type,
          source_id: existing.source_id,
          source_trigger: existing.source_trigger,
          created_by: staff.userId,
        },
        { onConflict: "source_type,source_id,source_trigger" },
      );

    if (suppressionError) {
      throw new Error(`Unable to suppress regeneration: ${suppressionError.message}`);
    }
  }

  const { error } = await admin
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) {
    throw new Error(`Unable to delete notification: ${error.message}`);
  }

  refresh();
}
