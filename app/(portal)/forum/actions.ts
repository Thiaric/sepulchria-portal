"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  richTextToPlainText,
  sanitizeRichHtml,
} from "@/lib/rich-text";
import { createClient } from "@/lib/supabase/server";
import {
  notifyForumReplyAudience,
} from "@/lib/forum/forum-notifications";
import {
  canCreateOrderTopic,
  getForumViewerContext,
  readRequestedVisibleLevels,
  resolveVisibleLevelsForActor,
} from "@/lib/forum/order-forum-access";

const MAX_TITLE_LENGTH = 180;
const MAX_BODY_LENGTH = 50_000;
const MAX_BODY_HTML_LENGTH = 250_000;
const MAX_IMAGES = 8;
const MAX_IMAGE_URL_LENGTH = 2_000;

export type ForumFieldErrors = {
  sectionId?: string;
  characterId?: string;
  title?: string;
  body?: string;
  imageUrls?: string;
  quotedPostId?: string;
  topicId?: string;
  visibleOrderLevels?: string;
};

export type CreateForumTopicState = {
  success: boolean;
  message: string;
  fieldErrors?: ForumFieldErrors;
};

export type CreateForumReplyState = {
  success: boolean;
  message: string;
  fieldErrors?: ForumFieldErrors;
};

type ForumSectionRecord = {
  id: string;
  slug: string;
  name: string;
  association_id: string | null;
  order_id: string | null;
  visibility: string;
  is_active: boolean;
};

type ForumTopicRecord = {
  id: string;
  section_id: string;
  slug: string;
  title: string;
  author_character_id: string | null;
  is_locked: boolean;
  deleted_at: string | null;
};

type CharacterRecord = {
  id: string;
  user_id: string;
  status: string;
  association_id: string | null;
};

type CreatedTopicResult =
  | string
  | {
      topic_id?: string;
      id?: string;
      topic_slug?: string;
      slug?: string;
    }
  | Array<{
      topic_id?: string;
      id?: string;
      topic_slug?: string;
      slug?: string;
    }>
  | null;

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

function readCheckbox(
  formData: FormData,
  key: string,
): boolean {
  const value = formData.get(key);

  return (
    value === "on" ||
    value === "true" ||
    value === "1"
  );
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

function createSlug(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);

  return slug || "discussion";
}

function createUniqueSlug(value: string): string {
  const baseSlug = createSlug(value);

  const suffix = [
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 8),
  ].join("-");

  return `${baseSlug}-${suffix}`.slice(0, 170);
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
        "Every attachment must be a valid HTTP or HTTPS image URL.",
    };
  }

  return {
    imageUrls: uniqueUrls,
    error: null,
  };
}

function getCreatedTopicId(
  result: CreatedTopicResult,
): string | null {
  if (typeof result === "string") {
    return result;
  }

  if (Array.isArray(result)) {
    const firstResult = result[0];

    return (
      firstResult?.topic_id ??
      firstResult?.id ??
      null
    );
  }

  if (result && typeof result === "object") {
    return result.topic_id ?? result.id ?? null;
  }

  return null;
}

function getCreatedTopicSlug(
  result: CreatedTopicResult,
): string | null {
  if (
    !result ||
    typeof result === "string"
  ) {
    return null;
  }

  if (Array.isArray(result)) {
    const firstResult = result[0];

    return (
      firstResult?.topic_slug ??
      firstResult?.slug ??
      null
    );
  }

  return result.topic_slug ?? result.slug ?? null;
}

async function getAuthenticatedUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      supabase,
      user: null,
    };
  }

  return {
    supabase,
    user,
  };
}

async function getOwnedApprovedCharacter(
  characterId: string,
  userId: string,
): Promise<{
  character: CharacterRecord | null;
  error: string | null;
}> {
  if (!characterId) {
    return {
      character: null,
      error: null,
    };
  }

  if (!isUuid(characterId)) {
    return {
      character: null,
      error: "The selected character is invalid.",
    };
  }

  const supabase = await createClient();

  const {
    data: character,
    error,
  } = await supabase
    .from("characters")
    .select(
      `
        id,
        user_id,
        status,
        association_id
      `,
    )
    .eq("id", characterId)
    .eq("user_id", userId)
    .maybeSingle<CharacterRecord>();

  if (error) {
    return {
      character: null,
      error: error.message,
    };
  }

  if (!character) {
    return {
      character: null,
      error:
        "You cannot publish using this character.",
    };
  }

  if (character.status !== "approved") {
    return {
      character: null,
      error:
        "Only approved characters may publish in the forum.",
    };
  }

  return {
    character,
    error: null,
  };
}

