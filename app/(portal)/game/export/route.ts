import { redirect } from "next/navigation";

import {
  ROOM_HISTORY_HOURS,
  ROOM_INACTIVITY_RESET_HOURS,
  ROOM_HISTORY_BATCH_SIZE,
} from "@/lib/game/constants";
import { createClient } from "@/lib/supabase/server";
import type {
  CharacterAttributeKey,
  CharacterSummary,
  RoomMessage,
} from "@/types/game";

export const dynamic = "force-dynamic";


type RoomRow = {
  id: string;
  name: string;
  description: string | null;
  area:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

function normaliseRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}


function stripRichTextMarkup(
  value: string,
): string {
  return value
    .replace(
      /\[img(?:=[^\]]*)?\]([\s\S]*?)\[\/img\]/gi,
      "$1",
    )
    .replace(
      /\[url=[^\]]+\]([\s\S]*?)\[\/url\]/gi,
      "$1",
    )
    .replace(
      /\[(?:\/)?(?:b|i|u|s|quote|h2|h3|center|list)\]/gi,
      "",
    )
    .replace(/\[\*\]/gi, "• ");
}

function escapeHtml(
  value: string,
): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeFilename(
  value: string,
): string {
  return (
    value
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-",
      )
      .replace(
        /^-+|-+$/g,
        ""
      ) || "sepulchria-role"
  );
}

