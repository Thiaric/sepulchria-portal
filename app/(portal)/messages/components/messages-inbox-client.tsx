"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useState,
} from "react";

import { RichTextContentClient } from "@/components/editor/rich-text-content-client";
import { SanctionRestrictionNotice, useSanctionCapability } from "@/components/sanctions/sanction-capability-ui";
import {
  MessageCharacterIcons,
  MessagePresenceStatus,
  type MessageCodexIdentity,
} from "@/components/messages/message-character-meta";

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
  is_system: boolean;

  race:
    | MessageCodexIdentity
    | MessageCodexIdentity[]
    | null;

  association:
    | MessageCodexIdentity
    | MessageCodexIdentity[]
    | null;
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
  isGroup: boolean;
  groupTitle: string | null;
  participantNames: string[];

  lastMessage: {
    id: string;
    body: string;
    created_at: string;
    sender_character_id: string;
  } | null;

  unreadCount: number;
  searchableText: string;

  matchedMessages:
    MessageSearchEntry[];
};

type MessagesInboxClientProps = {
  viewerIsStaff: boolean;

  conversations:
    ConversationCard[];

  availableCharacters:
    CharacterSummary[];

  showArchived: boolean;
};

function displayName(
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

function formatDate(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/London",
    },
  ).format(date);
}

