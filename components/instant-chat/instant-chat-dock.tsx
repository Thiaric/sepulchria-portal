"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type OpenChat = { characterId: string; conversationId: string };

export function InstantChatDock({ characterId }: { characterId: string | null }) {
  const supabase = useMemo(() => createClient(), []);
  const { playPortalSound } = usePortalAudio();

  const [enabled, setEnabled] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [dockOpen, setDockOpen] = useState(false);
  const [openChat, setOpenChat] = useState<OpenChat | null>(null);
  const [chatMinimised, setChatMinimised] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const openChatRef = useRef<OpenChat | null>(null);

  useEffect(() => { openChatRef.current = openChat; }, [openChat]);

  const totalUnread = contacts.reduce(
    (sum, c) => sum + Number(c.unread_count ?? 0), 0,
  );

  const loadContacts = useCallback(async () => {
    if (!characterId) return;

    const { data: setting } = await supabase
      .from("instant_chat_settings")
      .select("enabled")
      .eq("character_id", characterId)
      .maybeSingle();

    setEnabled(setting?.enabled !== false);

    const { data, error: e } = await supabase.rpc("get_instant_chat_contacts");
    if (e) {
      console.error("Instant chat contacts:", e.message);
      return;
    }
    setContacts((data ?? []) as Contact[]);
  }, [characterId, supabase]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data, error: e } = await supabase
      .from("instant_chat_messages")
      .select("id, conversation_id, sender_character_id, body, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (e) { setError(e.message); return; }
    setMessages((data ?? []) as ChatMessage[]);
  }, [supabase]);

  const markRead = useCallback(async (conversationId: string) => {
    await supabase.rpc("mark_instant_chat_read", {
      p_conversation_id: conversationId,
    });
    setContacts((current) =>
      current.map((c) =>
        c.conversation_id === conversationId ? { ...c, unread_count: 0 } : c,
      ),
    );
  }, [supabase]);

  useEffect(() => {
    void loadContacts();
    if (!characterId) return;
    const timer = window.setInterval(() => void loadContacts(), 10_000);
    return () => window.clearInterval(timer);
  }, [characterId, loadContacts]);

  useEffect(() => {
    if (!characterId) return;

    const channel = supabase
      .channel(`instant-chat-${characterId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "instant_chat_messages",
      }, (payload) => {
        const message = payload.new as ChatMessage;
        if (message.sender_character_id === characterId) return;

        const active = openChatRef.current;
        if (
          active?.conversationId === message.conversation_id &&
          !chatMinimised &&
          document.visibilityState === "visible"
        ) {
          setMessages((current) =>
            current.some((m) => m.id === message.id) ? current : [...current, message],
          );
          void markRead(message.conversation_id);
        } else {
          playPortalSound("room-message");
          void loadContacts();
        }
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [characterId, chatMinimised, loadContacts, markRead, playPortalSound, supabase]);

  useEffect(() => {
    if (!openChat || chatMinimised) return;
    void loadMessages(openChat.conversationId);
    void markRead(openChat.conversationId);
  }, [openChat, chatMinimised, loadMessages, markRead]);

  useEffect(() => {
    if (!openChat || chatMinimised) return;
    window.requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }, [messages, openChat, chatMinimised]);

  if (!characterId) return null;

  async function openConversation(contact: Contact) {
    setError(null);
    setBusy(true);
    let conversationId = contact.conversation_id;

    if (!conversationId) {
      const { data, error: e } = await supabase.rpc("start_instant_chat", {
        p_target_character_id: contact.character_id,
      });
      if (e) { setError(e.message); setBusy(false); return; }
      conversationId = data as string;
      await loadContacts();
    }

    setOpenChat({ characterId: contact.character_id, conversationId });
    setChatMinimised(false);
    setDockOpen(false);
    setBusy(false);
  }

  async function sendMessage() {
    if (!openChat || !draft.trim() || busy) return;
    const body = draft.trim();
    setDraft("");
    setBusy(true);
    setError(null);

    const { error: e } = await supabase.rpc("send_instant_chat_message", {
      p_conversation_id: openChat.conversationId,
      p_body: body,
    });

    if (e) {
      setDraft(body);
      setError(e.message);
      setBusy(false);
      return;
    }

    await Promise.all([loadMessages(openChat.conversationId), loadContacts()]);
    setBusy(false);
  }

  async function toggleEnabled() {
    const next = !enabled;
    const { error: e } = await supabase.rpc("set_instant_chat_enabled", {
      p_enabled: next,
    });
    if (e) { setError(e.message); return; }

    setEnabled(next);
    if (!next) {
      setDockOpen(false);
      setOpenChat(null);
    } else {
      await loadContacts();
    }
  }

  const activeContacts = contacts
    .filter((c) => Boolean(c.conversation_id))
    .sort((a, b) =>
      Date.parse(b.last_message_at ?? "1970-01-01") -
      Date.parse(a.last_message_at ?? "1970-01-01"),
    );

  const q = search.trim().toLowerCase();
  const filteredContacts = contacts.filter((c) =>
    c.display_name.toLowerCase().includes(q),
  );

  const other = openChat
    ? contacts.find((c) => c.character_id === openChat.characterId) ?? null
    : null;

  return (
    <div className="pointer-events-none fixed bottom-10 right-4 z-[120] flex flex-col items-end gap-2 sm:right-5 xl:right-[calc(clamp(240px,18vw,300px)+1.25rem)]">
      {openChat && other ? (
        <section className="pointer-events-auto w-[min(92vw,360px)] overflow-hidden border border-[#765937]/80 bg-[#100c09] shadow-[0_18px_60px_rgba(0,0,0,0.78)]">
          <header className="flex h-12 items-center gap-2 border-b border-[#60482e]/55 bg-[#1d160f] px-3">
            <div className="h-8 w-8 shrink-0 overflow-hidden border border-[#60482e] bg-[#0d0907]">
              {other.portrait_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={other.portrait_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center font-serif text-[#b6976c]">
                  {other.display_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-sm text-[#e1c89d]">{other.display_name}</p>
              <p className="text-[7px] uppercase tracking-[0.16em] text-[#8d7b63]">
                {other.presence_status} · Off-game
              </p>
            </div>

            <button type="button" onClick={() => setChatMinimised((v) => !v)}
              className="flex h-7 w-7 items-center justify-center border border-[#60482e]/55 text-[#b99b70]">
              {chatMinimised ? "□" : "—"}
            </button>
            <button type="button" onClick={() => setOpenChat(null)}
              className="flex h-7 w-7 items-center justify-center border border-[#60482e]/55 text-[#b99b70]">×</button>
          </header>

          {!chatMinimised ? (
            <>
              <div ref={scrollRef} className="h-[320px] space-y-2 overflow-y-auto bg-[#0d0a08] p-3">
                {messages.map((message) => {
                  const own = message.sender_character_id === characterId;
                  return (
                    <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[82%] border px-3 py-2 text-xs leading-5 ${
                        own
                          ? "border-[#80613c] bg-[#2c2117] text-[#dcc8a8]"
                          : "border-[#514233] bg-[#17120f] text-[#c5b59c]"
                      }`}>
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <time className="mt-1 block text-right text-[7px] text-[#746858]">
                          {new Date(message.created_at).toLocaleTimeString("en-GB", {
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </time>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 ? (
                  <p className="py-12 text-center text-xs text-[#776b5d]">Start an off-game conversation.</p>
                ) : null}
              </div>

              {error ? (
                <p className="border-t border-[#7b4035]/50 bg-[#2b1411] px-3 py-2 text-[9px] text-[#e1a093]">{error}</p>
              ) : null}

              <div className="flex gap-2 border-t border-[#60482e]/55 bg-[#15100d] p-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  rows={2}
                  maxLength={1200}
                  placeholder="Off-game message…"
                  className="min-h-[42px] flex-1 resize-none border border-[#60482e]/55 bg-[#0d0907] px-3 py-2 text-xs text-[#d8c6a8] outline-none placeholder:text-[#625747] focus:border-[#9b7446]"
                />
                <button type="button" disabled={busy || !draft.trim()} onClick={() => void sendMessage()}
                  className="border border-[#8b683e] bg-[#382516] px-3 text-[8px] uppercase tracking-[0.14em] text-[#e2c28f] disabled:opacity-40">
                  Send
                </button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {dockOpen && enabled ? (
        <section className="pointer-events-auto w-[min(92vw,320px)] overflow-hidden border border-[#765937]/80 bg-[#100c09] shadow-[0_18px_60px_rgba(0,0,0,0.78)]">
          <header className="flex items-center justify-between border-b border-[#60482e]/55 bg-[#1d160f] px-3 py-2.5">
            <div>
              <p className="font-serif text-sm text-[#e1c89d]">Instant Chat</p>
              <p className="text-[7px] uppercase tracking-[0.16em] text-[#806e59]">Off-game only</p>
            </div>
            <button type="button" onClick={() => setDockOpen(false)}
              className="flex h-7 w-7 items-center justify-center border border-[#60482e]/55 text-[#b99b70]">×</button>
          </header>

          <div className="border-b border-[#60482e]/40 p-2">
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a character…"
              className="w-full border border-[#60482e]/55 bg-[#0d0907] px-3 py-2 text-xs text-[#d8c6a8] outline-none placeholder:text-[#625747] [&::-webkit-search-cancel-button]:hidden" />
          </div>

          <div className="max-h-[330px] overflow-y-auto p-2">
            {!q && activeContacts.length > 0 ? (
              <>
                <p className="px-2 py-1 text-[7px] uppercase tracking-[0.18em] text-[#806e59]">Active chats</p>
                {activeContacts.map((c) => (
                  <ContactButton key={`active-${c.character_id}`} contact={c} busy={busy}
                    onOpen={() => void openConversation(c)} />
                ))}
                <div className="my-2 border-t border-[#60482e]/35" />
              </>
            ) : null}

            <p className="px-2 py-1 text-[7px] uppercase tracking-[0.18em] text-[#806e59]">People in Sepulchria</p>
            {filteredContacts.map((c) => (
              <ContactButton key={c.character_id} contact={c} busy={busy}
                onOpen={() => void openConversation(c)} />
            ))}
            {filteredContacts.length === 0 ? (
              <p className="p-5 text-center text-xs text-[#776b5d]">No characters available.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="pointer-events-auto flex items-center gap-2">
        <button type="button" onClick={() => void toggleEnabled()}
          title={enabled ? "Disable instant chat" : "Enable instant chat"}
          className={`h-9 border px-3 text-[8px] uppercase tracking-[0.14em] ${
            enabled
              ? "border-[#60482e] bg-[#17120f] text-[#9f896a]"
              : "border-[#6b3f36] bg-[#261411] text-[#c88f82]"
          }`}>
          {enabled ? "Chat on" : "Chat off"}
        </button>

        {enabled ? (
          <button type="button" onClick={() => setDockOpen((v) => !v)}
            className="relative flex h-10 min-w-[132px] items-center justify-center gap-2 border border-[#8b683e] bg-[#2c1d12] px-4 font-serif text-sm text-[#e3c795] shadow-[0_10px_30px_rgba(0,0,0,0.55)]">
            <span>Instant Chat</span>
            {totalUnread > 0 ? (
              <span className="flex min-w-5 items-center justify-center rounded-full bg-[#8b3c32] px-1.5 py-0.5 text-[9px] font-bold text-[#ffe1ac]">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            ) : null}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ContactButton({ contact, busy, onOpen }: {
  contact: Contact; busy: boolean; onOpen: () => void;
}) {
  const unread = Number(contact.unread_count ?? 0);
  return (
    <button type="button" disabled={busy} onClick={onOpen}
      className="flex w-full items-center gap-2 border-b border-[#3d3024]/55 px-2 py-2 text-left transition hover:bg-[#1d160f] disabled:opacity-50">
      <div className="h-9 w-9 shrink-0 overflow-hidden border border-[#60482e] bg-[#0d0907]">
        {contact.portrait_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={contact.portrait_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center font-serif text-[#b6976c]">
            {contact.display_name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-xs text-[#d8c09a]">{contact.display_name}</p>
        <p className="mt-0.5 text-[7px] uppercase tracking-[0.14em] text-[#776b5d]">{contact.presence_status}</p>
      </div>
      {unread > 0 ? (
        <span className="flex min-w-5 items-center justify-center rounded-full bg-[#8b3c32] px-1.5 py-0.5 text-[9px] font-bold text-[#ffe1ac]">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </button>
  );
}
