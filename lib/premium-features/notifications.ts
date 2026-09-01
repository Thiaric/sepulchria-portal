import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type PremiumFeatureNotificationInput = {
  characterId: string;
  createdBy: string;
  title: string;
  body: string;
  href?: string | null;
};

function thirtyDaysFromNow() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 30);
  return date.toISOString();
}

export async function createPremiumFeatureGrantNotification({
  characterId,
  createdBy,
  title,
  body,
  href = null,
}: PremiumFeatureNotificationInput) {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const {
    data: notification,
    error: notificationError,
  } = await admin
    .from("notifications")
    .insert({
      type: "reward",
      title,
      body,
      href,
      starts_at: now,
      expires_at: thirtyDaysFromNow(),
      expires_game_at: null,
      created_by: createdBy,
      is_automatic: true,
      staff_overridden: false,
      is_active: true,
    })
    .select("id")
    .single();

  if (notificationError || !notification) {
    throw new Error(
      `Unable to create premium feature notification: ${
        notificationError?.message ?? "Unknown error"
      }`,
    );
  }

  const { error: targetError } = await admin
    .from("notification_targets")
    .insert({
      notification_id: notification.id,
      target_type: "character",
      target_id: characterId,
    });

  if (targetError) {
    await admin
      .from("notifications")
      .delete()
      .eq("id", notification.id);

    throw new Error(
      `Unable to target premium feature notification: ${targetError.message}`,
    );
  }
}
