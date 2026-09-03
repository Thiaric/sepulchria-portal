import "server-only";

import {
  createClient as createAdminClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import {
  createTargetedCharacterNotification,
} from "@/lib/notifications/create-targeted-character-notification";

const FORUM_SYSTEM_CHARACTER_ID =
  "00000000-0000-4000-8000-00000000f001";

function createPrivilegedClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const secret =
    process.env.SUPABASE_SECRET_KEY;

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
      .eq("is_system", false)
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

async function sendAnonymousForumNotification({
  recipientCharacterId,
  heading,
  message,
  href,
  linkLabel = "Open forum",
}: {
  recipientCharacterId: string;
  heading: string;
  message: string;
  href: string;
  linkLabel?: string;
}): Promise<boolean> {
  const admin =
    createPrivilegedClient();

  const pairKey =
    `system-forum:${recipientCharacterId}`;

  let conversationId:
    | string
    | null = null;

  const {
    data: existing,
    error: existingError,
  } = await admin
    .from("direct_conversations")
    .select("id")
    .eq("pair_key", pairKey)
    .maybeSingle();

  if (existingError) {
    console.error(
      "Unable to find Forum system conversation:",
      existingError.message,
    );
    return false;
  }

  conversationId =
    existing?.id ?? null;

  if (!conversationId) {
    const {
      data: created,
      error: createError,
    } = await admin
      .from("direct_conversations")
      .insert({
        pair_key: pairKey,
        is_group: false,
        title:
          "Sepulchria Forum",
        created_by_character_id:
          null,
      })
      .select("id")
      .single();

    if (
      createError ||
      !created
    ) {
      console.error(
        "Unable to create Forum system conversation:",
        createError?.message ??
          "No conversation returned.",
      );
      return false;
    }

    conversationId =
      created.id;

    const {
      error: participantsError,
    } = await admin
      .from(
        "direct_conversation_participants",
      )
      .insert([
        {
          conversation_id:
            conversationId,
          character_id:
            FORUM_SYSTEM_CHARACTER_ID,
        },
        {
          conversation_id:
            conversationId,
          character_id:
            recipientCharacterId,
        },
      ]);

    if (participantsError) {
      await admin
        .from(
          "direct_conversations",
        )
        .delete()
        .eq(
          "id",
          conversationId,
        );

      console.error(
        "Unable to create Forum system participants:",
        participantsError.message,
      );
      return false;
    }
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
  } = await admin
    .from("direct_messages")
    .insert({
      conversation_id:
        conversationId,
      sender_character_id:
        FORUM_SYSTEM_CHARACTER_ID,
      body,
      message_mode:
        "offgame",
      client_nonce:
        crypto.randomUUID(),
    });

  if (messageError) {
    console.error(
      "Unable to send anonymous Forum notification:",
      messageError.message,
    );
    return false;
  }

  await admin
    .from("direct_conversations")
    .update({
      updated_at: timestamp,
    })
    .eq("id", conversationId);

  /*
   * Re-open the recipient's system notification thread if archived.
   * Never alter deleted_at: this is not a player group membership.
   */
  await admin
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
    .eq(
      "character_id",
      recipientCharacterId,
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
  isAnonymous = false,
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
  isAnonymous?: boolean;
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

  const { data: { user: actorUser } } = await supabase.auth.getUser();

  if (!actorUser) {
    console.error("Unable to create Forum reply bell notifications: authenticated user not found.");
    return;
  }

  await Promise.all(
    [...recipients].map(async (recipientCharacterId) => {
      try {
        await createTargetedCharacterNotification({
          recipientCharacterId,
          title: isAnonymous
            ? "New anonymous reply to a forum topic"
            : "New reply to a forum topic",
          body: isAnonymous
            ? `A new anonymous reply has been posted to “${topicTitle}”.`
            : `A new reply has been posted to “${topicTitle}”.`,
          href,
          sourceType: "forum_reply",
          sourceId: crypto.randomUUID(),
          sourceTrigger: "reply_posted",
          createdByUserId: actorUser.id,
        });
      } catch (error) {
        console.error(
          "Unable to create Forum reply bell notification:",
          error instanceof Error ? error.message : error,
        );
      }
    }),
  );
}