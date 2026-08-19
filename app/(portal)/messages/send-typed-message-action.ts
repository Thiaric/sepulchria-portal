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
import type {
  MessageActionState,
  PrivateMessageMode,
} from "@/types/messages";

const MESSAGE_MODES: PrivateMessageMode[] = [
  "ongame",
  "offgame",
];

const MAX_BODY_HTML_LENGTH = 100_000;

function readMessageMode(
  value: FormDataEntryValue | null,
): PrivateMessageMode {
  if (
    typeof value !== "string" ||
    !MESSAGE_MODES.includes(
      value as PrivateMessageMode,
    )
  ) {
    throw new Error(
      "The selected message type is invalid.",
    );
  }

  return value as PrivateMessageMode;
}

export async function sendTypedPrivateMessage(
  _previousState: MessageActionState,
  formData: FormData,
): Promise<MessageActionState> {
  try {
    const conversationId = String(
      formData.get("conversationId") ?? "",
    ).trim();

    const rawBody = String(
      formData.get("body") ?? "",
    ).trim();

    if (rawBody.length > MAX_BODY_HTML_LENGTH) {
      return {
        ok: false,
        message: "The formatted message is too large.",
      };
    }

    const body = sanitizeRichHtml(rawBody);
    const visibleBody = richTextToPlainText(body);

    const messageMode = readMessageMode(
      formData.get("messageMode"),
    );

    const nonce =
      String(
        formData.get("client_nonce") ?? "",
      ).trim() || crypto.randomUUID();

    if (!conversationId || !visibleBody) {
      return {
        ok: false,
        message:
          "Write a message before sending it.",
      };
    }

    if (
      visibleBody.length >
      PRIVATE_MESSAGE_MAX_LENGTH
    ) {
      return {
        ok: false,
        message: `The message exceeds ${PRIVATE_MESSAGE_MAX_LENGTH.toLocaleString(
          "en-GB",
        )} characters.`,
      };
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/auth/login");
    }

    const {
      data: character,
      error: characterError,
    } = await supabase
      .from("characters")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (characterError) {
      return {
        ok: false,
        message: characterError.message,
      };
    }

    if (!character) {
      redirect("/character/create");
    }

    if (character.status !== "approved") {
      return {
        ok: false,
        message:
          "Your character must be approved before sending private messages.",
      };
    }

    const {
      data: participant,
      error: participantError,
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
      .is(
        "deleted_at",
        null,
      )
      .maybeSingle();

    if (participantError) {
      return {
        ok: false,
        message: participantError.message,
      };
    }

    if (!participant) {
      return {
        ok: false,
        message:
          "Conversation not found.",
      };
    }

    const {
      data: otherParticipants,
      error: otherParticipantError,
    } = await supabase
      .from(
        "direct_conversation_participants",
      )
      .select("character_id, deleted_at")
      .eq(
        "conversation_id",
        conversationId,
      )
      .neq(
        "character_id",
        character.id,
      )
      .is(
        "deleted_at",
        null,
      );

    if (otherParticipantError) {
      return {
        ok: false,
        message:
          otherParticipantError.message,
      };
    }

    if (!otherParticipants?.length) {
      return {
        ok: false,
        message:
          "Recipient not found.",
      };
    }

    const otherIds =
      otherParticipants.map(
        (row) =>
          row.character_id as string,
      );

    const {
      data: blocks,
      error: blockError,
    } = await supabase
      .from("character_blocks")
      .select(
        "blocker_character_id, blocked_character_id",
      )
      .or(
        otherIds
          .flatMap(
            (otherId) => [
              `and(blocker_character_id.eq.${character.id},blocked_character_id.eq.${otherId})`,
              `and(blocker_character_id.eq.${otherId},blocked_character_id.eq.${character.id})`,
            ],
          )
          .join(","),
      );

    if (blockError) {
      return {
        ok: false,
        message: blockError.message,
      };
    }

    if ((blocks ?? []).length > 0) {
      return {
        ok: false,
        message:
          "This conversation is unavailable.",
      };
    }

    const cooldownSince = new Date(
      Date.now() -
        PRIVATE_MESSAGE_COOLDOWN_SECONDS *
          1000,
    ).toISOString();

    const {
      data: recentMessage,
      error: cooldownError,
    } = await supabase
      .from("direct_messages")
      .select("id")
      .eq(
        "conversation_id",
        conversationId,
      )
      .eq(
        "sender_character_id",
        character.id,
      )
      .gte("created_at", cooldownSince)
      .limit(1)
      .maybeSingle();

    if (cooldownError) {
      return {
        ok: false,
        message: cooldownError.message,
      };
    }

    if (recentMessage) {
      return {
        ok: false,
        message: `Please wait ${PRIVATE_MESSAGE_COOLDOWN_SECONDS} seconds before sending another message.`,
      };
    }

    const { error: messageError } =
      await supabase
        .from("direct_messages")
        .insert({
          conversation_id:
            conversationId,
          sender_character_id:
            character.id,
          body,
          client_nonce: nonce,
          message_mode: messageMode,
        });

    if (
      messageError &&
      messageError.code !== "23505"
    ) {
      return {
        ok: false,
        message: messageError.message,
      };
    }

    const now =
      new Date().toISOString();

    const {
      error: conversationUpdateError,
    } = await supabase
      .from("direct_conversations")
      .update({
        updated_at: now,
      })
      .eq("id", conversationId);

    if (conversationUpdateError) {
      return {
        ok: false,
        message:
          conversationUpdateError.message,
      };
    }

    const {
      error: participantUpdateError,
    } = await supabase
      .from(
        "direct_conversation_participants",
      )
      .update({
        archived_at: null,
      })
      .eq(
        "conversation_id",
        conversationId,
      )
      .is(
        "deleted_at",
        null,
      );

    if (participantUpdateError) {
      return {
        ok: false,
        message:
          participantUpdateError.message,
      };
    }

    revalidatePath(
      `/messages/${conversationId}`,
    );
    revalidatePath("/messages");

    return {
      ok: true,
      message: `${
        messageMode === "ongame"
          ? "On-game"
          : "Off-game"
      } message sent.`,
      submittedAt: Date.now(),
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unexpected error.",
    };
  }
}
