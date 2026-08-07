"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { stripRichTextForPreview } from "@/lib/rich-text-shared";
import { createClient } from "@/lib/supabase/client";
import type { PortalContext } from "@/types/portal";

type MessagesContextNavigatorProps = {
  context: PortalContext;
};

type ConversationRelation = {
  id: string;
  updated_at: string;
};

type MembershipRow = {
  conversation_id: string;
  archived_at: string | null;
  last_read_at: string | null;
  conversation:
    | ConversationRelation
    | ConversationRelation[]
    | null;
};

type CharacterSummary = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
  portrait_url: string | null;
};

type ParticipantRow = {
  conversation_id: string;
  character:
    | CharacterSummary
    | CharacterSummary[]
    | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  body: string;
  created_at: string;
  sender_character_id: string;
  message_mode: "ongame" | "offgame";
};

type ConversationEntry = {
  id: string;
  updatedAt: string;
  lastReadAt: string | null;
  other: CharacterSummary | null;
  lastMessage: MessageRow | null;
  unreadCount: number;
};

const MAX_VISIBLE_CONVERSATIONS = 8;

function normaliseRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getCharacterName(
  character: CharacterSummary | null,
): string {
  if (!character) {
    return "Deleted character";
  }

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

function compactText(
  value: string,
  maximumLength = 56,
): string {
  const cleaned =
    stripRichTextForPreview(value);

  if (cleaned.length <= maximumLength) {
    return cleaned;
  }

  return `${cleaned.slice(
    0,
    maximumLength - 1,
  )}…`;
}

function formatRelativeTime(
  value: string,
): string {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return "";
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor(
      (Date.now() - timestamp) / 1000,
    ),
  );

  if (elapsedSeconds < 60) {
    return "now";
  }

  const minutes = Math.floor(
    elapsedSeconds / 60,
  );

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(
    minutes / 60,
  );

  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(
    hours / 24,
  );

  if (days < 7) {
    return `${days}d`;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
    },
  ).format(new Date(timestamp));
}

