"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import { toggleArchive } from "../actions";
import { startConversationFromDirectory } from "../new-conversation-action";

type CharacterSummary = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
  portrait_url: string | null;
  public_slug: string;
  title: string | null;
};

type MessageSearchEntry = {
  id: string;
  body: string;
  createdAt: string;
};

type ConversationCard = {
  id: string;
  updatedAt: string;
  archivedAt: string | null;
  other: CharacterSummary | null;
  lastMessage: {
    id: string;
    body: string;
    created_at: string;
    sender_character_id: string;
  } | null;
  unreadCount: number;
  searchableText: string;
  matchedMessages: MessageSearchEntry[];
};

type MessagesInboxClientProps = {
  conversations: ConversationCard[];
  availableCharacters: CharacterSummary[];
  showArchived: boolean;
};

function displayName(
  character: CharacterSummary,
): string {
  return (
    character.display_name?.trim() ||
    [character.first_name, character.surname]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Unnamed character"
  );
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function compactText(
  value: string,
  max = 150,
): string {
  const normalized = value
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= max) {
    return normalized;
  }

  return `${normalized.slice(
    0,
    max - 1,
  )}…`;
}

export function MessagesInboxClient({
  conversations,
  availableCharacters,
  showArchived,
}: MessagesInboxClientProps) {
  const [query, setQuery] =
    useState("");

  const [newMessageOpen, setNewMessageOpen] =
    useState(false);

  const normalizedQuery =
    query.trim().toLowerCase();

  const filteredConversations =
    useMemo(() => {
      if (!normalizedQuery) {
        return conversations.map(
          (conversation) => ({
            ...conversation,
            matchSnippet: null as
              | string
              | null,
          }),
        );
      }

      return conversations
        .filter((conversation) =>
          conversation.searchableText.includes(
            normalizedQuery,
          ),
        )
        .map((conversation) => {
          const matchingMessage =
            conversation.matchedMessages.find(
              (message) =>
                message.body
                  .toLowerCase()
                  .includes(
                    normalizedQuery,
                  ),
            );

          return {
            ...conversation,
            matchSnippet:
              matchingMessage?.body ?? null,
          };
        });
    }, [
      conversations,
      normalizedQuery,
    ]);

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-5 border-b border-[#654b2e]/40 pb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#927047]">
              Private correspondence
            </p>

            <h1 className="mt-2 font-serif text-4xl text-[#ecd9b2]">
              Messages
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setNewMessageOpen(true)
              }
              className="border border-[#a07742] bg-[#402a17] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[#f1d5a2] transition hover:border-[#c49351] hover:bg-[#56371c]"
            >
              New message
            </button>

            <Link
              href="/messages"
              className={`border px-4 py-2 text-[10px] uppercase tracking-[0.18em] transition ${
                !showArchived
                  ? "border-[#967342] bg-[#3b2b1b] text-[#efd9aa]"
                  : "border-[#59432c] text-[#a98b61] hover:border-[#80613c]"
              }`}
            >
              Inbox
            </Link>

            <Link
              href="/messages?archived=1"
              className={`border px-4 py-2 text-[10px] uppercase tracking-[0.18em] transition ${
                showArchived
                  ? "border-[#967342] bg-[#3b2b1b] text-[#efd9aa]"
                  : "border-[#59432c] text-[#a98b61] hover:border-[#80613c]"
              }`}
            >
              Archived
            </Link>
          </div>
        </header>

        <section className="mt-6 border border-[#60482e]/45 bg-[#15100d] p-4">
          <label className="block">
            <span className="mb-2 block text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
              Filter conversations
            </span>

            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder="Search by character or message text..."
              className="w-full border border-[#60482e]/55 bg-[#100c09] px-4 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
            />
          </label>

          {normalizedQuery ? (
            <p className="mt-3 text-[10px] text-[#887a67]">
              {
                filteredConversations.length
              }{" "}
              conversation
              {filteredConversations.length ===
              1
                ? ""
                : "s"}{" "}
              found.
            </p>
          ) : null}
        </section>

        <div className="mt-5 space-y-3">
          {filteredConversations.map(
            (conversation) => {
              const otherName =
                conversation.other
                  ? displayName(
                      conversation.other,
                    )
                  : "Deleted character";

              return (
                <article
                  key={conversation.id}
                  className="flex flex-col gap-4 border border-[#60482e]/45 bg-[#15100d] p-5 transition hover:border-[#80613c] sm:flex-row sm:items-center"
                >
                  <Link
                    href={`/messages/${conversation.id}`}
                    className="flex min-w-0 flex-1 items-center gap-4"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden border border-[#60482e] bg-[#0d0a08]">
                      {conversation.other
                        ?.portrait_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            conversation.other
                              .portrait_url
                          }
                          alt={`Portrait of ${otherName}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center font-serif text-lg text-[#806b4e]">
                          {otherName
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="truncate font-serif text-xl text-[#dec69a]">
                          {otherName}
                        </h2>

                        {conversation.unreadCount >
                        0 ? (
                          <span className="rounded-full bg-[#8b3c32] px-2 py-1 text-[10px] font-bold text-[#ffe1ac]">
                            {
                              conversation.unreadCount
                            }
                          </span>
                        ) : null}
                      </div>

                      {conversation.other
                        ?.title ? (
                        <p className="mt-1 truncate text-[10px] italic text-[#8d7b63]">
                          {
                            conversation.other
                              .title
                          }
                        </p>
                      ) : null}

                      <p className="mt-2 truncate text-sm text-[#9f907c]">
                        {conversation.matchSnippet
                          ? compactText(
                              conversation.matchSnippet,
                            )
                          : conversation
                              .lastMessage
                              ?.body ??
                            "No messages yet."}
                      </p>

                      {conversation.matchSnippet ? (
                        <p className="mt-1 text-[8px] uppercase tracking-[0.16em] text-[#ad7d42]">
                          Matching message
                        </p>
                      ) : null}

                      <p className="mt-2 text-[9px] text-[#665c50]">
                        {formatDate(
                          conversation.updatedAt,
                        )}
                      </p>
                    </div>
                  </Link>

                  <form action={toggleArchive}>
                    <input
                      type="hidden"
                      name="conversationId"
                      value={conversation.id}
                    />

                    <input
                      type="hidden"
                      name="archive"
                      value={
                        showArchived
                          ? "false"
                          : "true"
                      }
                    />

                    <button
                      type="submit"
                      className="w-full border border-[#59432c] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#a98b61] transition hover:border-[#80613c] hover:text-[#d5ba8c] sm:w-auto"
                    >
                      {showArchived
                        ? "Restore"
                        : "Archive"}
                    </button>
                  </form>
                </article>
              );
            },
          )}

          {filteredConversations.length ===
          0 ? (
            <p className="border border-[#60482e]/45 bg-[#15100d] p-8 text-center text-sm text-[#8f8271]">
              {normalizedQuery
                ? "No conversations match your search."
                : "No conversations here yet."}
            </p>
          ) : null}
        </div>
      </div>

      <NewMessageModal
        open={newMessageOpen}
        onClose={() =>
          setNewMessageOpen(false)
        }
        characters={availableCharacters}
      />
    </div>
  );
}

function NewMessageModal({
  open,
  onClose,
  characters,
}: {
  open: boolean;
  onClose: () => void;
  characters: CharacterSummary[];
}) {
  const [query, setQuery] =
    useState("");

  const [selectedId, setSelectedId] =
    useState("");

  const filteredCharacters =
    useMemo(() => {
      const normalized =
        query.trim().toLowerCase();

      if (!normalized) {
        return characters;
      }

      return characters.filter(
        (character) =>
          [
            displayName(character),
            character.title,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(normalized),
      );
    }, [characters, query]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-message-title"
        className="flex max-h-[85dvh] w-full max-w-xl flex-col overflow-hidden border border-[#80603a]/70 bg-[#120d0a] shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#60482e]/45 p-5">
          <div>
            <p className="text-[8px] uppercase tracking-[0.25em] text-[#8c704b]">
              Private correspondence
            </p>

            <h2
              id="new-message-title"
              className="mt-2 font-serif text-3xl text-[#e6cea3]"
            >
              New message
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center border border-[#60482e]/55 text-lg text-[#b99a6d] transition hover:border-[#9b7446] hover:text-[#edd1a0]"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <label className="block">
            <span className="mb-2 block text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
              Find a character
            </span>

            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              autoFocus
              placeholder="Type a character name..."
              className="w-full border border-[#60482e]/55 bg-[#100c09] px-4 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
            />
          </label>

          <div className="mt-4 space-y-2">
            {filteredCharacters.map(
              (character) => {
                const name =
                  displayName(character);

                const selected =
                  selectedId ===
                  character.id;

                return (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() =>
                      setSelectedId(
                        character.id,
                      )
                    }
                    className={`flex w-full items-center gap-3 border p-3 text-left transition ${
                      selected
                        ? "border-[#a77a42] bg-[#382313]"
                        : "border-[#59432c]/55 bg-[#100c09] hover:border-[#80613c] hover:bg-[#1b130e]"
                    }`}
                  >
                    <div className="h-11 w-11 shrink-0 overflow-hidden border border-[#60482e] bg-[#0d0a08]">
                      {character.portrait_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            character.portrait_url
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center font-serif text-[#9b805b]">
                          {name
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-serif text-lg text-[#dcc397]">
                        {name}
                      </p>

                      <p className="mt-1 truncate text-[9px] text-[#7d7060]">
                        {character.title ??
                          "Citizen of Sepulchria"}
                      </p>
                    </div>
                  </button>
                );
              },
            )}

            {filteredCharacters.length ===
            0 ? (
              <p className="border border-[#59432c]/40 bg-[#100c09] p-5 text-center text-sm text-[#817565]">
                No available characters match
                your search.
              </p>
            ) : null}
          </div>
        </div>

        <footer className="flex justify-end gap-3 border-t border-[#60482e]/45 p-5">
          <button
            type="button"
            onClick={onClose}
            className="border border-[#59432c] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[#a98b61]"
          >
            Cancel
          </button>

          <form
            action={
              startConversationFromDirectory
            }
          >
            <input
              type="hidden"
              name="recipientId"
              value={selectedId}
            />

            <button
              type="submit"
              disabled={!selectedId}
              className="border border-[#a07742] bg-[#402a17] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[#f1d5a2] transition hover:border-[#c49351] hover:bg-[#56371c] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start conversation
            </button>
          </form>
        </footer>
      </section>
    </div>
  );
}
