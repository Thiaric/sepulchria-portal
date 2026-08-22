"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

const FLAG_COOLDOWN_MS = 10 * 60_000;
const MAX_RECIPIENTS_PER_FLAG = 250;

export type FlagTopicState = {
  ok: boolean;
  message: string;
  sent?: number;
  skipped?: number;
};

export type ForumFlagRecipient = {
  id: string;
  name: string;
  portraitUrl: string | null;
  raceId: string | null;
  raceName: string | null;
  associationId: string | null;
  associationName: string | null;
  isFriend: boolean;
};

type CharacterRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
  portrait_url: string | null;
  race_id: string | null;
  association_id: string | null;
  status: string;
};

type SectionRow = {
  id: string;
  visibility: "public" | "members" | "staff";
  association_id: string | null;
  is_active: boolean;
};

type NamedRow = {
  id: string;
  name: string;
};

function characterName(character: CharacterRow): string {
  const display = character.display_name?.trim();

  if (display) {
    return display;
  }

  return (
    [character.first_name, character.surname]
      .filter(Boolean)
      .join(" ")
      .trim() || "Unnamed character"
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function values(
  formData: FormData,
  key: string,
): string[] {
  return formData
    .getAll(key)
    .map((value) =>
      String(value).trim(),
    )
    .filter(Boolean);
}

async function getAccessibleCharacterRows(
  sectionId: string,
  excludeCharacterId?: string | null,
): Promise<{
  characters: CharacterRow[];
  races: Map<string, string>;
  associations: Map<string, string>;
}> {
  const supabase = await createClient();

  const {
    data: sectionData,
    error: sectionError,
  } = await supabase
    .from("forum_sections")
    .select(
      "id, visibility, association_id, is_active",
    )
    .eq("id", sectionId)
    .eq("is_active", true)
    .maybeSingle();

  if (sectionError) {
    throw new Error(
      `Unable to verify forum access: ${sectionError.message}`,
    );
  }

  if (!sectionData) {
    return {
      characters: [],
      races: new Map(),
      associations: new Map(),
    };
  }

  const section =
    sectionData as SectionRow;

  const {
    data: characterData,
    error: characterError,
  } = await supabase
    .from("characters")
    .select(
      `
        id,
        user_id,
        display_name,
        first_name,
        surname,
        portrait_url,
        race_id,
        association_id,
        status
      `,
    )
    .eq("status", "approved")
      .eq("is_system", false)
    .eq("is_system", false)
    .order("first_name", {
      ascending: true,
    });

  if (characterError) {
    throw new Error(
      `Unable to load eligible characters: ${characterError.message}`,
    );
  }

  const allCharacters =
    (characterData ??
      []) as CharacterRow[];

  const {
    data: staffData,
    error: staffError,
  } = await supabase
    .from("staff_members")
    .select("user_id");

  if (staffError) {
    throw new Error(
      `Unable to verify staff forum access: ${staffError.message}`,
    );
  }

  const staffUserIds = new Set(
    (staffData ?? []).map(
      (row) =>
        String(row.user_id),
    ),
  );

  const characters =
    allCharacters.filter(
      (character) => {
        if (
          excludeCharacterId &&
          character.id ===
            excludeCharacterId
        ) {
          return false;
        }

        const isStaff =
          staffUserIds.has(
            character.user_id,
          );

        /*
         * Staff are allowed into restricted forum sections.
         * This mirrors the portal's staff privilege model.
         */
        if (isStaff) {
          return true;
        }

        if (
          section.visibility ===
          "staff"
        ) {
          return false;
        }

        if (
          section.visibility ===
          "members"
        ) {
          return Boolean(
            section.association_id &&
              character.association_id ===
                section.association_id,
          );
        }

        return true;
      },
    );

  const raceIds = Array.from(
    new Set(
      characters
        .map(
          (character) =>
            character.race_id,
        )
        .filter(
          (
            id,
          ): id is string =>
            Boolean(id),
        ),
    ),
  );

  const associationIds =
    Array.from(
      new Set(
        characters
          .map(
            (character) =>
              character.association_id,
          )
          .filter(
            (
              id,
            ): id is string =>
              Boolean(id),
          ),
      ),
    );

  const [
    raceResult,
    associationResult,
  ] = await Promise.all([
    raceIds.length > 0
      ? supabase
          .from("races")
          .select("id, name")
          .in("id", raceIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),

    associationIds.length > 0
      ? supabase
          .from("associations")
          .select("id, name")
          .in(
            "id",
            associationIds,
          )
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  if (raceResult.error) {
    throw new Error(
      `Unable to load ancestries: ${raceResult.error.message}`,
    );
  }

  if (associationResult.error) {
    throw new Error(
      `Unable to load associations: ${associationResult.error.message}`,
    );
  }

  return {
    characters,
    races: new Map(
      (
        (raceResult.data ??
          []) as NamedRow[]
      ).map((race) => [
        race.id,
        race.name,
      ]),
    ),
    associations: new Map(
      (
        (associationResult.data ??
          []) as NamedRow[]
      ).map((association) => [
        association.id,
        association.name,
      ]),
    ),
  };
}

export async function loadForumFlagRecipients(
  sectionId: string,
): Promise<ForumFlagRecipient[]> {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const {
    data: senderData,
    error: senderError,
  } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "approved")
      .eq("is_system", false)
    .maybeSingle();

  if (senderError) {
    throw new Error(
      senderError.message,
    );
  }

  if (!senderData) {
    return [];
  }

  const {
    characters: rawCharacters,
    races,
    associations,
  } =
    await getAccessibleCharacterRows(
      sectionId,
      senderData.id,
    );

  const { data: blockRows, error: blockError } = await supabase
    .from("character_blocks")
    .select("blocker_character_id, blocked_character_id")
    .or([
      `blocker_character_id.eq.${senderData.id}`,
      `blocked_character_id.eq.${senderData.id}`,
    ].join(","));

  if (blockError) throw new Error(`Unable to filter blocked characters: ${blockError.message}`);

  const blockedIds = new Set<string>();
  for (const row of blockRows ?? []) {
    const blocker = String(row.blocker_character_id);
    const blocked = String(row.blocked_character_id);
    blockedIds.add(blocker === senderData.id ? blocked : blocker);
  }

  const characters = rawCharacters.filter(
    (character) => !blockedIds.has(character.id),
  );

  const [
    friendFeatureResult,
    friendEntriesResult,
  ] = await Promise.all([
    supabase
      .from(
        "character_feature_entitlements",
      )
      .select("enabled")
      .eq(
        "character_id",
        senderData.id,
      )
      .eq(
        "feature_key",
        "friend_list",
      )
      .maybeSingle(),
    supabase
      .from(
        "character_friend_entries",
      )
      .select(
        "target_character_id",
      )
      .eq(
        "owner_character_id",
        senderData.id,
      ),
  ]);

  const friendIds =
    friendFeatureResult.data
      ?.enabled === true
      ? new Set(
          (
            friendEntriesResult.data ??
            []
          ).map(
            (row) =>
              String(
                row.target_character_id,
              ),
          ),
        )
      : new Set<string>();

  return characters.map(
    (character) => ({
      id: character.id,
      name:
        characterName(character),
      portraitUrl:
        character.portrait_url,
      raceId: character.race_id,
      raceName:
        character.race_id
          ? races.get(
              character.race_id,
            ) ?? null
          : null,
      associationId:
        character.association_id,
      associationName:
        character.association_id
          ? associations.get(
              character.association_id,
            ) ?? null
          : null,
      isFriend:
        friendIds.has(
          character.id,
        ),
    }),
  );
}

export async function flagForumTopic(
  _previousState: FlagTopicState,
  formData: FormData,
): Promise<FlagTopicState> {
  try {
    const topicId = String(
      formData.get("topicId") ?? "",
    ).trim();

    const topicTitle = String(
      formData.get("topicTitle") ??
        "",
    ).trim();

    const sectionId = String(
      formData.get("sectionId") ?? "",
    ).trim();

    const sectionSlug = String(
      formData.get("sectionSlug") ??
        "",
    ).trim();

    const topicSlug = String(
      formData.get("topicSlug") ?? "",
    ).trim();

    const customMessage =
      String(
        formData.get(
          "customMessage",
        ) ?? "",
      )
        .trim()
        .slice(0, 1_000);

    if (
      !topicId ||
      !topicTitle ||
      !sectionId ||
      !sectionSlug ||
      !topicSlug
    ) {
      return {
        ok: false,
        message:
          "The forum topic could not be identified.",
      };
    }

    const selectedCharacterIds =
      new Set(
        values(
          formData,
          "characterIds",
        ),
      );

    const selectedRaceIds =
      new Set(
        values(
          formData,
          "raceIds",
        ),
      );

    const selectedAssociationIds =
      new Set(
        values(
          formData,
          "associationIds",
        ),
      );

    if (
      selectedCharacterIds.size ===
        0 &&
      selectedRaceIds.size === 0 &&
      selectedAssociationIds.size ===
        0
    ) {
      return {
        ok: false,
        message:
          "Choose at least one recipient.",
      };
    }

    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return {
        ok: false,
        message:
          "You must be signed in to flag a topic.",
      };
    }

    const {
      data: senderData,
      error: senderError,
    } = await supabase
      .from("characters")
      .select(
        `
          id,
          user_id,
          display_name,
          first_name,
          surname,
          portrait_url,
          race_id,
          association_id,
          status
        `,
      )
      .eq("user_id", user.id)
      .eq("status", "approved")
      .eq("is_system", false)
      .maybeSingle();

    if (
      senderError ||
      !senderData
    ) {
      return {
        ok: false,
        message:
          senderError?.message ??
          "You need an approved character to flag a topic.",
      };
    }

    const sender =
      senderData as CharacterRow;

    const {
      data: topic,
      error: topicError,
    } = await supabase
      .from("forum_topics")
      .select("id, section_id")
      .eq("id", topicId)
      .eq("section_id", sectionId)
      .is("deleted_at", null)
      .maybeSingle();

    if (
      topicError ||
      !topic
    ) {
      return {
        ok: false,
        message:
          "This forum topic is no longer available.",
      };
    }

    /*
     * SECURITY CHECK:
     * Resolve candidates from the section's actual visibility
     * before applying the user's selection.
     */
    const {
      characters:
        accessibleCharacters,
    } =
      await getAccessibleCharacterRows(
        sectionId,
        sender.id,
      );

    const recipients =
      accessibleCharacters.filter(
        (character) =>
          selectedCharacterIds.has(
            character.id,
          ) ||
          (character.race_id !==
            null &&
            selectedRaceIds.has(
              character.race_id,
            )) ||
          (character.association_id !==
            null &&
            selectedAssociationIds.has(
              character.association_id,
            )),
      );

    if (
      recipients.length === 0
    ) {
      return {
        ok: false,
        message:
          "No selected characters have access to this forum section.",
      };
    }

    if (
      recipients.length >
      MAX_RECIPIENTS_PER_FLAG
    ) {
      return {
        ok: false,
        message: `That selection is too large. Choose no more than ${MAX_RECIPIENTS_PER_FLAG} characters at once.`,
      };
    }

    const senderDisplayName =
      characterName(sender);

    const topicPath =
      `/forum/${encodeURIComponent(
        sectionSlug,
      )}/${encodeURIComponent(
        topicSlug,
      )}`;

    const safeSender =
      escapeHtml(
        senderDisplayName,
      );

    const safeTitle =
      escapeHtml(topicTitle);

    const safePath =
      escapeHtml(topicPath);

    const safeCustomMessage =
      customMessage
        ? escapeHtml(
            customMessage,
          ).replaceAll(
            "\n",
            "<br />",
          )
        : "";

    const messageBody =
      `<div data-forum-flag="true">` +
      `<p><strong>Forum Flag for Reading</strong></p>` +
      `<p><strong>${safeSender}</strong> wants you to read this forum topic:</p>` +
      `<p><strong>${safeTitle}</strong></p>` +
      (safeCustomMessage
        ? `<p><em>Personal note:</em></p><blockquote>${safeCustomMessage}</blockquote>`
        : "") +
      `<p><a href="${safePath}">Open topic →</a></p>` +
      `</div>`;

    let sent = 0;
    let skipped = 0;

    const now = new Date();

    const cooldownSince =
      new Date(
        now.getTime() -
          FLAG_COOLDOWN_MS,
      ).toISOString();

    for (
      const recipient
      of recipients
    ) {
      const {
        data: blocked,
      } = await supabase
        .from(
          "character_blocks",
        )
        .select(
          "blocker_character_id",
        )
        .or(
          [
            `and(blocker_character_id.eq.${sender.id},blocked_character_id.eq.${recipient.id})`,
            `and(blocker_character_id.eq.${recipient.id},blocked_character_id.eq.${sender.id})`,
          ].join(","),
        )
        .limit(1)
        .maybeSingle();

      if (blocked) {
        skipped += 1;
        continue;
      }

      const {
        data: recentFlag,
        error:
          recentFlagError,
      } = await supabase
        .from(
          "forum_topic_flags",
        )
        .select(
          "id, last_flagged_at",
        )
        .eq(
          "topic_id",
          topicId,
        )
        .eq(
          "sender_character_id",
          sender.id,
        )
        .eq(
          "recipient_character_id",
          recipient.id,
        )
        .gte(
          "last_flagged_at",
          cooldownSince,
        )
        .maybeSingle();

      if (recentFlagError) {
        return {
          ok: false,
          message:
            recentFlagError.message,
        };
      }

      if (recentFlag) {
        skipped += 1;
        continue;
      }

      const {
        data: conversationId,
        error:
          conversationError,
      } = await supabase.rpc(
        "start_direct_conversation",
        {
          recipient_character_id:
            recipient.id,
        },
      );

      if (
        conversationError ||
        !conversationId
      ) {
        skipped += 1;
        continue;
      }

      const {
        error: messageError,
      } = await supabase
        .from("direct_messages")
        .insert({
          conversation_id:
            conversationId,
          sender_character_id:
            sender.id,
          body: messageBody,
          client_nonce:
            crypto.randomUUID(),
        });

      if (messageError) {
        skipped += 1;
        continue;
      }

      const timestamp =
        now.toISOString();

      await supabase
        .from(
          "direct_conversations",
        )
        .update({
          updated_at: timestamp,
        })
        .eq(
          "id",
          conversationId,
        );

      await supabase
        .from(
          "direct_conversation_participants",
        )
        .update({
          archived_at: null,
        })
        .eq(
          "conversation_id",
          conversationId,
        );

      const {
        error: flagLogError,
      } = await supabase
        .from(
          "forum_topic_flags",
        )
        .upsert(
          {
            topic_id: topicId,
            sender_character_id:
              sender.id,
            recipient_character_id:
              recipient.id,
            last_flagged_at:
              timestamp,
          },
          {
            onConflict:
              "topic_id,sender_character_id,recipient_character_id",
          },
        );

      if (flagLogError) {
        console.error(
          "Unable to record forum topic flag:",
          flagLogError.message,
        );
      }

      sent += 1;
    }

    revalidatePath(
      "/messages",
    );

    revalidatePath(
      topicPath,
    );

    if (sent === 0) {
      return {
        ok: false,
        message:
          skipped > 0
            ? "No new flags were sent. The selected characters may have been flagged recently or are unavailable."
            : "No flags were sent.",
        sent,
        skipped,
      };
    }

    return {
      ok: true,
      message:
        skipped > 0
          ? `Topic flagged to ${sent} character${sent === 1 ? "" : "s"}. ${skipped} skipped.`
          : `Topic flagged to ${sent} character${sent === 1 ? "" : "s"}.`,
      sent,
      skipped,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to flag this topic.",
    };
  }
}
