"use client";

import {
  Fragment,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import {
  ROOM_HISTORY_HOURS,
  ROOM_INACTIVITY_RESET_HOURS,
} from "@/lib/game/constants";
import type {
  CharacterAttributeKey,
  CharacterSummary,
  RoomMessage,
  RoomMessageType,
} from "@/types/game";

type RoomMessageListProps = {
  roomId: string;
  messages: RoomMessage[];
  viewerCharacterId: string;
  canViewAllWhispers: boolean;
};

type InsertedRoomMessage = {
  id: string;
  room_id: string;
  character_id: string;
  message: string;
  message_type: RoomMessageType;
  roll_label: string | null;
  dice_sides: number | null;
  dice_result: number | null;
  attribute_key:
    | CharacterAttributeKey
    | null;
  attribute_value: number | null;
  roll_total: number | null;
  whisper_recipient_character_id:
    | string
    | null;
  created_at: string;
};

type RealtimeConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected";

function normaliseRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function CharacterIdentityIcons({
  author,
}: {
  author: CharacterSummary | null;
}) {
  const race = author
    ? normaliseRelation(author.race)
    : null;

  const association = author
    ? normaliseRelation(author.association)
    : null;

  if (
    !race?.icon_url &&
    !association?.icon_url
  ) {
    return null;
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
      {race?.icon_url ? (
        <img
          src={race.icon_url}
          alt={race.name}
          title={race.name}
          className="h-4 w-4 object-contain"
        />
      ) : null}

      {association?.icon_url ? (
        <img
          src={association.icon_url}
          alt={association.name}
          title={association.name}
          className="h-4 w-4 object-contain"
        />
      ) : null}
    </div>
  );
}

function mergeMessages(
  currentMessages: RoomMessage[],
  incomingMessages: RoomMessage[],
): RoomMessage[] {
  const messagesById =
    new Map<string, RoomMessage>();

  for (const message of
    currentMessages) {
    messagesById.set(
      message.id,
      message,
    );
  }

  for (const message of
    incomingMessages) {
    messagesById.set(
      message.id,
      message,
    );
  }

  return Array.from(
    messagesById.values(),
  ).sort(
    (first, second) =>
      Date.parse(
        first.created_at,
      ) -
      Date.parse(
        second.created_at,
      ),
  );
}

function getCharacterHref(
  character:
    | CharacterSummary
    | null
    | undefined,
): string {
  if (!character?.public_slug) {
    return "#";
  }

  return `/characters/${character.public_slug}?from=game`;
}

function getAttributeLabel(
  key:
    | CharacterAttributeKey
    | null,
): string {
  const labels:
    Record<
      CharacterAttributeKey,
      string
    > = {
      muscles: "Muscles",
      reflexes: "Reflexes",
      vigor: "Vigor",
      brains: "Brains",
      shrewd: "Shrewd",
      presence_score:
        "Presence",
    };

  return key
    ? labels[key]
    : "Attribute";
}

function formatRollText(
  item: RoomMessage,
): string {
  if (
    item.message_type ===
      "dice_roll" &&
    item.dice_sides &&
    item.dice_result
  ) {
    return `d${item.dice_sides} → ${item.dice_result}`;
  }

  if (
    item.message_type ===
      "attribute_check" &&
    item.roll_label &&
    item.dice_result !== null &&
    item.attribute_value !==
      null &&
    item.roll_total !== null
  ) {
    return `${item.roll_label} · d20(${item.dice_result}) + ${getAttributeLabel(
      item.attribute_key,
    )}(+${item.attribute_value}) = ${item.roll_total}`;
  }

  return item.message.replace(
    /^◆\s*/,
    "",
  );
}

function formatTime(
  createdAt: string,
): string {
  const date =
    new Date(createdAt);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function ActionSpeechText({
  content,
}: {
  content: string;
}) {
  const segments =
  content.split(
    /(<[^<>]*>|\([^()]*\)|\[[^\[\]]*\]|\{[^{}]*\})/g,
  );

  const rendered:
    ReactNode[] = [];

  segments.forEach(
    (segment, index) => {
      if (!segment) {
        return;
      }

      const isAction =
  (
    segment.startsWith("<") &&
    segment.endsWith(">")
  ) ||
  (
    segment.startsWith("(") &&
    segment.endsWith(")")
  ) ||
  (
    segment.startsWith("[") &&
    segment.endsWith("]")
  ) ||
  (
    segment.startsWith("{") &&
    segment.endsWith("}")
  );

      const displayText = isAction
        ? segment.slice(1, -1)
        : segment;

      rendered.push(
        <Fragment key={index}>
          <span
  className={
    isAction
      ? "italic text-[#a98a60]"
      : "text-[#d3c2aa]"
  }
  style={{
    lineHeight: "18px",
  }}
>
  {displayText}
</span>
        </Fragment>,
      );
    },
  );

  return (
    <span
  className="whitespace-pre-wrap break-words text-[13px]"
  style={{
    lineHeight: "18px",
  }}
>
      {rendered}
    </span>
  );
}

function CharacterPortrait({
  author,
  characterHref,
}: {
  author: CharacterSummary | null;
  characterHref: string;
}) {
  const portrait = (
    <div className="h-9 w-9 shrink-0 overflow-hidden border border-[#60482e] bg-[#0d0a08]">
      {author?.portrait_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={author.portrait_url}
          alt={`Portrait of ${author.first_name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full items-center justify-center text-[#806b4e]">
          ?
        </span>
      )}
    </div>
  );

  if (!author?.public_slug) {
    return portrait;
  }

  return (
    <Link
      href={characterHref}
      className="shrink-0"
    >
      {portrait}
    </Link>
  );
}

export default function RoomMessageList({
  roomId,
  messages,
  viewerCharacterId,
  canViewAllWhispers,
}: RoomMessageListProps) {
  const [
    liveMessages,
    setLiveMessages,
  ] = useState<RoomMessage[]>(
    messages,
  );

  const [
    connectionStatus,
    setConnectionStatus,
  ] =
    useState<RealtimeConnectionStatus>(
      "connecting",
    );

  const scrollContainerRef =
    useRef<HTMLDivElement>(null);

  const shouldScrollRef =
    useRef(true);

  useEffect(() => {
    setLiveMessages(
      (currentMessages) =>
        mergeMessages(
          currentMessages,
          messages,
        ),
    );
  }, [messages]);

  useEffect(() => {
    const characterIds =
      Array.from(
        new Set(
          liveMessages
            .map(
              (message) =>
                message.character_id,
            )
            .filter(Boolean),
        ),
      );

    if (
      characterIds.length === 0
    ) {
      return;
    }

    const needsIdentityData =
      liveMessages.some(
        (message) => {
          const author =
            normaliseRelation(
              message.character,
            );

          return (
            author &&
            (
              author.race ===
                undefined ||
              author.association ===
                undefined ||
              author.first_name ===
                undefined
            )
          );
        },
      );

    if (!needsIdentityData) {
      return;
    }

    let cancelled = false;

    async function enrichAuthors() {
      const supabase =
        createClient();

      const {
        data,
        error,
      } = await supabase
        .from("characters")
        .select(`
          id,
          first_name,
          display_name,
          portrait_url,
          public_slug,
          race:races(
            id,
            name,
            icon_url
          ),
          association:associations(
            id,
            name,
            icon_url
          )
        `)
        .in(
          "id",
          characterIds,
        );

      if (
        error ||
        !data ||
        cancelled
      ) {
        if (error) {
          console.error(
            "Unable to load character identity icons:",
            error.message,
          );
        }
        return;
      }

      const byId =
        new Map(
          data.map(
            (character) => [
              character.id,
              character as CharacterSummary,
            ],
          ),
        );

      setLiveMessages(
        (currentMessages) =>
          currentMessages.map(
            (message) => {
              const enriched =
                byId.get(
                  message.character_id,
                );

              if (!enriched) {
                return message;
              }

              return {
                ...message,
                character:
                  enriched,
              };
            },
          ),
      );
    }

    void enrichAuthors();

    return () => {
      cancelled = true;
    };
  }, [liveMessages]);

  useEffect(() => {
    const container =
      scrollContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTop =
      container.scrollHeight;
  }, []);

  useEffect(() => {
    if (
      !shouldScrollRef.current
    ) {
      return;
    }

    const container =
      scrollContainerRef.current;

    if (!container) {
      return;
    }

    const frame =
      requestAnimationFrame(
        () => {
          container.scrollTo({
            top:
              container.scrollHeight,
            behavior: "smooth",
          });
        },
      );

    return () =>
      cancelAnimationFrame(
        frame,
      );
  }, [liveMessages]);

  useEffect(() => {
    const historyWindow =
      ROOM_HISTORY_HOURS *
      60 *
      60 *
      1000;

    const inactivityWindow =
      ROOM_INACTIVITY_RESET_HOURS *
      60 *
      60 *
      1000;

    function pruneExpiredEntries() {
      setLiveMessages(
        (currentMessages) => {
          if (
            currentMessages.length ===
            0
          ) {
            return currentMessages;
          }

          const now = Date.now();

          const latestTimestamp =
            Date.parse(
              currentMessages[
                currentMessages.length -
                  1
              ].created_at,
            );

          if (
            Number.isNaN(
              latestTimestamp,
            ) ||
            now - latestTimestamp >=
              inactivityWindow
          ) {
            return [];
          }

          const historyStart =
            now - historyWindow;

          const filtered =
            currentMessages.filter(
              (message) => {
                const timestamp =
                  Date.parse(
                    message.created_at,
                  );

                return (
                  !Number.isNaN(
                    timestamp,
                  ) &&
                  timestamp >=
                    historyStart
                );
              },
            );

          return filtered.length ===
            currentMessages.length
            ? currentMessages
            : filtered;
        },
      );
    }

    pruneExpiredEntries();

    const timer =
      window.setInterval(
        pruneExpiredEntries,
        60_000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, []);

  useEffect(() => {
    const supabase =
      createClient();

    setConnectionStatus(
      "connecting",
    );

    const channel = supabase
      .channel(
        `room-messages-${roomId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table:
            "room_messages",
          filter:
            `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const inserted =
            payload.new as InsertedRoomMessage;

          const [
            authorResult,
            recipientResult,
          ] = await Promise.all([
            supabase
              .from("characters")
              .select(`
                id,
                first_name,
                display_name,
                portrait_url,
                public_slug,
                race:races(
                  id,
                  name,
                  icon_url
                ),
                association:associations(
                  id,
                  name,
                  icon_url
                )
              `)
              .eq(
                "id",
                inserted.character_id,
              )
              .maybeSingle(),

            inserted
              .whisper_recipient_character_id
              ? supabase
                  .from(
                    "characters",
                  )
                  .select(`
                    id,
                    first_name,
                    display_name,
                    portrait_url,
                    public_slug
                  `)
                  .eq(
                    "id",
                    inserted
                      .whisper_recipient_character_id,
                  )
                  .maybeSingle()
              : Promise.resolve({
                  data: null,
                  error: null,
                }),
          ]);

          if (
            authorResult.error
          ) {
            console.error(
              "Unable to load message author:",
              authorResult.error
                .message,
            );
          }

          if (
            recipientResult.error
          ) {
            console.error(
              "Unable to load whisper recipient:",
              recipientResult.error
                .message,
            );
          }

          const newMessage:
            RoomMessage = {
              id: inserted.id,
              message:
                inserted.message,
              message_type:
                inserted.message_type,
              roll_label:
                inserted.roll_label,
              dice_sides:
                inserted.dice_sides,
              dice_result:
                inserted.dice_result,
              attribute_key:
                inserted.attribute_key,
              attribute_value:
                inserted.attribute_value,
              roll_total:
                inserted.roll_total,
              whisper_recipient_character_id:
                inserted
                  .whisper_recipient_character_id,
              created_at:
                inserted.created_at,
              character_id:
                inserted.character_id,
              character:
                authorResult.data as
                  | CharacterSummary
                  | null,
              whisperRecipient:
                recipientResult.data as
                  | CharacterSummary
                  | null,
            };

          setLiveMessages(
            (currentMessages) =>
              mergeMessages(
                currentMessages,
                [newMessage],
              ),
          );
        },
      )
      .subscribe((status) => {
        if (
          status ===
          "SUBSCRIBED"
        ) {
          setConnectionStatus(
            "connected",
          );
          return;
        }

        if (
          status ===
            "CHANNEL_ERROR" ||
          status ===
            "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setConnectionStatus(
            "disconnected",
          );
        }
      });

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [roomId]);

  function handleScroll() {
    const container =
      scrollContainerRef.current;

    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    shouldScrollRef.current =
      distanceFromBottom < 120;
  }

  return (
    <div className="relative flex min-h-0 flex-none flex-col lg:flex-1">
      {connectionStatus !==
      "connected" ? (
        <div
          aria-live="polite"
          className={`border-b px-5 py-2 text-center text-[9px] uppercase tracking-[0.18em] ${
            connectionStatus ===
            "connecting"
              ? "border-[#6b5535]/40 bg-[#21190f] text-[#b89a68]"
              : "border-[#754137]/50 bg-[#2b1714] text-[#d28e82]"
          }`}
        >
          {connectionStatus ===
          "connecting"
            ? "Connecting to the room chronicle..."
            : "Realtime connection interrupted. Attempting to reconnect..."}
        </div>
      ) : null}

      <div
  id="room-chronicle"
  ref={scrollContainerRef}
  onScroll={handleScroll}
  className="min-h-0 flex-none overflow-visible lg:flex-1 lg:overflow-y-auto lg:overscroll-contain"
>

        {liveMessages.length >
        0 ? (
          <div className="divide-y divide-[#4f3b28]/35">
            {liveMessages.map(
              (item) => {
                const author =
                  normaliseRelation(
                    item.character,
                  );

                const recipient =
                  normaliseRelation(
                    item.whisperRecipient,
                  );

                const time =
                  formatTime(
                    item.created_at,
                  );

                const characterHref =
                  getCharacterHref(
                    author,
                  );

                if (
                  item.message_type ===
                  "fate"
                ) {
                  return (
                    <article
                      key={item.id}
                      className="border-y border-[#8a6637]/40 bg-[linear-gradient(90deg,rgba(91,56,24,0.22),rgba(24,16,11,0.72),rgba(91,56,24,0.14))] px-5 py-2.5 sm:px-7"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[8px] uppercase tracking-[0.24em] text-[#c99b58]">
                          The Voice of Fate
                        </span>

                        <time
                          dateTime={
                            item.created_at
                          }
                          className="text-[8px] uppercase tracking-[0.14em] text-[#776b5b]"
                        >
                          {time}
                        </time>
                      </div>

                      <p className="mt-1.5 whitespace-pre-wrap break-words font-serif text-[13px] leading-5 text-[#d6c09a]">
                        {item.message}
                      </p>
                    </article>
                  );
                }

                if (
                  item.message_type ===
                    "dice_roll" ||
                  item.message_type ===
                    "attribute_check"
                ) {
                  const isNaturalTwenty =
                    item.dice_sides ===
                      20 &&
                    item.dice_result ===
                      20;

                  const isNaturalOne =
                    item.dice_sides ===
                      20 &&
                    item.dice_result ===
                      1;

                  return (
                    <article
                      key={item.id}
                      className={`flex min-w-0 items-center gap-3 px-5 py-3 sm:px-7 ${
                        isNaturalTwenty
                          ? "bg-emerald-950/10"
                          : isNaturalOne
                            ? "bg-red-950/10"
                            : "bg-[#1b140e]/55"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`shrink-0 text-sm ${
                          isNaturalTwenty
                            ? "text-emerald-500"
                            : isNaturalOne
                              ? "text-red-500"
                              : "text-[#bd8d4d]"
                        }`}
                      >
                        ◆
                      </span>

                      {author?.public_slug ? (
                        <Link
                          href={
                            characterHref
                          }
                          className="shrink-0 font-serif text-sm text-[#d8bf91] transition hover:text-[#ecd29e]"
                        >
                          {
                            author.display_name
                          }
                        </Link>
                      ) : (
                        <span className="shrink-0 font-serif text-sm text-[#d8bf91]">
                          {author?.display_name ??
                            "Unknown character"}
                        </span>
                      )}

                      <p
                        className={`min-w-0 flex-1 truncate text-xs ${
                          isNaturalTwenty
                            ? "text-emerald-300"
                            : isNaturalOne
                              ? "text-red-300"
                              : "text-[#c8b89f]"
                        }`}
                        title={formatRollText(
                          item,
                        )}
                      >
                        {formatRollText(
                          item,
                        )}
                      </p>

                      <time
                        dateTime={
                          item.created_at
                        }
                        className="shrink-0 text-[8px] uppercase tracking-[0.14em] text-[#776b5b]"
                      >
                        {time}
                      </time>
                    </article>
                  );
                }

                const isWhisper =
                  item.message_type ===
                  "whisper";

                const isSender =
                  item.character_id ===
                  viewerCharacterId;

                const isRecipient =
                  item.whisper_recipient_character_id ===
                  viewerCharacterId;

                const whisperLabel =
                  isSender
                    ? `Whisper to ${
                        recipient?.display_name ??
                        "character"
                      }`
                    : isRecipient
                      ? "Whisper to you"
                      : canViewAllWhispers
                        ? `Whisper to ${
                            recipient?.display_name ??
                            "character"
                          }`
                        : "Whisper";

                return (
                  <article
  key={item.id}
  className={`flex gap-3 px-5 py-3 sm:px-7 ${
    isWhisper
      ? "border-l-2 border-[#7d628f] bg-[#241b2a]/45"
      : ""
  }`}
>
  {/* Character identity + timestamp */}
  <div className="flex w-[76px] shrink-0 flex-col">
    <div className="flex items-start gap-1.5">
      <CharacterPortrait
        author={author}
        characterHref={
          characterHref
        }
      />

      <CharacterIdentityIcons
        author={author}
      />
    </div>

    <time
      dateTime={
        item.created_at
      }
      className="mt-1.5 block text-[7px] uppercase leading-4 tracking-[0.12em] text-[#776b5b]"
    >
      {time}
    </time>
  </div>

  {/* Message */}
  <div className="min-w-0 flex-1">
    {isWhisper ? (
      <div className="mb-2 border-b border-[#7d628f]/35 pb-1.5">
        <span className="text-[8px] uppercase tracking-[0.2em] text-[#c7add6]">
          {whisperLabel}
        </span>
      </div>
    ) : null}

    <div
  className="min-w-0"
  style={{
    lineHeight: "18px",
  }}
>
      {author?.public_slug ? (
        <Link
          href={characterHref}
          className="mr-2 inline font-serif text-sm leading-[18px] text-[#d8bf91] transition hover:text-[#ecd29e]"
        >
          {author.first_name ??
            author.display_name}
        </Link>
      ) : (
        <span className="mr-2 inline font-serif text-sm leading-[18px] text-[#d8bf91]">
          {author?.first_name ??
            author?.display_name ??
            "Unknown character"}
        </span>
      )}

      <ActionSpeechText
        content={
          item.message
        }
      />
    </div>
  </div>
</article>
                );
              },
            )}

            <div id="chat-end" />
          </div>
        ) : (
          <div className="flex h-full min-h-0 items-center justify-center px-6 py-10 text-center font-serif italic text-[#8e7d66]">
            The room is silent.
          </div>
        )}
      </div>
    </div>
  );
}
