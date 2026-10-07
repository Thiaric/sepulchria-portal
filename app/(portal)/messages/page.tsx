import { redirect } from "next/navigation";

import { richTextToPlainText } from "@/lib/rich-text";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/auth/require-staff";

import { MessagesInboxClient } from "./components/messages-inbox-client";
import { MessagesInboxRealtime } from "./components/messages-inbox-realtime";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";

type Props = {
  searchParams: Promise<{
    archived?: string;
  }>;
};

type CodexIdentity = {
  id: string;
  name: string;
  icon_url: string | null;
  colour: string | null;
};

type CharacterSummary = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
  portrait_url: string | null;
  public_slug: string;
  title: string | null;
  is_system: boolean;

  race:
    | CodexIdentity
    | CodexIdentity[]
    | null;

  association:
    | CodexIdentity
    | CodexIdentity[]
    | null;
};

type ParticipantRow = {
  conversation_id: string;
  archived_at: string | null;
  deleted_at: string | null;
  last_read_at: string | null;

  conversation:
    | {
        id: string;
        updated_at: string;
        is_group: boolean;
        title: string | null;
      }
    | {
        id: string;
        updated_at: string;
        is_group: boolean;
        title: string | null;
      }[]
    | null;
};

type OtherParticipantRow = {
  character:
    | CharacterSummary
    | CharacterSummary[]
    | null;
};

type DirectMessageRow = {
  id: string;
  conversation_id: string;
  body: string;
  created_at: string;
  sender_character_id: string;
};

type DeletionRow = {
  message_id: string;
};

type InboxSummaryRow = {
  conversation_id: string;
  last_message_id: string | null;
  last_message_body: string | null;
  last_message_created_at: string | null;
  last_message_sender_character_id: string | null;
  unread_count: number | string;
};

type ConversationCard = {
  id: string;
  updatedAt: string;
  archivedAt: string | null;
  other: CharacterSummary | null;
  isGroup: boolean;
  groupTitle: string | null;
  participantNames: string[];

  lastMessage: DirectMessageRow | null;

  unreadCount: number;
  searchableText: string;

  matchedMessages: {
    id: string;
    body: string;
    createdAt: string;
  }[];
};