async function insertPostImages(
  postId: string,
  imageUrls: string[],
): Promise<string | null> {
  if (imageUrls.length === 0) {
    return null;
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("forum_post_images")
    .insert(
      imageUrls.map((imageUrl, index) => ({
        post_id: postId,
        image_url: imageUrl,
        alt_text: null,
        sort_order: index,
      })),
    );

  return error?.message ?? null;
}

export async function createForumTopicAction(
  _previousState: CreateForumTopicState,
  formData: FormData,
): Promise<CreateForumTopicState> {
  const sectionId = readText(
    formData,
    "sectionId",
    100,
  );

  const characterId = readText(
    formData,
    "characterId",
    100,
  );

  const isAnonymous = readCheckbox(
    formData,
    "isAnonymous",
  );

  const title = readText(
    formData,
    "title",
    MAX_TITLE_LENGTH,
  );

  const rawBody = readText(
    formData,
    "body",
    MAX_BODY_HTML_LENGTH,
  );

  const body = sanitizeRichHtml(rawBody);
  const visibleBody =
    richTextToPlainText(body);

  const fieldErrors: ForumFieldErrors = {};

  if (!sectionId || !isUuid(sectionId)) {
    fieldErrors.sectionId =
      "Select a valid forum section.";
  }

  if (!characterId) {
    fieldErrors.characterId =
      "Choose an approved character. Account-only forum posting is not permitted.";
  } else if (!isUuid(characterId)) {
    fieldErrors.characterId =
      "The selected character is invalid.";
  }

  if (!title) {
    fieldErrors.title =
      "Enter a discussion title.";
  } else if (title.length < 3) {
    fieldErrors.title =
      "The title must contain at least 3 characters.";
  }

  if (!visibleBody) {
    fieldErrors.body =
      "Write the opening post.";
  } else if (visibleBody.length < 2) {
    fieldErrors.body =
      "The opening post is too short.";
  } else if (
    visibleBody.length >
    MAX_BODY_LENGTH
  ) {
    fieldErrors.body =
      `The opening post cannot exceed ${MAX_BODY_LENGTH.toLocaleString("en-GB")} visible characters.`;
  }

  const {
    imageUrls,
    error: imageUrlsError,
  } = parseImageUrls(formData);

  if (imageUrlsError) {
    fieldErrors.imageUrls =
      imageUrlsError;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message:
        "Check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  const { supabase, user } =
    await getAuthenticatedUser();

  if (!user) {
    return {
      success: false,
      message:
        "You must be signed in to create a discussion.",
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
        slug,
        name,
        association_id,
        order_id,
        visibility,
        is_active
      `,
    )
    .eq("id", sectionId)
    .maybeSingle<ForumSectionRecord>();

  if (sectionError) {
    return {
      success: false,
      message: sectionError.message,
    };
  }

  if (!section || !section.is_active) {
    return {
      success: false,
      message:
        "This forum section is no longer available.",
      fieldErrors: {
        sectionId:
          "Select another forum section.",
      },
    };
  }

  const {
    character,
    error: characterError,
  } = await getOwnedApprovedCharacter(
    characterId,
    user.id,
  );

  if (characterError) {
    return {
      success: false,
      message: characterError,
      fieldErrors: {
        characterId: characterError,
      },
    };
  }

  let topicVisibleOrderLevels:
    number[] | null = null;

  if (section.order_id) {
    const viewer =
      await getForumViewerContext(supabase);

    if (
      !canCreateOrderTopic(
        viewer,
        section.order_id,
      )
    ) {
      return {
        success: false,
        message:
          "You are not a member of this Order.",
        fieldErrors: {
          sectionId:
            "Choose a forum section belonging to your Order.",
        },
      };
    }

    if (
      !viewer.isStaff &&
      viewer.characterId !==
        character?.id
    ) {
      return {
        success: false,
        message:
          "Publish using the character who belongs to this Order.",
        fieldErrors: {
          characterId:
            "Choose your Order member character.",
        },
      };
    }

    try {
      topicVisibleOrderLevels =
        resolveVisibleLevelsForActor({
          requestedLevels:
            readRequestedVisibleLevels(
              formData,
            ),
          actorLevel:
            viewer.membership?.orderId ===
            section.order_id
              ? viewer.membership.level
              : null,
          unrestricted:
            viewer.isStaff ||
            (viewer.membership?.orderId ===
              section.order_id &&
              viewer.membership.level === 6),
        });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Choose valid Order Levels.";

      return {
        success: false,
        message,
        fieldErrors: {
          visibleOrderLevels: message,
        },
      };
    }
  } else if (
    section.association_id &&
    character?.association_id !==
      section.association_id
  ) {
    return {
      success: false,
      message:
        "This section is reserved for members of its organisation.",
      fieldErrors: {
        characterId:
          "Choose an approved character belonging to this organisation.",
      },
    };
  }

  const topicSlug =
    createUniqueSlug(title);

  const {
  data: createdTopic,
  error: createTopicError,
} = await supabase.rpc(
  "create_forum_topic",
  {
    requested_section_id:
      section.id,
    requested_character_id:
      character!.id,
    requested_title:
      title,
    requested_slug:
      topicSlug,
    requested_body:
      body,
    requested_quoted_post_id:
  null,
requested_is_anonymous:
  isAnonymous,
  },
);

  if (createTopicError) {
    return {
      success: false,
      message: createTopicError.message,
    };
  }

  const createdTopicResult =
    createdTopic as CreatedTopicResult;

  let createdTopicId =
    getCreatedTopicId(
      createdTopicResult,
    );

  const finalTopicSlug =
    getCreatedTopicSlug(
      createdTopicResult,
    ) ?? topicSlug;

  if (!createdTopicId) {
    const {
      data: topicRecord,
      error: topicLookupError,
    } = await supabase
      .from("forum_topics")
      .select("id")
      .eq("section_id", section.id)
      .eq("slug", finalTopicSlug)
      .eq("author_user_id", user.id)
      .maybeSingle<{ id: string }>();

    if (topicLookupError) {
      return {
        success: false,
        message:
          topicLookupError.message,
      };
    }

    createdTopicId =
      topicRecord?.id ?? null;
  }

  if (!createdTopicId) {
    return {
      success: false,
      message:
        "The discussion was created, but its opening post could not be found.",
    };
  }

  if (section.order_id) {
    const { error: visibilityError } =
      await supabase
        .from("forum_topics")
        .update({
          visible_order_levels:
            topicVisibleOrderLevels,
        })
        .eq("id", createdTopicId);

    if (visibilityError) {
      return {
        success: false,
        message:
          `The discussion was created, but its Order visibility could not be saved: ${visibilityError.message}`,
      };
    }
  }

  const {
    data: openingPost,
    error: openingPostError,
  } = await supabase
    .from("forum_posts")
    .select("id")
    .eq("topic_id", createdTopicId)
    .eq("is_initial", true)
    .maybeSingle<{ id: string }>();

  if (openingPostError) {
    return {
      success: false,
      message:
        openingPostError.message,
    };
  }

  if (
    openingPost &&
    imageUrls.length > 0
  ) {
    const imageInsertError =
      await insertPostImages(
        openingPost.id,
        imageUrls,
      );

    if (imageInsertError) {
      return {
        success: false,
        message:
          `The discussion was created, but its images could not be attached: ${imageInsertError}`,
      };
    }
  }

  revalidatePath("/forum");
  revalidatePath(
    `/forum/${section.slug}`,
  );

  redirect(
    `/forum/${section.slug}/${finalTopicSlug}`,
  );
}

export async function createForumReplyAction(
  _previousState: CreateForumReplyState,
  formData: FormData,
): Promise<CreateForumReplyState> {
  const topicId = readText(
    formData,
    "topicId",
    100,
  );

  const sectionSlug = readText(
    formData,
    "sectionSlug",
    180,
  );

  const topicSlug = readText(
    formData,
    "topicSlug",
    180,
  );

  const characterId = readText(
    formData,
    "characterId",
    100,
  );

  const isAnonymous = readCheckbox(
    formData,
    "isAnonymous",
  );

  const quotedPostId = readText(
    formData,
    "quotedPostId",
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

  const fieldErrors: ForumFieldErrors = {};

  if (!topicId || !isUuid(topicId)) {
    fieldErrors.topicId =
      "The discussion is invalid.";
  }

  if (!characterId) {
    fieldErrors.characterId =
      "Choose an approved character. Account-only forum posting is not permitted.";
  } else if (!isUuid(characterId)) {
    fieldErrors.characterId =
      "The selected character is invalid.";
  }

  if (!visibleBody) {
    fieldErrors.body =
      "Write a reply before publishing.";
  } else if (visibleBody.length < 2) {
    fieldErrors.body =
      "The reply is too short.";
  } else if (
    visibleBody.length >
    MAX_BODY_LENGTH
  ) {
    fieldErrors.body =
      `The reply cannot exceed ${MAX_BODY_LENGTH.toLocaleString("en-GB")} visible characters.`;
  }

  if (
    quotedPostId &&
    !isUuid(quotedPostId)
  ) {
    fieldErrors.quotedPostId =
      "The quoted post is invalid.";
  }

  const {
    imageUrls,
    error: imageUrlsError,
  } = parseImageUrls(formData);

  if (imageUrlsError) {
    fieldErrors.imageUrls =
      imageUrlsError;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      message:
        "Check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  const { supabase, user } =
    await getAuthenticatedUser();

  if (!user) {
    return {
      success: false,
      message:
        "You must be signed in to reply.",
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
        author_character_id,
        is_locked,
        deleted_at
      `,
    )
    .eq("id", topicId)
    .maybeSingle<ForumTopicRecord>();

  if (topicError) {
    return {
      success: false,
      message: topicError.message,
    };
  }

  if (!topic || topic.deleted_at) {
    return {
      success: false,
      message:
        "This discussion is no longer available.",
    };
  }

  if (topic.is_locked) {
    return {
      success: false,
      message:
        "This discussion has been locked and no longer accepts replies.",
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
        slug,
        name,
        association_id,
        visibility,
        is_active
      `,
    )
    .eq("id", topic.section_id)
    .maybeSingle<ForumSectionRecord>();

  if (sectionError) {
    return {
      success: false,
      message: sectionError.message,
    };
  }

  if (!section || !section.is_active) {
    return {
      success: false,
      message:
        "This forum section is no longer available.",
    };
  }

  const {
    character,
    error: characterError,
  } = await getOwnedApprovedCharacter(
    characterId,
    user.id,
  );

  if (characterError) {
    return {
      success: false,
      message: characterError,
      fieldErrors: {
        characterId: characterError,
      },
    };
  }

  if (
    section.association_id &&
    character?.association_id !==
      section.association_id
  ) {
    return {
      success: false,
      message:
        "This discussion is reserved for members of its organisation.",
      fieldErrors: {
        characterId:
          "Choose an approved character belonging to this organisation.",
      },
    };
  }

  if (quotedPostId) {
    const {
      data: quotedPost,
      error: quotedPostError,
    } = await supabase
      .from("forum_posts")
      .select("id, topic_id")
      .eq("id", quotedPostId)
      .maybeSingle<{
        id: string;
        topic_id: string;
      }>();

    if (quotedPostError) {
      return {
        success: false,
        message:
          quotedPostError.message,
      };
    }

    if (
      !quotedPost ||
      quotedPost.topic_id !== topic.id
    ) {
      return {
        success: false,
        message:
          "The selected quote does not belong to this discussion.",
        fieldErrors: {
          quotedPostId:
            "Remove the invalid quote and try again.",
        },
      };
    }
  }

  const {
    data: createdPost,
    error: createPostError,
  } = await supabase
    .from("forum_posts")
    .insert({
      topic_id: topic.id,
      author_user_id: user.id,
      author_character_id:
        character!.id,
      body,
      is_initial: false,
      is_anonymous: isAnonymous,
      quoted_post_id:
        quotedPostId || null,
    })
    .select("id")
    .single<{ id: string }>();

  if (createPostError) {
    return {
      success: false,
      message: createPostError.message,
    };
  }

  const imageInsertError =
    await insertPostImages(
      createdPost.id,
      imageUrls,
    );

  if (imageInsertError) {
    await supabase
      .from("forum_posts")
      .delete()
      .eq("id", createdPost.id)
      .eq("author_user_id", user.id);

    return {
      success: false,
      message:
        `The reply could not be published because its images could not be attached: ${imageInsertError}`,
    };
  }

  const finalSectionSlug =
    section.slug || sectionSlug;

  const finalTopicSlug =
    topic.slug || topicSlug;

  revalidatePath("/forum");
  revalidatePath(
    `/forum/${finalSectionSlug}`,
  );
  revalidatePath(
    `/forum/${finalSectionSlug}/${finalTopicSlug}`,
  );

  await notifyForumReplyAudience({
    supabase,
    actorCharacterId:
      character!.id,
    topicId: topic.id,
    topicAuthorCharacterId:
      topic.author_character_id,
    topicTitle: topic.title,
    isAnonymous,
    href:
      `/forum/${encodeURIComponent(
        finalSectionSlug,
      )}/${encodeURIComponent(
        finalTopicSlug,
      )}#post-${createdPost.id}`,
  });

  revalidatePath("/messages");

  redirect(
    `/forum/${finalSectionSlug}/${finalTopicSlug}#post-${createdPost.id}`,
  );
}