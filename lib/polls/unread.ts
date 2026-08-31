import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  canViewPoll,
  getPollViewer,
} from "@/lib/polls/access";

type PollUnreadRow = {
  id: string;
  status: string;
  opens_at: string | null;
  closes_at: string | null;
  poll_targets:
    | {
        target_type: string;
        target_id: string | null;
      }[]
    | null;
};

function isOpenNow(
  poll: PollUnreadRow,
) {
  if (poll.status !== "open") {
    return false;
  }

  const now = Date.now();

  const opensAt =
    poll.opens_at
      ? new Date(
          poll.opens_at,
        ).getTime()
      : 0;

  const closesAt =
    poll.closes_at
      ? new Date(
          poll.closes_at,
        ).getTime()
      : null;

  return (
    opensAt <= now &&
    (
      closesAt === null ||
      closesAt > now
    )
  );
}

export async function getUnreadOpenPollIds(
  userId: string,
): Promise<string[]> {
  const [
    viewer,
    pollsResult,
    readsResult,
  ] = await Promise.all([
    getPollViewer(userId),

    createAdminClient()
      .from("polls")
      .select(`
        id,
        status,
        opens_at,
        closes_at,
        poll_targets(
          target_type,
          target_id
        )
      `)
      .eq("status", "open"),

    createAdminClient()
      .from("poll_reads")
      .select("poll_id")
      .eq("user_id", userId),
  ]);

  if (pollsResult.error) {
    throw new Error(
      `Unable to load open Polls: ${pollsResult.error.message}`,
    );
  }

  if (readsResult.error) {
    throw new Error(
      `Unable to load Poll seen state: ${readsResult.error.message}`,
    );
  }

  const seen =
    new Set(
      (readsResult.data ?? [])
        .map(
          (row) =>
            row.poll_id,
        )
        .filter(
          (value): value is string =>
            typeof value === "string",
        ),
    );

  return (
    (
      pollsResult.data ??
      []
    ) as unknown as
      PollUnreadRow[]
  )
    .filter(
      (poll) =>
        isOpenNow(poll) &&
        canViewPoll(
          viewer,
          poll.poll_targets ??
            [],
        ) &&
        !seen.has(poll.id),
    )
    .map((poll) => poll.id);
}

export async function markPollSeen(
  userId: string,
  pollId: string,
) {
  const viewer =
    await getPollViewer(userId);

  const admin =
    createAdminClient();

  const {
    data: poll,
    error,
  } = await admin
    .from("polls")
    .select(`
      id,
      status,
      opens_at,
      closes_at,
      poll_targets(
        target_type,
        target_id
      )
    `)
    .eq("id", pollId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load Poll: ${error.message}`,
    );
  }

  if (!poll) {
    return false;
  }

  const typedPoll =
    poll as unknown as
      PollUnreadRow;

  if (
    !isOpenNow(
      typedPoll,
    ) ||
    !canViewPoll(
      viewer,
      typedPoll.poll_targets ??
        [],
    )
  ) {
    return false;
  }

  const {
    error: readError,
  } = await admin
    .from("poll_reads")
    .upsert(
      {
        user_id: userId,
        poll_id: pollId,
        seen_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "user_id,poll_id",
      },
    );

  if (readError) {
    throw new Error(
      `Unable to mark Poll as seen: ${readError.message}`,
    );
  }

  return true;
}
