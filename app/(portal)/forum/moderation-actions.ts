"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  resolveActorCharacterId,
  sendForumNotification,
} from "@/lib/forum/forum-notifications";

export type ForumModerationState = {
  success: boolean;
  message: string;
};

type ForumTopicRecord = {
  id: string;
  section_id: string;
  title: string;
  slug: string;
  author_character_id: string | null;
  is_locked: boolean;
  is_pinned: boolean;
  deleted_at: string | null;
};

type ForumSectionRecord = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

function readText(
  formData: FormData,
  key: string,
  maximumLength = 500,
): string {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maximumLength);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function requireStaff() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      user: null,
      isStaff: false,
      error: "You must be signed in.",
    };
  }

  const {
    data: staffResult,
    error: staffError,
  } = await supabase.rpc(
    "current_user_is_staff",
  );

  if (staffError || staffResult !== true) {
    return {
      supabase,
      user,
      isStaff: false,
      error:
        "You do not have permission to moderate the forum.",
    };
  }

  return {
    supabase,
    user,
    isStaff: true,
    error: null,
  };
}

async function loadTopicContext(
  topicId: string,
) {
  const supabase = await createClient();

  const {
    data: topic,
    error: topicError,
  } = await supabase
    .from("forum_topics")
    .select(
      `
        id,
        section_id,
        title,
        slug,
        author_character_id,
        is_locked,
        is_pinned,
        deleted_at
      `,
    )
    .eq("id", topicId)
    .maybeSingle<ForumTopicRecord>();

  if (topicError || !topic) {
    return {
      topic: null,
      section: null,
      error:
        topicError?.message ??
        "The selected discussion does not exist.",
    };
  }

  const {
    data: section,
    error: sectionError,
  } = await supabase
    .from("forum_sections")
    .select(
      `
        id,
        name,
        slug,
        is_active
      `,
    )
    .eq("id", topic.section_id)
    .maybeSingle<ForumSectionRecord>();

  if (sectionError || !section) {
    return {
      topic,
      section: null,
      error:
        sectionError?.message ??
        "The discussion section does not exist.",
    };
  }

  return {
    topic,
    section,
    error: null,
  };
}

async function writeModerationLog({
  moderatorUserId,
  topicId,
  postId = null,
  action,
  details = null,
}: {
  moderatorUserId: string;
  topicId: string;
  postId?: string | null;
  action: string;
  details?: Record<string, unknown> | null;
}): Promise<string | null> {
  const supabase =
    await createClient();

  const { error } =
    await supabase
      .from("forum_moderation_log")
      .insert({
        moderator_user_id:
          moderatorUserId,
        topic_id: topicId,
        post_id: postId,
        action,
        details,
      });

  if (error) {
    console.error(
      "Unable to write forum moderation log:",
      error.message,
    );

    return error.message;
  }

  return null;
}

function revalidateForumTopic(
  sectionSlug: string,
  topicSlug: string,
) {
  revalidatePath("/forum");
  revalidatePath(
    `/forum/${sectionSlug}`,
  );
  revalidatePath(
    `/forum/${sectionSlug}/${topicSlug}`,
  );
}

async function notifyTopicAuthor({
  supabase,
  moderatorUserId,
  topic,
  heading,
  message,
  href,
  linkLabel,
}: {
  supabase: Awaited<
    ReturnType<typeof createClient>
  >;
  moderatorUserId: string;
  topic: ForumTopicRecord;
  heading: string;
  message: string;
  href: string;
  linkLabel: string;
}) {
  if (
    !topic.author_character_id
  ) {
    return;
  }

  const actorCharacterId =
    await resolveActorCharacterId(
      supabase,
      moderatorUserId,
    );

  if (!actorCharacterId) {
    return;
  }

  await sendForumNotification({
    supabase,
    actorCharacterId,
    recipientCharacterId:
      topic.author_character_id,
    heading,
    message,
    href,
    linkLabel,
  });

  revalidatePath("/messages");
}

