import Link from "next/link";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  obscureCommunication,
} from "./actions";

type SearchParams = {
  view?: string;
  q?: string;
  character?: string;
  conversation?: string;
  room?: string;
  kind?: string;
  from?: string;
  to?: string;
  type?: string;
  message?: string;
};

type CharacterOption = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
};

type RoomOption = {
  id: string;
  name: string;
  slug: string;
};

function one<T>(
  value: T | T[] | null,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function characterName(
  character:
    | {
        display_name?: string | null;
        first_name?: string | null;
        surname?: string | null;
      }
    | null
    | undefined,
) {
  return (
    character?.display_name?.trim() ||
    [
      character?.first_name,
      character?.surname,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Unknown character"
  );
}

function formatDateTime(
  value: string,
) {
  const date = new Date(value);

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
    },
  ).format(date);
}

function plainText(
  value: string,
) {
  return value
    .replace(
      /<br\s*\/?>/gi,
      "\n",
    )
    .replace(
      /<\/p>/gi,
      "\n",
    )
    .replace(
      /<[^>]+>/g,
      "",
    )
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function startOfDay(
  value: string | undefined,
) {
  return value
    ? `${value}T00:00:00.000Z`
    : null;
}

function endOfDay(
  value: string | undefined,
) {
  return value
    ? `${value}T23:59:59.999Z`
    : null;
}

function buildHref(
  current: SearchParams,
  changes: Record<
    string,
    string | null
  >,
) {
  const params =
    new URLSearchParams();

  for (
    const [key, value]
    of Object.entries({
      ...current,
      ...changes,
    })
  ) {
    if (value) {
      params.set(
        key,
        value,
      );
    }
  }

  return `/admin/communication-logs?${params.toString()}`;
}

const input =
  "h-9 min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 text-[9px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-9b7446))]";

const button =
  "h-9 border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-4 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d5b785))] transition hover:border-[rgb(var(--sep-colour-ad824d))]";

type CommunicationSourceType =
  | "direct_message"
  | "instant_chat_message"
  | "room_message";

type ModerationRecord = {
  source_id: string;
  original_content: string;
  original_forwarded_body:
    | string
    | null;
  reason: string;
  moderated_at: string;
  moderated_by_label: string;
};

async function loadModerationMap(
  supabase: ReturnType<
    typeof createAdminClient
  >,
  sourceType:
    CommunicationSourceType,
  sourceIds: string[],
) {
  if (sourceIds.length === 0) {
    return new Map<
      string,
      ModerationRecord
    >();
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "communication_moderation_actions",
    )
    .select(
      "source_id, original_content, original_forwarded_body, reason, moderated_at, moderated_by_label",
    )
    .eq(
      "source_type",
      sourceType,
    )
    .in(
      "source_id",
      sourceIds,
    );

  if (error) {
    throw new Error(
      `Unable to load moderation state: ${error.message}`,
    );
  }

  return new Map(
    (
      (data ?? []) as
        ModerationRecord[]
    ).map((row) => [
      String(row.source_id),
      row,
    ]),
  );
}

function ModerationPanel({
  sourceType,
  sourceId,
  moderation,
}: {
  sourceType:
    CommunicationSourceType;
  sourceId: string;
  moderation:
    | ModerationRecord
    | null;
}) {
  if (moderation) {
    return (
      <div
        data-communication-log-marker
        data-source-type={sourceType}
        data-source-id={sourceId}
        className="mt-3 border border-[rgb(var(--sep-colour-8d5b45))]/65 bg-[rgb(var(--sep-colour-241310))] px-3 py-2"
      >
        <p className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d49a88))]">
          Obscured by staff
        </p>
        <p className="mt-1 text-[9px] leading-5 text-[rgb(var(--sep-colour-baa58b))]">
          {moderation.moderated_by_label}
          {" · "}
          {formatDateTime(
            moderation.moderated_at,
          )}
          {" · "}
          {moderation.reason}
        </p>
      </div>
    );
  }

  return (
    <details
      data-communication-log-marker
      data-source-type={sourceType}
      data-source-id={sourceId}
      className="mt-3 border border-[rgb(var(--sep-colour-70483f))]/55 bg-[rgb(var(--sep-colour-1d1110))] px-3 py-2"
    >
      <summary className="cursor-pointer text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d99b8e))]">
        Obscure
      </summary>

      <form
        action={
          obscureCommunication
        }
        className="mt-3 flex flex-col gap-2 sm:flex-row"
      >
        <input
          type="hidden"
          name="sourceType"
          value={sourceType}
        />
        <input
          type="hidden"
          name="sourceId"
          value={sourceId}
        />

        <input
          type="text"
          name="reason"
          required
          maxLength={500}
          placeholder="Reason for obscuring this message…"
          className="h-9 min-w-0 flex-1 border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-0c0907))] px-3 text-[9px] text-[rgb(var(--sep-colour-d2c0a5))] outline-none"
        />

        <button
          type="submit"
          className="h-9 border border-[rgb(var(--sep-colour-9a5147))] bg-[rgb(var(--sep-colour-351815))] px-3 text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-e0a69a))]"
        >
          Confirm Obscure
        </button>
      </form>
    </details>
  );
}

