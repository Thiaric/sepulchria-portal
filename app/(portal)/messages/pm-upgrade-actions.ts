"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  richTextToPlainText,
  sanitizeRichHtml,
} from "@/lib/rich-text";
import { createClient } from "@/lib/supabase/server";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function recipientIds(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll("recipientIds")
        .map((value) =>
          String(value).trim(),
        )
        .filter((value) =>
          UUID.test(value),
        ),
    ),
  );
}

async function context() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const {
    data: character,
    error,
  } = await supabase
    .from("characters")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!character) {
    redirect("/character/create");
  }

  if (character.status !== "approved") {
    throw new Error(
      "Your character must be approved before using private messages.",
    );
  }

  return {
    supabase,
    character,
  };
}

async function ensureRecipientsAvailable(
  ids: string[],
  actorId: string,
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
) {
  const clean =
    ids.filter(
      (id) => id !== actorId,
    );

  if (!clean.length) {
    throw new Error(
      "Select at least one recipient.",
    );
  }

  const {
    data: rows,
    error,
  } = await supabase
    .from("characters")
    .select("id")
    .in("id", clean)
    .eq("status", "approved");

  if (error) {
    throw new Error(error.message);
  }

  if (
    (rows ?? []).length !==
    clean.length
  ) {
    throw new Error(
      "One or more selected characters are unavailable.",
    );
  }

  return clean;
}

export async function startMultiConversation(
  formData: FormData,
): Promise<void> {
  const {
    supabase,
    character,
  } = await context();

  const ids =
    await ensureRecipientsAvailable(
      recipientIds(formData),
      character.id,
      supabase,
    );

  if (ids.length === 1) {
    const {
      data: conversationId,
      error,
    } = await supabase.rpc(
      "start_direct_conversation",
      {
        recipient_character_id:
          ids[0],
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

    redirect(
      `/messages/${conversationId}`,
    );
  }

  const title =
    String(
      formData.get("groupTitle") ??
        "",
    ).trim();

  const {
    data: conversationId,
    error,
  } = await supabase.rpc(
    "start_group_conversation",
    {
      recipient_character_ids:
        ids,
      group_title:
        title || null,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!conversationId) {
    throw new Error(
      "The group conversation could not be created.",
    );
  }

  redirect(
    `/messages/${conversationId}`,
  );
}

export async function forwardPrivateMessage(
  formData: FormData,
): Promise<void> {
  const {
    supabase,
    character,
  } = await context();

  const sourceMessageId =
    String(
      formData.get(
        "sourceMessageId",
      ) ?? "",
    ).trim();

  if (!UUID.test(sourceMessageId)) {
    throw new Error(
      "The source message is invalid.",
    );
  }

  const ids =
    await ensureRecipientsAvailable(
      recipientIds(formData),
      character.id,
      supabase,
    );

  const {
    data: source,
    error: sourceError,
  } = await supabase
    .from("direct_messages")
    .select(`
      id,
      body,
      created_at,
      conversation_id,
      sender:characters!direct_messages_sender_character_id_fkey(
        display_name,
        first_name,
        surname
      )
    `)
    .eq("id", sourceMessageId)
    .maybeSingle();

  if (sourceError) {
    throw new Error(
      sourceError.message,
    );
  }

  if (!source) {
    throw new Error(
      "The message could not be found.",
    );
  }

  const {
    data: sourceMembership,
    error: membershipError,
  } = await supabase
    .from(
      "direct_conversation_participants",
    )
    .select("conversation_id")
    .eq(
      "conversation_id",
      source.conversation_id,
    )
    .eq(
      "character_id",
      character.id,
    )
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      membershipError.message,
    );
  }

  if (!sourceMembership) {
    throw new Error(
      "You cannot forward this message.",
    );
  }

  let destinationId:
    | string
    | null = null;

  if (ids.length === 1) {
    const {
      data,
      error,
    } = await supabase.rpc(
      "start_direct_conversation",
      {
        recipient_character_id:
          ids[0],
      },
    );

    if (error) {
      throw new Error(error.message);
    }

    destinationId = data;
  } else {
    const title =
      String(
        formData.get(
          "groupTitle",
        ) ?? "",
      ).trim();

    const {
      data,
      error,
    } = await supabase.rpc(
      "start_group_conversation",
      {
        recipient_character_ids:
          ids,
        group_title:
          title || null,
      },
    );

    if (error) {
      throw new Error(error.message);
    }

    destinationId = data;
  }

  if (!destinationId) {
    throw new Error(
      "The destination conversation could not be created.",
    );
  }

  const rawNote =
    String(
      formData.get("note") ?? "",
    ).trim();

  const note =
    rawNote
      ? sanitizeRichHtml(rawNote)
      : "";

  const senderRelation =
    source.sender;

  const sender =
    Array.isArray(senderRelation)
      ? senderRelation[0]
      : senderRelation;

  const senderName =
    sender?.display_name?.trim() ||
    [
      sender?.first_name,
      sender?.surname,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Unknown character";

  const body =
    note &&
    richTextToPlainText(note)
      ? note
      : "<p>Forwarded message</p>";

  const {
    error: insertError,
  } = await supabase
    .from("direct_messages")
    .insert({
      conversation_id:
        destinationId,
      sender_character_id:
        character.id,
      body,
      message_mode: "offgame",
      client_nonce:
        crypto.randomUUID(),
      forwarded_from_message_id:
        source.id,
      forwarded_sender_name:
        senderName,
      forwarded_created_at:
        source.created_at,
      forwarded_body:
        source.body,
    });

  if (insertError) {
    throw new Error(
      insertError.message,
    );
  }

  await supabase
    .from("direct_conversations")
    .update({
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", destinationId);

  revalidatePath("/messages");

  redirect(
    `/messages/${destinationId}`,
  );
}
