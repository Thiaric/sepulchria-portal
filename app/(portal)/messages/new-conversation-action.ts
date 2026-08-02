"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function readRequiredUuid(
  value: FormDataEntryValue | null,
): string {
  if (typeof value !== "string") {
    throw new Error(
      "The recipient identifier is missing.",
    );
  }

  const valueTrimmed = value.trim();

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(valueTrimmed)) {
    throw new Error(
      "The selected recipient is invalid.",
    );
  }

  return valueTrimmed;
}

export async function startConversationFromDirectory(
  formData: FormData,
): Promise<void> {
  const recipientId = readRequiredUuid(
    formData.get("recipientId"),
  );

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const {
    data: sender,
    error: senderError,
  } = await supabase
    .from("characters")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (senderError) {
    throw new Error(senderError.message);
  }

  if (!sender) {
    redirect("/character/create");
  }

  if (sender.status !== "approved") {
    redirect(
      `/character?error=${encodeURIComponent(
        "Your character must be approved before starting a private conversation.",
      )}`,
    );
  }

  if (recipientId === sender.id) {
    throw new Error(
      "You cannot message yourself.",
    );
  }

  const {
    data: recipient,
    error: recipientError,
  } = await supabase
    .from("characters")
    .select("id, status")
    .eq("id", recipientId)
    .maybeSingle();

  if (recipientError) {
    throw new Error(
      recipientError.message,
    );
  }

  if (
    !recipient ||
    recipient.status !== "approved"
  ) {
    throw new Error(
      "The selected character is not available for private messages.",
    );
  }

  const {
    data: block,
    error: blockError,
  } = await supabase
    .from("character_blocks")
    .select("blocker_character_id")
    .or(
      [
        `and(blocker_character_id.eq.${sender.id},blocked_character_id.eq.${recipientId})`,
        `and(blocker_character_id.eq.${recipientId},blocked_character_id.eq.${sender.id})`,
      ].join(","),
    )
    .limit(1)
    .maybeSingle();

  if (blockError) {
    throw new Error(blockError.message);
  }

  if (block) {
    throw new Error(
      "This character is not available for private messages.",
    );
  }

  const {
    data: conversationId,
    error,
  } = await supabase.rpc(
    "start_direct_conversation",
    {
      recipient_character_id:
        recipientId,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!conversationId) {
    throw new Error(
      "The conversation could not be created.",
    );
  }

  redirect(`/messages/${conversationId}`);
}