export default async function CommunicationLogsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  await requireAdminSection("communication_logs");

  const params =
    (await searchParams) ?? {};

  const view =
    params.view === "chat" ||
    params.view === "instant" ||
    params.view === "blocks"
      ? params.view
      : "pm";

  const supabase =
    createAdminClient();

  const [
    charactersResult,
    roomsResult,
    privateRoomsResult,
    headquartersResult,
  ] = await Promise.all([
    supabase
      .from("characters")
      .select(
        "id, display_name, first_name, surname",
      )
      .eq("is_system", false)
      .order(
        "display_name",
        {
          ascending: true,
        },
      ),

    supabase
      .from("rooms")
      .select(
        "id, name, slug",
      )
      .order("name"),

    supabase
      .from(
        "private_location_rooms",
      )
      .select("room_id"),

    supabase
      .from(
        "order_headquarters",
      )
      .select("room_id"),
  ]);

  const firstError =
    charactersResult.error ??
    roomsResult.error ??
    privateRoomsResult.error ??
    headquartersResult.error;

  if (firstError) {
    throw new Error(
      `Unable to prepare Communication Logs: ${firstError.message}`,
    );
  }

  const characters =
    (charactersResult.data ??
      []) as CharacterOption[];

  const rooms =
    (roomsResult.data ??
      []) as RoomOption[];

  const privateRoomIds =
    new Set(
      (
        privateRoomsResult.data ??
        []
      ).map(
        (row) =>
          String(row.room_id),
      ),
    );

  const headquartersRoomIds =
    new Set(
      (
        headquartersResult.data ??
        []
      ).map(
        (row) =>
          String(row.room_id),
      ),
    );

  const content =
    view === "pm"
      ? await loadPrivateMessages(
          params,
          characters,
        )
      : view === "instant"
        ? await loadInstantChatMessages(
            params,
            characters,
          )
        : view === "blocks"
          ? await loadCharacterBlocks(
              params,
              characters,
            )
        : await loadRoomMessages(
            params,
            privateRoomIds,
            headquartersRoomIds,
          );

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-[1500px]">
        <div>
          <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
            Administration · Moderation
          </p>

          <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">
            Communication Logs
          </h1>

          <p className="mt-3 max-w-4xl text-sm leading-7 text-[rgb(var(--sep-colour-9c8d79))]">
            Staff-only read access to historical Private Messages,
            complete location chat logs (including whispers), and the
            bottom-right off-game Instant Chat. Viewing a log does not
            join the conversation, alter unread state, or appear as a
            participant.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <ViewLink
            active={
              view === "pm"
            }
            href={buildHref(
              params,
              {
                view: "pm",
                room: null,
                type: null,
                kind: null,
                conversation:
                  null,
              },
            )}
          >
            Private Messages
          </ViewLink>

          <ViewLink
            active={
              view === "chat"
            }
            href={buildHref(
              params,
              {
                view: "chat",
                conversation:
                  null,
                type: null,
              },
            )}
          >
            Location Chats
          </ViewLink>

          <ViewLink
            active={
              view ===
              "instant"
            }
            href={buildHref(
              params,
              {
                view: "instant",
                room: null,
                kind: null,
                type: null,
              },
            )}
          >
            Instant Chats
          </ViewLink>

          <ViewLink
            active={view === "blocks"}
            href={buildHref(params, {
              view: "blocks",
              room: null,
              kind: null,
              type: null,
              conversation: null,
            })}
          >
            Character Blocks
          </ViewLink>
        </div>

        <form
          method="get"
          className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
        >
          <input
            type="hidden"
            name="view"
            value={view}
          />

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
            <input
              type="search"
              name="q"
              defaultValue={
                params.q ?? ""
              }
              placeholder="Search message content..."
              className={`${input} xl:col-span-2`}
            />

            <select
              name="character"
              defaultValue={
                params.character ??
                ""
              }
              className={input}
            >
              <option value="">
                All characters
              </option>

              {characters.map(
                (character) => (
                  <option
                    key={
                      character.id
                    }
                    value={
                      character.id
                    }
                  >
                    {characterName(
                      character,
                    )}
                  </option>
                ),
              )}
            </select>

            {view === "pm" ||
            view === "instant" ? (
              <input
                name="conversation"
                defaultValue={
                  params.conversation ??
                  ""
                }
                placeholder={
                  view === "instant"
                    ? "Instant Chat UUID..."
                    : "Conversation UUID..."
                }
                className={input}
              />
            ) : (
              <select
                name="room"
                defaultValue={
                  params.room ??
                  ""
                }
                className={input}
              >
                <option value="">
                  All locations
                </option>

                {rooms.map(
                  (room) => (
                    <option
                      key={
                        room.id
                      }
                      value={
                        room.id
                      }
                    >
                      {room.name}
                    </option>
                  ),
                )}
              </select>
            )}

            <input
              type="date"
              name="from"
              defaultValue={
                params.from ?? ""
              }
              className={input}
              title="From date"
            />

            <input
              type="date"
              name="to"
              defaultValue={
                params.to ?? ""
              }
              className={input}
              title="To date"
            />
          </div>

          {view === "chat" ? (
            <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
              <select
                name="kind"
                defaultValue={
                  params.kind ??
                  ""
                }
                className={input}
              >
                <option value="">
                  All location types
                </option>
                <option value="public">
                  Public Locations
                </option>
                <option value="private">
                  Private Locations
                </option>
                <option value="headquarters">
                  Order Headquarters
                </option>
              </select>

              <select
                name="type"
                defaultValue={
                  params.type ??
                  ""
                }
                className={input}
              >
                <option value="">
                  All chat entries
                </option>
                <option value="action">
                  Actions / Dialogue
                </option>
                <option value="dice_roll">
                  Dice Rolls
                </option>
                <option value="attribute_check">
                  Attribute Checks
                </option>
                <option value="fate">
                  Fate
                </option>
                <option value="whisper">
                  Whispers
                </option>
              </select>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className={button}
            >
              Apply Filters
            </button>

            <Link
              href={`/admin/communication-logs?view=${view}`}
              className={`${button} inline-flex items-center`}
            >
              Reset
            </Link>

            <span className="ml-auto text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-716654))]">
              Newest first · maximum 250 results
            </span>
          </div>
        </form>

        {content}
      </div>
    </main>
  );
}

