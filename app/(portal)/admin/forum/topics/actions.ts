"use server";



import { redirect } from "next/navigation";
import {
  revalidatePath,
} from "next/cache";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

type PurgeResult = {
  topic_id?: string;
  topic_title?: string;
  topic_slug?: string;
  section_slug?: string;
  deleted_posts?: number;
};

function readText(
  formData: FormData,
  key: string,
  maximumLength: number,
): string {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maximumLength);
}

function readRequiredUuid(
  formData: FormData,
  key: string,
): string {
  const value = readText(
    formData,
    key,
    100,
  );

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(value)) {
    throw new Error(
      "The selected forum record is invalid.",
    );
  }

  return value;
}

function readReturnTo(
  formData: FormData,
  fallback: string,
): string {
  const value = readText(
    formData,
    "returnTo",
    1200,
  );

  if (
    value.startsWith(
      "/admin/forum/topics",
    ) ||
    value.startsWith(
      "/admin/forum/replies",
    )
  ) {
    return value;
  }

  return fallback;
}

function addMessage(
  path: string,
  key: "success" | "error",
  message: string,
): string {
  const url = new URL(
    path,
    "https://sepulchria.local",
  );

  url.searchParams.delete("success");
  url.searchParams.delete("error");
  url.searchParams.set(key, message);

  return `${url.pathname}${url.search}`;
}

async function requireForumPurgeRole(
  returnTo: string,
) {
  const staff = await requireAdminSection("forum");

  if (staff.role === "master") {
    redirect(
      addMessage(
        returnTo,
        "error",
        "Masters may moderate forum content, but only owners, administrators and moderators may permanently erase it.",
      ),
    );
  }

  return staff;
}

function revalidateForumManagement() {
  revalidatePath("/forum");
  revalidatePath("/forum", "layout");
  revalidatePath("/admin/forum");
  revalidatePath("/admin/forum/topics");
  revalidatePath("/admin/forum/replies");
  revalidatePath("/admin/forum/moderation");
}

export async function permanentlyDeleteForumTopicAction(
  formData: FormData,
) {
  const returnTo = readReturnTo(
    formData,
    "/admin/forum/topics?status=deleted",
  );

  await requireForumPurgeRole(returnTo);

  const topicId = readRequiredUuid(
    formData,
    "topicId",
  );

  const confirmation = readText(
    formData,
    "confirmation",
    500,
  );

  const supabase = await createClient();

  const {
    data: topic,
    error: topicError,
  } = await supabase
    .from("forum_topics")
    .select(
      "id, title, deleted_at",
    )
    .eq("id", topicId)
    .maybeSingle<{
      id: string;
      title: string;
      deleted_at: string | null;
    }>();

  if (topicError || !topic) {
    redirect(
      addMessage(
        returnTo,
        "error",
        topicError?.message ??
          "The discussion no longer exists.",
      ),
    );
  }

  if (!topic.deleted_at) {
    redirect(
      addMessage(
        returnTo,
        "error",
        "Only discussions that have already been deleted may be permanently erased.",
      ),
    );
  }

  if (confirmation !== topic.title) {
    redirect(
      addMessage(
        returnTo,
        "error",
        `Type the complete discussion title exactly as shown: “${topic.title}”.`,
      ),
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "permanently_delete_forum_topic",
    {
      target_topic_id: topicId,
    },
  );

  if (error) {
    redirect(
      addMessage(
        returnTo,
        "error",
        `Unable to permanently delete the discussion: ${error.message}`,
      ),
    );
  }

  const result =
    (data ?? {}) as PurgeResult;

  revalidateForumManagement();

  if (
    result.section_slug &&
    result.topic_slug
  ) {
    revalidatePath(
      `/forum/${result.section_slug}`,
    );

    revalidatePath(
      `/forum/${result.section_slug}/${result.topic_slug}`,
    );
  }

  const deletedPostCount =
    typeof result.deleted_posts ===
    "number"
      ? result.deleted_posts
      : 0;

  redirect(
    addMessage(
      returnTo,
      "success",
      `“${topic.title}” was permanently deleted together with ${deletedPostCount} forum ${deletedPostCount === 1 ? "post" : "posts"}.`,
    ),
  );
}

export async function permanentlyDeleteForumReplyAction(
  formData: FormData,
) {
  const returnTo = readReturnTo(
    formData,
    "/admin/forum/replies?status=deleted",
  );

  await requireForumPurgeRole(returnTo);

  const postId = readRequiredUuid(
    formData,
    "postId",
  );

  const confirmation = readText(
    formData,
    "confirmation",
    50,
  );

  if (confirmation !== "DELETE") {
    redirect(
      addMessage(
        returnTo,
        "error",
        "Type DELETE in capital letters to confirm permanent deletion of the reply.",
      ),
    );
  }

  const supabase = await createClient();

  const {
    data: post,
    error: postError,
  } = await supabase
    .from("forum_posts")
    .select(
      "id, deleted_at, is_initial",
    )
    .eq("id", postId)
    .maybeSingle<{
      id: string;
      deleted_at: string | null;
      is_initial: boolean;
    }>();

  if (postError || !post) {
    redirect(
      addMessage(
        returnTo,
        "error",
        postError?.message ??
          "The reply no longer exists.",
      ),
    );
  }

  if (post.is_initial) {
    redirect(
      addMessage(
        returnTo,
        "error",
        "The opening post must be permanently deleted from the Discussions page together with its entire topic.",
      ),
    );
  }

  if (!post.deleted_at) {
    redirect(
      addMessage(
        returnTo,
        "error",
        "Only replies that have already been deleted may be permanently erased.",
      ),
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "permanently_delete_forum_post",
    {
      target_post_id: postId,
    },
  );

  if (error) {
    redirect(
      addMessage(
        returnTo,
        "error",
        `Unable to permanently delete the reply: ${error.message}`,
      ),
    );
  }

  const result =
    (data ?? {}) as PurgeResult;

  revalidateForumManagement();

  if (
    result.section_slug &&
    result.topic_slug
  ) {
    revalidatePath(
      `/forum/${result.section_slug}`,
    );

    revalidatePath(
      `/forum/${result.section_slug}/${result.topic_slug}`,
    );
  }

  redirect(
    addMessage(
      returnTo,
      "success",
      "The selected reply was permanently deleted.",
    ),
  );
}
