"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

const SOURCE_TYPES = [
  "direct_message",
  "instant_chat_message",
  "room_message",
] as const;

type CommunicationSourceType =
  (typeof SOURCE_TYPES)[number];

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function obscureCommunication(
  formData: FormData,
) {
  await requireStaff();

  const sourceType = String(
    formData.get("sourceType") ?? "",
  ).trim();

  const sourceId = String(
    formData.get("sourceId") ?? "",
  ).trim();

  const reason = String(
    formData.get("reason") ?? "",
  ).trim();

  if (
    !SOURCE_TYPES.includes(
      sourceType as CommunicationSourceType,
    ) ||
    !isUuid(sourceId)
  ) {
    throw new Error(
      "Invalid communication moderation request.",
    );
  }

  if (!reason) {
    throw new Error(
      "A moderation reason is required.",
    );
  }

  if (reason.length > 500) {
    throw new Error(
      "The moderation reason must be 500 characters or fewer.",
    );
  }

  const supabase =
    await createClient();

  const { error } =
    await supabase.rpc(
      "staff_obscure_communication",
      {
        p_source_type:
          sourceType,
        p_source_id:
          sourceId,
        p_reason: reason,
      },
    );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  revalidatePath(
    "/admin/communication-logs",
  );
}