async function loadPrivateMessages(
  params: SearchParams,
  characters: CharacterOption[],
) {
  const supabase =
    createAdminClient();

  let conversationIds:
    | string[]
    | null = null;

  if (params.character) {
    const {
      data: memberships,
      error,
    } = await supabase
      .from(
        "direct_conversation_participants",
      )
      .select(
        "conversation_id",
      )
      .eq(
        "character_id",
        params.character,
      );

    if (error) {
      throw new Error(
        `Unable to filter PM conversations: ${error.message}`,
      );
    }

    conversationIds =
      (memberships ?? []).map(
        (row) =>
          String(
            row.conversation_id,
          ),
      );

    if (
      conversationIds.length ===
      0
    ) {
      return (
        <EmptyState message="No Private Messages match these filters." />
      );
    }
  }

  let query =
    supabase
      .from("direct_messages")
      .select(`
        id,
        conversation_id,
        sender_character_id,
        body,
        message_mode,
        created_at,
        forwarded_sender_name,
        forwarded_created_at,
        forwarded_body,
        sender:characters!direct_messages_sender_character_id_fkey(
          id,
          display_name,
          first_name,
          surname,
          is_system
        ),
        conversation:direct_conversations(
          id,
          is_group,
          title
        )
      `)
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(250);

  if (params.q?.trim()) {
    query = query.ilike(
      "body",
      `%${params.q.trim()}%`,
    );
  }

  if (
    params.conversation?.trim()
  ) {
    query = query.eq(
      "conversation_id",
      params.conversation.trim(),
    );
  } else if (
    conversationIds
  ) {
    query = query.in(
      "conversation_id",
      conversationIds,
    );
  }

  const from =
    startOfDay(params.from);
  const to =
    endOfDay(params.to);

  if (from) {
    query = query.gte(
      "created_at",
      from,
    );
  }

  if (to) {
    query = query.lte(
      "created_at",
      to,
    );
  }

  const {
    data: messages,
    error,
  } = await query;

  if (error) {
    throw new Error(
      `Unable to load Private Message logs: ${error.message}`,
    );
  }

  const conversationIdList =
    [
      ...new Set(
        (messages ?? []).map(
          (message) =>
            String(
              message.conversation_id,
            ),
        ),
      ),
    ];

  const {
    data: participantRows,
    error:
      participantsError,
  } =
    conversationIdList.length
      ? await supabase
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
              is_system
            )
          `)
          .in(
            "conversation_id",
            conversationIdList,
          )
      : {
          data: [],
          error: null,
        };

  if (participantsError) {
    throw new Error(
      `Unable to load PM participants: ${participantsError.message}`,
    );
  }

  const names =
    new Map<string, string[]>();

  for (
    const row of
      participantRows ?? []
  ) {
    const character =
      one(
        row.character as
          | {
              id: string;
              display_name:
                | string
                | null;
              first_name:
                | string
                | null;
              surname:
                | string
                | null;
            }
          | {
              id: string;
              display_name:
                | string
                | null;
              first_name:
                | string
                | null;
              surname:
                | string
                | null;
            }[]
          | null,
      );

    if (!character) continue;

    const key =
      String(
        row.conversation_id,
      );

    names.set(
      key,
      [
        ...(names.get(key) ??
          []),
        characterName(
          character,
        ),
      ],
    );
  }

  const characterById =
    new Map(
      characters.map(
        (character) => [
          character.id,
          characterName(
            character,
          ),
        ],
      ),
    );

  const moderationById =
    await loadModerationMap(
      supabase,
      "direct_message",
      (messages ?? []).map(
        (message) =>
          String(message.id),
      ),
    );

  return (
    <section className="mt-4 space-y-2">
      {(messages ?? []).map(
        (message) => {
          const sender =
            one(
              message.sender as
                | {
                    id: string;
                    display_name:
                      | string
                      | null;
                    first_name:
                      | string
                      | null;
                    surname:
                      | string
                      | null;
                    is_system:
                      boolean;
                  }
                | {
                    id: string;
                    display_name:
                      | string
                      | null;
                    first_name:
                      | string
                      | null;
                    surname:
                      | string
                      | null;
                    is_system:
                      boolean;
                  }[]
                | null,
            );

          const conversation =
            one(
              message.conversation as
                | {
                    id: string;
                    is_group:
                      boolean;
                    title:
                      | string
                      | null;
                  }
                | {
                    id: string;
                    is_group:
                      boolean;
                    title:
                      | string
                      | null;
                  }[]
                | null,
            );

          const participants =
            names.get(
              String(
                message.conversation_id,
              ),
            ) ?? [];

          const conversationLabel =
            conversation?.is_group
              ? conversation
                  .title?.trim() ||
                participants.join(
                  ", ",
                ) ||
                "Group conversation"
              : participants.join(
                  " ↔ ",
                ) ||
                "Direct conversation";

          const moderation =
            moderationById.get(
              String(message.id),
            ) ?? null;

          const isTarget =
            params.message ===
            String(message.id);

          return (
            <article
              id={`message-${message.id}`}
              key={message.id}
              className={`border bg-[rgb(var(--sep-colour-15100d))] p-4 ${
                isTarget
                  ? "border-[rgb(var(--sep-colour-c99758))] ring-1 ring-[rgb(var(--sep-colour-c99758))]/70"
                  : "border-[rgb(var(--sep-colour-59432c))]/40"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-serif text-base text-[rgb(var(--sep-colour-dcc49a))]">
                    {sender
                      ? characterName(
                          sender,
                        )
                      : characterById.get(
                          String(
                            message.sender_character_id,
                          ),
                        ) ??
                        "Deleted / unknown sender"}
                  </p>

                  <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806f5b))]">
                    {conversationLabel}
                    {" · "}
                    {message.message_mode ??
                      "message"}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[9px] text-[rgb(var(--sep-colour-9b8768))]">
                    {formatDateTime(
                      String(
                        message.created_at,
                      ),
                    )}
                  </p>

                  <p className="mt-1 font-mono text-[7px] text-[rgb(var(--sep-colour-62584b))]">
                    {
                      message.conversation_id
                    }
                  </p>
                </div>
              </div>

              <div className="mt-3 whitespace-pre-wrap border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-3 text-xs leading-6 text-[rgb(var(--sep-colour-c1b198))]">
                {plainText(
                  String(
                    moderation
                      ?.original_content ??
                      message.body ??
                      "",
                  ),
                ) ||
                  "(empty message)"}
              </div>

              {(moderation
                ?.original_forwarded_body ??
                message.forwarded_body) ? (
                <div className="mt-3 border-l-2 border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-100c09))] p-3 text-[10px] leading-5 text-[rgb(var(--sep-colour-9e907d))]">
                  <p className="mb-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806f5b))]">
                    Forwarded from{" "}
                    {message.forwarded_sender_name ??
                      "Unknown"}
                    {message.forwarded_created_at
                      ? ` · ${formatDateTime(
                          String(
                            message.forwarded_created_at,
                          ),
                        )}`
                      : ""}
                  </p>

                  <p className="whitespace-pre-wrap">
                    {plainText(
                      String(
                        moderation
                          ?.original_forwarded_body ??
                          message.forwarded_body,
                      ),
                    )}
                  </p>
                </div>
              ) : null}

              <ModerationPanel
                sourceType="direct_message"
                sourceId={String(
                  message.id,
                )}
                moderation={
                  moderation
                }
              />
            </article>
          );
        },
      )}

      {!messages?.length ? (
        <EmptyState message="No Private Messages match these filters." />
      ) : null}
    </section>
  );
}


type LocationChatCharacter = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  surname: string | null;
  portrait_url: string | null;
  race:
    | {
        id: string;
        name: string;
        icon_url: string | null;
      }
    | {
        id: string;
        name: string;
        icon_url: string | null;
      }[]
    | null;
};

