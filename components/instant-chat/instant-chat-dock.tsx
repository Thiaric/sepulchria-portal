"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePortalAudio } from "@/components/audio/portal-audio-provider";
import { createClient } from "@/lib/supabase/client";

type Contact = {
  character_id: string;
  display_name: string;
  portrait_url: string | null;
  public_slug: string;
  presence_status: string;
  last_seen_at?: string | null;
  conversation_id: string | null;
  unread_count: number | string;
  last_message_at: string | null;
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_character_id: string;
  body: string;
  created_at: string;
};

type OpenChat = {
  characterId: string;
  conversationId: string;
};

export function InstantChatDock({
  characterId,
}: {
  characterId: string | null;
}) {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const { playPortalSound } =
    usePortalAudio();

  const [enabled, setEnabled] =
    useState(true);

  const [contacts, setContacts] =
    useState<Contact[]>([]);

  const [dockOpen, setDockOpen] =
    useState(false);

  const [openChat, setOpenChat] =
    useState<OpenChat | null>(null);

  const [
    chatMinimised,
    setChatMinimised,
  ] = useState(false);

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [draft, setDraft] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const scrollRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const openChatRef =
    useRef<OpenChat | null>(null);

  useEffect(() => {
    openChatRef.current = openChat;
  }, [openChat]);

  const totalUnread =
    contacts.reduce(
      (sum, contact) =>
        sum +
        Number(
          contact.unread_count ?? 0,
        ),
      0,
    );

  const loadContacts =
    useCallback(async () => {
      if (!characterId) {
        return;
      }

      const {
        data: setting,
      } = await supabase
        .from(
          "instant_chat_settings",
        )
        .select("enabled")
        .eq(
          "character_id",
          characterId,
        )
        .maybeSingle();

      setEnabled(
        setting?.enabled !== false,
      );

      const {
        data,
        error: contactError,
      } = await supabase.rpc(
        "get_instant_chat_contacts",
      );

      if (contactError) {
        console.error(
          "Instant chat contacts:",
          contactError.message,
        );
        return;
      }

      const rpcContacts =
        (data ?? []) as Contact[];

      /*
       * Do not trust the RPC's stored presence_status on its own.
       * A browser can disappear without ever writing "offline", leaving
       * an old "online" value behind indefinitely.
       *
       * character_presence.last_seen_at is the heartbeat source of truth.
       * Anything older than 2 minutes is treated as offline.
       */
      const contactIds =
        rpcContacts.map(
          (contact) =>
            contact.character_id,
        );

      if (contactIds.length === 0) {
        setContacts([]);
        return;
      }

      const {
        data: presenceRows,
        error: presenceError,
      } = await supabase
        .from(
          "character_presence",
        )
        .select(
          "character_id, last_seen_at",
        )
        .in(
          "character_id",
          contactIds,
        );

      if (presenceError) {
        console.error(
          "Instant chat presence:",
          presenceError.message,
        );

        /*
         * Fail safely: if heartbeat data cannot be read, do not show
         * somebody as online merely because a stale status says so.
         */
        setContacts(
          rpcContacts.map(
            (contact) => ({
              ...contact,
              presence_status:
                "offline",
            }),
          ),
        );
        return;
      }

      const lastSeenByCharacter =
        new Map<string, string | null>(
          (presenceRows ?? []).map(
            (row) => [
              row.character_id as string,
              (row.last_seen_at ??
                null) as string | null,
            ],
          ),
        );

      const ONLINE_WINDOW_MS =
        2 * 60 * 1000;

      const now = Date.now();

      setContacts(
        rpcContacts.map(
          (contact) => {
            const lastSeen =
              lastSeenByCharacter.get(
                contact.character_id,
              ) ?? null;

            const lastSeenMs =
              lastSeen
                ? Date.parse(lastSeen)
                : Number.NaN;

            const heartbeatIsFresh =
              Number.isFinite(
                lastSeenMs,
              ) &&
              now - lastSeenMs <=
                ONLINE_WINDOW_MS;

            return {
              ...contact,
              last_seen_at:
                lastSeen,
              presence_status:
                heartbeatIsFresh
                  ? contact.presence_status
                  : "offline",
            };
          },
        ),
      );
    }, [
      characterId,
      supabase,
    ]);

  const loadMessages =
    useCallback(
      async (
        conversationId: string,
      ) => {
        const {
          data,
          error: messageError,
        } = await supabase
          .from(
            "instant_chat_messages",
          )
          .select(
            "id, conversation_id, sender_character_id, body, created_at",
          )
          .eq(
            "conversation_id",
            conversationId,
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(200);

        if (messageError) {
          setError(
            messageError.message,
          );
          return;
        }

        setMessages(
          (
            (data ??
              []) as ChatMessage[]
          ).reverse(),
        );
      },
      [supabase],
    );

  const markRead =
    useCallback(
      async (
        conversationId: string,
      ) => {
        await supabase.rpc(
          "mark_instant_chat_read",
          {
            p_conversation_id:
              conversationId,
          },
        );

        setContacts(
          (current) =>
            current.map(
              (contact) =>
                contact.conversation_id ===
                conversationId
                  ? {
                      ...contact,
                      unread_count: 0,
                    }
                  : contact,
            ),
        );
      },
      [supabase],
    );

  useEffect(() => {
    void loadContacts();

    if (!characterId) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          void loadContacts();
        },
        10_000,
      );

    return () => {
      window.clearInterval(timer);
    };
  }, [
    characterId,
    loadContacts,
  ]);

  useEffect(() => {
    if (!characterId) {
      return;
    }

    const channel =
      supabase
        .channel(
          `instant-chat-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table:
              "instant_chat_messages",
          },
          (payload) => {
            const message =
              payload.new as ChatMessage;

            if (
              message.sender_character_id ===
              characterId
            ) {
              return;
            }

            const active =
              openChatRef.current;
          if (
  active?.conversationId ===
    message.conversation_id &&
  !chatMinimised &&
  document.visibilityState ===
    "visible"
) {
  setMessages(
    (current) =>
      current.some(
        (existing) =>
          existing.id ===
          message.id,
      )
        ? current
        : [
            ...current,
            message,
          ],
  );

  playPortalSound(
    "instant-swish",
  );

  void markRead(
    message.conversation_id,
  );
} else {
  playPortalSound(
    "instant-bubble",
  );

  void loadContacts();
}
          },
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    characterId,
    chatMinimised,
    loadContacts,
    markRead,
    playPortalSound,
    supabase,
  ]);

  useEffect(() => {
    if (
      !openChat ||
      chatMinimised
    ) {
      return;
    }

    void loadMessages(
      openChat.conversationId,
    );

    void markRead(
      openChat.conversationId,
    );
  }, [
    openChat,
    chatMinimised,
    loadMessages,
    markRead,
  ]);

  useEffect(() => {
    if (
      !openChat ||
      chatMinimised
    ) {
      return;
    }

    window.requestAnimationFrame(
      () => {
        if (
          scrollRef.current
        ) {
          scrollRef.current.scrollTop =
            scrollRef.current
              .scrollHeight;
        }
      },
    );
  }, [
    messages,
    openChat,
    chatMinimised,
  ]);

  if (!characterId) {
    return null;
  }

  async function openConversation(
    contact: Contact,
  ) {
    setError(null);
    setBusy(true);

    let conversationId =
      contact.conversation_id;

    if (!conversationId) {
      const {
        data,
        error:
          conversationError,
      } = await supabase.rpc(
        "start_instant_chat",
        {
          p_target_character_id:
            contact.character_id,
        },
      );

      if (conversationError) {
        setError(
          conversationError.message,
        );
        setBusy(false);
        return;
      }

      conversationId =
        data as string;

      await loadContacts();
    }

    setOpenChat({
      characterId:
        contact.character_id,
      conversationId,
    });

    setChatMinimised(false);
    setDockOpen(false);
    setBusy(false);
  }

  async function sendMessage() {
    if (
      !openChat ||
      !draft.trim() ||
      busy
    ) {
      return;
    }

    const body =
      draft.trim();

    setDraft("");
    setBusy(true);
    setError(null);

    const {
      error: sendError,
    } = await supabase.rpc(
      "send_instant_chat_message",
      {
        p_conversation_id:
          openChat.conversationId,
        p_body: body,
      },
    );

    if (sendError) {
      setDraft(body);
      setError(
        sendError.message,
      );
      setBusy(false);
      return;
    }

    await Promise.all([
      loadMessages(
        openChat.conversationId,
      ),
      loadContacts(),
    ]);

    setBusy(false);
  }

  async function toggleEnabled() {
    const next = !enabled;

    const {
      error: toggleError,
    } = await supabase.rpc(
      "set_instant_chat_enabled",
      {
        p_enabled: next,
      },
    );

    if (toggleError) {
      setError(
        toggleError.message,
      );
      return;
    }

    setEnabled(next);

    if (!next) {
      setDockOpen(false);
      setOpenChat(null);
    } else {
      await loadContacts();
    }
  }

  const activeContacts =
    contacts
      .filter((contact) =>
        Boolean(
          contact.conversation_id,
        ),
      )
      .sort(
        (a, b) =>
          Date.parse(
            b.last_message_at ??
              "1970-01-01",
          ) -
          Date.parse(
            a.last_message_at ??
              "1970-01-01",
          ),
      );

  const q =
    search
      .trim()
      .toLowerCase();

  const filteredContacts =
    contacts.filter(
      (contact) =>
        contact.display_name
          .toLowerCase()
          .includes(q),
    );

  const other =
    openChat
      ? contacts.find(
          (contact) =>
            contact.character_id ===
            openChat.characterId,
        ) ?? null
      : null;

  return (
    <div className="relative z-[120] w-full">
      {/* OPEN CONVERSATION */}
      {openChat && other ? (
        <section
          className={[
            "absolute bottom-[calc(100%+0.35rem)] left-0 right-0",
            "z-[130] overflow-hidden",
            "border border-[rgb(var(--sep-colour-765937))]/80",
            "bg-[rgb(var(--sep-colour-100c09))]",
            "shadow-[0_-12px_40px_rgba(var(--sep-rgb-0-0-0),0.78)]",
          ].join(" ")}
        >
          <header className="flex h-9 items-center gap-1.5 border-b border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-1d160f))] px-2">
            <div className="h-6 w-6 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0d0907))]">
              {other.portrait_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    other.portrait_url
                  }
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full items-center justify-center font-serif text-[9px] text-[rgb(var(--sep-colour-b6976c))]">
                  {other.display_name
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-[11px] leading-tight text-[rgb(var(--sep-colour-e1c89d))]">
                {
                  other.display_name
                }
              </p>

              <p className="mt-0.5 text-[6px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8d7b63))]">
                {
                  other.presence_status
                }{" "}
                · Off-game
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setChatMinimised(
                  (current) =>
                    !current,
                )
              }
              title={
                chatMinimised
                  ? "Expand chat"
                  : "Minimise chat"
              }
              className="flex h-5 w-5 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] text-[9px] text-[rgb(var(--sep-colour-b99b70))] transition hover:border-[rgb(var(--sep-colour-8b683e))] hover:text-[rgb(var(--sep-colour-e3c795))]"
            >
              {chatMinimised
                ? "□"
                : "—"}
            </button>

            <button
              type="button"
              onClick={() => {
                setOpenChat(null);
                setMessages([]);
                setError(null);
              }}
              title="Close chat"
              className="flex h-5 w-5 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] text-[10px] text-[rgb(var(--sep-colour-b99b70))] transition hover:border-[rgb(var(--sep-colour-8b683e))] hover:text-[rgb(var(--sep-colour-e3c795))]"
            >
              ×
            </button>
          </header>

          {!chatMinimised ? (
            <>
              <div
                ref={scrollRef}
                className="h-[min(220px,30dvh)] space-y-1.5 overflow-y-auto overscroll-contain bg-[rgb(var(--sep-colour-0d0a08))] p-2"
              >
                {messages.map(
                  (message) => {
                    const own =
                      message.sender_character_id ===
                      characterId;

                    return (
                      <div
                        key={
                          message.id
                        }
                        className={`flex ${
                          own
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[82%] border px-2 py-1.5 text-[10px] leading-4 ${
                            own
                              ? "border-[rgb(var(--sep-colour-80613c))] bg-[rgb(var(--sep-colour-2c2117))] text-[rgb(var(--sep-colour-dcc8a8))]"
                              : "border-[rgb(var(--sep-colour-514233))] bg-[rgb(var(--sep-colour-17120f))] text-[rgb(var(--sep-colour-c5b59c))]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {
                              message.body
                            }
                          </p>

                          <time className="mt-0.5 block text-right text-[6px] leading-none text-[rgb(var(--sep-colour-746858))]">
                            {new Date(
                              message.created_at,
                            ).toLocaleTimeString(
                              "en-GB",
                              {
                                hour: "2-digit",
                                minute:
                                  "2-digit",
                              },
                            )}
                          </time>
                        </div>
                      </div>
                    );
                  },
                )}

                {messages.length ===
                0 ? (
                  <p className="py-8 text-center text-[10px] text-[rgb(var(--sep-colour-776b5d))]">
                    Start an
                    off-game
                    conversation.
                  </p>
                ) : null}
              </div>

              {error ? (
                <p className="border-t border-[rgb(var(--sep-colour-7b4035))]/50 bg-[rgb(var(--sep-colour-2b1411))] px-2 py-1.5 text-[8px] text-[rgb(var(--sep-colour-e1a093))]">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-1.5 border-t border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] p-1.5">
                <textarea
                  value={draft}
                  onChange={(
                    event,
                  ) =>
                    setDraft(
                      event.target
                        .value,
                    )
                  }
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                        "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();

                      void sendMessage();
                    }
                  }}
                  rows={1}
                  maxLength={1200}
                  placeholder="Off-game message…"
                  className="min-h-[32px] min-w-0 flex-1 resize-none border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-2 py-1.5 text-[10px] leading-4 text-[rgb(var(--sep-colour-d8c6a8))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-9b7446))]"
                />

                <button
                  type="button"
                  disabled={
                    busy ||
                    !draft.trim()
                  }
                  onClick={() =>
                    void sendMessage()
                  }
                  className="shrink-0 border border-[rgb(var(--sep-colour-8b683e))] bg-[rgb(var(--sep-colour-382516))] px-2 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-e2c28f))] transition hover:bg-[rgb(var(--sep-colour-49301c))] disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {/* CONTACT / ACTIVE CHAT PANEL */}
      {dockOpen &&
      enabled &&
      !openChat ? (
        <section
          className={[
            "absolute bottom-[calc(100%+0.35rem)] left-0 right-0",
            "z-[125] overflow-hidden",
            "border border-[rgb(var(--sep-colour-765937))]/80",
            "bg-[rgb(var(--sep-colour-100c09))]",
            "shadow-[0_-12px_40px_rgba(var(--sep-rgb-0-0-0),0.78)]",
          ].join(" ")}
        >
          <header className="flex items-center justify-between border-b border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-1d160f))] px-2.5 py-1.5">
            <div>
              <p className="font-serif text-[11px] leading-tight text-[rgb(var(--sep-colour-e1c89d))]">
                Instant Chat
              </p>

              <p className="mt-0.5 text-[6px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806e59))]">
                Off-game only
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setDockOpen(false)
              }
              className="flex h-5 w-5 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] text-[10px] text-[rgb(var(--sep-colour-b99b70))] transition hover:border-[rgb(var(--sep-colour-8b683e))] hover:text-[rgb(var(--sep-colour-e3c795))]"
            >
              ×
            </button>
          </header>

          <div className="border-b border-[rgb(var(--sep-colour-60482e))]/40 p-1.5">
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Find a character…"
              className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-2 py-1.5 text-[9px] text-[rgb(var(--sep-colour-d8c6a8))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-9b7446))] [&::-webkit-search-cancel-button]:hidden"
            />
          </div>

          <div className="max-h-[min(260px,34dvh)] overflow-y-auto overscroll-contain p-1.5">
            {!q &&
            activeContacts.length >
              0 ? (
              <>
                <p className="px-1.5 py-1 text-[6px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806e59))]">
                  Active chats
                </p>

                {activeContacts.map(
                  (contact) => (
                    <ContactButton
                      key={`active-${contact.character_id}`}
                      contact={
                        contact
                      }
                      busy={busy}
                      onOpen={() =>
                        void openConversation(
                          contact,
                        )
                      }
                    />
                  ),
                )}

                <div className="my-1.5 border-t border-[rgb(var(--sep-colour-60482e))]/35" />
              </>
            ) : null}

            <p className="px-1.5 py-1 text-[6px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806e59))]">
              People in
              Sepulchria
            </p>

            {filteredContacts.map(
              (contact) => (
                <ContactButton
                  key={
                    contact.character_id
                  }
                  contact={contact}
                  busy={busy}
                  onOpen={() =>
                    void openConversation(
                      contact,
                    )
                  }
                />
              ),
            )}

            {filteredContacts.length ===
            0 ? (
              <p className="p-4 text-center text-[9px] text-[rgb(var(--sep-colour-776b5d))]">
                No characters
                available.
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="border-t border-[rgb(var(--sep-colour-7b4035))]/50 bg-[rgb(var(--sep-colour-2b1411))] px-2 py-1.5 text-[8px] text-[rgb(var(--sep-colour-e1a093))]">
              {error}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* COMPACT SIDEBAR CONTROL */}
      <div className="flex w-full items-center gap-1 border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-2">
        <button
          type="button"
          onClick={() =>
            void toggleEnabled()
          }
          title={
            enabled
              ? "Instant chat enabled — click to disable"
              : "Instant chat disabled — click to enable"
          }
          aria-label={
            enabled
              ? "Disable instant chat"
              : "Enable instant chat"
          }
          className={`flex h-7 w-7 shrink-0 items-center justify-center border transition ${
            enabled
              ? "border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-17120f))] text-[rgb(var(--sep-colour-b89a70))] hover:border-[rgb(var(--sep-colour-8b683e))] hover:text-[rgb(var(--sep-colour-e3c795))]"
              : "border-[rgb(var(--sep-colour-6b3f36))] bg-[rgb(var(--sep-colour-261411))] text-[rgb(var(--sep-colour-a65f53))] hover:border-[rgb(var(--sep-colour-98594d))] hover:text-[rgb(var(--sep-colour-d68d80))]"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />

            {!enabled ? (
              <path d="M4 4l16 16" />
            ) : null}
          </svg>
        </button>

        <button
          type="button"
          disabled={!enabled}
          onClick={() => {
            setDockOpen(
              (current) =>
                !current,
            );

            if (openChat) {
              setOpenChat(null);
              setMessages([]);
            }

            setError(null);
          }}
          className={[
            "relative flex h-7 min-w-0 flex-1 items-center justify-between gap-1.5",
            "border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-21170f))] px-2",
            "font-serif text-[10px] text-[rgb(var(--sep-colour-d8bc8d))]",
            "transition hover:border-[rgb(var(--sep-colour-9b7446))] hover:bg-[rgb(var(--sep-colour-2b1d13))]",
            "disabled:cursor-not-allowed disabled:border-[rgb(var(--sep-colour-49392b))] disabled:bg-[rgb(var(--sep-colour-15110e))] disabled:text-[rgb(var(--sep-colour-665b4d))]",
          ].join(" ")}
        >
          <span className="truncate">
            Instant Chat
          </span>

          <div className="flex shrink-0 items-center gap-1.5">
            {totalUnread > 0 ? (
              <span className="flex min-w-4 items-center justify-center rounded-full bg-[rgb(var(--sep-colour-8b3c32))] px-1 py-0.5 text-[7px] font-bold leading-none text-[rgb(var(--sep-colour-ffe1ac))]">
                {totalUnread >
                99
                  ? "99+"
                  : totalUnread}
              </span>
            ) : null}

            <span className="text-[7px] text-[rgb(var(--sep-colour-95754d))]">
              {dockOpen
                ? "▼"
                : "▲"}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

function ContactButton({
  contact,
  busy,
  onOpen,
}: {
  contact: Contact;
  busy: boolean;
  onOpen: () => void;
}) {
  const unread = Number(
    contact.unread_count ?? 0,
  );

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onOpen}
      className="flex w-full items-center gap-1.5 border-b border-[rgb(var(--sep-colour-3d3024))]/55 px-1.5 py-1.5 text-left transition hover:bg-[rgb(var(--sep-colour-1d160f))] disabled:opacity-50"
    >
      <div className="h-7 w-7 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0d0907))]">
        {contact.portrait_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={
              contact.portrait_url
            }
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center font-serif text-[9px] text-[rgb(var(--sep-colour-b6976c))]">
            {contact.display_name
              .charAt(0)
              .toUpperCase()}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-[10px] leading-tight text-[rgb(var(--sep-colour-d8c09a))]">
          {
            contact.display_name
          }
        </p>

        <p className="mt-0.5 text-[6px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-776b5d))]">
          {
            contact.presence_status
          }
        </p>
      </div>

      {unread > 0 ? (
        <span className="flex min-w-4 items-center justify-center rounded-full bg-[rgb(var(--sep-colour-8b3c32))] px-1 py-0.5 text-[7px] font-bold leading-none text-[rgb(var(--sep-colour-ffe1ac))]">
          {unread > 99
            ? "99+"
            : unread}
        </span>
      ) : null}
    </button>
  );
}