import Link from "next/link";

import {
  requireStaff,
} from "@/lib/auth/require-staff";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

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

export default async function CommunicationLogsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  await requireStaff();

  const params =
    (await searchParams) ?? {};

  const view =
    params.view === "chat" ||
    params.view === "instant"
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

          return (
            <article
              key={message.id}
              className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-15100d))] p-4"
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
                    message.body ??
                      "",
                  ),
                ) ||
                  "(empty message)"}
              </div>

              {message.forwarded_body ? (
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
                        message.forwarded_body,
                      ),
                    )}
                  </p>
                </div>
              ) : null}
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
          surname
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

  return (
    <section className="mt-4 space-y-2">
      {messages.map(
        (message) => {
          const sender =
            one(
              message.character as
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

          return (
            <article
              key={message.id}
              className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-15100d))] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-base text-[rgb(var(--sep-colour-dcc49a))]">
                    {characterName(
                      sender,
                    )}
                    {message.message_type ===
                      "whisper" ? (
                      <>
                        {" "}
                        <span className="text-[rgb(var(--sep-colour-806f5b))]">
                          →
                        </span>{" "}
                        {characterName(
                          recipient,
                        )}
                      </>
                    ) : null}
                  </p>

                  <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806f5b))]">
                    {room?.name ??
                      "Unknown location"}
                    {" · "}
                    {kind}
                    {" · "}
                    {message.message_type}
                  </p>
                </div>

                <p className="text-[9px] text-[rgb(var(--sep-colour-9b8768))]">
                  {formatDateTime(
                    String(
                      message.created_at,
                    ),
                  )}
                </p>
              </div>

              <p className="mt-3 whitespace-pre-wrap border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-3 text-xs leading-6 text-[rgb(var(--sep-colour-c1b198))]">
                {String(
                  message.message ??
                    "",
                )}
              </p>

              {message.roll_label ||
              message.dice_result !==
                null ||
              message.roll_total !==
                null ? (
                <p className="mt-2 text-[8px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-786a58))]">
                  {[
                    message.roll_label,
                    message.dice_sides
                      ? `d${message.dice_sides}`
                      : null,
                    message.dice_result !==
                      null
                      ? `Roll ${message.dice_result}`
                      : null,
                    message.attribute_key
                      ? `${message.attribute_key}: ${message.attribute_value ?? "?"}`
                      : null,
                    message.roll_total !==
                      null
                      ? `Total ${message.roll_total}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
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

  return (
    <section className="mt-4 space-y-2">
      {(messages ?? []).map(
        (message) => (
          <article
            key={message.id}
            className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-15100d))] p-4"
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
                message.body ?? "",
              )}
            </p>
          </article>
        ),
      )}

      {!messages?.length ? (
        <EmptyState message="No Instant Chat messages match these filters." />
      ) : null}
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