type LocationChatTags = {
  buffs: string[];
  debuffs: string[];
  conditions: string[];
  prices: string[];
};

function locationChatFirstName(
  character:
    | {
        display_name?: string | null;
        first_name?: string | null;
      }
    | null
    | undefined,
) {
  return (
    character?.first_name?.trim() ||
    character?.display_name
      ?.trim()
      .split(/\s+/)[0] ||
    "Unknown character"
  );
}

function locationChatAttributeLabel(
  key:
    | string
    | null
    | undefined,
) {
  const labels: Record<string, string> = {
    muscles: "Muscles",
    reflexes: "Reflexes",
    vigor: "Vigor",
    brains: "Brains",
    shrewd: "Shrewd",
    presence_score: "Presence",
  };

  return key
    ? labels[key] ?? key
    : "Attribute";
}

function locationChatRollText(
  message: {
    message: string;
    message_type: string;
    roll_label: string | null;
    dice_sides: number | null;
    dice_result: number | null;
    attribute_key: string | null;
    attribute_value: number | null;
    roll_total: number | null;
  },
) {
  if (
    message.message_type === "dice_roll" &&
    message.dice_sides &&
    message.dice_result !== null
  ) {
    return `d${message.dice_sides} → ${message.dice_result}`;
  }

  if (
    message.message_type === "attribute_check" &&
    message.roll_label &&
    message.dice_result !== null &&
    message.attribute_value !== null &&
    message.roll_total !== null
  ) {
    return `${message.roll_label} · d20(${message.dice_result}) + ${locationChatAttributeLabel(
      message.attribute_key,
    )}(+${message.attribute_value}) = ${message.roll_total}`;
  }

  return String(message.message ?? "").replace(
    /^◆\s*/,
    "",
  );
}

function isLocationMechanicalAction(
  message: {
    message: string;
    message_type: string;
  },
) {
  if (
    message.message_type !== "action" ||
    !String(message.message ?? "")
      .trimStart()
      .startsWith("◆")
  ) {
    return false;
  }

  const value = String(
    message.message ?? "",
  ).replace(/^◆\s*/, "");

  return (
    /^Warp\s+/i.test(value) ||
    /^used\s+"/i.test(value) ||
    /\battacks?\b/i.test(value) ||
    /\buses\s+(?:dodge|defend|resist)/i.test(value) ||
    /\bchooses\s+do nothing\b/i.test(value) ||
    /\bawaiting\s+(?:dodge|defend|resist)/i.test(value) ||
    /\bsuccess roll:/i.test(value) ||
    /\bshape succeeds\b/i.test(value) ||
    /\bno counter attempted\b/i.test(value) ||
    /\bpotential damage:/i.test(value) ||
    /\bfate resolves the result\b/i.test(value) ||
    /\bcurrent hp\s+-?\d+\s*(?:->|→)\s*-?\d+/i.test(value) ||
    /\bhealing\s+\d+/i.test(value) ||
    /\bdamage\s+\d+/i.test(value) ||
    /\b\d+\s+damage\b/i.test(value)
  );
}

function locationMechanicalBracket(
  value: string,
) {
  const clean = value
    .trim()
    .replace(/^\[|\]$/g, "");

  return `[${clean}]`;
}

function formatLocationMechanicalSegment(
  rawSegment: string,
  index: number,
) {
  const segment =
    rawSegment.trim();

  if (!segment) {
    return "";
  }

  if (
    index === 0 &&
    /^Warp\s+/i.test(segment)
  ) {
    return `warps ${locationMechanicalBracket(
      segment.replace(/^Warp\s+/i, ""),
    )}`;
  }

  const used = segment.match(
    /^used\s+"([^"]+)"\s+on\s+(.+)$/i,
  );

  if (used) {
    return `uses ${locationMechanicalBracket(
      used[1],
    )} on ${locationMechanicalBracket(
      used[2],
    )}`;
  }

  const counterAgainst =
    segment.match(
      /^(.+?)\s+uses\s+(.+?)\s+against\s+(.+)$/i,
    );

  if (
    counterAgainst &&
    /^(Dodge|Defend|Resist)/i.test(
      counterAgainst[2],
    )
  ) {
    return `${counterAgainst[1]} uses ${locationMechanicalBracket(
      counterAgainst[2],
    )} against ${locationMechanicalBracket(
      counterAgainst[3],
    )}`;
  }

  const counter = segment.match(
    /^(.+?)\s+uses\s+(.+)$/i,
  );

  if (
    counter &&
    /^(Dodge|Defend|Resist)/i.test(
      counter[2],
    )
  ) {
    return `${counter[1]} uses ${locationMechanicalBracket(
      counter[2],
    )}`;
  }

  const doNothing =
    segment.match(
      /^(.+?)\s+chooses\s+Do nothing$/i,
    );

  if (doNothing) {
    return `${doNothing[1]} chooses ${locationMechanicalBracket(
      "Do Nothing",
    )}`;
  }

  const attackOn =
    segment.match(
      /^attacks\s+on\s+(.+?)\s+with\s+"([^"]+)"$/i,
    );

  if (attackOn) {
    return `attacks ${locationMechanicalBracket(
      attackOn[1],
    )} with ${locationMechanicalBracket(
      attackOn[2],
    )}`;
  }

  const attackWith =
    segment.match(
      /^attacks\s+(.+?)\s+with\s+"([^"]+)"$/i,
    );

  if (attackWith) {
    return `attacks ${locationMechanicalBracket(
      attackWith[1],
    )} with ${locationMechanicalBracket(
      attackWith[2],
    )}`;
  }

  const unarmed =
    segment.match(
      /^attacks\s+(.+?)\s+Unarmed$/i,
    );

  if (unarmed) {
    return `attacks ${locationMechanicalBracket(
      unarmed[1],
    )} with ${locationMechanicalBracket(
      "Unarmed",
    )}`;
  }

  const level =
    segment.match(
      /^Level\s+(.+)$/i,
    );

  if (level) {
    return locationMechanicalBracket(
      `Level ${level[1]}`,
    );
  }

  const labelled =
    segment.match(
      /^(Target|Targets|Automatic|Save required|Movement|Components|Duration|Resolved|Condition|Effect):\s*(.+)$/i,
    );

  if (labelled) {
    return `${labelled[1]}: ${locationMechanicalBracket(
      labelled[2],
    )}`;
  }

  const successRoll =
    segment.match(
      /^Success Roll:\s*(.+)$/i,
    );

  if (successRoll) {
    return `Success Roll ${locationMechanicalBracket(
      successRoll[1],
    )}`;
  }

  const diceRoll =
    segment.match(
      /^(d(?:4|6|8|10|12|20|100)\s*(?:->|→))\s*(.+)$/i,
    );

  if (diceRoll) {
    const dcMatch =
      diceRoll[2].match(
        /^(.+?)\s+vs\s+DC\s+(-?\d+)$/i,
      );

    if (dcMatch) {
      return `${diceRoll[1]} ${locationMechanicalBracket(
        dcMatch[1],
      )} vs DC ${locationMechanicalBracket(
        dcMatch[2],
      )}`;
    }

    return `${diceRoll[1]} ${locationMechanicalBracket(
      diceRoll[2],
    )}`;
  }

  const awaiting =
    segment.match(
      /^Awaiting\s+(.+)$/i,
    );

  if (awaiting) {
    return `Awaiting ${locationMechanicalBracket(
      awaiting[1],
    )}`;
  }

  if (
    /^(?:Current\s+)?(?:HP|Health)\s+-?\d+\s*(?:->|→)\s*-?\d+$/i.test(segment) ||
    /^Healing\s+\d+$/i.test(segment) ||
    /^Heal(?:ing)?\s+\d+$/i.test(segment) ||
    /^Damage\s+\d+$/i.test(segment) ||
    /^\d+\s+Damage$/i.test(segment) ||
    /^Max(?:imum)?\s+(?:HP|Health)\s+.*$/i.test(segment)
  ) {
    return locationMechanicalBracket(
      segment,
    );
  }

  const resolvedDamage =
    segment.match(
      /^(.+?(?:→|->)\s*)(\d+\s+Damage)$/i,
    );

  if (resolvedDamage) {
    return `${resolvedDamage[1]}${locationMechanicalBracket(
      resolvedDamage[2],
    )}`;
  }

  const potentialDamage =
    segment.match(
      /^Potential Damage:\s*(.+)$/i,
    );

  if (potentialDamage) {
    return `Potential Damage ${locationMechanicalBracket(
      potentialDamage[1],
    )}`;
  }

  return segment;
}

