"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPollNotification } from "@/lib/polls/notifications";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(
  formData: FormData,
  name: string,
  required = true,
) {
  const raw =
    formData.get(name);

  const value =
    typeof raw === "string"
      ? raw.trim()
      : "";

  if (
    required &&
    !value
  ) {
    throw new Error(
      `${name} is required.`,
    );
  }

  return value || null;
}

function uuid(
  value: string | null,
  label: string,
) {
  if (
    !value ||
    !UUID_RE.test(value)
  ) {
    throw new Error(
      `${label} is invalid.`,
    );
  }

  return value;
}

function audience(
  formData: FormData,
) {
  const targetType =
    String(
      text(
        formData,
        "targetType",
      ),
    );

  const allowed = [
    "global",
    "staff",
    "user",
    "character",
    "ancestry",
    "association",
    "order",
  ];

  if (
    !allowed.includes(
      targetType,
    )
  ) {
    throw new Error(
      "Audience is invalid.",
    );
  }

  if (
    targetType ===
      "global" ||
    targetType ===
      "staff"
  ) {
    return {
      targetType,
      targetId: null,
    };
  }

  const fields: Record<
    string,
    {
      field: string;
      label: string;
    }
  > = {
    character: {
      field:
        "characterTargetId",
      label: "Character",
    },
    ancestry: {
      field:
        "ancestryTargetId",
      label: "Ancestry",
    },
    association: {
      field:
        "associationTargetId",
      label: "Association",
    },
    order: {
      field:
        "orderTargetId",
      label: "Order",
    },
    user: {
      field:
        "userTargetId",
      label: "User",
    },
  };

  const definition =
    fields[targetType];

  return {
    targetType,
    targetId: uuid(
      text(
        formData,
        definition.field,
        false,
      ),
      definition.label,
    ),
  };
}

function parseCloseAt(
  value: string | null,
) {
  if (!value) return null;

  const parsed =
    new Date(
      /(?:Z|[+-]\d\d:\d\d)$/.test(
        value,
      )
        ? value
        : `${value}:00Z`,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    throw new Error(
      "Closing date is invalid.",
    );
  }

  return parsed.toISOString();
}

function refresh() {
  revalidatePath(
    "/admin/polls",
  );
  revalidatePath("/polls");
  revalidatePath(
    "/",
    "layout",
  );
}

export async function createPoll(
  formData: FormData,
) {
  const staff =
    await requireAdminSection(
      "polls",
    );

  const admin =
    createAdminClient();

  const options =
    String(
      text(
        formData,
        "options",
      ),
    )
      .split(/\r?\n/)
      .map((value) =>
        value.trim(),
      )
      .filter(Boolean);

  if (
    options.length < 2
  ) {
    throw new Error(
      "A poll needs at least two options.",
    );
  }

  if (
    options.length > 20
  ) {
    throw new Error(
      "A poll can have at most 20 options.",
    );
  }

  if (
    new Set(
      options.map((value) =>
        value.toLocaleLowerCase(),
      ),
    ).size !==
    options.length
  ) {
    throw new Error(
      "Poll options must be unique.",
    );
  }

  const selectionMode =
    String(
      text(
        formData,
        "selectionMode",
      ),
    );

  if (
    ![
      "single",
      "multiple",
    ].includes(selectionMode)
  ) {
    throw new Error(
      "Selection mode is invalid.",
    );
  }

  const rawMaximum =
    Number.parseInt(
      String(
        formData.get(
          "maxChoices",
        ) ?? "1",
      ),
      10,
    );

  const maxChoices =
    selectionMode === "single"
      ? 1
      : Math.max(
          1,
          Math.min(
            options.length,
            Number.isFinite(
              rawMaximum,
            )
              ? rawMaximum
              : 1,
          ),
        );

  const resultsVisibility =
    String(
      text(
        formData,
        "resultsVisibility",
      ),
    );

  if (
    ![
      "live",
      "after_vote",
      "after_close",
      "staff_only",
    ].includes(
      resultsVisibility,
    )
  ) {
    throw new Error(
      "Results visibility is invalid.",
    );
  }

  const target =
    audience(formData);

  const closesAt =
    parseCloseAt(
      text(
        formData,
        "closesAt",
        false,
      ),
    );

  const {
    data: poll,
    error,
  } = await admin
    .from("polls")
    .insert({
      title: text(
        formData,
        "title",
      ),
      description:
        text(
          formData,
          "description",
          false,
        ) ?? "",
      status: "draft",
      selection_mode:
        selectionMode,
      max_choices:
        maxChoices,
      allow_vote_change:
        formData.get(
          "allowVoteChange",
        ) === "on",
      is_anonymous:
        formData.get(
          "isAnonymous",
        ) === "on",
      results_visibility:
        resultsVisibility,
      closes_at:
        closesAt,
      created_by:
        staff.userId,
    })
    .select("id")
    .single();

  if (
    error ||
    !poll
  ) {
    throw new Error(
      `Unable to create poll: ${error?.message ?? "Unknown error"}`,
    );
  }

  const {
    error: optionError,
  } = await admin
    .from("poll_options")
    .insert(
      options.map(
        (label, index) => ({
          poll_id: poll.id,
          label,
          sort_order:
            index,
        }),
      ),
    );

  if (optionError) {
    await admin
      .from("polls")
      .delete()
      .eq("id", poll.id);

    throw new Error(
      `Unable to create poll options: ${optionError.message}`,
    );
  }

  const {
    error: targetError,
  } = await admin
    .from("poll_targets")
    .insert({
      poll_id: poll.id,
      target_type:
        target.targetType,
      target_id:
        target.targetId,
    });

  if (targetError) {
    await admin
      .from("polls")
      .delete()
      .eq("id", poll.id);

    throw new Error(
      `Unable to create poll audience: ${targetError.message}`,
    );
  }

  refresh();
}