export function MessagesInboxClient({
  viewerIsStaff,
  conversations,
  availableCharacters,
  showArchived,
}: MessagesInboxClientProps) {
  const router = useRouter();

  const [query, setQuery] =
    useState("");

  const communication = useSanctionCapability("communication");

  const [
    newMessageOpen,
    setNewMessageOpen,
  ] = useState(false);

  const normalizedQuery =
    query
      .trim()
      .toLowerCase();

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
        .filter(
          (conversation) =>
            conversation.searchableText.includes(
              normalizedQuery,
            ),
        )
        .map(
          (conversation) => {
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
                matchingMessage
                  ?.body ??
                null,
            };
          },
        );
    }, [
      conversations,
      normalizedQuery,
    ]);

  return (
    <div className="p-2 sm:p-4 lg:p-4">
      <div className="mx-auto max-w-[1200px]">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[rgb(var(--sep-colour-654b2e))]/40 pb-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-[rgb(var(--sep-colour-927047))]">
              Private correspondence
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {communication.blocked ? (
              <SanctionRestrictionNotice message={communication.message} compact />
            ) : (
              <Link href="/messages/new" className="border border-[rgb(var(--sep-colour-a07742))] bg-[rgb(var(--sep-colour-402a17))] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-f1d5a2))] transition hover:border-[rgb(var(--sep-colour-c49351))] hover:bg-[rgb(var(--sep-colour-56371c))]">New message</Link>
            )}

            <Link
              href="/messages"
              className={`border px-4 py-2 text-[10px] uppercase tracking-[0.18em] transition ${
                !showArchived
                  ? "border-[rgb(var(--sep-colour-967342))] bg-[rgb(var(--sep-colour-3b2b1b))] text-[rgb(var(--sep-colour-efd9aa))]"
                  : "border-[rgb(var(--sep-colour-59432c))] text-[rgb(var(--sep-colour-a98b61))] hover:border-[rgb(var(--sep-colour-80613c))]"
              }`}
            >
              Inbox
            </Link>

            <Link
              href="/messages?archived=1"
              className={`border px-4 py-2 text-[10px] uppercase tracking-[0.18em] transition ${
                showArchived
                  ? "border-[rgb(var(--sep-colour-967342))] bg-[rgb(var(--sep-colour-3b2b1b))] text-[rgb(var(--sep-colour-efd9aa))]"
                  : "border-[rgb(var(--sep-colour-59432c))] text-[rgb(var(--sep-colour-a98b61))] hover:border-[rgb(var(--sep-colour-80613c))]"
              }`}
            >
              Archived
            </Link>
          </div>
        </header>

        <section className="mt-3 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-3">
          <label className="block">
            <span className="mb-2 block text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
              Filter conversations
            </span>

            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target
                    .value,
                )
              }
              placeholder="Search by character or message text..."
              className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
            />
          </label>

          {normalizedQuery ? (
            <p className="mt-3 text-[10px] text-[rgb(var(--sep-colour-887a67))]">
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

        <div className="mt-3 space-y-2">
          {filteredConversations.map(
            (conversation) => {
              const otherName =
                conversation.isGroup
                  ? conversation.groupTitle?.trim() ||
                    conversation.participantNames.join(", ") ||
                    "Group conversation"
                  : conversation.other
                    ? displayName(
                        conversation.other,
                      )
                    : "Deleted character";

              return (
                <article
                  key={
                    conversation.id
                  }
                  className="flex flex-col gap-3 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-3 transition hover:border-[rgb(var(--sep-colour-80613c))] sm:flex-row sm:items-center"
                >
                  <div
                    role="link"
                    tabIndex={0}
                    onClick={() =>
                      router.push(
                        `/messages/${conversation.id}`,
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        router.push(
                          `/messages/${conversation.id}`,
                        );
                      }
                    }}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
                  >
                    <div className="h-11 w-11 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0d0a08))]">
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
                        <span className="flex h-full items-center justify-center font-serif text-lg text-[rgb(var(--sep-colour-806b4e))]">
                          {otherName
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    {!conversation.isGroup &&
                    conversation.other &&
                    !conversation.other.is_system ? (
                      <MessageCharacterIcons
                        characterId={
                          conversation.other.id
                        }
                        race={
                          conversation.other
                            .race
                        }
                      />
                    ) : null}

                    <div className="min-w-0 flex-1 pl-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="truncate font-serif text-base text-[rgb(var(--sep-colour-dec69a))]">
                          {otherName}
                        </h2>

                        {!conversation.isGroup &&
                        conversation.other &&
                        !conversation.other.is_system ? (
                          <MessagePresenceStatus
                            characterId={
                              conversation
                                .other.id
                            }
                            viewerIsStaff={
                              viewerIsStaff
                            }
                          />
                        ) : null}

                        {conversation.unreadCount >
                        0 ? (
                          <span className="rounded-full bg-[rgb(var(--sep-colour-8b3c32))] px-2 py-1 text-[10px] font-bold text-[rgb(var(--sep-colour-ffe1ac))]">
                            {
                              conversation.unreadCount
                            }
                          </span>
                        ) : null}
                      </div>

                      {!conversation.isGroup &&
                      conversation.other &&
                      !conversation.other.is_system &&
                      conversation.other
                        .title ? (
                        <p className="mt-1 truncate text-[10px] italic text-[rgb(var(--sep-colour-8d7b63))]">
                          {
                            conversation
                              .other
                              .title
                          }
                        </p>
                      ) : null}

                      <div className="mt-1 max-h-5 overflow-hidden text-xs leading-5 text-[rgb(var(--sep-colour-9f907c))]">
                        {conversation.matchSnippet ? (
                          <RichTextContentClient
                            body={
                              conversation.matchSnippet
                            }
                            className="[&_p]:m-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-sm [&_img]:hidden [&_table]:hidden"
                          />
                        ) : conversation.lastMessage
                            ?.body ? (
                          <RichTextContentClient
                            body={
                              conversation
                                .lastMessage
                                .body
                            }
                            className="[&_p]:m-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-sm [&_img]:hidden [&_table]:hidden"
                          />
                        ) : (
                          "No messages yet."
                        )}
                      </div>

                      {conversation.matchSnippet ? (
                        <p className="mt-1 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-ad7d42))]">
                          Matching message
                        </p>
                      ) : null}

                      <p className="mt-1 text-[8px] text-[rgb(var(--sep-colour-665c50))]">
                        {formatDate(
                          conversation.updatedAt,
                        )}
                      </p>
                    </div>
                  </div>

                  <form
                    action={
                      toggleArchive
                    }
                  >
                    <input
                      type="hidden"
                      name="conversationId"
                      value={
                        conversation.id
                      }
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
                      className="w-full border border-[rgb(var(--sep-colour-59432c))] px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-a98b61))] transition hover:border-[rgb(var(--sep-colour-80613c))] hover:text-[rgb(var(--sep-colour-d5ba8c))] sm:w-auto"
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
            <p className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 text-center text-sm text-[rgb(var(--sep-colour-8f8271))]">
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
          setNewMessageOpen(
            false,
          )
        }
        characters={
          availableCharacters
        }
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
  characters:
    CharacterSummary[];
}) {
  const [query, setQuery] =
    useState("");

  const [
    selectedId,
    setSelectedId,
  ] = useState("");

  const filteredCharacters =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLowerCase();

      if (!normalized) {
        return characters;
      }

      return characters.filter(
        (character) =>
          [
            displayName(
              character,
            ),
            character.title,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(
              normalized,
            ),
      );
    }, [
      characters,
      query,
    ]);

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
        className="flex max-h-[85dvh] w-full max-w-xl flex-col overflow-hidden border border-[rgb(var(--sep-colour-80603a))]/70 bg-[rgb(var(--sep-colour-120d0a))] shadow-[0_30px_100px_rgba(var(--sep-rgb-0-0-0),0.8)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[rgb(var(--sep-colour-60482e))]/45 p-5">
          <div>
            <p className="text-[8px] uppercase tracking-[0.25em] text-[rgb(var(--sep-colour-8c704b))]">
              Private correspondence
            </p>

            <h2
              id="new-message-title"
              className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-e6cea3))]"
            >
              New message
            </h2>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="flex h-9 w-9 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/55 text-lg text-[rgb(var(--sep-colour-b99a6d))] transition hover:border-[rgb(var(--sep-colour-9b7446))] hover:text-[rgb(var(--sep-colour-edd1a0))]"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <label className="block">
            <span className="mb-2 block text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
              Find a character
            </span>

            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target
                    .value,
                )
              }
              autoFocus
              placeholder="Type a character name..."
              className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
            />
          </label>

          <div className="mt-4 space-y-2">
            {filteredCharacters.map(
              (character) => {
                const name =
                  displayName(
                    character,
                  );

                const selected =
                  selectedId ===
                  character.id;

                return (
                  <button
                    key={
                      character.id
                    }
                    type="button"
                    onClick={() =>
                      setSelectedId(
                        character.id,
                      )
                    }
                    className={`flex w-full items-center gap-3 border p-3 text-left transition ${
                      selected
                        ? "border-[rgb(var(--sep-colour-a77a42))] bg-[rgb(var(--sep-colour-382313))]"
                        : "border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-100c09))] hover:border-[rgb(var(--sep-colour-80613c))] hover:bg-[rgb(var(--sep-colour-1b130e))]"
                    }`}
                  >
                    <div className="h-11 w-11 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0d0a08))]">
                      {character.portrait_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            character
                              .portrait_url
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center font-serif text-[rgb(var(--sep-colour-9b805b))]">
                          {name
                            .charAt(
                              0,
                            )
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    <MessageCharacterIcons
                      characterId={
                        character.id
                      }
                      race={
                        character.race
                      }
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-serif text-lg text-[rgb(var(--sep-colour-dcc397))]">
                          {name}
                        </p>

                        <MessagePresenceStatus
                          characterId={
                            character.id
                          }
                        />
                      </div>

                      <p className="mt-1 truncate text-[9px] text-[rgb(var(--sep-colour-7d7060))]">
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
              <p className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-5 text-center text-sm text-[rgb(var(--sep-colour-817565))]">
                No available
                characters match
                your search.
              </p>
            ) : null}
          </div>
        </div>

        <footer className="flex justify-end gap-3 border-t border-[rgb(var(--sep-colour-60482e))]/45 p-5">
          <button
            type="button"
            onClick={
              onClose
            }
            className="border border-[rgb(var(--sep-colour-59432c))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a98b61))]"
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
              value={
                selectedId
              }
            />

            <button
              type="submit"
              disabled={
                !selectedId
              }
              className="border border-[rgb(var(--sep-colour-a07742))] bg-[rgb(var(--sep-colour-402a17))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-f1d5a2))] transition hover:border-[rgb(var(--sep-colour-c49351))] hover:bg-[rgb(var(--sep-colour-56371c))] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start conversation
            </button>
          </form>
        </footer>
      </section>
    </div>
  );
}