function formatLocationMechanicalText(
  message: {
    message: string;
    message_type: string;
    roll_label: string | null;
    dice_sides: number | null;
    dice_result: number | null;
    attribute_key: string | null;
    attribute_value: number | null;
    roll_total: number | null;
  },
) {
  return locationChatRollText(
    message,
  )
    .split(/\s+·\s+/g)
    .map((segment, index) =>
      formatLocationMechanicalSegment(
        segment,
        index,
      ),
    )
    .filter(Boolean)
    .join(" - ");
}

function renderLocationMechanicalText(
  message: {
    message: string;
    message_type: string;
    roll_label: string | null;
    dice_sides: number | null;
    dice_result: number | null;
    attribute_key: string | null;
    attribute_value: number | null;
    roll_total: number | null;
  },
) {
  return formatLocationMechanicalText(
    message,
  )
    .split(/(\[[^\]]+\])/g)
    .filter(Boolean)
    .map((segment, index) => {
      const highlighted =
        segment.startsWith("[") &&
        segment.endsWith("]");

      return (
        <span
          key={index}
          className={
            highlighted
              ? "font-bold text-[rgb(var(--sep-colour-a98a60))]"
              : undefined
          }
        >
          {segment}
        </span>
      );
    });
}

function renderLocationActionSpeech(
  content: string,
) {
  return content
    .split(
      /(<[^<>]*>|\([^()]*\)|\[[^\[\]]*\]|\{[^{}]*\})/g,
    )
    .filter(Boolean)
    .map((segment, index) => {
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

      return (
        <span
          key={index}
          className={
            isAction
              ? "italic text-[rgb(var(--sep-colour-a98a60))]"
              : "text-[rgb(var(--sep-colour-d3c2aa))]"
          }
        >
          {segment}
        </span>
      );
    });
}

function renderLocationChatTags(
  tags:
    | LocationChatTags
    | undefined,
) {
  if (!tags) {
    return null;
  }

  const groups: string[] = [];

  if (tags.buffs.length) {
    groups.push(
      tags.buffs.join(" - "),
    );
  }

  if (tags.debuffs.length) {
    groups.push(
      tags.debuffs.join(" - "),
    );
  }

  if (tags.conditions.length) {
    groups.push(
      tags.conditions.join(" - "),
    );
  }

  if (tags.prices.length) {
    groups.push(
      tags.prices.join(" - "),
    );
  }

  if (!groups.length) {
    return null;
  }

  return (
    <span className="text-[9px] uppercase tracking-[.04em] text-[rgb(var(--sep-colour-b99765))]">
      {" | "}
      {groups.join(" | ")}
    </span>
  );
}