export async function toggleTopicLockAction(
  _previousState: ForumModerationState,
  formData: FormData,
): Promise<ForumModerationState> {
  const topicId = readText(
    formData,
    "topicId",
    100,
  );

  if (!isUuid(topicId)) {
    return {
      success: false,
      message:
        "The selected discussion is invalid.",
    };
  }

  const access = await requireStaff();

  if (
    !access.user ||
    !access.isStaff
  ) {
    return {
      success: false,
      message:
        access.error ??
        "Permission denied.",
    };
  }

  const {
    topic,
    section,
    error,
  } = await loadTopicContext(topicId);

  if (!topic || !section || error) {
    return {
      success: false,
      message:
        error ??
        "The discussion could not be loaded.",
    };
  }

  if (topic.deleted_at) {
    return {
      success: false,
      message:
        "A deleted discussion cannot be locked or unlocked.",
    };
  }

  const nextLockedState =
    !topic.is_locked;

  const { error: updateError } =
    await access.supabase
      .from("forum_topics")
      .update({
        is_locked: nextLockedState,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", topic.id);

  if (updateError) {
    return {
      success: false,
      message: updateError.message,
    };
  }

  await writeModerationLog({
    moderatorUserId:
      access.user.id,
    topicId: topic.id,
    action: nextLockedState
      ? "topic_locked"
      : "topic_unlocked",
    details: {
      title: topic.title,
      section_id: section.id,
    },
  });

  await notifyTopicAuthor({
    supabase:
      access.supabase,
    moderatorUserId:
      access.user.id,
    topic,
    heading:
      nextLockedState
        ? "Your forum topic was locked"
        : "Your forum topic was unlocked",
    message:
      nextLockedState
        ? `Staff locked “${topic.title}”.`
        : `Staff unlocked “${topic.title}”.`,
    href:
      `/forum/${encodeURIComponent(
        section.slug,
      )}/${encodeURIComponent(
        topic.slug,
      )}`,
    linkLabel:
      "Open topic",
  });

  revalidateForumTopic(
    section.slug,
    topic.slug,
  );

  return {
    success: true,
    message: nextLockedState
      ? "Discussion locked."
      : "Discussion unlocked.",
  };
}

export async function toggleTopicPinAction(
  _previousState: ForumModerationState,
  formData: FormData,
): Promise<ForumModerationState> {
  const topicId = readText(
    formData,
    "topicId",
    100,
  );

  if (!isUuid(topicId)) {
    return {
      success: false,
      message:
        "The selected discussion is invalid.",
    };
  }

  const access = await requireStaff();

  if (
    !access.user ||
    !access.isStaff
  ) {
    return {
      success: false,
      message:
        access.error ??
        "Permission denied.",
    };
  }

  const {
    topic,
    section,
    error,
  } = await loadTopicContext(topicId);

  if (!topic || !section || error) {
    return {
      success: false,
      message:
        error ??
        "The discussion could not be loaded.",
    };
  }

  if (topic.deleted_at) {
    return {
      success: false,
      message:
        "A deleted discussion cannot be pinned or unpinned.",
    };
  }

  const nextPinnedState =
    !topic.is_pinned;

  const { error: updateError } =
    await access.supabase
      .from("forum_topics")
      .update({
        is_pinned: nextPinnedState,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", topic.id);

  if (updateError) {
    return {
      success: false,
      message: updateError.message,
    };
  }

  await writeModerationLog({
    moderatorUserId:
      access.user.id,
    topicId: topic.id,
    action: nextPinnedState
      ? "topic_pinned"
      : "topic_unpinned",
    details: {
      title: topic.title,
      section_id: section.id,
    },
  });

  await notifyTopicAuthor({
    supabase:
      access.supabase,
    moderatorUserId:
      access.user.id,
    topic,
    heading:
      nextPinnedState
        ? "Your forum topic was pinned"
        : "Your forum topic was unpinned",
    message:
      nextPinnedState
        ? `Staff pinned “${topic.title}”.`
        : `Staff unpinned “${topic.title}”.`,
    href:
      `/forum/${encodeURIComponent(
        section.slug,
      )}/${encodeURIComponent(
        topic.slug,
      )}`,
    linkLabel:
      "Open topic",
  });

  revalidateForumTopic(
    section.slug,
    topic.slug,
  );

  return {
    success: true,
    message: nextPinnedState
      ? "Discussion pinned."
      : "Discussion unpinned.",
  };
}

export async function moveTopicAction(
  _previousState: ForumModerationState,
  formData: FormData,
): Promise<ForumModerationState> {
  const topicId = readText(
    formData,
    "topicId",
    100,
  );

  const destinationSectionId =
    readText(
      formData,
      "destinationSectionId",
      100,
    );

  if (
    !isUuid(topicId) ||
    !isUuid(destinationSectionId)
  ) {
    return {
      success: false,
      message:
        "The selected discussion or destination section is invalid.",
    };
  }

  const access = await requireStaff();

  if (
    !access.user ||
    !access.isStaff
  ) {
    return {
      success: false,
      message:
        access.error ??
        "Permission denied.",
    };
  }

  const {
    topic,
    section: currentSection,
    error,
  } = await loadTopicContext(topicId);

  if (
    !topic ||
    !currentSection ||
    error
  ) {
    return {
      success: false,
      message:
        error ??
        "The discussion could not be loaded.",
    };
  }

  if (topic.deleted_at) {
    return {
      success: false,
      message:
        "A deleted discussion cannot be moved.",
    };
  }

  if (
    destinationSectionId ===
    currentSection.id
  ) {
    return {
      success: false,
      message:
        "The discussion is already in this section.",
    };
  }

  const {
    data: destinationSection,
    error: destinationError,
  } = await access.supabase
    .from("forum_sections")
    .select(
      `
        id,
        name,
        slug,
        is_active
      `,
    )
    .eq(
      "id",
      destinationSectionId,
    )
    .maybeSingle<ForumSectionRecord>();

  if (
    destinationError ||
    !destinationSection ||
    !destinationSection.is_active
  ) {
    return {
      success: false,
      message:
        destinationError?.message ??
        "The destination section is unavailable.",
    };
  }

  const { error: updateError } =
    await access.supabase
      .from("forum_topics")
      .update({
        section_id:
          destinationSection.id,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", topic.id);

  if (updateError) {
    return {
      success: false,
      message: updateError.message,
    };
  }

  await writeModerationLog({
    moderatorUserId:
      access.user.id,
    topicId: topic.id,
    action: "topic_moved",
    details: {
      title: topic.title,
      from_section_id:
        currentSection.id,
      from_section_name:
        currentSection.name,
      to_section_id:
        destinationSection.id,
      to_section_name:
        destinationSection.name,
    },
  });

  await notifyTopicAuthor({
    supabase:
      access.supabase,
    moderatorUserId:
      access.user.id,
    topic,
    heading:
      "Your forum topic was moved",
    message:
      `Staff moved “${topic.title}” from ${currentSection.name} to ${destinationSection.name}.`,
    href:
      `/forum/${encodeURIComponent(
        destinationSection.slug,
      )}/${encodeURIComponent(
        topic.slug,
      )}`,
    linkLabel:
      "Open moved topic",
  });

  revalidatePath("/forum");
  revalidatePath(
    `/forum/${currentSection.slug}`,
  );
  revalidatePath(
    `/forum/${destinationSection.slug}`,
  );
  revalidatePath(
    `/forum/${destinationSection.slug}/${topic.slug}`,
  );

  redirect(
    `/forum/${destinationSection.slug}/${topic.slug}`,
  );
}

export async function deleteTopicAction(
  _previousState: ForumModerationState,
  formData: FormData,
): Promise<ForumModerationState> {
  const topicId = readText(
    formData,
    "topicId",
    100,
  );

  const reason = readText(
    formData,
    "reason",
    1_000,
  );

  if (!isUuid(topicId)) {
    return {
      success: false,
      message:
        "The selected discussion is invalid.",
    };
  }

  const access =
    await requireStaff();

  if (
    !access.user ||
    !access.isStaff
  ) {
    return {
      success: false,
      message:
        access.error ??
        "Permission denied.",
    };
  }

  const {
    topic,
    section,
    error,
  } = await loadTopicContext(
    topicId,
  );

  if (
    !topic ||
    !section ||
    error
  ) {
    return {
      success: false,
      message:
        error ??
        "The discussion could not be loaded.",
    };
  }

  if (topic.deleted_at) {
    return {
      success: false,
      message:
        "This discussion has already been deleted.",
    };
  }

  const deletedAt =
    new Date().toISOString();

  const { error: topicError } =
    await access.supabase
      .from("forum_topics")
      .update({
        deleted_at: deletedAt,
        updated_at: deletedAt,
      })
      .eq("id", topic.id);

  if (topicError) {
    return {
      success: false,
      message: topicError.message,
    };
  }

  /*
   * Soft-delete every post in the topic.
   *
   * The database trigger you already fixed
   * now preserves every post body.
   */
  const { error: postsError } =
    await access.supabase
      .from("forum_posts")
      .update({
        deleted_at: deletedAt,
      })
      .eq("topic_id", topic.id)
      .is("deleted_at", null);

  if (postsError) {
    await access.supabase
      .from("forum_topics")
      .update({
        deleted_at: null,
      })
      .eq("id", topic.id);

    return {
      success: false,
      message:
        `The discussion could not be fully deleted: ${postsError.message}`,
    };
  }

  const logError =
    await writeModerationLog({
      moderatorUserId:
        access.user.id,
      topicId: topic.id,
      action: "delete_topic",
      details: {
        title: topic.title,
        section_id:
          section.id,
        section_name:
          section.name,
        reason:
          reason || null,
      },
    });

  if (logError) {
    /*
     * Roll everything back if the audit
     * record cannot be written.
     */
    await access.supabase
      .from("forum_topics")
      .update({
        deleted_at: null,
      })
      .eq("id", topic.id);

    await access.supabase
      .from("forum_posts")
      .update({
        deleted_at: null,
      })
      .eq("topic_id", topic.id)
      .eq(
        "deleted_at",
        deletedAt,
      );

    return {
      success: false,
      message:
        `The moderation log could not be written, so the discussion was not deleted: ${logError}`,
    };
  }

  await notifyTopicAuthor({
    supabase:
      access.supabase,
    moderatorUserId:
      access.user.id,
    topic,
    heading:
      "Your forum topic was moderated",
    message:
      reason
        ? `Staff removed “${topic.title}”. Reason: ${reason}`
        : `Staff removed “${topic.title}”.`,
    href:
      `/forum/${encodeURIComponent(
        section.slug,
      )}`,
    linkLabel:
      "Open forum section",
  });

  revalidatePath("/forum");
  revalidatePath(
    `/forum/${section.slug}`,
  );
  revalidatePath(
    "/admin/forum/topics",
  );
  revalidatePath(
    "/admin/forum/moderation",
  );

  redirect(
    `/forum/${section.slug}`,
  );
}

export async function restoreTopicAction(
  formData: FormData,
): Promise<void> {
  const topicId = readText(
    formData,
    "topicId",
    100,
  );

  const reason = readText(
    formData,
    "reason",
    1_000,
  );

  const returnTo = readText(
    formData,
    "returnTo",
    1200,
  );

  if (!isUuid(topicId)) {
    redirect(
      "/admin/forum/topics?status=deleted&error=Invalid%20discussion.",
    );
  }

  const access =
    await requireStaff();

  if (
    !access.user ||
    !access.isStaff
  ) {
    redirect(
      "/admin/forum/topics?status=deleted&error=Permission%20denied.",
    );
  }

  const {
    topic,
    section,
    error,
  } = await loadTopicContext(
    topicId,
  );

  if (
    !topic ||
    !section ||
    error
  ) {
    redirect(
      "/admin/forum/topics?status=deleted&error=Unable%20to%20load%20discussion.",
    );
  }

  if (!topic.deleted_at) {
    redirect(
      "/admin/forum/topics?status=deleted&error=Discussion%20is%20not%20deleted.",
    );
  }

  const originalDeletedAt =
    topic.deleted_at;

  const { error: topicError } =
    await access.supabase
      .from("forum_topics")
      .update({
        deleted_at: null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", topic.id);

  if (topicError) {
    redirect(
      `/admin/forum/topics?status=deleted&error=${encodeURIComponent(
        topicError.message,
      )}`,
    );
  }

  /*
   * Restore only posts that were deleted
   * as part of this topic deletion.
   *
   * This avoids accidentally restoring a
   * reply that had already been moderated
   * before the topic itself was removed.
   */
  const { error: postsError } =
    await access.supabase
      .from("forum_posts")
      .update({
        deleted_at: null,
      })
      .eq("topic_id", topic.id)
      .eq(
        "deleted_at",
        originalDeletedAt,
      );

  if (postsError) {
    await access.supabase
      .from("forum_topics")
      .update({
        deleted_at:
          originalDeletedAt,
      })
      .eq("id", topic.id);

    redirect(
      `/admin/forum/topics?status=deleted&error=${encodeURIComponent(
        postsError.message,
      )}`,
    );
  }

  const logError =
    await writeModerationLog({
      moderatorUserId:
        access.user.id,
      topicId: topic.id,
      action: "restore_topic",
      details: {
        title: topic.title,
        section_id:
          section.id,
        section_name:
          section.name,
        reason:
          reason || null,
      },
    });

  if (logError) {
    redirect(
      `/admin/forum/topics?status=deleted&error=${encodeURIComponent(
        `The topic was restored, but the moderation log could not be written: ${logError}`,
      )}`,
    );
  }

  await notifyTopicAuthor({
    supabase:
      access.supabase,
    moderatorUserId:
      access.user.id,
    topic,
    heading:
      "Your forum topic was restored",
    message:
      reason
        ? `Staff restored “${topic.title}”. Note: ${reason}`
        : `Staff restored “${topic.title}”.`,
    href:
      `/forum/${encodeURIComponent(
        section.slug,
      )}/${encodeURIComponent(
        topic.slug,
      )}`,
    linkLabel:
      "Open restored topic",
  });

  revalidateForumTopic(
    section.slug,
    topic.slug,
  );

  revalidatePath(
    "/admin/forum/topics",
  );

  revalidatePath(
    "/admin/forum/moderation",
  );

  const destination =
    returnTo.startsWith(
      "/admin/forum/topics",
    )
      ? returnTo
      : "/admin/forum/topics?status=deleted";

  const separator =
    destination.includes("?")
      ? "&"
      : "?";

  redirect(
    `${destination}${separator}success=${encodeURIComponent(
      `“${topic.title}” has been restored.`,
    )}`,
  );
}