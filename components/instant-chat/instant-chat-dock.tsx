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

      setContacts(
        (data ?? []) as Contact[],
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
            ascending: true,
          })
          .limit(200);

        if (messageError) {
          setError(
            messageError.message,
          );
          return;
        }

        setMessages(
          (data ??
            []) as ChatMessage[],
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

              void markRead(
                message.conversation_id,
              );
            } else {
              playPortalSound(
                "room-message",
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
            "border border-[#765937]/80",
            "bg-[#100c09]",
            "shadow-[0_-12px_40px_rgba(0,0,0,0.78)]",
          ].join(" ")}
        >
          <header className="flex h-9 items-center gap-1.5 border-b border-[#60482e]/55 bg-[#1d160f] px-2">
            <div className="h-6 w-6 shrink-0 overflow-hidden border border-[#60482e] bg-[#0d0907]">
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
                <span className="flex h-full items-center justify-center font-serif text-[9px] text-[#b6976c]">
                  {other.display_name
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-[11px] leading-tight text-[#e1c89d]">
                {
                  other.display_name
                }
              </p>

              <p className="mt-0.5 text-[6px] uppercase tracking-[0.12em] text-[#8d7b63]">
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
              className="flex h-5 w-5 items-center justify-center border border-[#60482e]/55 bg-[#15100d] text-[9px] text-[#b99b70] transition hover:border-[#8b683e] hover:text-[#e3c795]"
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
              className="flex h-5 w-5 items-center justify-center border border-[#60482e]/55 bg-[#15100d] text-[10px] text-[#b99b70] transition hover:border-[#8b683e] hover:text-[#e3c795]"
            >
              ×
            </button>
          </header>

          {!chatMinimised ? (
            <>
              <div
                ref={scrollRef}
                className="h-[min(220px,30dvh)] space-y-1.5 overflow-y-auto overscroll-contain bg-[#0d0a08] p-2"
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
                              ? "border-[#80613c] bg-[#2c2117] text-[#dcc8a8]"
                              : "border-[#514233] bg-[#17120f] text-[#c5b59c]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {
                              message.body
                            }
                          </p>

                          <time className="mt-0.5 block text-right text-[6px] leading-none text-[#746858]">
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
                  <p className="py-8 text-center text-[10px] text-[#776b5d]">
                    Start an
                    off-game
                    conversation.
                  </p>
                ) : null}
              </div>

              {error ? (
                <p className="border-t border-[#7b4035]/50 bg-[#2b1411] px-2 py-1.5 text-[8px] text-[#e1a093]">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-1.5 border-t border-[#60482e]/55 bg-[#15100d] p-1.5">
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
                  className="min-h-[32px] min-w-0 flex-1 resize-none border border-[#60482e]/55 bg-[#0d0907] px-2 py-1.5 text-[10px] leading-4 text-[#d8c6a8] outline-none placeholder:text-[#625747] focus:border-[#9b7446]"
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
                  className="shrink-0 border border-[#8b683e] bg-[#382516] px-2 text-[7px] uppercase tracking-[0.1em] text-[#e2c28f] transition hover:bg-[#49301c] disabled:opacity-40"
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
            "border border-[#765937]/80",
            "bg-[#100c09]",
            "shadow-[0_-12px_40px_rgba(0,0,0,0.78)]",
          ].join(" ")}
        >
          <header className="flex items-center justify-between border-b border-[#60482e]/55 bg-[#1d160f] px-2.5 py-1.5">
            <div>
              <p className="font-serif text-[11px] leading-tight text-[#e1c89d]">
                Instant Chat
              </p>

              <p className="mt-0.5 text-[6px] uppercase tracking-[0.12em] text-[#806e59]">
                Off-game only
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setDockOpen(false)
              }
              className="flex h-5 w-5 items-center justify-center border border-[#60482e]/55 bg-[#15100d] text-[10px] text-[#b99b70] transition hover:border-[#8b683e] hover:text-[#e3c795]"
            >
              ×
            </button>
          </header>

          <div className="border-b border-[#60482e]/40 p-1.5">
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Find a character…"
              className="w-full border border-[#60482e]/55 bg-[#0d0907] px-2 py-1.5 text-[9px] text-[#d8c6a8] outline-none placeholder:text-[#625747] focus:border-[#9b7446] [&::-webkit-search-cancel-button]:hidden"
            />
          </div>

          <div className="max-h-[min(260px,34dvh)] overflow-y-auto overscroll-contain p-1.5">
            {!q &&
            activeContacts.length >
              0 ? (
              <>
                <p className="px-1.5 py-1 text-[6px] uppercase tracking-[0.14em] text-[#806e59]">
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

                <div className="my-1.5 border-t border-[#60482e]/35" />
              </>
            ) : null}

            <p className="px-1.5 py-1 text-[6px] uppercase tracking-[0.14em] text-[#806e59]">
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
              <p className="p-4 text-center text-[9px] text-[#776b5d]">
                No characters
                available.
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="border-t border-[#7b4035]/50 bg-[#2b1411] px-2 py-1.5 text-[8px] text-[#e1a093]">
              {error}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* COMPACT SIDEBAR CONTROL */}
      <div className="flex w-full items-center gap-1 border-t border-[#60482e]/35 pt-2">
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
              ? "border-[#60482e] bg-[#17120f] text-[#b89a70] hover:border-[#8b683e] hover:text-[#e3c795]"
              : "border-[#6b3f36] bg-[#261411] text-[#a65f53] hover:border-[#98594d] hover:text-[#d68d80]"
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
            "border border-[#765937]/70 bg-[#21170f] px-2",
            "font-serif text-[10px] text-[#d8bc8d]",
            "transition hover:border-[#9b7446] hover:bg-[#2b1d13]",
            "disabled:cursor-not-allowed disabled:border-[#49392b] disabled:bg-[#15110e] disabled:text-[#665b4d]",
          ].join(" ")}
        >
          <span className="truncate">
            Instant Chat
          </span>

          <div className="flex shrink-0 items-center gap-1.5">
            {totalUnread > 0 ? (
              <span className="flex min-w-4 items-center justify-center rounded-full bg-[#8b3c32] px-1 py-0.5 text-[7px] font-bold leading-none text-[#ffe1ac]">
                {totalUnread >
                99
                  ? "99+"
                  : totalUnread}
              </span>
            ) : null}

            <span className="text-[7px] text-[#95754d]">
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
      className="flex w-full items-center gap-1.5 border-b border-[#3d3024]/55 px-1.5 py-1.5 text-left transition hover:bg-[#1d160f] disabled:opacity-50"
    >
      <div className="h-7 w-7 shrink-0 overflow-hidden border border-[#60482e] bg-[#0d0907]">
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
          <span className="flex h-full items-center justify-center font-serif text-[9px] text-[#b6976c]">
            {contact.display_name
              .charAt(0)
              .toUpperCase()}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-[10px] leading-tight text-[#d8c09a]">
          {
            contact.display_name
          }
        </p>

        <p className="mt-0.5 text-[6px] uppercase tracking-[0.1em] text-[#776b5d]">
          {
            contact.presence_status
          }
        </p>
      </div>

      {unread > 0 ? (
        <span className="flex min-w-4 items-center justify-center rounded-full bg-[#8b3c32] px-1 py-0.5 text-[7px] font-bold leading-none text-[#ffe1ac]">
          {unread > 99
            ? "99+"
            : unread}
        </span>
      ) : null}
    </button>
  );
}