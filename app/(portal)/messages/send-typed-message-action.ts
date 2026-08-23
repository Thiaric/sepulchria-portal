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
import { assertCurrentUserCan } from "@/lib/sanctions/enforcement";
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

    await assertCurrentUserCan(
      supabase,
      "communication",
    );

    const { data: sentMessageId, error: sendError } = await supabase.rpc(
      "send_direct_message_fast",
      { p_conversation_id: conversationId, p_body: body, p_client_nonce: nonce, p_message_mode: messageMode },
    );

    if (sendError && sendError.code !== "23505") { return { ok:false, message:sendError.message }; }
    if (!sentMessageId && !sendError) { return { ok:false, message:"The message could not be sent." }; }

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
