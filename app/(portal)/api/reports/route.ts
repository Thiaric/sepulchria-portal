import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { consumeSecurityRateLimit } from "@/lib/security/rate-limit";

const SOURCE_TYPES = [
  "forum_topic",
  "forum_post",
  "direct_message",
  "room_message",
  "instant_chat_message",
  "character",
] as const;

type SourceType = (typeof SOURCE_TYPES)[number];

const REASONS = [
  "child_sexual_content",
  "child_grooming",
  "suicide_self_harm",
  "eating_disorder",
  "pornographic_media",
  "immediate_safety",
  "harassment",
  "offensive_inappropriate",
  "metagaming_rule_breach",
  "spam",
  "impersonation",
  "sexual_inappropriate",
  "other",
] as const;

const CHARACTER_PROFILE_FIELDS = {
  bio: {
    label: "Bio",
    column: "personality",
    valueType: "text",
  },
  physical: {
    label: "Physical",
    column: "physical_description",
    valueType: "text",
  },
  background: {
    label: "Background",
    column: "biography",
    valueType: "text",
  },
  public_notes: {
    label: "Public Notes",
    column: "public_notes",
    valueType: "text",
  },
  relationships: {
    label: "Relationships",
    column: "relationships",
    valueType: "text",
  },
  offgame: {
    label: "Offgame",
    column: "offgame",
    valueType: "text",
  },
  profile_picture: {
    label: "Profile picture",
    column: "portrait_url",
    valueType: "image_url",
  },
  mp3_music: {
    label: "MP3 music",
    column: "music_url",
    valueType: "audio_url",
  },
} as const;

type CharacterProfileField =
  keyof typeof CHARACTER_PROFILE_FIELDS;

