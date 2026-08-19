"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  richTextToPlainText,
  sanitizeRichHtml,
} from "@/lib/rich-text";
import { createClient } from "@/lib/supabase/server";
import {
  resolveActorCharacterId,
  sendForumNotification,
} from "@/lib/forum/forum-notifications";

const MAX_BODY_LENGTH = 50_000;
const MAX_BODY_HTML_LENGTH = 250_000;
const MAX_IMAGES = 8;
const MAX_IMAGE_URL_LENGTH = 2_000;

export type EditForumPostState = {
  success: boolean;
  message: string;
  fieldErrors?: {
    body?: string;
    imageUrls?: string;
  };
};

export type DeleteForumPostState = {
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
  slug: string;
  title: string;
  author_user_id: string | null;
  is_locked: boolean;
  deleted_at: string | null;
};

type ForumSectionRecord = {
  id: string;
  slug: string;
};

function readText(
  formData: FormData,
  key: string,
  maximumLength?: number,
): string {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim();

  if (
    typeof maximumLength === "number" &&
    normalized.length > maximumLength
  ) {
    return normalized.slice(0, maximumLength);
  }

  return normalized;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const parsedUrl = new URL(value);

    return (
      parsedUrl.protocol === "http:" ||
      parsedUrl.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function parseImageUrls(
  formData: FormData,
): {
  imageUrls: string[];
  error: string | null;
} {
  const rawValue = formData.get("imageUrls");

  if (
    rawValue === null ||
    rawValue === undefined ||
    rawValue === ""
  ) {
    return {
      imageUrls: [],
      error: null,
    };
  }

  if (typeof rawValue !== "string") {
    return {
      imageUrls: [],
      error: "The attached images are invalid.",
    };
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(rawValue);
  } catch {
    return {
      imageUrls: [],
      error: "The attached images could not be read.",
    };
  }

  if (!Array.isArray(parsedValue)) {
    return {
      imageUrls: [],
      error: "The attached images are invalid.",
    };
  }

  const normalizedUrls = parsedValue
    .filter(
      (value): value is string =>
        typeof value === "string",
    )
    .map((value) => value.trim())
    .filter(Boolean);

  const uniqueUrls = Array.from(
    new Set(normalizedUrls),
  );

  if (uniqueUrls.length > MAX_IMAGES) {
    return {
      imageUrls: [],
      error: `You may attach a maximum of ${MAX_IMAGES} images.`,
    };
  }

  const invalidUrl = uniqueUrls.find(
    (url) =>
      url.length > MAX_IMAGE_URL_LENGTH ||
      !isSafeHttpUrl(url),
  );

  if (invalidUrl) {
    return {
      imageUrls: [],
      error:
        "Every attachment must be a valid HTTP or HTTPS URL.",
    };
  }

  return {
    imageUrls: uniqueUrls,
    error: null,
  };
}

async function getStaffStatus(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
): Promise<boolean> {
  const { data, error } =
    await supabase.rpc(
      "current_user_is_staff",
    );

  if (error) {
    return false;
  }

  return data === true;
}

async function getPostContext(
  postId: string,
): Promise<{
  post: ForumPostRecord | null;
  topic: ForumTopicRecord | null;
  section: ForumSectionRecord | null;
  error: string | null;
}> {
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

  if (postError) {
    return {
      post: null,
      topic: null,
      section: null,
      error: postError.message,
    };
  }

  if (!post) {
    return {
      post: null,
      topic: null,
      section: null,
      error: "The selected post does not exist.",
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
        slug,
        title,
        author_user_id,
        is_locked,
        deleted_at
      `,
    )
    .eq("id", post.topic_id)
    .maybeSingle<ForumTopicRecord>();

  if (topicError) {
    return {
      post,
      topic: null,
      section: null,
      error: topicError.message,
    };
  }

  if (!topic) {
    return {
      post,
      topic: null,
      section: null,
      error:
        "The discussion containing this post no longer exists.",
    };
  }

  const {
    data: section,
    error: sectionError,
  } = await supabase
    .from("forum_sections")
    .select("id, slug")
    .eq("id", topic.section_id)
    .maybeSingle<ForumSectionRecord>();

  if (sectionError) {
    return {
      post,
      topic,
      section: null,
      error: sectionError.message,
    };
  }

  if (!section) {
    return {
      post,
      topic,
      section: null,
      error:
        "The forum section containing this post no longer exists.",
    };
  }

  return {
    post,
    topic,
    section,
    error: null,
  };
}

function revalidateForumPaths(
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

export async function editForumPostAction(
  _previousState: EditForumPostState,
  formData: FormData,
): Promise<EditForumPostState> {
  const postId = readText(
    formData,
    "postId",
    100,
  );

  const rawBody = readText(
    formData,
    "body",
    MAX_BODY_HTML_LENGTH,
  );

  const body = sanitizeRichHtml(rawBody);
  const visibleBody =
    richTextToPlainText(body);

  const fieldErrors: NonNullable<
    EditForumPostState["fieldErrors"]
  > = {};

  if (!postId || !isUuid(postId)) {
    return {
      success: false,
      message: "The selected post is invalid.",
    };
  }

  if (!visibleBody) {
    fieldErrors.body =
      "The post cannot be empty.";
  } else if (visibleBody.length < 2) {
    fieldErrors.body =
      "The post is too short.";
  } else if (
    visibleBody.length >
    MAX_BODY_LENGTH
  ) {
    fieldErrors.body =
      `The post cannot exceed ${MAX_BODY_LENGTH.toLocaleString("en-GB")} visible characters.`;
  }

  const {
    imageUrls,
    error: imageUrlsError,
  } = parseImageUrls(formData);

  if (imageUrlsError) {
    fieldErrors.imageUrls =
      imageUrlsError;
  }

  if (
    Object.keys(fieldErrors).length > 0
  ) {
    return {
      success: false,
      message:
        "Check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message:
        "You must be signed in to edit a post.",
    };
  }

  const {
    post,
    topic,
    section,
    error: contextError,
  } = await getPostContext(postId);

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

  if (post.deleted_at) {
    return {
      success: false,
      message:
        "A deleted post cannot be edited.",
    };
  }

  if (topic.deleted_at) {
    return {
      success: false,
      message:
        "This discussion is no longer available.",
    };
  }

  const isStaff =
    await getStaffStatus(supabase);

  const ownsPost =
    post.author_user_id === user.id;

  if (!ownsPost && !isStaff) {
    return {
      success: false,
      message:
        "You do not have permission to edit this post.",
    };
  }

  if (topic.is_locked && !isStaff) {
    return {
      success: false,
      message:
        "This discussion is locked. Only staff members may edit its posts.",
    };
  }

  const { error: updateError } =
    await supabase
      .from("forum_posts")
      .update({
        body,
        edited_at:
          new Date().toISOString(),
      })
      .eq("id", post.id);

  if (updateError) {
    return {
      success: false,
      message: updateError.message,
    };
  }

  const {
    error: deleteImagesError,
  } = await supabase
    .from("forum_post_images")
    .delete()
    .eq("post_id", post.id);

  if (deleteImagesError) {
    return {
      success: false,
      message:
        `The post was edited, but its previous images could not be replaced: ${deleteImagesError.message}`,
    };
  }

  if (imageUrls.length > 0) {
    const {
      error: insertImagesError,
    } = await supabase
      .from("forum_post_images")
      .insert(
        imageUrls.map(
          (imageUrl, index) => ({
            post_id: post.id,
            image_url: imageUrl,
            alt_text: null,
            sort_order: index,
          }),
        ),
      );

    if (insertImagesError) {
      return {
        success: false,
        message:
          `The post was edited, but its new images could not be attached: ${insertImagesError.message}`,
      };
    }
  }

  revalidateForumPaths(
    section.slug,
    topic.slug,
  );

  if (
    !ownsPost &&
    post.author_character_id
  ) {
    const actorCharacterId =
      await resolveActorCharacterId(
        supabase,
        user.id,
      );

    if (actorCharacterId) {
      await sendForumNotification({
        supabase,
        actorCharacterId,
        recipientCharacterId:
          post.author_character_id,
        heading:
          "Your forum content was edited",
        message:
          `Another user edited your post in “${topic.title}”.`,
        href:
          `/forum/${encodeURIComponent(
            section.slug,
          )}/${encodeURIComponent(
            topic.slug,
          )}#post-${post.id}`,
        linkLabel:
          "Open edited post",
      });

      revalidatePath(
        "/messages",
      );
    }
  }

  redirect(
    `/forum/${section.slug}/${topic.slug}#post-${post.id}`,
  );
}