async function loadRoomMessages(
  params: SearchParams,
  privateRoomIds: Set<string>,
  headquartersRoomIds: Set<string>,
) {
  const supabase =
    createAdminClient();

  let query =
    supabase
      .from("room_messages")
      .select(`
        id,
        room_id,
        character_id,
        message,
        message_type,
        roll_label,
        dice_sides,
        dice_result,
        attribute_key,
        attribute_value,
        roll_total,
        whisper_recipient_character_id,
        created_at,
        room:rooms(
          id,
          name,
          slug
        ),
        character:characters!room_messages_character_id_fkey(
          id,
          display_name,
          first_name,
          surname,
          portrait_url,
          race:races(
            id,
            name,
            icon_url
          )
        ),
        whisperRecipient:characters!room_messages_whisper_recipient_character_id_fkey(
          id,
          display_name,
          first_name,
          surname
        )
      `)
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(250);

  if (
    params.type?.trim()
  ) {
    query = query.eq(
      "message_type",
      params.type.trim(),
    );
  }

  if (params.q?.trim()) {
    query = query.ilike(
      "message",
      `%${params.q.trim()}%`,
    );
  }

  if (params.room?.trim()) {
    query = query.eq(
      "room_id",
      params.room.trim(),
    );
  }

  if (
    params.character?.trim()
  ) {
    query = query.or(
      `character_id.eq.${params.character.trim()},whisper_recipient_character_id.eq.${params.character.trim()}`,
    );
  }

  const from =
    startOfDay(params.from);
  const to =
    endOfDay(params.to);

  if (from) {
    query = query.gte(
      "created_at",
      from,
    );
  }

  if (to) {
    query = query.lte(
      "created_at",
      to,
    );
  }

  const {
    data: rawMessages,
    error,
  } = await query;

  if (error) {
    throw new Error(
      `Unable to load location chat logs: ${error.message}`,
    );
  }

  const messages =
    (rawMessages ?? []).filter(
      (message) => {
        const roomId =
          String(
            message.room_id,
          );

        const kind =
          headquartersRoomIds.has(
            roomId,
          )
            ? "headquarters"
            : privateRoomIds.has(
                  roomId,
                )
              ? "private"
              : "public";

        return (
          !params.kind ||
          params.kind === kind
        );
      },
    );

  const characterIds =
    Array.from(
      new Set(
        messages
          .map((message) =>
            String(
              message.character_id ??
              "",
            ),
          )
          .filter(Boolean),
      ),
    );

  const [
    orderResult,
    shapeResult,
    priceResult,
  ] =
    characterIds.length > 0
      ? await Promise.all([
          supabase
            .from("order_memberships")
            .select(`
              character_id,
              order:orders!order_memberships_order_id_fkey(
                id,
                name,
                icon_url,
                colour
              )
            `)
            .in(
              "character_id",
              characterIds,
            ),
          supabase.rpc(
            "get_active_shape_chat_tags",
            {
              p_character_ids:
                characterIds,
            },
          ),
          supabase.rpc(
            "get_active_price_chat_tags",
            {
              p_character_ids:
                characterIds,
            },
          ),
        ])
      : [
          {
            data: [],
            error: null,
          },
          {
            data: [],
            error: null,
          },
          {
            data: [],
            error: null,
          },
        ];

  if (orderResult.error) {
    throw new Error(
      `Unable to load location chat Order icons: ${orderResult.error.message}`,
    );
  }

  if (shapeResult.error) {
    throw new Error(
      `Unable to load location chat Shape tags: ${shapeResult.error.message}`,
    );
  }

  if (priceResult.error) {
    throw new Error(
      `Unable to load location chat Price tags: ${priceResult.error.message}`,
    );
  }

  const orderByCharacterId =
    new Map<
      string,
      {
        name: string;
        icon_url: string | null;
        colour: string | null;
      }
    >();

  for (
    const row of
      orderResult.data ?? []
  ) {
    const order =
      one(
        row.order as
          | {
              name: string;
              icon_url:
                | string
                | null;
              colour:
                | string
                | null;
            }
          | {
              name: string;
              icon_url:
                | string
                | null;
              colour:
                | string
                | null;
            }[]
          | null,
      );

    if (!order) {
      continue;
    }

    orderByCharacterId.set(
      String(row.character_id),
      order,
    );
  }

  const tagsByCharacterId =
    new Map<
      string,
      LocationChatTags
    >();

  for (
    const characterId of
      characterIds
  ) {
    tagsByCharacterId.set(
      characterId,
      {
        buffs: [],
        debuffs: [],
        conditions: [],
        prices: [],
      },
    );
  }

  for (
    const row of
      shapeResult.data ?? []
  ) {
    const id =
      String(
        row.character_id,
      );

    const existing =
      tagsByCharacterId.get(id) ??
      {
        buffs: [],
        debuffs: [],
        conditions: [],
        prices: [],
      };

    tagsByCharacterId.set(
      id,
      {
        ...existing,
        buffs:
          row.buffs ?? [],
        debuffs:
          row.debuffs ?? [],
        conditions:
          row.conditions ?? [],
      },
    );
  }

  for (
    const row of
      priceResult.data ?? []
  ) {
    const id =
      String(
        row.character_id,
      );

    const existing =
      tagsByCharacterId.get(id) ??
      {
        buffs: [],
        debuffs: [],
        conditions: [],
        prices: [],
      };

    tagsByCharacterId.set(
      id,
      {
        ...existing,
        prices:
          row.prices ?? [],
      },
    );
  }

  const moderationById =
    await loadModerationMap(
      supabase,
      "room_message",
      messages.map(
        (message) =>
          String(message.id),
      ),
    );

  return (
    <section className="mt-4 space-y-2">
      {messages.map(
        (message) => {
          const sender =
            one(
              message.character as
                | LocationChatCharacter
                | LocationChatCharacter[]
                | null,
            );

          const recipient =
            one(
              message.whisperRecipient as
                | {
                    display_name:
                      | string
                      | null;
                    first_name:
                      | string
                      | null;
                    surname:
                      | string
                      | null;
                  }
                | {
                    display_name:
                      | string
                      | null;
                    first_name:
                      | string
                      | null;
                    surname:
                      | string
                      | null;
                  }[]
                | null,
            );

          const room =
            one(
              message.room as
                | {
                    id: string;
                    name: string;
                    slug: string;
                  }
                | {
                    id: string;
                    name: string;
                    slug: string;
                  }[]
                | null,
            );

          const roomId =
            String(
              message.room_id,
            );

          const kind =
            headquartersRoomIds.has(
              roomId,
            )
              ? "Order Headquarters"
              : privateRoomIds.has(
                    roomId,
                  )
                ? "Private Location"
                : "Public Location";

          const moderation =
            moderationById.get(
              String(message.id),
            ) ?? null;

          const isTarget =
            params.message ===
            String(message.id);

          const displayMessage =
            String(
              moderation
                ?.original_content ??
              message.message ??
              "",
            );

          const messageForRendering = {
            ...message,
            message:
              displayMessage,
          };

          const isOutOfCharacter =
            displayMessage
              .trimStart()
              .startsWith("//");

          const isWhisper =
            message.message_type ===
            "whisper";

          const isMechanicalAction =
            isLocationMechanicalAction(
              messageForRendering,
            );

          const isMechanicalOutput =
            message.message_type ===
              "dice_roll" ||
            message.message_type ===
              "attribute_check" ||
            isMechanicalAction;

          const naturalTwenty =
            message.dice_sides === 20 &&
            message.dice_result === 20;

          const naturalOne =
            message.dice_sides === 20 &&
            message.dice_result === 1;

          const race =
            sender
              ? one(
                  sender.race,
                )
              : null;

          const order =
            sender?.id
              ? orderByCharacterId.get(
                  String(
                    sender.id,
                  ),
                ) ?? null
              : null;

          const tags =
            sender?.id
              ? tagsByCharacterId.get(
                  String(
                    sender.id,
                  ),
                )
              : undefined;

          const whisperLabel =
            isWhisper
              ? `Whisper to ${
                  characterName(
                    recipient,
                  )
                }`
              : "";

          if (
            message.message_type ===
            "fate"
          ) {
            return (
              <article
                id={`message-${message.id}`}
                key={message.id}
                className={`border bg-[rgb(var(--sep-colour-15100d))] ${
                  isTarget
                    ? "border-[rgb(var(--sep-colour-c99758))] ring-1 ring-[rgb(var(--sep-colour-c99758))]/70"
                    : "border-[rgb(var(--sep-colour-59432c))]/40"
                }`}
              >
                <div className="border-b border-[rgb(var(--sep-colour-59432c))]/25 px-4 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806f5b))]">
                  {room?.name ??
                    "Unknown location"}
                  {" · "}
                  {kind}
                  {" · fate"}
                </div>

                <div className="border-y border-[rgb(var(--sep-colour-8a6637))]/40 bg-[linear-gradient(90deg,rgba(var(--sep-rgb-91-56-24),0.22),rgba(var(--sep-rgb-24-16-11),0.72),rgba(var(--sep-rgb-91-56-24),0.14))] px-5 py-2.5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-c99b58))]">
                      The Voice of Fate
                    </span>

                    <time className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-776b5b))]">
                      {formatDateTime(
                        String(
                          message.created_at,
                        ),
                      )}
                    </time>
                  </div>

                  <p className="mt-1.5 whitespace-pre-wrap break-words font-serif text-[13px] leading-5 text-[rgb(var(--sep-colour-d6c09a))]">
                    {displayMessage}
                  </p>
                </div>

                <div className="px-4 pb-4">
                  <ModerationPanel
                    sourceType="room_message"
                    sourceId={String(
                      message.id,
                    )}
                    moderation={
                      moderation
                    }
                  />
                </div>
              </article>
            );
          }

          return (
            <article
              id={`message-${message.id}`}
              key={message.id}
              className={`border bg-[rgb(var(--sep-colour-15100d))] ${
                isTarget
                  ? "border-[rgb(var(--sep-colour-c99758))] ring-1 ring-[rgb(var(--sep-colour-c99758))]/70"
                  : "border-[rgb(var(--sep-colour-59432c))]/40"
              }`}
            >
              {/* Keep the admin-only location metadata, filters and moderation context. */}
              <div className="border-b border-[rgb(var(--sep-colour-59432c))]/25 px-4 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806f5b))]">
                {room?.name ??
                  "Unknown location"}
                {" · "}
                {kind}
                {" · "}
                {message.message_type}
              </div>

              <div
                className={`relative flex min-w-0 gap-3 px-5 py-3 pr-12 sm:px-7 sm:pr-12 ${
                  isOutOfCharacter
                    ? "border-l-2 border-[rgb(var(--sep-colour-627f9f))] bg-[rgb(var(--sep-colour-182536))]/55"
                    : isWhisper
                      ? "border-l-2 border-[rgb(var(--sep-colour-7d628f))] bg-[rgb(var(--sep-colour-241b2a))]/45"
                      : isMechanicalAction
                        ? "border-l-2 border-[rgb(var(--sep-colour-bd8d4d))]/45 bg-[rgb(var(--sep-colour-21170f))]/70"
                        : naturalTwenty
                          ? "bg-emerald-950/10"
                          : naturalOne
                            ? "bg-red-950/10"
                            : ""
                }`}
              >
                {/* Left: portrait, race/Order icons, time — same structure as live location chat. */}
                <div className="flex w-[76px] shrink-0 flex-col">
                  <div className="flex items-start gap-1.5">
                    <div className="h-9 w-9 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0d0a08))]">
                      {sender?.portrait_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            sender.portrait_url
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[rgb(var(--sep-colour-806b4e))]">
                          ?
                        </span>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
                      {race?.icon_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            race.icon_url
                          }
                          alt=""
                          title={
                            race.name
                          }
                          className="h-4 w-4 object-contain"
                        />
                      ) : null}

                      {order ? (
                        order.icon_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={
                              order.icon_url
                            }
                            alt=""
                            title={`Order: ${order.name}`}
                            className="h-4 w-4 object-contain"
                          />
                        ) : (
                          <span
                            title={`Order: ${order.name}`}
                            className="flex h-4 w-4 items-center justify-center font-serif text-[7px]"
                            style={{
                              color:
                                order.colour ??
                                "#8d6d3e",
                            }}
                          >
                            {order.name
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        )
                      ) : null}
                    </div>
                  </div>

                  <time className="mt-1.5 block text-[7px] uppercase leading-4 tracking-[0.12em] text-[rgb(var(--sep-colour-776b5b))]">
                    {formatDateTime(
                      String(
                        message.created_at,
                      ),
                    )}
                  </time>
                </div>

                <div className="min-w-0 flex-1">
                  {isWhisper ||
                  isOutOfCharacter ? (
                    <div
                      className={`mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-b pb-1.5 ${
                        isOutOfCharacter
                          ? "border-[rgb(var(--sep-colour-627f9f))]/40"
                          : "border-[rgb(var(--sep-colour-7d628f))]/35"
                      }`}
                    >
                      {isOutOfCharacter ? (
                        <span className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-a9c7e6))]">
                          Out of Character message
                        </span>
                      ) : null}

                      {isWhisper ? (
                        <span className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-c7add6))]">
                          {whisperLabel}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Main body: Name | active conditions/prices/etc, then newline, then the whole output. */}
                  <p
                    className={`min-w-0 whitespace-pre-wrap break-words text-[13px] leading-[18px] ${
                      isWhisper
                        ? "text-[rgb(var(--sep-colour-c7add6))]"
                        : isOutOfCharacter
                          ? "text-[rgb(var(--sep-colour-a9c7e6))]"
                          : naturalTwenty
                            ? "text-emerald-300"
                            : naturalOne
                              ? "text-red-300"
                              : isMechanicalOutput
                                ? "text-[rgb(var(--sep-colour-c8b89f))]"
                                : "text-[rgb(var(--sep-colour-d3c2aa))]"
                    }`}
                  >
                    <span
                      className={`font-serif text-sm ${
                        isWhisper
                          ? "text-[rgb(var(--sep-colour-c7add6))]"
                          : isOutOfCharacter
                            ? "text-[rgb(var(--sep-colour-a9c7e6))]"
                            : isMechanicalOutput
                              ? "text-[rgb(var(--sep-colour-d8bf91))]"
                              : "text-[rgb(var(--sep-colour-d8bf91))]"
                      }`}
                      title={
                        characterName(
                          sender,
                        )
                      }
                    >
                      {locationChatFirstName(
                        sender,
                      )}
                    </span>

                    {renderLocationChatTags(
                      tags,
                    )}

                    <br />

                    {isMechanicalOutput
                      ? renderLocationMechanicalText(
                          messageForRendering,
                        )
                      : renderLocationActionSpeech(
                          displayMessage,
                        )}
                  </p>
                </div>
              </div>

              <div className="px-4 pb-4">
                <ModerationPanel
                  sourceType="room_message"
                  sourceId={String(
                    message.id,
                  )}
                  moderation={
                    moderation
                  }
                />
              </div>
            </article>
          );
        },
      )}

      {!messages.length ? (
        <EmptyState message="No Location Chat messages match these filters." />
      ) : null}
    </section>
  );
}