function normaliseRelation<T>(
  value: T | T[] | null,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function characterName(
  character: CharacterSummary,
): string {
  return (
    character.display_name?.trim() ||
    [
      character.first_name,
      character.surname,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Unnamed character"
  );
}

export default async function MessagesPage({
  searchParams,
}: Props) {
  const { archived } =
    await searchParams;

  const showArchived =
    archived === "1";

  const supabase =
    await createClient();

  const staffSessionPromise =
    getStaffSession();

  const {
    data: { user },
  } =
    await getAuthenticatedUser();

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
    throw new Error(
      characterError.message,
    );
  }

  if (!character) {
    redirect(
      "/character/create",
    );
  }

  if (
    character.status !==
    "approved"
  ) {
    redirect(
      `/character?error=${encodeURIComponent(
        "Your character must be approved before using private messages.",
      )}`,
    );
  }

  let membershipQuery =
    supabase
      .from(
        "direct_conversation_participants",
      )
      .select(`
        conversation_id,
        archived_at,
        deleted_at,
        last_read_at,
        conversation:direct_conversations(
          id,
          updated_at,
          is_group,
          title
        )
      `)
      .eq(
        "character_id",
        character.id,
      )
      .is(
        "deleted_at",
        null,
      );

  membershipQuery =
    showArchived
      ? membershipQuery.not(
          "archived_at",
          "is",
          null,
        )
      : membershipQuery.is(
          "archived_at",
          null,
        );

  membershipQuery =
    membershipQuery.limit(100);

  const {
    data:
      membershipRows = [],
    error:
      membershipsError,
  } = await membershipQuery;

  if (membershipsError) {
    throw new Error(
      membershipsError.message,
    );
  }

  const rows =
    membershipRows as unknown as ParticipantRow[];

  const conversationIds =
    rows.map(
      (row) =>
        row.conversation_id,
    );

  const [
    otherParticipantsResult,
    summaryResult,
    deletionsResult,
    availableCharactersResult,
    blocksResult,
  ] = await Promise.all([
    conversationIds.length
      ? supabase
          .from(
            "direct_conversation_participants",
          )
          .select(`
            conversation_id,
            character:characters(
              id,
              display_name,
              first_name,
              surname,
              portrait_url,
              public_slug,
              title,
              is_system,

              race:races!characters_race_id_fkey(
                id,
                name,
                icon_url,
                colour
              ),

              association:associations!characters_association_id_fkey(
                id,
                name,
                icon_url,
                colour
              )
            )
          `)
          .in(
            "conversation_id",
            conversationIds,
          )
          .neq(
            "character_id",
            character.id,
          )
          .is(
            "deleted_at",
            null,
          )
      : Promise.resolve({
          data: [],
          error: null,
        }),

    conversationIds.length
      ? supabase.rpc(
          "get_direct_message_inbox_summaries",
          {
            p_character_id: character.id,
            p_archived: showArchived,
            p_limit: 100,
          },
        )
      : Promise.resolve({
          data: [],
          error: null,
        }),

    supabase
      .from(
        "direct_message_deletions",
      )
      .select(
        "message_id",
      )
      .eq(
        "character_id",
        character.id,
      ),

    supabase
      .from("characters")
      .select(`
        id,
        display_name,
        first_name,
        surname,
        portrait_url,
        public_slug,
        title,

        race:races!characters_race_id_fkey(
          id,
          name,
          icon_url,
          colour
        ),

        association:associations!characters_association_id_fkey(
          id,
          name,
          icon_url,
          colour
        )
      `)
      .eq(
        "status",
        "approved",
      )
      .neq(
        "id",
        character.id,
      )
      .order(
        "display_name",
        {
          ascending: true,
        },
      ),

    supabase
      .from(
        "character_blocks",
      )
      .select(
        "blocker_character_id, blocked_character_id",
      )
      .or(
        `blocker_character_id.eq.${character.id},blocked_character_id.eq.${character.id}`,
      ),
  ]);

  const firstError =
    otherParticipantsResult.error ??
    summaryResult.error ??
    deletionsResult.error ??
    availableCharactersResult.error ??
    blocksResult.error;

  if (firstError) {
    throw new Error(
      firstError.message,
    );
  }

  const summariesByConversation =
    new Map<string, InboxSummaryRow>();

  for (
    const row of
      (summaryResult.data ?? []) as InboxSummaryRow[]
  ) {
    summariesByConversation.set(
      row.conversation_id,
      row,
    );
  }

  const blockedCharacterIds =
    new Set<string>();

  for (
    const block
    of blocksResult.data ?? []
  ) {
    blockedCharacterIds.add(
      block.blocker_character_id ===
        character.id
        ? block.blocked_character_id
        : block.blocker_character_id,
    );
  }

  const availableCharacters =
    (
      (availableCharactersResult.data ??
        []) as unknown as CharacterSummary[]
    ).filter(
      (candidate) =>
        !blockedCharacterIds.has(
          candidate.id,
        ),
    );

  const othersByConversation =
    new Map<
      string,
      CharacterSummary[]
    >();

  for (
    const row
    of (
      otherParticipantsResult.data ??
      []
    ) as unknown as (
      OtherParticipantRow & {
        conversation_id: string;
      }
    )[]
  ) {
    const other =
      normaliseRelation(
        row.character,
      );

    if (other) {
      const current =
        othersByConversation.get(
          row.conversation_id,
        ) ?? [];

      current.push(other);

      othersByConversation.set(
        row.conversation_id,
        current,
      );
    }
  }

  const conversations =
    rows
      .map<
        ConversationCard | null
      >((row) => {
        const conversation =
          normaliseRelation(
            row.conversation,
          );

        if (!conversation) {
          return null;
        }

        const others =
          othersByConversation.get(
            row.conversation_id,
          ) ?? [];

        const other =
          others[0] ?? null;

        const participantNames =
          others.map(
            characterName,
          );

        const summary =
          summariesByConversation.get(
            row.conversation_id,
          ) ?? null;

        const lastMessage: DirectMessageRow | null =
          summary?.last_message_id &&
          summary.last_message_created_at &&
          summary.last_message_sender_character_id
            ? {
                id: summary.last_message_id,
                conversation_id: row.conversation_id,
                body: summary.last_message_body ?? "",
                created_at: summary.last_message_created_at,
                sender_character_id:
                  summary.last_message_sender_character_id,
              }
            : null;

        const unreadCount =
          Number(summary?.unread_count ?? 0);

        const name =
          conversation.is_group
            ? conversation.title?.trim() ||
              participantNames.join(", ") ||
              "Group conversation"
            : other
              ? characterName(other)
              : "Unknown character";

        const searchableText =
          [
            name,
            other?.title,
            lastMessage
              ? richTextToPlainText(
                  lastMessage.body,
                )
              : null,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return {
          id:
            row.conversation_id,

          updatedAt:
            lastMessage?.created_at ??
            conversation.updated_at,

          archivedAt:
            row.archived_at,

          other,
          isGroup:
            conversation.is_group,
          groupTitle:
            conversation.title,
          participantNames,
          lastMessage,
          unreadCount,
          searchableText,

          matchedMessages:
            lastMessage
              ? [{
                  id: lastMessage.id,
                  body: lastMessage.body,
                  createdAt:
                    lastMessage.created_at,
                }]
              : [],
        };
      })
      .filter(
        (
          conversation,
        ): conversation is ConversationCard =>
          conversation !==
          null,
      )
      .sort(
        (a, b) =>
          Date.parse(
            b.updatedAt,
          ) -
          Date.parse(
            a.updatedAt,
          ),
      );

  const staffSession =
    await staffSessionPromise;

  return (
    <>
      <MessagesInboxRealtime
        characterId={
          character.id
        }
      />

      <MessagesInboxClient
      viewerIsStaff={
        staffSession !== null
      }
      conversations={
        conversations
      }
      availableCharacters={
        availableCharacters
      }
      showArchived={
        showArchived
      }
      />
    </>
  );
}