function isCharacterProfileField(
  value: unknown,
): value is CharacterProfileField {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(
      CHARACTER_PROFILE_FIELDS,
      value,
    )
  );
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function safeText(value: unknown, max: number): string {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

async function characterSnapshot(
  admin: ReturnType<typeof createAdminClient>,
  characterId: string | null,
) {
  if (!characterId) return null;

  const { data, error } = await admin
    .from("characters")
    .select("id, user_id, display_name, first_name, surname")
    .eq("id", characterId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id ?? null,
    name:
      data.display_name?.trim() ||
      [data.first_name, data.surname]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      "Unknown character",
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be signed in to submit a report." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const sourceType = body?.sourceType;
  const sourceId = body?.sourceId;
  const reason = body?.reason;
  const explanation = safeText(body?.explanation, 5000);
  const sourceUrl = safeText(body?.sourceUrl, 1200);

  if (
    !SOURCE_TYPES.includes(sourceType as SourceType) ||
    !isUuid(sourceId) ||
    !REASONS.includes(reason as (typeof REASONS)[number])
  ) {
    return NextResponse.json(
      { error: "This report request is invalid." },
      { status: 400 },
    );
  }

  try {
    const reportRateLimit =
      await consumeSecurityRateLimit({
        scope: "report_user",
        identifier: `user:${user.id}`,
        limit: 10,
        windowSeconds: 60 * 60,
      });

    if (!reportRateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "You have submitted too many reports recently. Please wait before submitting another report.",
          retryAfterSeconds:
            reportRateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(
                1,
                reportRateLimit.retryAfterSeconds,
              ),
            ),
          },
        },
      );
    }
  } catch (error) {
    console.error(
      "Unable to apply report rate limit:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Security verification is temporarily unavailable. Please try again shortly.",
      },
      { status: 503 },
    );
  }

  const admin = createAdminClient();

  const { data: reporterCharacter, error: reporterCharacterError } =
    await admin
      .from("characters")
      .select(
        "id, user_id, display_name, first_name, surname, current_room_id",
      )
      .eq("user_id", user.id)
      .maybeSingle();

  if (reporterCharacterError || !reporterCharacter) {
    return NextResponse.json(
      { error: "A character is required to submit a report." },
      { status: 403 },
    );
  }

  const reporterName =
    reporterCharacter.display_name?.trim() ||
    [reporterCharacter.first_name, reporterCharacter.surname]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Player";

  const { data: staffRow } = await admin
    .from("staff_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const reporterIsStaff = Boolean(staffRow);

  let authorUserId: string | null = null;
  let authorCharacterId: string | null = null;
  let authorName: string | null = null;
  let contentSnapshot = "";
  let originalCreatedAt: string | null = null;
  let sourceContext: Record<string, unknown> = {
    url: sourceUrl || null,
  };
  let contextSnapshot: Record<string, unknown> = {};

  let characterProfileEvidence: Array<{
    key: CharacterProfileField;
    label: string;
    column: string;
    valueType: string;
    value: string;
  }> = [];

  if (sourceType === "character") {
    const requestedFields: CharacterProfileField[] = [];

    for (const value of Array.isArray(body?.fields) ? body.fields : []) {
      if (
        isCharacterProfileField(value) &&
        !requestedFields.includes(value)
      ) {
        requestedFields.push(value);
      }
    }

    if (requestedFields.length === 0) {
      return NextResponse.json(
        { error: "Choose at least one character profile field to report." },
        { status: 400 },
      );
    }

    const { data: target, error } = await admin
      .from("characters")
      .select(
        "id,user_id,public_slug,display_name,first_name,surname,status,is_system,personality,physical_description,biography,public_notes,relationships,offgame,portrait_url,music_url,updated_at",
      )
      .eq("id", sourceId)
      .maybeSingle();

    if (
      error ||
      !target ||
      target.status !== "approved" ||
      target.is_system
    ) {
      return NextResponse.json(
        { error: "This character profile is unavailable." },
        { status: 404 },
      );
    }

    if (
      target.user_id === user.id ||
      target.id === reporterCharacter.id
    ) {
      return NextResponse.json(
        { error: "You cannot report your own character profile." },
        { status: 400 },
      );
    }

    const fieldValues: Record<CharacterProfileField, string> = {
      bio: target.personality ?? "",
      physical: target.physical_description ?? "",
      background: target.biography ?? "",
      public_notes: target.public_notes ?? "",
      relationships: target.relationships ?? "",
      offgame: target.offgame ?? "",
      profile_picture: target.portrait_url ?? "",
      mp3_music: target.music_url ?? "",
    };

    characterProfileEvidence = requestedFields.map((key) => {
      const meta = CHARACTER_PROFILE_FIELDS[key];

      return {
        key,
        label: meta.label,
        column: meta.column,
        valueType: meta.valueType,
        value: fieldValues[key].trim(),
      };
    });

    const emptySelection =
      characterProfileEvidence.find(
        (item) => !item.value,
      );

    if (emptySelection) {
      return NextResponse.json(
        {
          error: `${emptySelection.label} does not currently contain reportable content.`,
        },
        { status: 400 },
      );
    }

    const first = characterProfileEvidence[0];

    authorUserId = target.user_id ?? null;
    authorCharacterId = target.id;
    authorName =
      target.display_name?.trim() ||
      [target.first_name, target.surname]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      "Unknown character";

    contentSnapshot = first.value;
    originalCreatedAt = target.updated_at;

    sourceContext = {
      ...sourceContext,
      character_id: target.id,
      public_slug: target.public_slug,
      selected_fields: characterProfileEvidence.map(
        (item) => ({
          key: item.key,
          label: item.label,
        }),
      ),
    };

    contextSnapshot = {
      character_profile_field: first.key,
      character_profile_field_label: first.label,
      character_profile_column: first.column,
      value_type: first.valueType,
      public_slug: target.public_slug,
    };
  } else if (sourceType === "forum_post") {
    const { data: post, error } = await supabase
      .from("forum_posts")
      .select(
        "id, topic_id, author_user_id, author_character_id, body, is_initial, is_anonymous, created_at, updated_at, deleted_at",
      )
      .eq("id", sourceId)
      .maybeSingle();

    if (error || !post || post.deleted_at) {
      return NextResponse.json(
        { error: "This forum post is unavailable." },
        { status: 404 },
      );
    }

    authorUserId = post.author_user_id ?? null;
    authorCharacterId = post.author_character_id ?? null;
    contentSnapshot = post.body;
    originalCreatedAt = post.created_at;

    const { data: topic } = await supabase
      .from("forum_topics")
      .select("id, title, slug, section_id")
      .eq("id", post.topic_id)
      .maybeSingle();

    const { data: nearby } = await admin
      .from("forum_posts")
      .select(
        "id, author_user_id, author_character_id, body, created_at, edited_at, deleted_at",
      )
      .eq("topic_id", post.topic_id)
      .order("created_at", { ascending: true })
      .limit(40);

    const rows = nearby ?? [];
    const index = rows.findIndex((row) => row.id === sourceId);

    contextSnapshot = {
      topic: topic ?? null,
      surrounding_posts:
        index >= 0
          ? rows.slice(Math.max(0, index - 3), index + 4)
          : [],
      reported_post_updated_at: post.updated_at,
      reported_post_was_anonymous: post.is_anonymous,
    };

    sourceContext = {
      ...sourceContext,
      topic_id: post.topic_id,
      is_initial: post.is_initial,
    };
  } else if (sourceType === "forum_topic") {
    const { data: topic, error } = await supabase
      .from("forum_topics")
      .select(
        "id, section_id, author_user_id, author_character_id, title, slug, created_at, updated_at, deleted_at",
      )
      .eq("id", sourceId)
      .maybeSingle();

    if (error || !topic || topic.deleted_at) {
      return NextResponse.json(
        { error: "This forum topic is unavailable." },
        { status: 404 },
      );
    }

    const { data: openingPost } = await supabase
      .from("forum_posts")
      .select(
        "id, author_user_id, author_character_id, body, is_anonymous, created_at, updated_at, deleted_at",
      )
      .eq("topic_id", topic.id)
      .eq("is_initial", true)
      .maybeSingle();

    authorUserId =
      openingPost?.author_user_id ?? topic.author_user_id ?? null;
    authorCharacterId =
      openingPost?.author_character_id ??
      topic.author_character_id ??
      null;
    contentSnapshot =
      `${topic.title}\n\n${openingPost?.body ?? ""}`.trim();
    originalCreatedAt = topic.created_at;

    const { data: nearby } = await admin
      .from("forum_posts")
      .select(
        "id, author_user_id, author_character_id, body, created_at, edited_at, deleted_at",
      )
      .eq("topic_id", topic.id)
      .order("created_at", { ascending: true })
      .limit(7);

    contextSnapshot = {
      topic: {
        id: topic.id,
        title: topic.title,
        slug: topic.slug,
        section_id: topic.section_id,
        updated_at: topic.updated_at,
      },
      opening_post_id: openingPost?.id ?? null,
      surrounding_posts: nearby ?? [],
      opening_post_was_anonymous: openingPost?.is_anonymous ?? false,
    };
  } else if (sourceType === "direct_message") {
    const { data: message, error } = await supabase
      .from("direct_messages")
      .select(
        "id, conversation_id, sender_character_id, body, message_mode, created_at",
      )
      .eq("id", sourceId)
      .maybeSingle();

    if (error || !message) {
      return NextResponse.json(
        { error: "This private message is unavailable." },
        { status: 404 },
      );
    }

    const { data: membership } = await admin
      .from("direct_conversation_participants")
      .select("character_id")
      .eq("conversation_id", message.conversation_id)
      .eq("character_id", reporterCharacter.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: "This private message is not available to your character." },
        { status: 403 },
      );
    }

    authorCharacterId = message.sender_character_id;
    contentSnapshot = message.body;
    originalCreatedAt = message.created_at;

    const { data: nearby } = await admin
      .from("direct_messages")
      .select("id, sender_character_id, body, message_mode, created_at")
      .eq("conversation_id", message.conversation_id)
      .order("created_at", { ascending: true })
      .limit(200);

    const rows = nearby ?? [];
    const index = rows.findIndex((row) => row.id === sourceId);

    contextSnapshot = {
      conversation_id: message.conversation_id,
      surrounding_messages:
        index >= 0
          ? rows.slice(Math.max(0, index - 3), index + 4)
          : [],
    };

    sourceContext = {
      ...sourceContext,
      conversation_id: message.conversation_id,
      message_mode: message.message_mode,
    };
  } else if (sourceType === "instant_chat_message") {
    const { data: message, error } = await supabase
      .from("instant_chat_messages")
      .select("id, conversation_id, sender_character_id, body, created_at")
      .eq("id", sourceId)
      .maybeSingle();

    if (error || !message) {
      return NextResponse.json(
        { error: "This Instant Chat message is unavailable." },
        { status: 404 },
      );
    }

    const { data: membership } = await admin
      .from("instant_chat_participants")
      .select("character_id")
      .eq("conversation_id", message.conversation_id)
      .eq("character_id", reporterCharacter.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: "This Instant Chat message is not available to your character." },
        { status: 403 },
      );
    }

    authorCharacterId = message.sender_character_id;
    contentSnapshot = message.body;
    originalCreatedAt = message.created_at;

    const { data: nearby } = await admin
      .from("instant_chat_messages")
      .select("id, sender_character_id, body, created_at")
      .eq("conversation_id", message.conversation_id)
      .order("created_at", { ascending: true })
      .limit(200);

    const rows = nearby ?? [];
    const index = rows.findIndex((row) => row.id === sourceId);

    contextSnapshot = {
      conversation_id: message.conversation_id,
      surrounding_messages:
        index >= 0
          ? rows.slice(Math.max(0, index - 3), index + 4)
          : [],
    };

    sourceContext = {
      ...sourceContext,
      conversation_id: message.conversation_id,
    };
  } else {
    const { data: message, error } = await supabase
      .from("room_messages")
      .select(
        "id, room_id, character_id, message, message_type, whisper_recipient_character_id, created_at, edited_at",
      )
      .eq("id", sourceId)
      .maybeSingle();

    if (error || !message) {
      return NextResponse.json(
        { error: "This location message is unavailable." },
        { status: 404 },
      );
    }

    if (
      !reporterIsStaff &&
      reporterCharacter.current_room_id !== message.room_id
    ) {
      return NextResponse.json(
        { error: "This location message is not available to your character." },
        { status: 403 },
      );
    }

    if (
      message.message_type === "whisper" &&
      !reporterIsStaff &&
      message.character_id !== reporterCharacter.id &&
      message.whisper_recipient_character_id !== reporterCharacter.id
    ) {
      return NextResponse.json(
        { error: "This whisper is not available to your character." },
        { status: 403 },
      );
    }

    authorCharacterId = message.character_id ?? null;
    contentSnapshot = message.message;
    originalCreatedAt = message.created_at;

    const { data: room } = await admin
      .from("rooms")
      .select("id, name, slug")
      .eq("id", message.room_id)
      .maybeSingle();

    const { data: nearby } = await admin
      .from("room_messages")
      .select(
        "id, character_id, message, message_type, whisper_recipient_character_id, created_at, edited_at",
      )
      .eq("room_id", message.room_id)
      .order("created_at", { ascending: true })
      .limit(500);

    const rows = nearby ?? [];
    const index = rows.findIndex((row) => row.id === sourceId);

    contextSnapshot = {
      room: room ?? null,
      surrounding_messages:
        index >= 0
          ? rows.slice(Math.max(0, index - 3), index + 4)
          : [],
      reported_message_edited_at: message.edited_at,
    };

    sourceContext = {
      ...sourceContext,
      room_id: message.room_id,
      message_type: message.message_type,
      whisper_recipient_character_id:
        message.whisper_recipient_character_id,
    };
  }

  const authorCharacter = await characterSnapshot(
    admin,
    authorCharacterId,
  );

  if (authorCharacter) {
    authorUserId = authorCharacter.userId ?? authorUserId;
    authorName = authorCharacter.name;
  }

  if (
    authorUserId === user.id ||
    authorCharacterId === reporterCharacter.id
  ) {
    return NextResponse.json(
      { error: "You cannot report your own content." },
      { status: 400 },
    );
  }

  if (!contentSnapshot.trim()) {
    return NextResponse.json(
      { error: "There is no reportable content to preserve." },
      { status: 400 },
    );
  }

  const { data: result, error: reportError } = await admin.rpc(
    "create_moderation_report",
    {
      p_reporter_user_id: user.id,
      p_reporter_character_id: reporterCharacter.id,
      p_reporter_name_snapshot: reporterName,
      p_reported_user_id: authorUserId,
      p_reported_character_id: authorCharacterId,
      p_reported_name_snapshot: authorName,
      p_reason_code: reason,
      p_explanation: explanation || null,
      p_source_type: sourceType,
      p_source_id: sourceId,
      p_source_context: sourceContext,
      p_author_user_id: authorUserId,
      p_author_character_id: authorCharacterId,
      p_author_name_snapshot: authorName,
      p_content_snapshot: contentSnapshot,
      p_original_created_at: originalCreatedAt,
      p_context_snapshot: contextSnapshot,
    },
  );

  if (reportError) {
    return NextResponse.json(
      { error: reportError.message },
      {
        status:
          reportError.message.includes("already have an open report") ||
          reportError.message.includes("Too many reports")
            ? 409
            : 500,
      },
    );
  }

  const created = Array.isArray(result) ? result[0] : result;

  if (!created?.public_reference) {
    return NextResponse.json(
      { error: "The report could not be created." },
      { status: 500 },
    );
  }

  if (
    sourceType === "character" &&
    characterProfileEvidence.length > 1
  ) {
    const { data: createdTicket, error: ticketLookupError } =
      await admin
        .from("tickets")
        .select("id")
        .eq("public_reference", created.public_reference)
        .maybeSingle();

    if (ticketLookupError || !createdTicket) {
      return NextResponse.json(
        {
          error:
            "The report was created, but its additional profile evidence could not be attached.",
          reference: created.public_reference,
        },
        { status: 500 },
      );
    }

    const { data: createdReport, error: reportLookupError } =
      await admin
        .from("reports")
        .select("id")
        .eq("ticket_id", createdTicket.id)
        .maybeSingle();

    if (reportLookupError || !createdReport) {
      return NextResponse.json(
        {
          error:
            "The report was created, but its additional profile evidence could not be attached.",
          reference: created.public_reference,
        },
        { status: 500 },
      );
    }

    const additionalEvidence =
      characterProfileEvidence.slice(1).map((item) => ({
        ticket_id: createdTicket.id,
        report_id: createdReport.id,
        evidence_type: "content_snapshot",
        source_type: "character",
        source_id: sourceId,
        author_user_id: authorUserId,
        author_character_id: authorCharacterId,
        author_name_snapshot: authorName,
        content_snapshot: item.value,
        original_created_at: originalCreatedAt,
        context_snapshot: {
          character_profile_field: item.key,
          character_profile_field_label: item.label,
          character_profile_column: item.column,
          value_type: item.valueType,
          public_slug:
            typeof sourceContext.public_slug === "string"
              ? sourceContext.public_slug
              : null,
        },
      }));

    const { error: additionalEvidenceError } =
      await admin
        .from("report_evidence")
        .insert(additionalEvidence);

    if (additionalEvidenceError) {
      return NextResponse.json(
        {
          error:
            "The report was created, but not all selected profile evidence could be attached.",
          reference: created.public_reference,
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    reference: created.public_reference,
  });
}