async function loadInstantChatMessages(
  params: SearchParams,
  characters: CharacterOption[],
) {
  const supabase =
    createAdminClient();

  let query =
    supabase
      .from("instant_chat_messages")
      .select(
        "id, conversation_id, sender_character_id, body, created_at",
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(250);

  if (params.q?.trim()) {
    query = query.ilike(
      "body",
      `%${params.q.trim()}%`,
    );
  }

  if (params.character?.trim()) {
    query = query.eq(
      "sender_character_id",
      params.character.trim(),
    );
  }

  if (params.conversation?.trim()) {
    query = query.eq(
      "conversation_id",
      params.conversation.trim(),
    );
  }

  const from =
    startOfDay(params.from);
  const to =
    endOfDay(params.to);

  if (from) {
    query = query.gte(
      "created_at",
      from,
    );
  }

  if (to) {
    query = query.lte(
      "created_at",
      to,
    );
  }

  const {
    data: messages,
    error,
  } = await query;

  if (error) {
    throw new Error(
      `Unable to load Instant Chat logs: ${error.message}`,
    );
  }

  const characterById =
    new Map(
      characters.map(
        (character) => [
          character.id,
          characterName(character),
        ],
      ),
    );

  const moderationById =
    await loadModerationMap(
      supabase,
      "instant_chat_message",
      (messages ?? []).map(
        (message) =>
          String(message.id),
      ),
    );

  return (
    <section className="mt-4 space-y-2">
      {(messages ?? []).map(
        (message) => {
          const moderation =
            moderationById.get(
              String(message.id),
            ) ?? null;

          const isTarget =
            params.message ===
            String(message.id);

          return (
          <article
            id={`message-${message.id}`}
            key={message.id}
            className={`border bg-[rgb(var(--sep-colour-15100d))] p-4 ${
              isTarget
                ? "border-[rgb(var(--sep-colour-c99758))] ring-1 ring-[rgb(var(--sep-colour-c99758))]/70"
                : "border-[rgb(var(--sep-colour-59432c))]/40"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-serif text-base text-[rgb(var(--sep-colour-dcc49a))]">
                  {characterById.get(
                    String(
                      message.sender_character_id,
                    ),
                  ) ??
                    "Unknown character"}
                </p>

                <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806f5b))]">
                  Instant Chat · Off-game
                </p>
              </div>

              <div className="text-right">
                <p className="text-[9px] text-[rgb(var(--sep-colour-9b8768))]">
                  {formatDateTime(
                    String(
                      message.created_at,
                    ),
                  )}
                </p>

                <p className="mt-1 font-mono text-[7px] text-[rgb(var(--sep-colour-62584b))]">
                  {String(
                    message.conversation_id,
                  )}
                </p>
              </div>
            </div>

            <p className="mt-3 whitespace-pre-wrap border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-3 text-xs leading-6 text-[rgb(var(--sep-colour-c1b198))]">
              {String(
                moderation
                  ?.original_content ??
                  message.body ??
                  "",
              )}
            </p>

            <ModerationPanel
              sourceType="instant_chat_message"
              sourceId={String(
                message.id,
              )}
              moderation={
                moderation
              }
            />
          </article>
          );
        },
      )}

      {!messages?.length ? (
        <EmptyState message="No Instant Chat messages match these filters." />
      ) : null}
    </section>
  );
}


async function loadCharacterBlocks(
  params: SearchParams,
  characters: CharacterOption[],
) {
  const supabase = createAdminClient();

  let query = supabase
    .from("character_blocks")
    .select("blocker_character_id, blocked_character_id, created_at")
    .order("created_at", { ascending: false })
    .limit(250);

  if (params.character?.trim()) {
    query = query.or([
      `blocker_character_id.eq.${params.character.trim()}`,
      `blocked_character_id.eq.${params.character.trim()}`,
    ].join(","));
  }

  const from = startOfDay(params.from);
  const to = endOfDay(params.to);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data: rows, error } = await query;
  if (error) throw new Error(`Unable to load Character Block logs: ${error.message}`);

  const names = new Map(
    characters.map((character) => [character.id, characterName(character)]),
  );

  return (
    <section className="mt-4 space-y-2">
      {(rows ?? []).map((row) => (
        <article
          key={`${row.blocker_character_id}:${row.blocked_character_id}`}
          className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-15100d))] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-serif text-base text-[rgb(var(--sep-colour-dcc49a))]">
                {names.get(String(row.blocker_character_id)) ?? "Unknown character"}
                {" → "}
                {names.get(String(row.blocked_character_id)) ?? "Unknown character"}
              </p>
              <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806f5b))]">
                Character Block
              </p>
            </div>
            <p className="text-[9px] text-[rgb(var(--sep-colour-9b8768))]">
              {formatDateTime(String(row.created_at))}
            </p>
          </div>
        </article>
      ))}
      {!rows?.length ? <EmptyState message="No Character Blocks match these filters." /> : null}
    </section>
  );
}

function ViewLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children:
    React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`border px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] transition ${
        active
          ? "border-[rgb(var(--sep-colour-a47b47))] bg-[rgb(var(--sep-colour-3b2919))] text-[rgb(var(--sep-colour-efd3a1))]"
          : "border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-15100d))] text-[rgb(var(--sep-colour-9f8a6d))] hover:border-[rgb(var(--sep-colour-8d683f))]"
      }`}
    >
      {children}
    </Link>
  );
}

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-8 text-center text-sm italic text-[rgb(var(--sep-colour-776b5b))]">
      {message}
    </div>
  );
}
