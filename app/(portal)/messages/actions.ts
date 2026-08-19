"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  PRIVATE_MESSAGE_COOLDOWN_SECONDS,
  PRIVATE_MESSAGE_MAX_LENGTH,
} from "@/lib/messages/constants";
import {
  richTextToPlainText,
  sanitizeRichHtml,
} from "@/lib/rich-text";
import { createClient } from "@/lib/supabase/server";
import type { MessageActionState } from "@/types/messages";

const MAX_BODY_HTML_LENGTH = 100_000;

type OwnedCharacter = { id: string };

async function getContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: character, error } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!character) redirect("/character/create");

  return { supabase, character: character as OwnedCharacter };
}

export async function startConversation(formData: FormData): Promise<void> {
  const recipientId = String(formData.get("recipientId") ?? "").trim();
  if (!recipientId) throw new Error("Missing recipient.");

  const { supabase, character } = await getContext();
  if (recipientId === character.id) throw new Error("You cannot message yourself.");

  const { data: conversationId, error } = await supabase.rpc(
    "start_direct_conversation",
    { recipient_character_id: recipientId },
  );

  if (error) throw new Error(error.message);
  if (!conversationId) throw new Error("The conversation could not be created.");

  await supabase
    .from("direct_conversation_participants")
    .update({ deleted_at: null })
    .eq("conversation_id", conversationId)
    .eq("character_id", character.id);

  redirect(`/messages/${conversationId}`);
}

