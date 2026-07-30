"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import type {
  CharacterSummary,
  RoomMessage,
} from "@/types/game";

type RoomMessageListProps = {
  roomId: string;
  messages: RoomMessage[];
  olderBefore?: string;
};

type InsertedRoomMessage = {
  id: string;
  room_id: string;
  character_id: string;
  message: string;
  created_at: string;
};

type RealtimeConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected";

function mergeMessages(
  currentMessages: RoomMessage[],
  incomingMessages: RoomMessage[],
): RoomMessage[] {
  const messagesById = new Map<string, RoomMessage>();

  for (const message of currentMessages) {
    messagesById.set(message.id, message);
  }

  for (const message of incomingMessages) {
    messagesById.set(message.id, message);
  }

  return Array.from(messagesById.values()).sort(
    (first, second) =>
      Date.parse(first.created_at) -
      Date.parse(second.created_at),
  );
}

function getCharacterHref(
  character: CharacterSummary | null | undefined,
): string {
  if (!character?.public_slug) {
    return "#";
  }

  return `/characters/${character.public_slug}?from=game`;
}

export default function RoomMessageList({
  roomId,
  messages,
  olderBefore,
}: RoomMessageListProps) {
  const [liveMessages, setLiveMessages] =
    useState<RoomMessage[]>(messages);

  const [
    connectionStatus,
    setConnectionStatus,
  ] =
    useState<RealtimeConnectionStatus>(
      "connecting",
    );

  const scrollContainerRef =
    useRef<HTMLDivElement>(null);

  const shouldScrollRef = useRef(true);

  useEffect(() => {
    setLiveMessages((currentMessages) =>
      mergeMessages(
        currentMessages,
        messages,
      ),
    );
  }, [messages]);

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
    if (!shouldScrollRef.current) {
      return;
    }

    const container =
      scrollContainerRef.current;

    if (!container) {
      return;
    }

    const animationFrame =
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      });

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [liveMessages]);

  useEffect(() => {
    const supabase = createClient();

    setConnectionStatus("connecting");

    const channel = supabase
      .channel(`room-messages-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const inserted =
            payload.new as InsertedRoomMessage;

          const {
            data: author,
            error: authorError,
          } = await supabase
            .from("characters")
            .select(
              `
                id,
                display_name,
                portrait_url,
                public_slug
              `,
            )
            .eq(
              "id",
              inserted.character_id,
            )
            .maybeSingle();

          if (authorError) {
            console.error(
              "Unable to load message author:",
              authorError.message,
            );
          }

          const newMessage: RoomMessage = {
            id: inserted.id,
            message: inserted.message,
            created_at:
              inserted.created_at,
            character_id:
              inserted.character_id,
            character:
              (author as CharacterSummary | null) ??
              null,
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
        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
          return;
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setConnectionStatus(
            "disconnected",
          );
        }
      });

    return () => {
      void supabase.removeChannel(channel);
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
  <div className="relative flex min-h-0 flex-1 flex-col">
      {connectionStatus !== "connected" ? (
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
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {olderBefore ? (
          <div className="border-b border-[#4f3b28]/35 p-4 text-center">
            <Link
              href={`/game?before=${encodeURIComponent(
                olderBefore,
              )}#room-chronicle`}
              className="text-[10px] uppercase tracking-[0.2em] text-[#a98b61] hover:text-[#ecd29e]"
            >
              Load earlier actions
            </Link>
          </div>
        ) : null}

        {liveMessages.length > 0 ? (
          <div className="divide-y divide-[#4f3b28]/35">
            {liveMessages.map((item) => {
              const author =
                Array.isArray(
                  item.character,
                )
                  ? item.character[0]
                  : item.character;

              const date = new Date(
                item.created_at,
              );

              const time = Number.isNaN(
                date.getTime(),
              )
                ? ""
                : new Intl.DateTimeFormat(
                    "en-GB",
                    {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  ).format(date);

              const characterHref =
                getCharacterHref(author);

              return (
                <article
                  key={item.id}
                  className="flex gap-4 px-5 py-5 sm:px-7"
                >
                  {author?.public_slug ? (
                    <Link
                      href={characterHref}
                      className="h-12 w-12 shrink-0 overflow-hidden border border-[#60482e] bg-[#0d0a08]"
                    >
                      {author.portrait_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            author.portrait_url
                          }
                          alt={`Portrait of ${author.display_name}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[#806b4e]">
                          ?
                        </span>
                      )}
                    </Link>
                  ) : (
                    <div className="h-12 w-12 shrink-0 overflow-hidden border border-[#60482e] bg-[#0d0a08]">
                      {author?.portrait_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            author.portrait_url
                          }
                          alt={`Portrait of ${author.display_name}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[#806b4e]">
                          ?
                        </span>
                      )}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      {author?.public_slug ? (
                        <Link
                          href={characterHref}
                          className="font-serif text-lg text-[#d8bf91] transition hover:text-[#ecd29e]"
                        >
                          {author.display_name}
                        </Link>
                      ) : (
                        <span className="font-serif text-lg text-[#d8bf91]">
                          {author?.display_name ??
                            "Unknown character"}
                        </span>
                      )}

                      <time
                        dateTime={
                          item.created_at
                        }
                        className="text-[9px] uppercase tracking-[0.18em] text-[#776b5b]"
                      >
                        {time}
                      </time>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#b8aa96]">
                      {item.message}
                    </p>
                  </div>
                </article>
              );
            })}

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