function formatDateTime(
  value: string,
): string {
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

function renderActionSpeech(
  content: string,
): string {
  const segments =
    content.split(
      /(<[^<>]*>|\([^()]*\))/g,
    );

  return segments
    .filter(Boolean)
    .map((segment) => {
      const isAction =
        (
          segment.startsWith(
            "<",
          ) &&
          segment.endsWith(
            ">",
          )
        ) ||
        (
          segment.startsWith(
            "(",
          ) &&
          segment.endsWith(
            ")",
          )
        );

      const escaped =
        escapeHtml(segment)
          .replaceAll(
            "\n",
            "<br />",
          );

      return isAction
        ? `<span class="action-text">${escaped}</span>`
        : `<span class="speech-text">${escaped}</span>`;
    })
    .join("");
}

function renderRollText(
  message: RoomMessage,
): string {
  if (
    message.message_type ===
      "dice_roll" &&
    message.dice_sides &&
    message.dice_result
  ) {
    return `d${message.dice_sides} → ${message.dice_result}`;
  }

  if (
    message.message_type ===
      "attribute_check" &&
    message.roll_label &&
    message.dice_result !== null &&
    message.attribute_value !==
      null &&
    message.roll_total !== null
  ) {
    return `${message.roll_label} · d20(${message.dice_result}) + ${getAttributeLabel(
      message.attribute_key,
    )}(+${message.attribute_value}) = ${message.roll_total}`;
  }

  return message.message.replace(
    /^◆\s*/,
    "",
  );
}

function renderMessage(
  message: RoomMessage,
): string {
  const author =
    normaliseRelation(
      message.character,
    );

  const recipient =
    normaliseRelation(
      message.whisperRecipient,
    );

  const authorName =
    author?.display_name ??
    "Unknown character";

  const time =
    formatDateTime(
      message.created_at,
    );

  if (
    message.message_type ===
    "fate"
  ) {
    return `
      <article class="entry fate-entry">
        <div class="entry-header">
          <span class="fate-label">Fate</span>
          <time>${escapeHtml(time)}</time>
        </div>

        <div class="fate-body">
          ${escapeHtml(
            message.message,
          ).replaceAll(
            "\n",
            "<br />",
          )}
        </div>
      </article>
    `;
  }

  if (
    message.message_type ===
      "dice_roll" ||
    message.message_type ===
      "attribute_check"
  ) {
    const naturalTwenty =
      message.dice_sides === 20 &&
      message.dice_result === 20;

    const naturalOne =
      message.dice_sides === 20 &&
      message.dice_result === 1;

    const extraClass =
      naturalTwenty
        ? " critical-success"
        : naturalOne
          ? " critical-failure"
          : "";

    return `
      <article class="entry roll-entry${extraClass}">
        <div class="roll-symbol">◆</div>

        <div class="roll-author">
          ${escapeHtml(authorName)}
        </div>

        <div class="roll-result">
          ${escapeHtml(
            renderRollText(
              message,
            ),
          )}
        </div>

        <time>${escapeHtml(time)}</time>
      </article>
    `;
  }

  const isWhisper =
    message.message_type ===
    "whisper";

  const whisperLabel =
    isWhisper
      ? `Whisper to ${
          recipient?.display_name ??
          "character"
        }`
      : "";

  return `
    <article class="entry role-entry${
      isWhisper
        ? " whisper-entry"
        : ""
    }">
      <div class="entry-header">
        <div class="author-line">
          <span class="author-name">
            ${escapeHtml(
              authorName,
            )}
          </span>

          ${
            isWhisper
              ? `<span class="whisper-label">${escapeHtml(
                  whisperLabel,
                )}</span>`
              : ""
          }
        </div>

        <time>${escapeHtml(time)}</time>
      </div>

      <div class="role-body">
        ${renderActionSpeech(
          message.message,
        )}
      </div>
    </article>
  `;
}

async function loadVisibleMessages(
  roomId: string,
) {
  const supabase =
    await createClient();

  const {
    data: latestMessage,
    error: latestMessageError,
  } = await supabase
    .from("room_messages")
    .select("created_at")
    .eq("room_id", roomId)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (latestMessageError) {
    throw new Error(
      `Unable to load the latest room entry: ${latestMessageError.message}`,
    );
  }

  if (!latestMessage) {
    return [] as RoomMessage[];
  }

  const now = Date.now();

  const latestTimestamp =
    Date.parse(
      latestMessage.created_at,
    );

  const inactivityLimit =
    ROOM_INACTIVITY_RESET_HOURS *
    60 *
    60 *
    1000;

  const roomIsStillActive =
    !Number.isNaN(
      latestTimestamp,
    ) &&
    now - latestTimestamp <
      inactivityLimit;

  if (!roomIsStillActive) {
    return [] as RoomMessage[];
  }

  const historyStart =
    new Date(
      now -
        ROOM_HISTORY_HOURS *
          60 *
          60 *
          1000,
    ).toISOString();

  const messages:
    RoomMessage[] = [];

  let from = 0;

  while (true) {
    const to =
      from +
      ROOM_HISTORY_BATCH_SIZE -
      1;

    const {
      data,
      error,
    } = await supabase
      .from("room_messages")
      .select(`
        id,
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
        character_id,

        character:characters!room_messages_character_id_fkey(
          id,
          display_name,
          portrait_url,
          public_slug
        ),

        whisperRecipient:characters!room_messages_whisper_recipient_character_id_fkey(
          id,
          display_name,
          portrait_url,
          public_slug
        )
      `)
      .eq("room_id", roomId)
      .gte(
        "created_at",
        historyStart,
      )
      .order(
        "created_at",
        {
          ascending: true,
        },
      )
      .range(from, to);

    if (error) {
      throw new Error(
        `Unable to export visible room messages: ${error.message}`,
      );
    }

    const batch =
      (data ??
        []) as unknown as RoomMessage[];

    messages.push(...batch);

    if (
      batch.length <
      ROOM_HISTORY_BATCH_SIZE
    ) {
      break;
    }

    from +=
      ROOM_HISTORY_BATCH_SIZE;
  }

  return messages;
}

export async function GET() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select(
      "id, display_name, current_room_id, status",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    characterError ||
    !character
  ) {
    throw new Error(
      characterError?.message ??
      "Unable to load the current character.",
    );
  }

  if (
    character.status !==
    "approved"
  ) {
    redirect("/character");
  }

  if (
    !character.current_room_id
  ) {
    redirect("/game");
  }

  const {
    data: roomData,
    error: roomError,
  } = await supabase
    .from("rooms")
    .select(`
      id,
      name,
      description,
      area:areas!rooms_area_id_fkey(
        name
      )
    `)
    .eq(
      "id",
      character.current_room_id,
    )
    .maybeSingle();

  if (
    roomError ||
    !roomData
  ) {
    throw new Error(
      roomError?.message ??
      "Unable to load the current room.",
    );
  }

  const room =
    roomData as unknown as RoomRow;

  const area =
    normaliseRelation(
      room.area,
    );

  const messages =
    await loadVisibleMessages(
      room.id,
    );

  const participants =
    Array.from(
      new Set(
        messages
          .map((message) =>
            normaliseRelation(
              message.character,
            )?.display_name?.trim(),
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(value),
          ),
      ),
    ).sort((first, second) =>
      first.localeCompare(
        second,
      ),
    );

  const exportedAt =
    new Date();

  const exportedAtLabel =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        dateStyle: "long",
        timeStyle: "short",
      },
    ).format(exportedAt);

  const roomHeading =
    area?.name
      ? `${room.name}, ${area.name}`
      : room.name;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />

  <title>${escapeHtml(
    room.name,
  )} · Sepulchria Role Export</title>

  <style>
    :root {
      color-scheme: dark;
      font-family:
        Georgia,
        "Times New Roman",
        serif;
      background: #0d0907;
      color: #d7c6aa;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background:
        radial-gradient(
          circle at top,
          #2b1d12 0,
          #120d09 42%,
          #090706 100%
        );
      color: #d7c6aa;
      line-height: 1.65;
    }

    main {
      width: min(
        920px,
        calc(100% - 32px)
      );
      margin: 32px auto;
    }

    header {
      border: 1px solid #654b2e;
      background:
        rgba(
          21,
          16,
          13,
          0.96
        );
      padding: 28px;
    }

    .eyebrow {
      margin: 0;
      color: #987447;
      font-family:
        Arial,
        sans-serif;
      font-size: 10px;
      letter-spacing: 0.28em;
      text-transform: uppercase;
    }

    h1 {
      margin:
        12px 0 0;
      color: #ead5ad;
      font-size:
        clamp(
          30px,
          6vw,
          48px
        );
      font-weight: 400;
      line-height: 1.1;
    }

    .room-description {
      margin:
        18px 0 0;
      color: #a99b88;
      white-space:
        pre-wrap;
    }

    .metadata {
      display: grid;
      grid-template-columns:
        repeat(
          auto-fit,
          minmax(
            180px,
            1fr
          )
        );
      gap: 12px;
      margin-top: 24px;
      border-top:
        1px solid
        #59432c;
      padding-top: 18px;
      font-family:
        Arial,
        sans-serif;
    }

    .metadata strong {
      display: block;
      color: #806b50;
      font-size: 9px;
      font-weight: 400;
      letter-spacing: 0.2em;
      text-transform:
        uppercase;
    }

    .metadata span {
      display: block;
      margin-top: 4px;
      color: #c9b69a;
      font-size: 12px;
    }

    .chronicle {
      margin-top: 18px;
      border:
        1px solid
        #60482e;
      background:
        rgba(
          17,
          13,
          10,
          0.95
        );
    }

    .entry {
      border-bottom:
        1px solid
        rgba(
          79,
          59,
          40,
          0.65
        );
    }

    .entry:last-child {
      border-bottom: 0;
    }

    .role-entry {
      padding: 22px 26px;
    }

    .entry-header {
      display: flex;
      align-items:
        baseline;
      justify-content:
        space-between;
      gap: 16px;
    }

    .author-line {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }

    .author-name {
      color: #d8bf91;
      font-size: 18px;
    }

    time {
      flex: 0 0 auto;
      color: #776b5b;
      font-family:
        Arial,
        sans-serif;
      font-size: 9px;
      letter-spacing: 0.12em;
      text-transform:
        uppercase;
    }

    .role-body {
      margin-top: 12px;
      font-family:
        Arial,
        sans-serif;
      font-size: 14px;
      line-height: 1.9;
      white-space:
        pre-wrap;
      overflow-wrap:
        anywhere;
    }

    .speech-text {
      color: #d3c2aa;
    }

    .action-text {
      color: #a98a60;
      font-style: italic;
    }

    .whisper-entry {
      border-left:
        3px solid
        #7d628f;
      background:
        rgba(
          36,
          27,
          42,
          0.58
        );
    }

    .whisper-label {
      border:
        1px solid
        rgba(
          125,
          98,
          143,
          0.8
        );
      background: #201727;
      color: #c7add6;
      padding: 3px 7px;
      font-family:
        Arial,
        sans-serif;
      font-size: 8px;
      letter-spacing:
        0.14em;
      text-transform:
        uppercase;
    }

    .roll-entry {
      display: grid;
      grid-template-columns:
        auto auto 1fr auto;
      align-items: center;
      gap: 12px;
      padding: 12px 26px;
      background:
        rgba(
          27,
          20,
          14,
          0.7
        );
      font-family:
        Arial,
        sans-serif;
    }

    .roll-symbol {
      color: #bd8d4d;
    }

    .roll-author {
      color: #d8bf91;
      font-family:
        Georgia,
        "Times New Roman",
        serif;
      white-space:
        nowrap;
    }

    .roll-result {
      min-width: 0;
      color: #c8b89f;
      font-size: 12px;
      overflow-wrap:
        anywhere;
    }

    .critical-success {
      background:
        rgba(
          6,
          78,
          59,
          0.18
        );
    }

    .critical-success
    .roll-symbol,
    .critical-success
    .roll-result {
      color: #86efac;
    }

    .critical-failure {
      background:
        rgba(
          127,
          29,
          29,
          0.18
        );
    }

    .critical-failure
    .roll-symbol,
    .critical-failure
    .roll-result {
      color: #fca5a5;
    }

    .fate-entry {
      padding: 18px 26px;
      border-top:
        1px solid
        rgba(
          138,
          102,
          55,
          0.7
        );
      border-bottom:
        1px solid
        rgba(
          138,
          102,
          55,
          0.7
        );
      background:
        linear-gradient(
          90deg,
          rgba(
            91,
            56,
            24,
            0.4
          ),
          rgba(
            24,
            16,
            11,
            0.9
          ),
          rgba(
            91,
            56,
            24,
            0.25
          )
        );
    }

    .fate-label {
      color: #d4a65f;
      font-family:
        Arial,
        sans-serif;
      font-size: 10px;
      letter-spacing: 0.3em;
      text-transform:
        uppercase;
    }

    .fate-body {
      margin-top: 12px;
      color: #d6c09a;
      font-size: 16px;
      white-space:
        pre-wrap;
      overflow-wrap:
        anywhere;
    }

    .empty {
      padding: 48px 24px;
      color: #8e7d66;
      text-align: center;
      font-style: italic;
    }

    footer {
      margin: 18px 0 0;
      color: #6f6254;
      font-family:
        Arial,
        sans-serif;
      font-size: 10px;
      line-height: 1.7;
      text-align: center;
    }

    @media print {
      :root {
        color-scheme: light;
      }

      body {
        background: white;
        color: #241b14;
      }

      main {
        width: 100%;
        margin: 0;
      }

      header,
      .chronicle {
        background: white;
        border-color: #8c755f;
      }

      h1,
      .author-name,
      .roll-author,
      .speech-text,
      .fate-body {
        color: #241b14;
      }

      .action-text {
        color: #6f5336;
      }

      .role-entry,
      .roll-entry,
      .fate-entry {
        break-inside: avoid;
      }

      footer {
        color: #66594e;
      }
    }

    @media (
      max-width: 620px
    ) {
      .entry-header {
        align-items:
          flex-start;
        flex-direction:
          column;
        gap: 6px;
      }

      .roll-entry {
        grid-template-columns:
          auto 1fr;
      }

      .roll-result,
      .roll-entry time {
        grid-column: 2;
      }
    }
  </style>
