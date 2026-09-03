import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

function notificationExpiry() {
  return new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export async function createTargetedCharacterNotification({
  recipientCharacterId,
  title,
  body,
  href,
  sourceType,
  sourceId,
  sourceTrigger,
  createdByUserId,
}: {
  recipientCharacterId: string;
  title: string;
  body: string;
  href: string;
  sourceType: string;
  sourceId: string;
  sourceTrigger: string;
  createdByUserId: string;
}) {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: notification, error: notificationError } = await admin
    .from("notifications")
    .insert({
      type: "system",
      title,
      body,
      href,
      starts_at: now,
      expires_at: notificationExpiry(),
      expires_game_at: null,
      created_by: createdByUserId,
      is_automatic: true,
      source_type: sourceType,
      source_id: sourceId,
      source_trigger: sourceTrigger,
      staff_overridden: false,
      is_active: true,
    })
    .select("id")
    .single();

  if (notificationError || !notification) {
    throw new Error(notificationError?.message ?? "Unable to create notification.");
  }

  const { error: targetError } = await admin
    .from("notification_targets")
    .insert({
      notification_id: notification.id,
      target_type: "character",
      target_id: recipientCharacterId,
    });

  if (targetError) {
    await admin.from("notifications").delete().eq("id", notification.id);
    throw new Error(targetError.message);
  }

  const { error: readySignalError } = await admin
    .from("notifications")
    .update({
      /*
       * Guarantee the ready UPDATE changes a persisted value even when
       * creation and targeting complete inside the same millisecond.
       */
      starts_at:
        new Date(
          Date.parse(now) + 1,
        ).toISOString(),
    })
    .eq("id", notification.id);

  if (readySignalError) {
    console.warn("Notification realtime ready signal:", readySignalError.message);
  }

  return notification.id as string;
}
