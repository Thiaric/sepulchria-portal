"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  requireAdmin,
  requireStaff,
} from "@/lib/auth/require-staff";
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
  const parsed = readOptionalUuid(value);

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

  return trimmed.slice(0, maxLength);
}

function readReturnPath(
  value: FormDataEntryValue | null,
): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/admin/characters")
  ) {
    return "/admin/characters";
  }

  return value;
}

export async function updateCharacterAdministration(
  formData: FormData,
) {
  const staff = await requireStaff();

  const characterId = readRequiredUuid(
    formData.get("characterId"),
  );

  const raceId = readOptionalUuid(
    formData.get("raceId"),
  );

  const associationId = readOptionalUuid(
    formData.get("associationId"),
  );

  const status = readStatus(
    formData.get("status"),
  );

  const title = readOptionalText(
    formData.get("title"),
    120,
  );

  const staffNotes = readOptionalText(
    formData.get("staffNotes"),
    10000,
  );

  const submittedRejectionReason =
    readOptionalText(
      formData.get("rejectionReason"),
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

  const returnTo = readReturnPath(
    formData.get("returnTo"),
  );

  const supabase = await createClient();

  const {
    data: character,
    error: readError,
  } = await supabase
    .from("characters")
    .select(`
      public_slug,
      first_name,
      surname,
      physical_description,
      personality,
      biography,
      status,
      race_id,
      association_id,
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

  if (readError || !character) {
    throw new Error(
      `Unable to find character: ${
        readError?.message ??
        "Character not found."
      }`,
    );
  }

  if (status === "approved") {
    const missingFields: string[] = [];

    if (!character.first_name?.trim()) {
      missingFields.push("first name");
    }

    if (!character.surname?.trim()) {
      missingFields.push("surname");
    }

    if (!raceId) {
      missingFields.push("race");
    }

    if (!associationId) {
      missingFields.push("Association");
    }

    if (!character.physical_description?.trim()) {
      missingFields.push("physical description");
    }

    if (!character.personality?.trim()) {
      missingFields.push("personality");
    }

    if (!character.biography?.trim()) {
      missingFields.push("biography");
    }

    if (!character.public_slug?.trim()) {
      missingFields.push("public slug");
    }

    if (missingFields.length > 0) {
      throw new Error(
        `This character cannot be approved until the following fields are completed: ${missingFields.join(
          ", ",
        )}.`,
      );
    }
  }

  const now = new Date().toISOString();
  const isNewApproval =
    status === "approved" &&
    character.status !== "approved";

  const approvalData =
    status === "approved"
      ? {
          approved_at:
            character.approved_at ?? now,
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
          approval_notice_seen_at: null,
        };

  const updatePayload = {
    race_id: raceId,
    association_id: associationId,
    status,
    title,
    staff_notes: staffNotes,
    rejection_reason: rejectionReason,
    approved_at: approvalData.approved_at,
    approved_by: approvalData.approved_by,
    updated_at: now,
    ...(approvalData.approval_notice_seen_at !==
    undefined
      ? {
          approval_notice_seen_at:
            approvalData.approval_notice_seen_at,
        }
      : {}),
  };

  const { error: updateError } =
    await supabase
      .from("characters")
      .update(updatePayload)
      .eq("id", characterId);

  if (updateError) {
    throw new Error(
      `Unable to update character: ${updateError.message}`,
    );
  }

  if (character.status !== status) {
    const { error: historyError } =
      await supabase
        .from("character_status_history")
        .insert({
          character_id: characterId,
          old_status: character.status,
          new_status: status,
          changed_by: staff.userId,
          reason:
            status === "rejected"
              ? rejectionReason
              : null,
        });

    if (historyError) {
      const { error: rollbackError } =
        await supabase
          .from("characters")
          .update({
            race_id: character.race_id,
            association_id: character.association_id,
            status: character.status,
            title: character.title,
            staff_notes: character.staff_notes,
            rejection_reason: character.rejection_reason,
            approved_at: character.approved_at,
            approved_by: character.approved_by,
            approval_notice_seen_at:
              character.approval_notice_seen_at,
            updated_at: character.updated_at,
          })
          .eq("id", characterId);

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
  revalidatePath("/admin/characters");
  revalidatePath(
    `/admin/characters/${characterId}`,
  );
  revalidatePath("/character");
  revalidatePath("/characters");

  if (character.public_slug) {
    revalidatePath(
      `/characters/${character.public_slug}`,
    );
  }

  redirect(returnTo);
}

export async function deleteCharacterAdministration(
  formData: FormData,
) {
  /*
   * requireAdmin() should permit only the roles configured
   * as administrators/owners in the project.
   */
  await requireAdmin();

  const characterId = readRequiredUuid(
    formData.get("characterId"),
  );

  const confirmation = readOptionalText(
    formData.get("confirmation"),
    200,
  );

  if (!confirmation) {
    throw new Error(
      "Type the character name to confirm deletion.",
    );
  }

  const supabase = await createClient();

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

  if (characterError || !character) {
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
    confirmation.trim() !== expectedName
  ) {
    throw new Error(
      `Confirmation does not match "${expectedName}".`,
    );
  }

  /*
   * Preserve forum discussions while removing the link
   * to the deleted character.
   */
  const {
    error: forumPostsError,
  } = await supabase
    .from("forum_posts")
    .update({
      author_character_id: null,
    })
    .eq(
      "author_character_id",
      characterId,
    );

  if (forumPostsError) {
    throw new Error(
      `Unable to anonymise forum posts: ${forumPostsError.message}`,
    );
  }

  const {
    error: forumTopicsError,
  } = await supabase
    .from("forum_topics")
    .update({
      author_character_id: null,
    })
    .eq(
      "author_character_id",
      characterId,
    );

  if (forumTopicsError) {
    throw new Error(
      `Unable to anonymise forum topics: ${forumTopicsError.message}`,
    );
  }

  /*
   * Delete dependent records before deleting the character.
   * These operations are intentionally sequential so that
   * any database error clearly identifies the affected table.
   */

  const {
    error: presenceError,
  } = await supabase
    .from("character_presence")
    .delete()
    .eq("character_id", characterId);

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
    .eq("character_id", characterId);

  if (roomMessagesError) {
    throw new Error(
      `Unable to delete room messages: ${roomMessagesError.message}`,
    );
  }

  const {
    error: directMessagesError,
  } = await supabase
    .from("direct_messages")
    .delete()
    .eq(
      "sender_character_id",
      characterId,
    );

  if (directMessagesError) {
    throw new Error(
      `Unable to delete direct messages: ${directMessagesError.message}`,
    );
  }

  const {
    error: participantsError,
  } = await supabase
    .from(
      "direct_conversation_participants",
    )
    .delete()
    .eq("character_id", characterId);

  if (participantsError) {
    throw new Error(
      `Unable to remove character from conversations: ${participantsError.message}`,
    );
  }

  const {
    error: blocksAsBlockerError,
  } = await supabase
    .from("character_blocks")
    .delete()
    .eq(
      "blocker_character_id",
      characterId,
    );

  if (blocksAsBlockerError) {
    throw new Error(
      `Unable to delete character blocks: ${blocksAsBlockerError.message}`,
    );
  }

  const {
    error: blocksAsBlockedError,
  } = await supabase
    .from("character_blocks")
    .delete()
    .eq(
      "blocked_character_id",
      characterId,
    );

  if (blocksAsBlockedError) {
    throw new Error(
      `Unable to delete character blocks: ${blocksAsBlockedError.message}`,
    );
  }

  /*
   * Delete the character sheet only.
   * The associated Supabase Auth account remains intact,
   * allowing the user to create a new character.
   *
   * There is deliberately no status restriction here:
   * an owner/admin may delete draft, submitted, approved,
   * or rejected characters.
   */
  const {
    error: deleteError,
  } = await supabase
    .from("characters")
    .delete()
    .eq("id", characterId);

  if (deleteError) {
    throw new Error(
      `Unable to delete character: ${deleteError.message}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/game");
  revalidatePath("/character");
  revalidatePath("/characters");
  revalidatePath("/messages");
  revalidatePath("/forum");
  revalidatePath("/admin");
  revalidatePath("/admin/characters");

  if (character.public_slug) {
    revalidatePath(
      `/characters/${character.public_slug}`,
    );
  }

  redirect("/admin/characters");
}