export async function openPoll(
  formData: FormData,
) {
  const staff =
    await requireAdminSection(
      "polls",
    );

  const pollId =
    uuid(
      text(
        formData,
        "pollId",
      ),
      "Poll",
    );

  const admin =
    createAdminClient();

  const {
    data: poll,
    error,
  } = await admin
    .from("polls")
    .select(`
      id,
      title,
      status,
      closes_at,
      poll_targets(
        target_type,
        target_id
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
    poll.status !==
    "draft"
  ) {
    throw new Error(
      "Only draft polls can be opened.",
    );
  }

  const now =
    new Date();

  if (
    poll.closes_at &&
    new Date(
      poll.closes_at,
    ).getTime() <=
      now.getTime()
  ) {
    throw new Error(
      "The poll closing date is already in the past.",
    );
  }

  const { error: updateError } =
    await admin
      .from("polls")
      .update({
        status: "open",
        opens_at:
          now.toISOString(),
        updated_at:
          now.toISOString(),
      })
      .eq("id", pollId);

  if (updateError) {
    throw new Error(
      `Unable to open poll: ${updateError.message}`,
    );
  }

  await createPollNotification(
    poll,
    "opened",
    staff.userId,
  );

  refresh();
}

export async function closePoll(
  formData: FormData,
) {
  const staff =
    await requireAdminSection(
      "polls",
    );

  const pollId =
    uuid(
      text(
        formData,
        "pollId",
      ),
      "Poll",
    );

  const admin =
    createAdminClient();

  const {
    data: poll,
    error,
  } = await admin
    .from("polls")
    .select(`
      id,
      title,
      status,
      closes_at,
      poll_targets(
        target_type,
        target_id
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
    poll.status !==
    "open"
  ) {
    throw new Error(
      "Only open polls can be closed.",
    );
  }

  const now =
    new Date().toISOString();

  const { error: updateError } =
    await admin
      .from("polls")
      .update({
        status: "closed",
        closed_at: now,
        updated_at: now,
      })
      .eq("id", pollId);

  if (updateError) {
    throw new Error(
      `Unable to close poll: ${updateError.message}`,
    );
  }

  await createPollNotification(
    poll,
    "closed",
    staff.userId,
  );

  refresh();
}

export async function reopenPoll(
  formData: FormData,
) {
  const staff =
    await requireAdminSection(
      "polls",
    );

  const pollId =
    uuid(
      text(
        formData,
        "pollId",
      ),
      "Poll",
    );

  const admin =
    createAdminClient();

  const {
    data: poll,
    error,
  } = await admin
    .from("polls")
    .select(`
      id,
      title,
      status,
      closes_at,
      poll_targets(
        target_type,
        target_id
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
    poll.status !==
    "closed"
  ) {
    throw new Error(
      "Only closed polls can be reopened.",
    );
  }

  const now =
    new Date();

  const oldCloseAt =
    poll.closes_at
      ? new Date(
          poll.closes_at,
        ).getTime()
      : null;

  const nextCloseAt =
    oldCloseAt !== null &&
    oldCloseAt <=
      now.getTime()
      ? null
      : poll.closes_at;

  /*
   * A reopened Poll begins a fresh notification cycle.
   * Remove old opened/closed notices for this Poll before
   * creating the new opened notice.
   */
  const {
    error: notificationDeleteError,
  } = await admin
    .from("notifications")
    .delete()
    .eq("source_type", "poll")
    .eq("source_id", pollId);

  if (
    notificationDeleteError
  ) {
    throw new Error(
      `Unable to reset Poll notifications: ${notificationDeleteError.message}`,
    );
  }

  const {
    error: updateError,
  } = await admin
    .from("polls")
    .update({
      status: "open",
      opens_at:
        now.toISOString(),
      closes_at:
        nextCloseAt,
      closed_at: null,
      updated_at:
        now.toISOString(),
    })
    .eq("id", pollId);

  if (updateError) {
    throw new Error(
      `Unable to reopen Poll: ${updateError.message}`,
    );
  }

  await createPollNotification(
    {
      ...poll,
      closes_at:
        nextCloseAt,
    },
    "opened",
    staff.userId,
  );

  refresh();
}

export async function deletePoll(
  formData: FormData,
) {
  await requireAdminSection(
    "polls",
  );

  const pollId =
    uuid(
      text(
        formData,
        "pollId",
      ),
      "Poll",
    );

  const admin =
    createAdminClient();

  const {
    data: poll,
    error: loadError,
  } = await admin
    .from("polls")
    .select("status")
    .eq("id", pollId)
    .single();

  if (
    loadError ||
    !poll
  ) {
    throw new Error(
      "Poll was not found.",
    );
  }

  /*
   * Deleted Polls must disappear from the notification panel.
   * Closed Polls remain untouched; only deletion removes notices.
   */
  const {
    error: notificationDeleteError,
  } = await admin
    .from("notifications")
    .delete()
    .eq("source_type", "poll")
    .eq("source_id", pollId);

  if (
    notificationDeleteError
  ) {
    throw new Error(
      `Unable to delete Poll notifications: ${notificationDeleteError.message}`,
    );
  }

  const { error } =
    await admin
      .from("polls")
      .delete()
      .eq("id", pollId);

  if (error) {
    throw new Error(
      `Unable to delete poll: ${error.message}`,
    );
  }

  refresh();
}