export async function sendPrivateMessage(
  _previousState: MessageActionState,
  formData: FormData,
): Promise<MessageActionState> {
  try {
    const conversationId = String(formData.get("conversationId") ?? "").trim();
    const rawBody = String(formData.get("body") ?? "").trim();

    if (rawBody.length > MAX_BODY_HTML_LENGTH) {
      return { ok: false, message: "The formatted message is too large." };
    }

    const body = sanitizeRichHtml(rawBody);
    const visibleBody = richTextToPlainText(body);
    const nonce = String(formData.get("client_nonce") ?? "").trim() || crypto.randomUUID();

    if (!conversationId || !visibleBody) {
      return { ok: false, message: "Write a message before sending it." };
    }

    if (visibleBody.length > PRIVATE_MESSAGE_MAX_LENGTH) {
      return {
        ok: false,
        message: `The message exceeds ${PRIVATE_MESSAGE_MAX_LENGTH.toLocaleString("en-GB")} characters.`,
      };
    }

    const { supabase, character } = await getContext();

    const { data: participant, error: participantError } = await supabase
      .from("direct_conversation_participants")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("character_id", character.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (participantError) return { ok: false, message: participantError.message };
    if (!participant) return { ok: false, message: "Conversation not found." };

    const { data: otherParticipants, error: otherParticipantError } = await supabase
      .from("direct_conversation_participants")
      .select("character_id, deleted_at")
      .eq("conversation_id", conversationId)
      .neq("character_id", character.id)
      .is("deleted_at", null);

    if (otherParticipantError) return { ok: false, message: otherParticipantError.message };
    if (!otherParticipants?.length) return { ok: false, message: "Recipient not found." };

    const otherIds = otherParticipants.map((row) => row.character_id as string);

    const { data: blocks, error: blockError } = await supabase
      .from("character_blocks")
      .select("blocker_character_id, blocked_character_id")
      .or(
        otherIds.flatMap((otherId) => [
          `and(blocker_character_id.eq.${character.id},blocked_character_id.eq.${otherId})`,
          `and(blocker_character_id.eq.${otherId},blocked_character_id.eq.${character.id})`,
        ]).join(","),
      );

    if (blockError) return { ok: false, message: blockError.message };
    if ((blocks ?? []).length > 0) return { ok: false, message: "This conversation is unavailable." };

    const cooldownSince = new Date(
      Date.now() - PRIVATE_MESSAGE_COOLDOWN_SECONDS * 1000,
    ).toISOString();

    const { data: recentMessage, error: cooldownError } = await supabase
      .from("direct_messages")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("sender_character_id", character.id)
      .gte("created_at", cooldownSince)
      .limit(1)
      .maybeSingle();

    if (cooldownError) return { ok: false, message: cooldownError.message };
    if (recentMessage) {
      return {
        ok: false,
        message: `Please wait ${PRIVATE_MESSAGE_COOLDOWN_SECONDS} seconds before sending another message.`,
      };
    }

    const { error: messageError } = await supabase
      .from("direct_messages")
      .insert({
        conversation_id: conversationId,
        sender_character_id: character.id,
        body,
        client_nonce: nonce,
      });

    if (messageError && messageError.code !== "23505") {
      return { ok: false, message: messageError.message };
    }

    const now = new Date().toISOString();
    const { error: conversationUpdateError } = await supabase
      .from("direct_conversations")
      .update({ updated_at: now })
      .eq("id", conversationId);

    if (conversationUpdateError) {
      return { ok: false, message: conversationUpdateError.message };
    }

    revalidatePath(`/messages/${conversationId}`);
    revalidatePath("/messages");

    return { ok: true, message: "Message sent.", submittedAt: Date.now() };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unexpected error.",
    };
  }
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { supabase, character } = await getContext();
  const { error } = await supabase
    .from("direct_conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("character_id", character.id)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  revalidatePath("/messages");
}

export async function toggleArchive(formData: FormData): Promise<void> {
  const conversationId = String(formData.get("conversationId") ?? "").trim();
  const archive = String(formData.get("archive") ?? "false") === "true";
  const { supabase, character } = await getContext();

  const { error } = await supabase
    .from("direct_conversation_participants")
    .update({
      archived_at: archive ? new Date().toISOString() : null,
    })
    .eq("conversation_id", conversationId)
    .eq("character_id", character.id)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  revalidatePath("/messages");
  redirect("/messages");
}

export async function deletePrivateMessages(formData: FormData): Promise<void> {
  const conversationId = String(formData.get("conversationId") ?? "").trim();
  const messageIds = formData.getAll("messageIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!conversationId || messageIds.length === 0) return;

  const { supabase } = await getContext();
  const { error } = await supabase.rpc("delete_direct_messages_for_me", {
    target_conversation_id: conversationId,
    target_message_ids: messageIds,
    target_deletion_kind: messageIds.length === 1 ? "single" : "bulk",
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
}

export async function deleteConversationForMe(formData: FormData): Promise<void> {
  const conversationId = String(formData.get("conversationId") ?? "").trim();
  if (!conversationId) return;

  const {
    supabase,
    character,
  } = await getContext();

  const {
    data: conversation,
    error: conversationError,
  } = await supabase
    .from("direct_conversations")
    .select("id, is_group")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError) {
    throw new Error(
      conversationError.message,
    );
  }

  if (!conversation) {
    redirect("/messages");
  }

  if (conversation.is_group) {
    const {
      error: leaveError,
    } = await supabase.rpc(
      "leave_group_conversation",
      {
        target_conversation_id:
          conversationId,
      },
    );

    if (leaveError) {
      throw new Error(
        leaveError.message,
      );
    }

    /*
     * Leaving a group is permanent membership removal.
     * Verify the database actually removed this character before redirecting.
     * This prevents a broken/stale RPC from pretending that Leave succeeded.
     */
    const {
      data: membershipAfterLeave,
      error: verifyLeaveError,
    } = await supabase
      .from(
        "direct_conversation_participants",
      )
      .select("conversation_id")
      .eq(
        "conversation_id",
        conversationId,
      )
      .eq(
        "character_id",
        character.id,
      )
      .maybeSingle();

    if (verifyLeaveError) {
      throw new Error(
        verifyLeaveError.message,
      );
    }

    if (membershipAfterLeave) {
      throw new Error(
        "Leave Conversation failed: your membership still exists. The conversation has NOT been left.",
      );
    }

    revalidatePath("/messages");
    revalidatePath(
      `/messages/${conversationId}`,
    );

    redirect("/messages");
  }

  const {
    error,
  } = await supabase.rpc(
    "delete_direct_conversation_for_me",
    {
      target_conversation_id:
        conversationId,
    },
  );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  revalidatePath("/messages");
  redirect("/messages");
}

export async function toggleBlock(formData: FormData): Promise<void> {
  const characterId = String(formData.get("characterId") ?? "").trim();
  const block = String(formData.get("block") ?? "false") === "true";
  const { supabase, character } = await getContext();

  if (!characterId || characterId === character.id) return;

  const { data: targetCharacter, error: targetCharacterError } = await supabase
    .from("characters")
    .select("id, public_slug")
    .eq("id", characterId)
    .maybeSingle();

  if (targetCharacterError) throw new Error(targetCharacterError.message);
  if (!targetCharacter) return;

  if (block) {
    const { error } = await supabase.from("character_blocks").upsert(
      {
        blocker_character_id: character.id,
        blocked_character_id: characterId,
      },
      { onConflict: "blocker_character_id,blocked_character_id" },
    );
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("character_blocks")
      .delete()
      .eq("blocker_character_id", character.id)
      .eq("blocked_character_id", characterId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/messages");
  if (targetCharacter.public_slug) {
    revalidatePath(`/characters/${targetCharacter.public_slug}`);
  }
}