export async function deleteForumPostAction(
  _previousState: DeleteForumPostState,
  formData: FormData,
): Promise<DeleteForumPostState> {
  const postId = readText(
    formData,
    "postId",
    100,
  );

  if (!postId || !isUuid(postId)) {
    return {
      success: false,
      message: "The selected post is invalid.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message:
        "You must be signed in to delete a post.",
    };
  }

  const {
    post,
    topic,
    section,
    error: contextError,
  } = await getPostContext(postId);

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

  if (post.deleted_at) {
    return {
      success: false,
      message:
        "This post has already been deleted.",
    };
  }

  const isStaff =
    await getStaffStatus(supabase);

  const ownsPost =
    post.author_user_id === user.id;

  if (!ownsPost && !isStaff) {
    return {
      success: false,
      message:
        "You do not have permission to delete this post.",
    };
  }

  if (topic.is_locked && !isStaff) {
    return {
      success: false,
      message:
        "This discussion is locked. Only staff members may delete its posts.",
    };
  }

  const deletionTimestamp =
    new Date().toISOString();

  if (post.is_initial) {
    const { error: topicDeleteError } =
      await supabase
        .from("forum_topics")
        .update({
          deleted_at:
            deletionTimestamp,
        })
        .eq("id", topic.id);

    if (topicDeleteError) {
      return {
        success: false,
        message:
          topicDeleteError.message,
      };
    }

    const { error: postsDeleteError } =
      await supabase
        .from("forum_posts")
        .update({
          deleted_at:
            deletionTimestamp,
        })
        .eq("topic_id", topic.id)
        .is("deleted_at", null);

    if (postsDeleteError) {
      return {
        success: false,
        message:
          `The discussion was deleted, but its posts could not all be marked as deleted: ${postsDeleteError.message}`,
      };
    }

    revalidatePath("/forum");
    revalidatePath(
      `/forum/${section.slug}`,
    );

    redirect(
      `/forum/${section.slug}`,
    );
  }

  const { error: postDeleteError } =
    await supabase
      .from("forum_posts")
      .update({
        deleted_at:
          deletionTimestamp,
      })
      .eq("id", post.id);

  if (postDeleteError) {
    return {
      success: false,
      message:
        postDeleteError.message,
    };
  }

  revalidateForumPaths(
    section.slug,
    topic.slug,
  );

  redirect(
    `/forum/${section.slug}/${topic.slug}#post-${post.id}`,
  );
}