</head>

<body>
  <main>
    <header>
      <p class="eyebrow">
        Sepulchria · Role Export
      </p>

      <h1>${escapeHtml(
        roomHeading,
      )}</h1>

      ${
        room.description
          ? `<p class="room-description">${escapeHtml(
              stripRichTextMarkup(room.description),
            ).replaceAll(
              "\n",
              "<br />",
            )}</p>`
          : ""
      }

      <div class="metadata">
        <div>
          <strong>
            Exported by
          </strong>

          <span>${escapeHtml(
            character.display_name,
          )}</span>
        </div>

        <div>
          <strong>
            Exported on
          </strong>

          <span>${escapeHtml(
            exportedAtLabel,
          )}</span>
        </div>

        <div>
          <strong>
            Visible entries
          </strong>

          <span>${messages.length}</span>
        </div>

        <div>
          <strong>
            Participants
          </strong>

          <span>${
            participants.length
              ? escapeHtml(
                  participants.join(
                    ", ",
                  ),
                )
              : "None recorded"
          }</span>
        </div>
      </div>
    </header>

    <section class="chronicle">
      ${
        messages.length
          ? messages
              .map(
                renderMessage,
              )
              .join("")
          : `<div class="empty">The room chronicle is empty.</div>`
      }
    </section>

    <footer>
      This file contains only the room entries visible to the account that exported it.
      Private whispers remain subject to Sepulchria's visibility rules.
    </footer>
  </main>
</body>
</html>`;

  const datePart =
    exportedAt
      .toISOString()
      .slice(0, 10);

  const filename =
    `${safeFilename(
      room.name,
    )}-${datePart}.html`;

  return new Response(
    html,
    {
      status: 200,
      headers: {
        "Content-Type":
          "text/html; charset=utf-8",
        "Content-Disposition":
          `attachment; filename="${filename}"`,
        "Cache-Control":
          "private, no-store, max-age=0",
        "X-Content-Type-Options":
          "nosniff",
      },
    },
  );
}