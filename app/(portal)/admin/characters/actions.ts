"use server";



import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import {
  revalidatePath,
} from "next/cache";

import {
  requireStaff,
  requireStaffCapability,
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
    await requireStaffCapability(
      "character_edit",
    );

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

  const relationships =
    readOptionalText(
      formData.get(
        "relationships",
      ),
      10000,
    );

  const offgame =
    readOptionalText(
      formData.get(
        "offgame",
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
      relationships,
      offgame,
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

/*
 * Load the character's current Order Vigour modifier too.
 * Base attributes stay stored on characters; Order/Ancestry
 * modifiers are never written into the base columns.
 */
let currentOrderVigourModifier = 0;

const {
  data: orderMembership,
  error: orderMembershipError,
} = await supabase
  .from("order_memberships")
  .select(`
    role:order_jobs!order_memberships_order_job_id_fkey(
      vigour_modifier
    )
  `)
  .eq("character_id", characterId)
  .limit(1)
  .maybeSingle();

if (orderMembershipError) {
  throw new Error(
    `Unable to load Order Vigour modifier: ${orderMembershipError.message}`,
  );
}

const orderRoleRelation =
  orderMembership?.role ?? null;

const orderRole =
  Array.isArray(orderRoleRelation)
    ? orderRoleRelation[0] ?? null
    : orderRoleRelation;

currentOrderVigourModifier =
  orderRole?.vigour_modifier ?? 0;

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
 * FIRST APPROVAL
 * --------------
 * Creation stores BASE health only.
 *
 * On first approval, bring Current Health up by every
 * permanent Vigour modifier already attached to the
 * character:
 *
 *   Ancestry Vigour + Order Vigour
 *
 * Base Vigour itself remains the editable characters.vigor
 * value and is NOT overwritten.
 */
if (isNewApproval) {
  /*
   * A newly approved character has not entered active play yet.
   * Initialise Current Health from the COMPLETE effective Vigour.
   *
   * IMPORTANT:
   * - characters.vigor remains BASE Vigour only.
   * - Ancestry and Order modifiers remain separate.
   * - We SET the starting health here rather than ADDING modifiers,
   *   because character creation may already have initialised health
   *   using the Ancestry modifier.
   *
   * Example:
   * Base Vigour 3 + Ancestry +2 + Order 0 = 5
   * Current Health = 50
   */
  currentHealth =
    Math.max(
      0,
      (
        newBaseVigour +
        newRaceVigourModifier +
        currentOrderVigourModifier
      ) * 10,
    );
} else if (ancestryChanged) {
  /*
   * AFTER APPROVAL
   * --------------
   * Changing Ancestry changes Current Health only by
   * the difference between the old and new Ancestry
   * Vigour modifiers, preserving existing damage.
   */
  currentHealth =
    adjustHealthForVigourModifier({
      currentHealth,
      oldModifier:
        oldRaceVigourModifier,
      newModifier:
        newRaceVigourModifier,
    });
} else {
  /*
   * LEGACY / STALE-HEALTH REPAIR
   * ----------------------------
   * Older approved characters may still have Current
   * Health equal to BASE Vigour × 10 because their
   * Ancestry/Order modifiers were never applied.
   *
   * When staff save such a record unchanged, repair it
   * once by adding the currently active permanent
   * Vigour modifiers.
   *
   * Example:
   *   Base Vigour 3
   *   Current Health 30
   *   Ancestry +2
   *   Order 0
   *
   * becomes 50 Current Health while BASE Vigour stays 3.
   */
  const hasPermanentVigourModifier =
    newRaceVigourModifier !== 0 ||
    currentOrderVigourModifier !== 0;

  const looksLikeUnmodifiedBaseHealth =
    character.status === "approved" &&
    character.current_health ===
      oldBaseVigour * 10 &&
    submittedCurrentHealth ===
      character.current_health &&
    oldBaseVigour ===
      newBaseVigour &&
    hasPermanentVigourModifier;

  if (looksLikeUnmodifiedBaseHealth) {
    currentHealth =
      adjustHealthForVigourModifier({
        currentHealth,
        oldModifier: 0,
        newModifier:
          newRaceVigourModifier +
          currentOrderVigourModifier,
      });
  }
}

currentHealth =
  Math.max(
    0,
    currentHealth,
  );

  const candidatePayload:
    Record<string, unknown> = {
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
      relationships,
      offgame,
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

  const currentValues:
    Record<string, unknown> = {
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
      relationships:
        character.relationships,
      offgame:
        character.offgame,
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
        character
          .approval_notice_seen_at,
    };

  const updatePayload:
    Record<string, unknown> =
      Object.fromEntries(
        Object.entries(
          candidatePayload,
        ).filter(
          ([key, value]) =>
            currentValues[key] !==
            value,
        ),
      );

  if (
    Object.keys(
      updatePayload,
    ).length > 0
  ) {
    updatePayload.updated_at =
      now;

    const {
      error: updateError,
    } = await supabase
      .from("characters")
      .update(updatePayload)
      .eq(
        "id",
        characterId,
      );

    if (updateError) {
      throw new Error(
        `Unable to update character: ${updateError.message}`,
      );
    }
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
          relationships:
            character.relationships,
          offgame:
            character.offgame,
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

  /*
   * INSTANT CHAT
   * ------------
   * Instant Chat becomes available when a character is
   * approved for the first time.
   *
   * Older characters already have this row. Newer characters
   * may not, so upsert makes this safe for both cases.
   *
   * ignoreDuplicates preserves an existing player's enabled /
   * disabled preference rather than resetting it to true.
   */
  if (isNewApproval) {
    /*
     * This is an administrative provisioning action.
     * The ordinary session client is subject to the player's RLS policy
     * and cannot insert settings for a character merely because an admin
     * is approving it. Use the existing service-role client here instead.
     */
    const instantChatAdmin =
      createPrivilegedClient();

    const {
      error: instantChatSettingsError,
    } = await instantChatAdmin
      .from("instant_chat_settings")
      .upsert(
        {
          character_id:
            characterId,
          enabled: true,
        },
        {
          onConflict:
            "character_id",
          ignoreDuplicates: true,
        },
      );

    if (instantChatSettingsError) {
      throw new Error(
        `The character was approved, but Instant Chat could not be initialised: ${instantChatSettingsError.message}`,
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
  await requireStaffCapability(
    "character_delete",
  );

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
    data: characterDeleted,
    error: deleteError,
  } = await supabase.rpc(
    "delete_character_completely",
    {
      p_character_id:
        characterId,
    },
  );

  if (deleteError) {
    throw new Error(
      `Unable to delete character: ${deleteError.message}`,
    );
  }

  if (characterDeleted !== true) {
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

const CHARACTER_FEATURE_KEYS = [
  "private_chat",
  "friend_list",
] as const;

type CharacterFeatureKey =
  (typeof CHARACTER_FEATURE_KEYS)[number];

const CHARACTER_FEATURE_SOURCES = [
  "paid",
  "expertise",
  "staff",
] as const;

type CharacterFeatureSource =
  (typeof CHARACTER_FEATURE_SOURCES)[number];


export async function setCharacterPortalSkinEntitlement(
  formData: FormData,
) {
  const staff = await requireStaff();

  const characterId =
    readRequiredUuid(
      formData.get("characterId"),
    );

  const skinId =
    readRequiredUuid(
      formData.get("skinId"),
    );

  const enabledRaw =
    formData.get("enabled");

  const enabled =
    enabledRaw === "true"
      ? true
      : enabledRaw === "false"
        ? false
        : null;

  if (enabled === null) {
    throw new Error(
      "The selected portal skin access value is invalid.",
    );
  }

  const sourceRaw =
    formData.get("source");

  const source =
    sourceRaw === "paid" ||
    sourceRaw === "staff"
      ? sourceRaw
      : null;

  if (!source) {
    throw new Error(
      "The selected portal skin unlock source is invalid.",
    );
  }

  const note =
    readOptionalText(
      formData.get("note"),
      1000,
    );

  const admin =
    createPrivilegedClient();

  const {
    data: character,
    error: characterError,
  } = await admin
    .from("characters")
    .select("id, user_id")
    .eq("id", characterId)
    .maybeSingle();

  if (
    characterError ||
    !character
  ) {
    throw new Error(
      `Unable to load the selected character account: ${
        characterError?.message ??
        "Character not found."
      }`,
    );
  }

  const {
    data: skin,
    error: skinError,
  } = await admin
    .from("portal_skins")
    .select(
      "id, slug, name, is_default",
    )
    .eq("id", skinId)
    .maybeSingle();

  if (
    skinError ||
    !skin
  ) {
    throw new Error(
      `Unable to load the selected portal skin: ${
        skinError?.message ??
        "Skin not found."
      }`,
    );
  }

  if (skin.is_default === true) {
    throw new Error(
      "The default Sepulchria skin does not require premium access.",
    );
  }

  const now =
    new Date().toISOString();

  const {
    error: entitlementError,
  } = await admin
    .from(
      "user_portal_skin_entitlements",
    )
    .upsert(
      {
        user_id:
          character.user_id,
        skin_id:
          skinId,
        enabled,
        source,
        note,
        granted_by:
          staff.userId,
        granted_at:
          now,
        updated_at:
          now,
      },
      {
        onConflict:
          "user_id,skin_id",
      },
    );

  if (entitlementError) {
    throw new Error(
      `Unable to update portal skin access: ${entitlementError.message}`,
    );
  }

  if (!enabled) {
    const {
      data: preference,
      error: preferenceError,
    } = await admin
      .from(
        "user_portal_preferences",
      )
      .select(
        "selected_skin_id",
      )
      .eq(
        "user_id",
        character.user_id,
      )
      .maybeSingle();

    if (preferenceError) {
      throw new Error(
        `Portal skin access was updated, but the account preference could not be checked: ${preferenceError.message}`,
      );
    }

    if (
      preference?.selected_skin_id ===
      skinId
    ) {
      const {
        data: defaultSkin,
        error: defaultSkinError,
      } = await admin
        .from("portal_skins")
        .select("id")
        .eq("is_default", true)
        .eq("is_active", true)
        .maybeSingle();

      if (
        defaultSkinError ||
        !defaultSkin
      ) {
        throw new Error(
          `Portal skin access was revoked, but the account could not be returned to Sepulchria: ${
            defaultSkinError?.message ??
            "Default skin not found."
          }`,
        );
      }

      const {
        error: resetError,
      } = await admin
        .from(
          "user_portal_preferences",
        )
        .upsert(
          {
            user_id:
              character.user_id,
            selected_skin_id:
              defaultSkin.id,
            updated_at:
              now,
          },
          {
            onConflict:
              "user_id",
          },
        );

      if (resetError) {
        throw new Error(
          `Portal skin access was revoked, but the account could not be returned to Sepulchria: ${resetError.message}`,
        );
      }
    }
  }

  revalidatePath(
    `/admin/characters/${characterId}`,
  );
  revalidatePath("/appearance");
}


export async function setCharacterFeatureEntitlement(
  formData: FormData,
) {
  const staff = await requireStaff();

  const characterId =
    readRequiredUuid(formData.get("characterId"));

  const featureKeyRaw =
    String(formData.get("featureKey") ?? "").trim();

  if (
    !CHARACTER_FEATURE_KEYS.includes(
      featureKeyRaw as CharacterFeatureKey,
    )
  ) {
    throw new Error("The selected feature is invalid.");
  }

  const sourceRaw =
    String(formData.get("source") ?? "").trim();

  if (
    !CHARACTER_FEATURE_SOURCES.includes(
      sourceRaw as CharacterFeatureSource,
    )
  ) {
    throw new Error("The selected unlock source is invalid.");
  }

  const enabled =
    String(formData.get("enabled") ?? "false") === "true";

  const note =
    readOptionalText(formData.get("note"), 1000);

  const admin = createPrivilegedClient();

  const { data: character, error: characterError } =
    await admin
      .from("characters")
      .select("id")
      .eq("id", characterId)
      .maybeSingle();

  if (characterError || !character) {
    throw new Error(
      characterError?.message ?? "Character not found.",
    );
  }

  const now = new Date().toISOString();

  const { error } = await admin
    .from("character_feature_entitlements")
    .upsert(
      {
        character_id: characterId,
        feature_key: featureKeyRaw,
        enabled,
        source: sourceRaw,
        note,
        granted_by: staff.userId,
        granted_at: now,
        updated_at: now,
      },
      {
        onConflict: "character_id,feature_key",
      },
    );

  if (error) {
    throw new Error(
      `Unable to update feature access: ${error.message}`,
    );
  }

  revalidatePath(`/admin/characters/${characterId}`);
}

