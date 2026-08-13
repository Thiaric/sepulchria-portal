"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type PostModerationState = {
  success: boolean;
  message: string;
};

type ForumPostRecord = {
  id: string;
  topic_id: string;
  author_user_id: string | null;
  author_character_id: string | null;
  body: string;
  is_initial: boolean;
  deleted_at: string | null;
};

type ForumTopicRecord = {
  id: string;
  section_id: string;
  title: string;
  slug: string;
  deleted_at: string | null;
};

type ForumSectionRecord = {
  id: string;
  name: string;
  slug: string;
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
    error: authenticationError,
  } = await supabase.auth.getUser();

  if (authenticationError || !user) {
    return {
      supabase,
      user: null,
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
      error:
        "You do not have permission to moderate forum posts.",
    };
  }

  return {
    supabase,
    user,
    error: null,
  };
}

async function loadPostContext(postId: string) {
  const supabase = await createClient();

  const {
    data: post,
    error: postError,
  } = await supabase
    .from("forum_posts")
    .select(
      `
        id,
        topic_id,
        author_user_id,
        author_character_id,
        body,
        is_initial,
        deleted_at
      `,
    )
    .eq("id", postId)
    .maybeSingle<ForumPostRecord>();

  if (postError || !post) {
    return {
      post: null,
      topic: null,
      section: null,
      error:
        postError?.message ??
        "The selected post does not exist.",
    };
  }

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
        deleted_at
      `,
    )
    .eq("id", post.topic_id)
    .maybeSingle<ForumTopicRecord>();

  if (topicError || !topic) {
    return {
      post,
      topic: null,
      section: null,
      error:
        topicError?.message ??
        "The discussion containing this post does not exist.",
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
        slug
      `,
    )
    .eq("id", topic.section_id)
    .maybeSingle<ForumSectionRecord>();

  if (sectionError || !section) {
    return {
      post,
      topic,
      section: null,
      error:
        sectionError?.message ??
        "The section containing this post does not exist.",
    };
  }

  return {
    post,
    topic,
    section,
    error: null,
  };
}

async function writeModerationLog({
  moderatorUserId,
  topicId,
  postId,
  action,
  details,
}: {
  moderatorUserId: string;
  topicId: string;
  postId: string;
  action: string;
  details?: Record<string, unknown>;
}): Promise<string | null> {
  const supabase =
    await createClient();

  const { error } =
    await supabase
      .from(
        "forum_moderation_log",
      )
      .insert({
        moderator_user_id:
          moderatorUserId,
        topic_id: topicId,
        post_id: postId,
        action,
        details: details ?? null,
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

function revalidatePostPages(
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

export async function moderateDeletePostAction(
  _previousState: PostModerationState,
  formData: FormData,
): Promise<PostModerationState> {
  const postId = readText(
    formData,
    "postId",
    100,
  );

  const reason = readText(
    formData,
    "reason",
    1_000,
  );

  if (!postId || !isUuid(postId)) {
    return {
      success: false,
      message:
        "The selected post is invalid.",
    };
  }

  const access = await requireStaff();

  if (!access.user || access.error) {
    return {
      success: false,
      message:
        access.error ??
        "Permission denied.",
    };
  }

  const {
    post,
    topic,
    section,
    error: contextError,
  } = await loadPostContext(postId);

  if (
    contextError ||
    !post ||
    !topic ||
    !section
  ) {
    return {
      success: false,
      message:
        contextError ??
        "The post could not be loaded.",
    };
  }

  if (topic.deleted_at) {
    return {
      success: false,
      message:
        "Posts inside a deleted discussion cannot be moderated.",
    };
  }

  if (post.is_initial) {
    return {
      success: false,
      message:
        "The opening post cannot be removed separately. Use the topic moderation panel to delete the entire discussion.",
    };
  }

  if (post.deleted_at) {
    return {
      success: false,
      message:
        "This post has already been deleted.",
    };
  }

  const deletedAt =
    new Date().toISOString();

  const { error: updateError } =
    await access.supabase
      .from("forum_posts")
      .update({
        deleted_at: deletedAt,
      })
      .eq("id", post.id);

  if (updateError) {
    return {
      success: false,
      message: updateError.message,
    };
  }

  const logError =
  await writeModerationLog({
    moderatorUserId:
      access.user.id,
    topicId: topic.id,
    postId: post.id,
    action: "delete_post",
    details: {
      topic_title: topic.title,
      section_id: section.id,
      section_name:
        section.name,
      reason: reason || null,

      /*
       * Keep a recovery snapshot in
       * the moderation history too.
       */
      original_body: post.body,

      author_user_id:
        post.author_user_id,
      author_character_id:
        post.author_character_id,
    },
  });

if (logError) {
  /*
   * Moderation without an audit
   * record is not acceptable.
   * Undo the soft deletion.
   */
  await access.supabase
    .from("forum_posts")
    .update({
      deleted_at: null,
    })
    .eq("id", post.id);

  return {
    success: false,
    message:
      `The moderation log could not be written, so the post was not deleted: ${logError}`,
  };
}

  revalidatePostPages(
    section.slug,
    topic.slug,
  );

  return {
    success: true,
    message:
      "The post has been removed.",
  };
}

export async function restorePostAction(
  _previousState: PostModerationState,
  formData: FormData,
): Promise<PostModerationState> {
  const postId = readText(
    formData,
    "postId",
    100,
  );

  const reason = readText(
    formData,
    "reason",
    1_000,
  );

  if (!postId || !isUuid(postId)) {
    return {
      success: false,
      message:
        "The selected post is invalid.",
    };
  }

  const access = await requireStaff();

  if (!access.user || access.error) {
    return {
      success: false,
      message:
        access.error ??
        "Permission denied.",
    };
  }

  const {
    post,
    topic,
    section,
    error: contextError,
  } = await loadPostContext(postId);

  if (
    contextError ||
    !post ||
    !topic ||
    !section
  ) {
    return {
      success: false,
      message:
        contextError ??
        "The post could not be loaded.",
    };
  }

  if (topic.deleted_at) {
    return {
      success: false,
      message:
        "A post cannot be restored while its discussion remains deleted.",
    };
  }

  if (!post.deleted_at) {
    return {
      success: false,
      message:
        "This post is not deleted.",
    };
  }

  const { error: updateError } =
    await access.supabase
      .from("forum_posts")
      .update({
        deleted_at: null,
      })
      .eq("id", post.id);

  if (updateError) {
    return {
      success: false,
      message: updateError.message,
    };
  }

  const logError =
  await writeModerationLog({
    moderatorUserId:
      access.user.id,
    topicId: topic.id,
    postId: post.id,
    action: "restore_post",
    details: {
      topic_title: topic.title,
      section_id: section.id,
      section_name:
        section.name,
      reason: reason || null,
      author_user_id:
        post.author_user_id,
      author_character_id:
        post.author_character_id,
    },
  });

if (logError) {
  return {
    success: false,
    message:
      `The post was restored, but the moderation log could not be written: ${logError}`,
  };
}

  revalidatePostPages(
    section.slug,
    topic.slug,
  );

  return {
    success: true,
    message:
      "The post has been restored.",
  };
}