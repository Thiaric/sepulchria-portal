"use server";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  requireAdmin,
  requireStaff,
} from "@/lib/auth/require-staff";
import { adjustHealthForVigourModifier } from "@/lib/characters/adjust-health-for-vigour-modifier";
import { createClient } from "@/lib/supabase/server";

const CHARACTER_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
] as const;

type CharacterStatus =
  (typeof CHARACTER_STATUSES)[number];

function readOptionalUuid(
  value: FormDataEntryValue | null,
): string | null {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return null;
  }

  const trimmed = value.trim();

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(trimmed)) {
    throw new Error(
      "An invalid identifier was submitted.",
    );
  }

  return trimmed;
}

function readRequiredUuid(
  value: FormDataEntryValue | null,
): string {
  const parsed =
    readOptionalUuid(value);

  if (!parsed) {
    throw new Error(
      "The character identifier is missing.",
    );
  }

  return parsed;
}

function readStatus(
  value: FormDataEntryValue | null,
): CharacterStatus {
  if (
    typeof value !== "string" ||
    !CHARACTER_STATUSES.includes(
      value as CharacterStatus,
    )
  ) {
    throw new Error(
      "The selected character status is invalid.",
    );
  }

  return value as CharacterStatus;
}

function readOptionalText(
  value: FormDataEntryValue | null,
  maxLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(
    0,
    maxLength,
  );
}

const ATTRIBUTE_NAMES = [
  "muscles",
  "reflexes",
  "vigor",
  "brains",
  "shrewd",
  "presence_score",
] as const;

type AttributeName =
  (typeof ATTRIBUTE_NAMES)[number];

function readOptionalAttributes(
  formData: FormData,
): Record<
  AttributeName,
  number | null
> {
  const rawValues =
    ATTRIBUTE_NAMES.map((name) =>
      String(
        formData.get(name) ?? "",
      ).trim(),
    );

  if (
    rawValues.every(
      (value) => value === "",
    )
  ) {
    return {
      muscles: null,
      reflexes: null,
      vigor: null,
      brains: null,
      shrewd: null,
      presence_score: null,
    };
  }

  const values =
    rawValues.map(Number);

  if (
    !values.every(
      (value) =>
        Number.isInteger(value) &&
        value >= 1 &&
        value <= 8,
    )
  ) {
    throw new Error(
      "Every attribute must be a whole number between 1 and 8.",
    );
  }


  return Object.fromEntries(
    ATTRIBUTE_NAMES.map(
      (name, index) => [
        name,
        values[index],
      ],
    ),
  ) as Record<
    AttributeName,
    number | null
  >;
}

function validateAdminPortraitUrl(
  value: string | null,
) {
  if (
    !value ||
    value.startsWith("/")
  ) {
    return;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      throw new Error();
    }
  } catch {
    throw new Error(
      "Portrait URL must be a valid HTTP or HTTPS URL.",
    );
  }
}

function validateAdminMusicUrl(
  value: string | null,
) {
  if (!value) {
    return;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      throw new Error();
    }
  } catch {
    throw new Error(
      "Character music URL must be a valid HTTP or HTTPS URL.",
    );
  }
}

function readReturnPath(
  value: FormDataEntryValue | null,
): string {
  if (
    typeof value !== "string" ||
    !value.startsWith(
      "/admin/characters",
    )
  ) {
    return "/admin/characters";
  }

  return value;
}

