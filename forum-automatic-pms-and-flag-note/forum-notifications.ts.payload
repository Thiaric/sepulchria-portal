import type {
  SupabaseClient,
} from "@supabase/supabase-js";

function escapeHtml(
  value: string,
): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function forumNoticeBody({
  heading,
  message,
  href,
  linkLabel,
}: {
  heading: string;
  message: string;
  href: string;
  linkLabel: string;
}) {
  return (
    `<div data-forum-notification="true">` +
    `<p><strong>Forum Notification</strong></p>` +
    `<p><strong>${escapeHtml(
      heading,
    )}</strong></p>` +
    `<p>${escapeHtml(
      message,
    ).replaceAll(
      "\n",
      "<br />",
    )}</p>` +
    `<p><a href="${escapeHtml(
      href,
    )}">${escapeHtml(
      linkLabel,
    )} →</a></p>` +
    `</div>`
  );
}

export async function resolveActorCharacterId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const {
    data,
    error,
  } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "approved")
    .maybeSingle();

  if (error) {
    console.error(
      "Unable to resolve forum notification sender:",
      error.message,
    );
    return null;
  }

  return data?.id ?? null;
}

export async function sendForumNotification({
  supabase,
  actorCharacterId,
  recipientCharacterId,
  heading,
  message,
  href,
  linkLabel = "Open forum",
}: {
  supabase: SupabaseClient;
  actorCharacterId: string;
  recipientCharacterId:
    | string
    | null
    | undefined;
  heading: string;
  message: string;
  href: string;
  linkLabel?: string;
}): Promise<boolean> {
  if (
    !recipientCharacterId ||
    recipientCharacterId ===
      actorCharacterId
  ) {
    return false;
  }

  const {
    data: conversationId,
    error: conversationError,
  } = await supabase.rpc(
    "start_direct_conversation",
    {
      recipient_character_id:
        recipientCharacterId,
    },
  );

  if (
    conversationError ||
    !conversationId
  ) {
    console.error(
      "Unable to create forum notification conversation:",
      conversationError?.message ??
        "No conversation id returned.",
    );
    return false;
  }

  const body =
    forumNoticeBody({
      heading,
      message,
      href,
      linkLabel,
    });

  const timestamp =
    new Date().toISOString();

  const {
    error: messageError,
  } = await supabase
    .from("direct_messages")
    .insert({
      conversation_id:
        conversationId,
      sender_character_id:
        actorCharacterId,
      body,
      message_mode:
        "offgame",
      client_nonce:
        crypto.randomUUID(),
    });

  if (messageError) {
    console.error(
      "Unable to send forum notification PM:",
      messageError.message,
    );
    return false;
  }

  await supabase
    .from("direct_conversations")
    .update({
      updated_at: timestamp,
    })
    .eq("id", conversationId);

  await supabase
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

  return true;
}

export async function notifyForumReplyAudience({
  supabase,
  actorCharacterId,
  topicId,
  topicAuthorCharacterId,
  topicTitle,
  href,
}: {
  supabase: SupabaseClient;
  actorCharacterId: string;
  topicId: string;
  topicAuthorCharacterId:
    | string
    | null
    | undefined;
  topicTitle: string;
  href: string;
}) {
  const recipients =
    new Set<string>();

  if (
    topicAuthorCharacterId &&
    topicAuthorCharacterId !==
      actorCharacterId
  ) {
    recipients.add(
      topicAuthorCharacterId,
    );
  }

  const {
    data: favourites,
    error: favouriteError,
  } = await supabase
    .from(
      "forum_topic_favourites",
    )
    .select("user_id")
    .eq("topic_id", topicId);

  if (favouriteError) {
    console.error(
      "Unable to load favourite-topic notification recipients:",
      favouriteError.message,
    );
  } else {
    const favouriteUserIds =
      Array.from(
        new Set(
          (favourites ?? [])
            .map(
              (row) =>
                String(
                  row.user_id ??
                    "",
                ),
            )
            .filter(Boolean),
        ),
      );

    if (
      favouriteUserIds.length >
      0
    ) {
      const {
        data: favouriteCharacters,
        error:
          favouriteCharactersError,
      } = await supabase
        .from("characters")
        .select("id, user_id")
        .in(
          "user_id",
          favouriteUserIds,
        )
        .eq(
          "status",
          "approved",
        );

      if (
        favouriteCharactersError
      ) {
        console.error(
          "Unable to resolve favourite-topic characters:",
          favouriteCharactersError.message,
        );
      } else {
        for (
          const character
          of favouriteCharacters ??
          []
        ) {
          if (
            character.id !==
            actorCharacterId
          ) {
            recipients.add(
              character.id,
            );
          }
        }
      }
    }
  }

  await Promise.all(
    [...recipients].map(
      (recipientCharacterId) =>
        sendForumNotification({
          supabase,
          actorCharacterId,
          recipientCharacterId,
          heading:
            "New reply to a forum topic",
          message:
            `A new reply has been posted to “${topicTitle}”.`,
          href,
          linkLabel:
            "Open reply",
        }),
    ),
  );
}
