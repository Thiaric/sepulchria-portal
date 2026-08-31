"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canViewPoll,
  getPollViewer,
} from "@/lib/polls/access";
import { closeExpiredPolls } from "@/lib/polls/lifecycle";

function selectedOptionIds(
  formData: FormData,
): string[] {
  return Array.from(
    new Set(
      formData
        .getAll("optionId")
        .filter(
          (value): value is string =>
            typeof value === "string" &&
            value.length > 0,
        ),
    ),
  );
}

export async function submitPollVote(
  formData: FormData,
) {
  await closeExpiredPolls();

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "You must be signed in.",
    );
  }

  const viewer =
    await getPollViewer(user.id);

  if (!viewer.characterId) {
    throw new Error(
      "A character is required to vote.",
    );
  }

  const pollId =
    String(
      formData.get("pollId") ??
        "",
    ).trim();

  if (!pollId) {
    throw new Error(
      "Poll is required.",
    );
  }

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
      selection_mode,
      max_choices,
      allow_vote_change,
      opens_at,
      closes_at,
      poll_targets(
        target_type,
        target_id
      ),
      poll_options(
        id
      )
    `)
    .eq("id", pollId)
    .single();

  if (
    error ||
    !poll
  ) {
    throw new Error(
      "Poll was not found.",
    );
  }

  if (
    !canViewPoll(
      viewer,
      poll.poll_targets ?? [],
    )
  ) {
    throw new Error(
      "You are not eligible for this poll.",
    );
  }

  const now =
    Date.now();

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

  if (
    poll.status !== "open" ||
    opensAt > now ||
    (
      closesAt !== null &&
      closesAt <= now
    )
  ) {
    throw new Error(
      "This poll is not open.",
    );
  }

  const optionIds =
    selectedOptionIds(
      formData,
    );

  const allowedIds =
    new Set(
      (
        poll.poll_options ??
        []
      ).map(
        (option) => option.id,
      ),
    );

  if (
    optionIds.length < 1 ||
    optionIds.some(
      (id) =>
        !allowedIds.has(id),
    )
  ) {
    throw new Error(
      "Choose a valid poll option.",
    );
  }

  const maximum =
    poll.selection_mode ===
    "single"
      ? 1
      : poll.max_choices;

  if (
    optionIds.length > maximum
  ) {
    throw new Error(
      `Choose no more than ${maximum} option${maximum === 1 ? "" : "s"}.`,
    );
  }

  const {
    data: existing,
    error: existingError,
  } = await admin
    .from("poll_ballots")
    .select("id")
    .eq("poll_id", pollId)
    .eq(
      "character_id",
      viewer.characterId,
    )
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Unable to check your vote: ${existingError.message}`,
    );
  }

  if (
    existing &&
    !poll.allow_vote_change
  ) {
    throw new Error(
      "This poll does not allow changing your vote.",
    );
  }

  let ballotId =
    existing?.id ?? null;

  if (!ballotId) {
    const {
      data: created,
      error: createError,
    } = await admin
      .from("poll_ballots")
      .insert({
        poll_id: pollId,
        character_id:
          viewer.characterId,
      })
      .select("id")
      .single();

    if (
      createError ||
      !created
    ) {
      throw new Error(
        `Unable to create ballot: ${createError?.message ?? "Unknown error"}`,
      );
    }

    ballotId =
      created.id;
  } else {
    const { error: touchError } =
      await admin
        .from("poll_ballots")
        .update({
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", ballotId);

    if (touchError) {
      throw new Error(
        `Unable to update ballot: ${touchError.message}`,
      );
    }
  }

  const { error: clearError } =
    await admin
      .from(
        "poll_ballot_choices",
      )
      .delete()
      .eq(
        "ballot_id",
        ballotId,
      );

  if (clearError) {
    throw new Error(
      `Unable to replace ballot choices: ${clearError.message}`,
    );
  }

  const {
    error: choiceError,
  } = await admin
    .from(
      "poll_ballot_choices",
    )
    .insert(
      optionIds.map(
        (optionId) => ({
          ballot_id:
            ballotId,
          option_id:
            optionId,
        }),
      ),
    );

  if (choiceError) {
    throw new Error(
      `Unable to save ballot choices: ${choiceError.message}`,
    );
  }

  revalidatePath("/polls");
  revalidatePath(
    "/",
    "layout",
  );
}