function createPrivilegedClient() {
  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const secret =
    process.env
      .SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.",
    );
  }

  return createAdminClient(
    url,
    secret,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export async function updateCharacterAdministration(
  formData: FormData,
) {
  const staff =
    await requireStaff();

  const characterId =
    readRequiredUuid(
      formData.get(
        "characterId",
      ),
    );

  const raceId =
    readOptionalUuid(
      formData.get("raceId"),
    );

  const status =
    readStatus(
      formData.get("status"),
    );

  const title =
    readOptionalText(
      formData.get("title"),
      120,
    );

  const firstName =
    readOptionalText(
      formData.get(
        "firstName",
      ),
      80,
    );

  const surname =
    readOptionalText(
      formData.get("surname"),
      80,
    );

  if (!firstName || !surname) {
    throw new Error(
      "First name and surname are required.",
    );
  }

  const pronouns =
    readOptionalText(
      formData.get(
        "pronouns",
      ),
      80,
    );

  const gender =
    readOptionalText(
      formData.get("gender"),
      20,
    );

  if (
    !gender ||
    ![
      "male",
      "female",
      "non_binary",
    ].includes(gender)
  ) {
    throw new Error(
      "A valid gender must be selected.",
    );
  }

  const sexualOrientation =
    readOptionalText(
      formData.get(
        "sexualOrientation",
      ),
      120,
    );

  const dateOfBirth =
    readOptionalText(
      formData.get(
        "dateOfBirth",
      ),
      20,
    );

  const birthplace =
    readOptionalText(
      formData.get(
        "birthplace",
      ),
      160,
    );

  const origin =
    readOptionalText(
      formData.get("origin"),
      160,
    );

  const portraitUrl =
    readOptionalText(
      formData.get(
        "portraitUrl",
      ),
      1000,
    );

  validateAdminPortraitUrl(
    portraitUrl,
  );

  const musicUrl =
    readOptionalText(
      formData.get("musicUrl"),
      2000,
    );

  validateAdminMusicUrl(
    musicUrl,
  );

  const physicalDescription =
    readOptionalText(
      formData.get(
        "physicalDescription",
      ),
      10000,
    );

  const personality =
    readOptionalText(
      formData.get(
        "personality",
      ),
      10000,
    );

  const biography =
    readOptionalText(
      formData.get(
        "biography",
      ),
      20000,
    );

  const publicNotes =
    readOptionalText(
      formData.get(
        "publicNotes",
      ),
      10000,
    );

  const attributes =
    readOptionalAttributes(
      formData,
    );

  const currentHealthRaw =
    String(
      formData.get(
        "currentHealth",
      ) ?? "",
    ).trim();

  let submittedCurrentHealth:
    number | null = null;

  if (
    currentHealthRaw !== ""
  ) {
    const parsedCurrentHealth =
      Number(currentHealthRaw);

    if (
      !Number.isInteger(
        parsedCurrentHealth,
      ) ||
      parsedCurrentHealth < 0
    ) {
      throw new Error(
        "Current Health must be a whole number of 0 or more.",
      );
    }

    submittedCurrentHealth =
      parsedCurrentHealth;
  }

  const staffNotes =
    readOptionalText(
      formData.get(
        "staffNotes",
      ),
      10000,
    );

  const submittedRejectionReason =
    readOptionalText(
      formData.get(
        "rejectionReason",
      ),
      5000,
    );

  if (
    status === "rejected" &&
    !submittedRejectionReason
  ) {
    throw new Error(
      "A rejection reason is required when rejecting a character.",
    );
  }

  const rejectionReason =
    status === "rejected"
      ? submittedRejectionReason
      : null;

  const returnTo =
    readReturnPath(
      formData.get(
        "returnTo",
      ),
    );

  const supabase =
    await createClient();

  const {
    data: character,
    error: readError,
  } = await supabase
    .from("characters")
    .select(`
      public_slug,
      first_name,
      surname,
      pronouns,
      gender,
      sexual_orientation,
      date_of_birth,
      birthplace,
      origin,
      portrait_url,
      music_url,
      physical_description,
      personality,
      biography,
      public_notes,
      muscles,
      reflexes,
      vigor,
      brains,
      shrewd,
      presence_score,
      current_health,
      status,
      race_id,
      title,
      staff_notes,
      rejection_reason,
      approved_at,
      approved_by,
      approval_notice_seen_at,
      updated_at
    `)
    .eq("id", characterId)
    .single();

  if (
    readError ||
    !character
  ) {
    throw new Error(
      `Unable to find character: ${
        readError?.message ??
        "Character not found."
      }`,
    );
  }

  const raceIds = [
  character.race_id,
  raceId,
].filter(
  (value): value is string =>
    Boolean(value),
);

let oldRaceVigourModifier = 0;
let newRaceVigourModifier = 0;

if (raceIds.length > 0) {
  const {
    data: raceModifierRows,
    error: raceModifierError,
  } = await supabase
    .from("races")
    .select(
      "id, vigour_modifier",
    )
    .in("id", raceIds);

  if (raceModifierError) {
    throw new Error(
      `Unable to load Ancestry Vigour modifiers: ${raceModifierError.message}`,
    );
  }

  oldRaceVigourModifier =
    raceModifierRows?.find(
      (race) =>
        race.id ===
        character.race_id,
    )?.vigour_modifier ?? 0;

  newRaceVigourModifier =
    raceModifierRows?.find(
      (race) =>
        race.id === raceId,
    )?.vigour_modifier ?? 0;
}

const ancestryChanged =
  character.race_id !== raceId;

  if (
    status === "approved"
  ) {
    const missingFields:
      string[] = [];

    if (!firstName) {
      missingFields.push(
        "first name",
      );
    }

    if (!surname) {
      missingFields.push(
        "surname",
      );
    }

    if (!raceId) {
      missingFields.push(
        "race",
      );
    }

    if (
      !physicalDescription
    ) {
      missingFields.push(
        "physical description",
      );
    }

    if (!personality) {
      missingFields.push(
        "personality",
      );
    }

    if (!biography) {
      missingFields.push(
        "biography",
      );
    }

    if (
      !character.public_slug?.trim()
    ) {
      missingFields.push(
        "public slug",
      );
    }

    const attributeValues = [
      attributes.muscles,
      attributes.reflexes,
      attributes.vigor,
      attributes.brains,
      attributes.shrewd,
      attributes.presence_score,
    ];

    if (
      character.status !==
        "approved" &&
      !attributeValues.every(
        (value) =>
          value !== null,
      )
    ) {
      missingFields.push(
        "character attributes",
      );
    }

    if (
      missingFields.length > 0
    ) {
      throw new Error(
        `This character cannot be approved until the following fields are completed: ${missingFields.join(
          ", ",
        )}.`,
      );
    }
  }

  const now =
    new Date().toISOString();

  const isNewApproval =
    status === "approved" &&
    character.status !==
      "approved";

  const approvalData =
    status === "approved"
      ? {
          approved_at:
            character.approved_at ??
            now,
          approved_by:
            character.approved_by ??
            staff.userId,
          approval_notice_seen_at:
            isNewApproval
              ? null
              : undefined,
        }
      : {
          approved_at: null,
          approved_by: null,
          approval_notice_seen_at:
            null,
        };

  const oldBaseVigour =
  character.vigor ?? 0;

const newBaseVigour =
  attributes.vigor ?? 0;

let currentHealth =
  submittedCurrentHealth ??
  character.current_health ??
  oldBaseVigour * 10;

/*
 * If staff changed the character's BASE
 * Vigour manually, preserve the existing
 * health difference.
 */
if (
  oldBaseVigour !==
  newBaseVigour
) {
  currentHealth +=
    (newBaseVigour -
      oldBaseVigour) *
    10;
}

/*
 * Changing Ancestry is an event.
 *
 * Apply ONLY the difference between the
 * old and new Ancestry Vigour modifier.
 *
 * Example:
 * old ancestry +1
 * new ancestry +3
 * current HP 24
 *
 * 24 + ((3 - 1) × 10) = 44
 */
if (ancestryChanged) {
  currentHealth =
    adjustHealthForVigourModifier({
      currentHealth,
      oldModifier:
        oldRaceVigourModifier,
      newModifier:
        newRaceVigourModifier,
    });
}

currentHealth =
  Math.max(
    0,
    currentHealth,
  );

  const updatePayload = {
    first_name: firstName,
    surname,
    pronouns,
    gender,
    sexual_orientation:
      sexualOrientation,
    date_of_birth:
      dateOfBirth,
    birthplace,
    origin,
    portrait_url:
      portraitUrl,
    music_url: musicUrl,
    physical_description:
      physicalDescription,
    personality,
    biography,
    public_notes:
      publicNotes,
    ...attributes,
    current_health:
      currentHealth,
    race_id: raceId,
    status,
    title,
    staff_notes:
      staffNotes,
    rejection_reason:
      rejectionReason,
    approved_at:
      approvalData.approved_at,
    approved_by:
      approvalData.approved_by,
    updated_at: now,
    ...(approvalData
      .approval_notice_seen_at !==
    undefined
      ? {
          approval_notice_seen_at:
            approvalData
              .approval_notice_seen_at,
        }
      : {}),
  };

  const {
    error: updateError,
  } = await supabase
    .from("characters")
    .update(updatePayload)
    .eq("id", characterId);

  if (updateError) {
    throw new Error(
      `Unable to update character: ${updateError.message}`,
    );
  }

  if (
    character.status !==
    status
  ) {
    const {
      error: historyError,
    } = await supabase
      .from(
        "character_status_history",
      )
      .insert({
        character_id:
          characterId,
        old_status:
          character.status,
        new_status: status,
        changed_by:
          staff.userId,
        reason:
          status === "rejected"
            ? rejectionReason
            : null,
      });

    if (historyError) {
      const {
        error: rollbackError,
      } = await supabase
        .from("characters")
        .update({
          first_name:
            character.first_name,
          surname:
            character.surname,
          pronouns:
            character.pronouns,
          gender:
            character.gender,
          sexual_orientation:
            character.sexual_orientation,
          date_of_birth:
            character.date_of_birth,
          birthplace:
            character.birthplace,
          origin:
            character.origin,
          portrait_url:
            character.portrait_url,
          music_url:
            character.music_url,
          physical_description:
            character.physical_description,
          personality:
            character.personality,
          biography:
            character.biography,
          public_notes:
            character.public_notes,
          muscles:
            character.muscles,
          reflexes:
            character.reflexes,
          vigor:
            character.vigor,
          brains:
            character.brains,
          shrewd:
            character.shrewd,
          presence_score:
            character.presence_score,
          current_health:
            character.current_health,
          race_id:
            character.race_id,
          status:
            character.status,
          title:
            character.title,
          staff_notes:
            character.staff_notes,
          rejection_reason:
            character.rejection_reason,
          approved_at:
            character.approved_at,
          approved_by:
            character.approved_by,
          approval_notice_seen_at:
            character.approval_notice_seen_at,
          updated_at:
            character.updated_at,
        })
        .eq(
          "id",
          characterId,
        );

      if (rollbackError) {
        throw new Error(
          `The status history could not be recorded (${historyError.message}) and the previous character state could not be restored (${rollbackError.message}).`,
        );
      }

      throw new Error(
        `Unable to record the character status change: ${historyError.message}`,
      );
    }
  }

  revalidatePath("/admin");
  revalidatePath(
    "/admin/characters",
  );
  revalidatePath(
    `/admin/characters/${characterId}`,
  );
  revalidatePath("/character");
  revalidatePath("/characters");

  if (
    character.public_slug
  ) {
    revalidatePath(
      `/characters/${character.public_slug}`,
    );
  }

  redirect(returnTo);
}

export async function deleteCharacterAdministration(
  formData: FormData,
) {
  await requireAdmin();

  const characterId =
    readRequiredUuid(
      formData.get(
        "characterId",
      ),
    );

  const confirmation =
    readOptionalText(
      formData.get(
        "confirmation",
      ),
      200,
    );

  if (!confirmation) {
    throw new Error(
      "Type the character name to confirm deletion.",
    );
  }

  const supabase =
    createPrivilegedClient();

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select(`
      id,
      user_id,
      public_slug,
      first_name,
      surname,
      display_name,
      status
    `)
    .eq("id", characterId)
    .maybeSingle();

  if (
    characterError ||
    !character
  ) {
    throw new Error(
      `Unable to find character: ${
        characterError?.message ??
        "Character not found."
      }`,
    );
  }

  const expectedName =
    character.display_name?.trim() ||
    `${character.first_name ?? ""} ${
      character.surname ?? ""
    }`.trim();

  if (
    confirmation.trim() !==
    expectedName
  ) {
    throw new Error(
      `Confirmation does not match "${expectedName}".`,
    );
  }

  const {
    error: forumPostsError,
  } = await supabase
    .from("forum_posts")
    .delete()
    .eq(
      "author_character_id",
      characterId,
    );

  if (forumPostsError) {
    throw new Error(
      `Unable to delete forum replies: ${forumPostsError.message}`,
    );
  }

  const {
    error: forumTopicsError,
  } = await supabase
    .from("forum_topics")
    .update({
      author_character_id:
        null,
    })
    .eq(
      "author_character_id",
      characterId,
    );

  if (forumTopicsError) {
    throw new Error(
      `Unable to preserve forum topics: ${forumTopicsError.message}`,
    );
  }

  const {
    error: presenceError,
  } = await supabase
    .from(
      "character_presence",
    )
    .delete()
    .eq(
      "character_id",
      characterId,
    );

  if (presenceError) {
    throw new Error(
      `Unable to delete character presence: ${presenceError.message}`,
    );
  }

  const {
    error: roomMessagesError,
  } = await supabase
    .from("room_messages")
    .delete()
    .eq(
      "character_id",
      characterId,
    );

  if (roomMessagesError) {
    throw new Error(
      `Unable to delete location messages: ${roomMessagesError.message}`,
    );
  }

  const {
    data: conversationMemberships,
    error: conversationLookupError,
  } = await supabase
    .from(
      "direct_conversation_participants",
    )
    .select("conversation_id")
    .eq(
      "character_id",
      characterId,
    );

  if (
    conversationLookupError
  ) {
    throw new Error(
      `Unable to find the character's private conversations: ${conversationLookupError.message}`,
    );
  }

  const conversationIds =
    Array.from(
      new Set(
        (
          conversationMemberships ??
          []
        )
          .map(
            (membership) =>
              membership.conversation_id,
          )
          .filter(Boolean),
      ),
    );

  if (
    conversationIds.length >
    0
  ) {
    const {
      error: conversationMessagesError,
    } = await supabase
      .from(
        "direct_messages",
      )
      .delete()
      .in(
        "conversation_id",
        conversationIds,
      );

    if (
      conversationMessagesError
    ) {
      throw new Error(
        `Unable to delete private-conversation messages: ${conversationMessagesError.message}`,
      );
    }

    const {
      error:
        conversationParticipantsError,
    } = await supabase
      .from(
        "direct_conversation_participants",
      )
      .delete()
      .in(
        "conversation_id",
        conversationIds,
      );

    if (
      conversationParticipantsError
    ) {
      throw new Error(
        `Unable to delete private-conversation participants: ${conversationParticipantsError.message}`,
      );
    }

    const {
      error: conversationsError,
    } = await supabase
      .from(
        "direct_conversations",
      )
      .delete()
      .in(
        "id",
        conversationIds,
      );

    if (conversationsError) {
      throw new Error(
        `Unable to delete private conversations: ${conversationsError.message}`,
      );
    }
  }

  const {
    error:
      remainingDirectMessagesError,
  } = await supabase
    .from("direct_messages")
    .delete()
    .eq(
      "sender_character_id",
      characterId,
    );

  if (
    remainingDirectMessagesError
  ) {
    throw new Error(
      `Unable to delete remaining private messages: ${remainingDirectMessagesError.message}`,
    );
  }

  const {
    error:
      remainingParticipantsError,
  } = await supabase
    .from(
      "direct_conversation_participants",
    )
    .delete()
    .eq(
      "character_id",
      characterId,
    );

  if (
    remainingParticipantsError
  ) {
    throw new Error(
      `Unable to remove remaining private-conversation memberships: ${remainingParticipantsError.message}`,
    );
  }

  const {
    error:
      blocksAsBlockerError,
  } = await supabase
    .from("character_blocks")
    .delete()
    .eq(
      "blocker_character_id",
      characterId,
    );

  if (
    blocksAsBlockerError
  ) {
    throw new Error(
      `Unable to delete character blocks: ${blocksAsBlockerError.message}`,
    );
  }

  const {
    error:
      blocksAsBlockedError,
  } = await supabase
    .from("character_blocks")
    .delete()
    .eq(
      "blocked_character_id",
      characterId,
    );

  if (
    blocksAsBlockedError
  ) {
    throw new Error(
      `Unable to delete character blocks: ${blocksAsBlockedError.message}`,
    );
  }

  const {
    error: statusHistoryError,
  } = await supabase
    .from(
      "character_status_history",
    )
    .delete()
    .eq(
      "character_id",
      characterId,
    );

  if (statusHistoryError) {
    throw new Error(
      `Unable to delete character status history: ${statusHistoryError.message}`,
    );
  }

  const {
    data: deletedCharacter,
    error: deleteError,
  } = await supabase
    .from("characters")
    .delete()
    .eq("id", characterId)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    throw new Error(
      `Unable to delete character: ${deleteError.message}`,
    );
  }

  if (!deletedCharacter) {
    throw new Error(
      "The character could not be deleted. No character row was removed.",
    );
  }

  const {
    data: remainingCharacter,
    error: verificationError,
  } = await supabase
    .from("characters")
    .select("id")
    .eq("id", characterId)
    .maybeSingle();

  if (verificationError) {
    throw new Error(
      `Unable to verify character deletion: ${verificationError.message}`,
    );
  }

  if (remainingCharacter) {
    throw new Error(
      "Character deletion failed: the character still exists after the delete operation.",
    );
  }

  revalidatePath("/");
  revalidatePath("/game");
  revalidatePath("/character");
  revalidatePath("/characters");
  revalidatePath("/messages");
  revalidatePath("/forum");
  revalidatePath("/admin");
  revalidatePath(
    "/admin/characters",
  );

  if (
    character.public_slug
  ) {
    revalidatePath(
      `/characters/${character.public_slug}`,
    );
  }

  redirect(
    "/admin/characters",
  );
}
