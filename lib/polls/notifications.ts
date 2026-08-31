import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type PollForNotification = {
  id: string;
  title: string;
  closes_at: string | null;
  poll_targets:
    | {
        target_type: string;
        target_id: string | null;
      }[]
    | null;
};

export async function createPollNotification(
  poll: PollForNotification,
  trigger: "opened" | "closed",
  createdBy: string,
) {
  const admin = createAdminClient();

  const {
    data: suppression,
    error: suppressionError,
  } = await admin
    .from(
      "notification_suppressions",
    )
    .select("source_type")
    .eq("source_type", "poll")
    .eq("source_id", poll.id)
    .eq("source_trigger", trigger)
    .maybeSingle();

  if (suppressionError) {
    throw new Error(
      `Unable to check poll notification suppression: ${suppressionError.message}`,
    );
  }

  if (suppression) {
    return;
  }

  const {
    data: existing,
    error: existingError,
  } = await admin
    .from("notifications")
    .select("id")
    .eq("source_type", "poll")
    .eq("source_id", poll.id)
    .eq("source_trigger", trigger)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Unable to check existing poll notification: ${existingError.message}`,
    );
  }

  if (existing) {
    return;
  }

  const now = new Date();
  const fallbackExpiry =
    new Date(
      now.getTime() +
        7 * 86_400_000,
    ).toISOString();

  const openExpiry =
    poll.closes_at &&
    new Date(
      poll.closes_at,
    ).getTime() > now.getTime()
      ? poll.closes_at
      : fallbackExpiry;

  const {
    data: notification,
    error,
  } = await admin
    .from("notifications")
    .insert({
      type: "announcement",
      title:
        trigger === "opened"
          ? `New poll: ${poll.title}`
          : `Poll closed: ${poll.title}`,
      body:
        trigger === "opened"
          ? "A new poll is open. Cast your vote while it is available."
          : "This poll has closed. Open it to review the available results.",
      href:
        `/polls#poll-${poll.id}`,
      starts_at:
        now.toISOString(),
      expires_at:
        trigger === "opened"
          ? openExpiry
          : fallbackExpiry,
      expires_game_at: null,
      created_by: createdBy,
      is_automatic: true,
      source_type: "poll",
      source_id: poll.id,
      source_trigger: trigger,
      staff_overridden: false,
      is_active: true,
    })
    .select("id")
    .single();

  if (
    error ||
    !notification
  ) {
    throw new Error(
      `Unable to create poll notification: ${error?.message ?? "Unknown error"}`,
    );
  }

  const targets =
    poll.poll_targets ?? [];

  if (targets.length === 0) {
    await admin
      .from("notifications")
      .delete()
      .eq(
        "id",
        notification.id,
      );

    throw new Error(
      "Poll has no audience target.",
    );
  }

  const { error: targetError } =
    await admin
      .from(
        "notification_targets",
      )
      .insert(
        targets.map((target) => ({
          notification_id:
            notification.id,
          target_type:
            target.target_type,
          target_id:
            target.target_id,
        })),
      );

  if (targetError) {
    await admin
      .from("notifications")
      .delete()
      .eq(
        "id",
        notification.id,
      );

    throw new Error(
      `Unable to create poll notification audience: ${targetError.message}`,
    );
  }
}
