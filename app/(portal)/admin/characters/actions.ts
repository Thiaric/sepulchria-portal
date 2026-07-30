"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth/require-staff";
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

  const rejectionReason =
    status === "rejected"
      ? submittedRejectionReason
      : null;

  const returnTo = readReturnPath(
    formData.get("returnTo"),
  );

  const supabase = await createClient();

  const { data: character, error: readError } =
    await supabase
      .from("characters")
      .select("public_slug")
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

  const approvalData =
    status === "approved"
      ? {
          approved_at:
            new Date().toISOString(),
          approved_by: staff.userId,
        }
      : {
          approved_at: null,
          approved_by: null,
        };

  const { error: updateError } =
    await supabase
      .from("characters")
      .update({
        race_id: raceId,
        association_id: associationId,
        status,
        title,
        staff_notes: staffNotes,
        rejection_reason: rejectionReason,
        ...approvalData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", characterId);

  if (updateError) {
    throw new Error(
      `Unable to update character: ${updateError.message}`,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/characters");
  revalidatePath(
    `/admin/characters/${characterId}`,
  );
  revalidatePath("/characters");
  revalidatePath(
    `/characters/${character.public_slug}`,
  );

  redirect(returnTo);
}