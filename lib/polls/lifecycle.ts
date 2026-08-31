import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createPollNotification } from "@/lib/polls/notifications";

export async function closeExpiredPolls() {
  const admin = createAdminClient();
  const now =
    new Date().toISOString();

  const {
    data: expired,
    error,
  } = await admin
    .from("polls")
    .select(`
      id,
      title,
      closes_at,
      created_by,
      poll_targets(
        target_type,
        target_id
      )
    `)
    .eq("status", "open")
    .not("closes_at", "is", null)
    .lte("closes_at", now);

  if (error) {
    throw new Error(
      `Unable to check expired polls: ${error.message}`,
    );
  }

  for (const poll of expired ?? []) {
    const { error: closeError } =
      await admin
        .from("polls")
        .update({
          status: "closed",
          closed_at: now,
          updated_at: now,
        })
        .eq("id", poll.id)
        .eq("status", "open");

    if (closeError) {
      throw new Error(
        `Unable to close expired poll: ${closeError.message}`,
      );
    }

    await createPollNotification(
      poll,
      "closed",
      poll.created_by,
    );
  }
}