export function MessagesContextNavigator({
  context,
}: MessagesContextNavigatorProps) {
  const pathname = usePathname();
  const instanceId = useId();

  const currentCharacterId =
    context.character?.id ?? null;

  const currentConversationId =
    useMemo(() => {
      const match = pathname.match(
        /^\/messages\/([^/]+)$/,
      );

      return match?.[1] ?? null;
    }, [pathname]);

  const [
    conversations,
    setConversations,
  ] = useState<ConversationEntry[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadConversations =
    useCallback(async () => {
      if (!currentCharacterId) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const supabase = createClient();

      const {
        data: membershipData,
        error: membershipError,
      } = await supabase
        .from(
          "direct_conversation_participants",
        )
        .select(`
          conversation_id,
          archived_at,
          last_read_at,
          conversation:direct_conversations(
            id,
            updated_at
          )
        `)
        .eq(
          "character_id",
          currentCharacterId,
        )
        .is("archived_at", null);

      if (membershipError) {
        setError(membershipError.message);
        setLoading(false);
        return;
      }

      const memberships =
        (membershipData ??
          []) as unknown as MembershipRow[];

      const conversationIds =
        memberships.map(
          (membership) =>
            membership.conversation_id,
        );

      if (
        conversationIds.length === 0
      ) {
        setConversations([]);
        setError(null);
        setLoading(false);
        return;
      }

      const [
        participantsResult,
        messagesResult,
      ] = await Promise.all([
        supabase
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
              portrait_url
            )
          `)
          .in(
            "conversation_id",
            conversationIds,
          )
          .neq(
            "character_id",
            currentCharacterId,
          ),

        supabase
          .from("direct_messages")
          .select(`
            id,
            conversation_id,
            body,
            created_at,
            sender_character_id,
            message_mode
          `)
          .in(
            "conversation_id",
            conversationIds,
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(500),
      ]);

      const firstError =
        participantsResult.error ??
        messagesResult.error;

      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      const otherByConversation =
        new Map<
          string,
          CharacterSummary
        >();

      for (const participant of
        (participantsResult.data ??
          []) as unknown as ParticipantRow[]) {
        const other =
          normaliseRelation(
            participant.character,
          );

        if (other) {
          otherByConversation.set(
            participant.conversation_id,
            other,
          );
        }
      }

      const messagesByConversation =
        new Map<string, MessageRow[]>();

      for (const message of
        (messagesResult.data ??
          []) as MessageRow[]) {
        const existing =
          messagesByConversation.get(
            message.conversation_id,
          ) ?? [];

        existing.push(message);

        messagesByConversation.set(
          message.conversation_id,
          existing,
        );
      }

      const nextConversations =
        memberships
          .map(
            (
              membership,
            ): ConversationEntry | null => {
              const conversation =
                normaliseRelation(
                  membership.conversation,
                );

              if (!conversation) {
                return null;
              }

              const messages =
                messagesByConversation.get(
                  membership.conversation_id,
                ) ?? [];

              const lastMessage =
                messages[0] ?? null;

              const lastReadTimestamp =
                membership.last_read_at
                  ? Date.parse(
                      membership.last_read_at,
                    )
                  : 0;

              const unreadCount =
                messages.filter(
                  (message) =>
                    message.sender_character_id !==
                      currentCharacterId &&
                    Date.parse(
                      message.created_at,
                    ) >
                      lastReadTimestamp,
                ).length;

              return {
                id:
                  membership.conversation_id,
                updatedAt:
                  conversation.updated_at,
                lastReadAt:
                  membership.last_read_at,
                other:
                  otherByConversation.get(
                    membership.conversation_id,
                  ) ?? null,
                lastMessage,
                unreadCount,
              };
            },
          )
          .filter(
            (
              conversation,
            ): conversation is ConversationEntry =>
              conversation !== null,
          )
          .sort(
            (first, second) =>
              Date.parse(
                second.updatedAt,
              ) -
              Date.parse(
                first.updatedAt,
              ),
          )
          .slice(
            0,
            MAX_VISIBLE_CONVERSATIONS,
          );

      setConversations(
        nextConversations,
      );
      setError(null);
      setLoading(false);
    }, [currentCharacterId]);

  useEffect(() => {
    setLoading(true);
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!currentCharacterId) {
      return;
    }

    const supabase = createClient();

    const safeInstanceId =
      instanceId.replace(
        /[^a-zA-Z0-9_-]/g,
        "",
      );

    const channel = supabase
      .channel(
        `message-context-navigator-${safeInstanceId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
        },
        () => {
          void loadConversations();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "direct_conversation_participants",
        },
        () => {
          void loadConversations();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table:
            "direct_conversations",
        },
        () => {
          void loadConversations();
        },
      )
      .subscribe();

    const refreshInterval =
      window.setInterval(() => {
        void loadConversations();
      }, 30_000);

    const handleFocus = () => {
      void loadConversations();
    };

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      window.clearInterval(
        refreshInterval,
      );

      window.removeEventListener(
        "focus",
        handleFocus,
      );

      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    currentCharacterId,
    instanceId,
    loadConversations,
  ]);

  const currentConversation =
    currentConversationId
      ? conversations.find(
          (conversation) =>
            conversation.id ===
            currentConversationId,
        ) ?? null
      : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0">
        <p className="text-[9px] uppercase tracking-[0.3em] text-[#876a46]">
          Correspondence
        </p>

        <h2 className="mt-2 font-serif text-2xl text-[#d6bd91]">
          {currentConversation
            ? getCharacterName(
                currentConversation.other,
              )
            : "Private messages"}
        </h2>

        {currentConversation ? (
          <div className="mt-3 flex items-center gap-2 text-[9px] uppercase tracking-[0.15em] text-[#756956]">
            <span
              className={`inline-flex border px-2 py-1 ${
                currentConversation
                  .lastMessage
                  ?.message_mode ===
                "ongame"
                  ? "border-[#8d6a40]/60 text-[#c7a471]"
                  : "border-[#626979]/60 text-[#aeb5c4]"
              }`}
            >
              {currentConversation
                .lastMessage
                ?.message_mode ===
              "ongame"
                ? "On-game"
                : "Off-game"}
            </span>

            {currentConversation
              .lastMessage ? (
              <span>
                Updated{" "}
                {formatRelativeTime(
                  currentConversation
                    .lastMessage
                    .created_at,
                )}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-xs leading-6 text-[#938673]">
            Switch quickly between your
            most recent conversations.
          </p>
        )}
      </header>

      <div className="mt-5 flex min-h-0 flex-1 flex-col border-t border-[#59432c]/35 pt-4">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <div>
            <p className="text-[8px] uppercase tracking-[0.22em] text-[#876a46]">
              Recent conversations
            </p>

            <p className="mt-1 text-[10px] text-[#756a5b]">
              Most recently active
            </p>
          </div>

          <span className="flex h-7 min-w-7 items-center justify-center rounded-full border border-[#59432c]/50 bg-[#100c09] px-2 text-[9px] text-[#b2956f]">
            {conversations.length}
          </span>
        </div>

        {error ? (
          <p className="mt-3 border border-[#743d35] bg-[#2a1512] p-3 text-[10px] leading-5 text-[#d8a49a]">
            Conversations could not be
            loaded.
          </p>
        ) : null}

        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
          {loading ? (
            <>
              <div className="h-16 animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
              <div className="h-16 animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
              <div className="h-16 animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
            </>
          ) : (
            conversations.map(
              (conversation) => {
                const name =
                  getCharacterName(
                    conversation.other,
                  );

                const isCurrent =
                  conversation.id ===
                  currentConversationId;

                return (
                  <Link
                    key={conversation.id}
                    href={`/messages/${conversation.id}`}
                    aria-current={
                      isCurrent
                        ? "page"
                        : undefined
                    }
                    className={`group flex items-center gap-3 border p-3 transition ${
                      isCurrent
                        ? "border-[#987344] bg-[#2a1d12] shadow-[inset_2px_0_0_#c18b48]"
                        : "border-[#59432c]/40 bg-[#100c09] hover:border-[#80613c] hover:bg-[#19120e]"
                    }`}
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden border border-[#60482e]/55 bg-[#0d0a08]">
                      {conversation.other
                        ?.portrait_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            conversation.other
                              .portrait_url
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center font-serif text-sm text-[#8d724f]">
                          {name
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate font-serif text-sm text-[#d6bd91]">
                          {name}
                        </p>

                        {conversation.unreadCount >
                        0 ? (
                          <span
                            title={`${conversation.unreadCount} unread message${
                              conversation.unreadCount ===
                              1
                                ? ""
                                : "s"
                            }`}
                            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#d19a4c] bg-[#7a291f] text-[7px] font-bold leading-none text-[#ffe1ac]"
                          >
                            {conversation.unreadCount >
                            9
                              ? "9+"
                              : conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-[10px] text-[#817565]">
                          {conversation
                            .lastMessage
                            ? compactText(
                                conversation
                                  .lastMessage
                                  .body,
                              )
                            : "No messages yet"}
                        </p>

                        {conversation
                          .lastMessage ? (
                          <time className="shrink-0 text-[8px] text-[#665c50]">
                            {formatRelativeTime(
                              conversation
                                .lastMessage
                                .created_at,
                            )}
                          </time>
                        ) : null}
                      </div>
                    </div>

                    <span
                      aria-hidden="true"
                      className={`shrink-0 text-xs transition group-hover:translate-x-0.5 ${
                        isCurrent
                          ? "text-[#d2aa72]"
                          : "text-[#69583f] group-hover:text-[#b38d5e]"
                      }`}
                    >
                      {isCurrent
                        ? "•"
                        : "→"}
                    </span>
                  </Link>
                );
              },
            )
          )}

          {!loading &&
          !error &&
          conversations.length === 0 ? (
            <p className="border border-[#59432c]/30 bg-[#100c09]/60 p-4 text-center text-[11px] leading-5 text-[#8f8271]">
              No private conversations
              yet.
            </p>
          ) : null}
        </div>

        <Link
          href="/messages"
          className="mt-4 flex shrink-0 items-center justify-between border border-[#765937] bg-[#271c12] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[#dfc79c] transition hover:border-[#997042] hover:bg-[#3b2919]"
        >
          <span>Open full inbox</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
