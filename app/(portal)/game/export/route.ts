import { redirect } from "next/navigation";

import {
  ROOM_HISTORY_HOURS,
  ROOM_INACTIVITY_RESET_HOURS,
  ROOM_HISTORY_BATCH_SIZE,
} from "@/lib/game/constants";
import { createClient } from "@/lib/supabase/server";
import type {
  CharacterAttributeKey,
  RoomMessage,
} from "@/types/game";

export const dynamic = "force-dynamic";


type RoomRow = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
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
        "",
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


function formatCompactTime(
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
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}


function getAttributeLabel(
  key:
    | CharacterAttributeKey
    | null,
): string {
  const labels: Record<
    CharacterAttributeKey,
    string
  > = {
    muscles: "Muscles",
    reflexes: "Reflexes",
    vigor: "Vigor",
    brains: "Brains",
    shrewd: "Shrewd",
    presence_score: "Presence",
  };

  return key
    ? labels[key]
    : "Attribute";
}


function getFirstName(
  displayName:
    | string
    | null
    | undefined,
): string {
  const clean =
    displayName?.trim();

  if (!clean) {
    return "Unknown";
  }

  return (
    clean.split(/\s+/)[0] ??
    clean
  );
}


function isSafeImageUrl(
  value:
    | string
    | null
    | undefined,
): value is string {
  if (!value) {
    return false;
  }

  if (value.startsWith("/")) {
    return true;
  }

  try {
    const parsed =
      new URL(value);

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );
  } catch {
    return false;
  }
}


/*
 * Renders the limited rich-text/BBCode
 * used by Sepulchria descriptions.
 *
 * The content is escaped first, then
 * supported markup is converted to HTML.
 */
function renderRichText(
  value: string,
): string {
  let html =
    escapeHtml(value);

  html = html
    .replace(
      /\[b\]([\s\S]*?)\[\/b\]/gi,
      "<strong>$1</strong>",
    )
    .replace(
      /\[i\]([\s\S]*?)\[\/i\]/gi,
      "<em>$1</em>",
    )
    .replace(
      /\[u\]([\s\S]*?)\[\/u\]/gi,
      "<u>$1</u>",
    )
    .replace(
      /\[s\]([\s\S]*?)\[\/s\]/gi,
      "<s>$1</s>",
    )
    .replace(
      /\[h2\]([\s\S]*?)\[\/h2\]/gi,
      "<h2>$1</h2>",
    )
    .replace(
      /\[h3\]([\s\S]*?)\[\/h3\]/gi,
      "<h3>$1</h3>",
    )
    .replace(
      /\[center\]([\s\S]*?)\[\/center\]/gi,
      '<div class="rich-center">$1</div>',
    )
    .replace(
      /\[quote\]([\s\S]*?)\[\/quote\]/gi,
      "<blockquote>$1</blockquote>",
    )
    .replace(
      /\[list\]([\s\S]*?)\[\/list\]/gi,
      '<div class="rich-list">$1</div>',
    )
    .replace(
      /\[\*\]/gi,
      '<span class="rich-bullet">•</span> ',
    );

  /*
   * URLs are rendered as clickable links,
   * but only HTTP/HTTPS links survive.
   */
  html = html.replace(
    /\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi,
    (
      _match,
      rawUrl: string,
      label: string,
    ) => {
      const decodedUrl =
        rawUrl
          .replaceAll(
            "&amp;",
            "&",
          )
          .replaceAll(
            "&quot;",
            '"',
          )
          .replaceAll(
            "&#039;",
            "'",
          );

      try {
        const parsed =
          new URL(decodedUrl);

        if (
          parsed.protocol !==
            "http:" &&
          parsed.protocol !==
            "https:"
        ) {
          return label;
        }

        return `<a href="${escapeHtml(
          parsed.toString(),
        )}" target="_blank" rel="noreferrer">${label}</a>`;
      } catch {
        return label;
      }
    },
  );

  /*
   * Images in descriptions are allowed
   * only for safe web/relative URLs.
   */
  html = html.replace(
    /\[img(?:=[^\]]*)?\]([\s\S]*?)\[\/img\]/gi,
    (
      _match,
      rawUrl: string,
    ) => {
      const decodedUrl =
        rawUrl
          .trim()
          .replaceAll(
            "&amp;",
            "&",
          )
          .replaceAll(
            "&quot;",
            '"',
          )
          .replaceAll(
            "&#039;",
            "'",
          );

      if (
        !isSafeImageUrl(
          decodedUrl,
        )
      ) {
        return "";
      }

      return `<img class="rich-image" src="${escapeHtml(
        decodedUrl,
      )}" alt="" />`;
    },
  );

  return html.replaceAll(
    "\n",
    "<br />",
  );
}


/*
 * Matches the live chat:
 *
 * <action>
 * (action)
 * [action]
 * {action}
 *
 * Everything outside those delimiters
 * is rendered as normal speech.
 */
function renderActionSpeech(
  content: string,
): string {
  const segments =
    content.split(
      /(<[^<>]*>|\([^()]*\)|\[[^\[\]]*\]|\{[^{}]*\})/g,
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
        ) ||
        (
          segment.startsWith(
            "[",
          ) &&
          segment.endsWith(
            "]",
          )
        ) ||
        (
          segment.startsWith(
            "{",
          ) &&
          segment.endsWith(
            "}",
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


function renderPortrait(
  name: string,
  portraitUrl:
    | string
    | null
    | undefined,
): string {
  if (
    isSafeImageUrl(
      portraitUrl,
    )
  ) {
    return `
      <div class="portrait-wrap">
        <img
          class="portrait"
          src="${escapeHtml(
            portraitUrl,
          )}"
          alt="${escapeHtml(
            name,
          )}"
        />
      </div>
    `;
  }

  const initial =
    name
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "?";

  return `
    <div class="portrait-wrap portrait-fallback">
      ${escapeHtml(initial)}
    </div>
  `;
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

  const shortAuthorName =
    getFirstName(
      authorName,
    );

  const time =
    formatCompactTime(
      message.created_at,
    );

  /*
   * FATE
   */
  if (
    message.message_type ===
    "fate"
  ) {
    return `
      <article class="entry fate-entry">
        <div class="fate-marker">
          ✦
        </div>

        <div class="fate-content">
          <div class="compact-header">
            <span class="fate-label">
              Fate
            </span>

            <time>
              ${escapeHtml(
                time,
              )}
            </time>
          </div>

          <div class="fate-body">
            ${escapeHtml(
              message.message,
            ).replaceAll(
              "\n",
              "<br />",
            )}
          </div>
        </div>
      </article>
    `;
  }

  /*
   * DICE / ATTRIBUTE CHECK
   */
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
        <span class="roll-symbol">
          ◆
        </span>

        <span class="roll-author">
          ${escapeHtml(
            shortAuthorName,
          )}
        </span>

        <span class="roll-result">
          ${escapeHtml(
            renderRollText(
              message,
            ),
          )}
        </span>

        <time>
          ${escapeHtml(
            time,
          )}
        </time>
      </article>
    `;
  }

  /*
   * NORMAL ROLE / WHISPER
   */
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

      ${renderPortrait(
        authorName,
        author?.portrait_url,
      )}

      <div class="message-content">
        <div class="compact-header">
          <div class="author-line">
            <span
              class="author-name"
              title="${escapeHtml(
                authorName,
              )}"
            >
              ${escapeHtml(
                shortAuthorName,
              )}
            </span>

            ${
              isWhisper
                ? `
                  <span class="whisper-label">
                    ${escapeHtml(
                      whisperLabel,
                    )}
                  </span>
                `
                : ""
            }
          </div>

          <time>
            ${escapeHtml(
              time,
            )}
          </time>
        </div>

        <div class="role-body">
          ${renderActionSpeech(
            message.message,
          )}
        </div>
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

  const now =
    Date.now();

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
      .eq(
        "room_id",
        roomId,
      )
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
      .range(
        from,
        to,
      );

    if (error) {
      throw new Error(
        `Unable to export visible room messages: ${error.message}`,
      );
    }

    const batch =
      (data ??
        []) as unknown as RoomMessage[];

    messages.push(
      ...batch,
    );

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
    redirect(
      "/auth/login",
    );
  }

  const {
    data: character,
    error: characterError,
  } = await supabase
    .from("characters")
    .select(
      "id, display_name, current_room_id, status",
    )
    .eq(
      "user_id",
      user.id,
    )
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
    redirect(
      "/character",
    );
  }

  if (
    !character.current_room_id
  ) {
    redirect(
      "/game",
    );
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
      image_url,
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
    ).sort(
      (
        first,
        second,
      ) =>
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
    ).format(
      exportedAt,
    );

  const roomHeading =
    area?.name
      ? `${room.name} · ${area.name}`
      : room.name;

  const roomImage =
    isSafeImageUrl(
      room.image_url,
    )
      ? room.image_url
      : null;

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
        Arial,
        Helvetica,
        sans-serif;

      background: #090706;
      color: #c9bba6;
    }

    * {
      box-sizing: border-box;
    }

    html {
      background: #090706;
    }

    body {
      margin: 0;

      background:
        radial-gradient(
          circle at 50% -15%,
          #2a1c11 0,
          #130e0a 31%,
          #090706 70%
        );

      color: #c9bba6;

      font-size: 13px;
      line-height: 1.55;
    }

    main {
      width: min(
        980px,
        calc(100% - 28px)
      );

      margin: 18px auto 28px;
    }

    /*
     * =====================================================
     * ARCHIVE HEADER
     * =====================================================
     */

    .archive-header {
      position: relative;

      overflow: hidden;

      border:
        1px solid
        #60482e;

      background:
        #15100d;
    }

    .location-image {
      position: relative;

      height:
        clamp(
          120px,
          18vw,
          190px
        );

      overflow: hidden;

      border-bottom:
        1px solid
        #60482e;
    }

    .location-image img {
      width: 100%;
      height: 100%;

      display: block;

      object-fit: cover;
      object-position: center;
    }

    .location-image::after {
      content: "";

      position: absolute;
      inset: 0;

      background:
        linear-gradient(
          to top,
          rgba(
            14,
            10,
            8,
            0.9
          ) 0%,
          rgba(
            14,
            10,
            8,
            0.22
          ) 50%,
          rgba(
            14,
            10,
            8,
            0.04
          ) 100%
        );

      pointer-events: none;
    }

    .location-image-title {
      position: absolute;

      z-index: 2;

      left: 18px;
      right: 18px;
      bottom: 14px;
    }

    .location-image-title
    .eyebrow {
      margin-bottom: 3px;
    }

    .location-image-title h1 {
      text-shadow:
        0 2px 8px
        rgba(
          0,
          0,
          0,
          0.95
        );
    }

    .header-content {
      padding: 15px 18px;
    }

    .eyebrow {
      margin: 0;

      color: #94734c;

      font-size: 8px;
      font-weight: 600;

      letter-spacing:
        0.24em;

      text-transform:
        uppercase;
    }

    h1 {
      margin:
        4px 0 0;

      color: #dfc79f;

      font-family:
        Georgia,
        "Times New Roman",
        serif;

      font-size:
        clamp(
          22px,
          4vw,
          31px
        );

      font-weight: 400;

      line-height: 1.1;
    }

    .room-description {
      max-width: 780px;

      margin-top: 10px;

      color: #9f927f;

      font-size: 11px;
      line-height: 1.6;
    }

    .room-description
    p {
      margin:
        5px 0;
    }

    .room-description
    strong {
      color: #cdb892;
    }

    .room-description
    em {
      color: #b09b7c;
    }

    .room-description
    h2,
    .room-description
    h3 {
      margin:
        10px 0 4px;

      color: #cfb78f;

      font-family:
        Georgia,
        "Times New Roman",
        serif;

      font-weight: 400;
    }

    .room-description
    h2 {
      font-size: 16px;
    }

    .room-description
    h3 {
      font-size: 14px;
    }

    .room-description
    blockquote {
      margin:
        8px 0;

      border-left:
        2px solid
        #745536;

      padding:
        4px 10px;

      color: #8f816e;

      font-style: italic;
    }

    .room-description
    a {
      color: #c69a60;
    }

    .rich-center {
      text-align: center;
    }

    .rich-bullet {
      color: #b88a51;
    }

    .rich-image {
      display: block;

      max-width: 100%;
      max-height: 260px;

      margin:
        8px auto;

      object-fit: contain;
    }

    /*
     * Metadata is deliberately a narrow
     * horizontal bar rather than four
     * large cards.
     */

    .metadata {
      display: flex;

      flex-wrap: wrap;

      gap:
        5px 22px;

      margin-top: 12px;

      border-top:
        1px solid
        rgba(
          96,
          72,
          46,
          0.45
        );

      padding-top: 10px;
    }

    .metadata-item {
      display: flex;

      align-items: baseline;

      gap: 6px;

      min-width: 0;
    }

    .metadata strong {
      color: #77654e;

      font-size: 7px;
      font-weight: 600;

      letter-spacing:
        0.15em;

      text-transform:
        uppercase;
    }

    .metadata span {
      min-width: 0;

      color: #b7a58b;

      font-size: 9px;
    }

    /*
     * =====================================================
     * CHRONICLE
     * =====================================================
     */

    .chronicle {
      margin-top: 10px;

      overflow: hidden;

      border:
        1px solid
        #60482e;

      background:
        rgba(
          17,
          13,
          10,
          0.97
        );
    }

    .entry {
      border-bottom:
        1px solid
        rgba(
          75,
          56,
          37,
          0.46
        );
    }

    .entry:last-child {
      border-bottom: 0;
    }

    /*
     * Normal role message:
     * portrait + compact content.
     */

    .role-entry {
      display: grid;

      grid-template-columns:
        36px minmax(
          0,
          1fr
        );

      gap: 10px;

      padding:
        10px 16px;

      transition:
        background 120ms ease;
    }

    .role-entry:nth-child(
      even
    ) {
      background:
        rgba(
          255,
          255,
          255,
          0.008
        );
    }

    .portrait-wrap {
      width: 36px;
      height: 36px;

      overflow: hidden;

      align-self: start;

      border:
        1px solid
        rgba(
          118,
          89,
          55,
          0.65
        );

      background: #0b0806;
    }

    .portrait {
      display: block;

      width: 100%;
      height: 100%;

      object-fit: cover;
      object-position: center;
    }

    .portrait-fallback {
      display: flex;

      align-items: center;
      justify-content: center;

      color: #b99a6d;

      font-family:
        Georgia,
        "Times New Roman",
        serif;

      font-size: 17px;
    }

    .message-content {
      min-width: 0;
    }

    .compact-header {
      display: flex;

      align-items: center;
      justify-content:
        space-between;

      gap: 12px;

      min-height: 18px;
    }

    .author-line {
      display: flex;

      min-width: 0;

      flex-wrap: wrap;

      align-items: center;

      gap: 7px;
    }

    .author-name {
      overflow: hidden;

      color: #d8bf91;

      font-family:
        Georgia,
        "Times New Roman",
        serif;

      font-size: 14px;

      line-height: 1.15;

      text-overflow:
        ellipsis;

      white-space: nowrap;
    }

    time {
      flex: 0 0 auto;

      color: #675c4e;

      font-size: 7px;

      letter-spacing:
        0.09em;

      text-transform:
        uppercase;

      white-space: nowrap;
    }

    .role-body {
      margin-top: 3px;

      color: #c9b9a2;

      font-size: 13px;

      line-height: 1.72;

      overflow-wrap:
        anywhere;
    }

    .speech-text {
      color: #cdbda7;
    }

    .action-text {
      color: #a78760;

      font-style: italic;
    }

    /*
     * WHISPERS
     */

    .whisper-entry {
      border-left:
        2px solid
        #76568a;

      background:
        linear-gradient(
          90deg,
          rgba(
            62,
            40,
            75,
            0.22
          ),
          rgba(
            27,
            20,
            30,
            0.12
          ) 58%,
          transparent
        );
    }

    .whisper-label {
      border:
        1px solid
        rgba(
          125,
          98,
          143,
          0.55
        );

      background:
        rgba(
          32,
          23,
          39,
          0.8
        );

      padding:
        2px 5px;

      color: #bda5cb;

      font-size: 6px;

      letter-spacing:
        0.11em;

      text-transform:
        uppercase;
    }

    /*
     * DICE
     */

    .roll-entry {
      display: grid;

      grid-template-columns:
        14px auto
        minmax(
          0,
          1fr
        )
        auto;

      align-items: center;

      gap: 8px;

      min-height: 34px;

      padding:
        6px 16px;

      background:
        rgba(
          31,
          23,
          16,
          0.64
        );
    }

    .roll-symbol {
      color: #b98849;

      font-size: 9px;
    }

    .roll-author {
      color: #cdb486;

      font-family:
        Georgia,
        "Times New Roman",
        serif;

      font-size: 11px;

      white-space: nowrap;
    }

    .roll-result {
      min-width: 0;

      color: #aa9c87;

      font-size: 10px;

      overflow-wrap:
        anywhere;
    }

    .critical-success {
      background:
        linear-gradient(
          90deg,
          rgba(
            6,
            78,
            59,
            0.22
          ),
          rgba(
            17,
            13,
            10,
            0.8
          )
        );
    }

    .critical-success
    .roll-symbol,
    .critical-success
    .roll-result {
      color: #86d9a6;
    }

    .critical-failure {
      background:
        linear-gradient(
          90deg,
          rgba(
            127,
            29,
            29,
            0.22
          ),
          rgba(
            17,
            13,
            10,
            0.8
          )
        );
    }

    .critical-failure
    .roll-symbol,
    .critical-failure
    .roll-result {
      color: #e99797;
    }

    /*
     * FATE
     */

    .fate-entry {
      display: grid;

      grid-template-columns:
        24px minmax(
          0,
          1fr
        );

      gap: 8px;

      padding:
        8px 16px;

      border-top:
        1px solid
        rgba(
          138,
          102,
          55,
          0.5
        );

      border-bottom:
        1px solid
        rgba(
          138,
          102,
          55,
          0.5
        );

      background:
        linear-gradient(
          90deg,
          rgba(
            91,
            56,
            24,
            0.27
          ),
          rgba(
            24,
            16,
            11,
            0.72
          ) 55%,
          rgba(
            91,
            56,
            24,
            0.08
          )
        );
    }

    .fate-marker {
      display: flex;

      align-items:
        flex-start;
      justify-content:
        center;

      padding-top: 1px;

      color: #c99851;

      font-size: 12px;
    }

    .fate-content {
      min-width: 0;
    }

    .fate-label {
      color: #d0a05a;

      font-size: 7px;
      font-weight: 600;

      letter-spacing:
        0.22em;

      text-transform:
        uppercase;
    }

    .fate-body {
      margin-top: 2px;

      color: #cbb58f;

      font-family:
        Georgia,
        "Times New Roman",
        serif;

      font-size: 12px;

      line-height: 1.6;

      overflow-wrap:
        anywhere;
    }

    /*
     * Empty archive
     */

    .empty {
      padding:
        28px 18px;

      color: #82735f;

      font-family:
        Georgia,
        "Times New Roman",
        serif;

      font-size: 12px;
      font-style: italic;

      text-align: center;
    }

    /*
     * FOOTER
     */

    footer {
      margin-top: 10px;

      color: #62574a;

      font-size: 8px;

      line-height: 1.55;

      text-align: center;
    }

    /*
     * =====================================================
     * MOBILE
     * =====================================================
     */

    @media (
      max-width: 620px
    ) {
      main {
        width:
          calc(
            100% - 16px
          );

        margin:
          8px auto 18px;
      }

      .header-content {
        padding:
          12px 13px;
      }

      .location-image-title {
        left: 13px;
        right: 13px;
        bottom: 11px;
      }

      .metadata {
        gap:
          5px 14px;
      }

      .role-entry {
        grid-template-columns:
          32px minmax(
            0,
            1fr
          );

        gap: 8px;

        padding:
          9px 11px;
      }

      .portrait-wrap {
        width: 32px;
        height: 32px;
      }

      .role-body {
        font-size: 12px;
      }

      .roll-entry {
        grid-template-columns:
          12px auto 1fr;

        gap: 6px;

        padding:
          6px 11px;
      }

      .roll-entry time {
        display: none;
      }

      .fate-entry {
        padding:
          8px 11px;
      }
    }

    /*
     * =====================================================
     * PRINT
     * =====================================================
     */

    @media print {
      :root {
        color-scheme: light;
      }

      html,
      body {
        background: white;
        color: #241b14;
      }

      body {
        font-size: 11px;
      }

      main {
        width: 100%;
        margin: 0;
      }

      .archive-header,
      .chronicle {
        border-color:
          #8b7864;

        background: white;
      }

      .location-image {
        height: 120px;

        border-color:
          #8b7864;
      }

      .location-image::after {
        background:
          linear-gradient(
            to top,
            rgba(
              255,
              255,
              255,
              0.2
            ),
            transparent
          );
      }

      .location-image-title
      h1,
      .location-image-title
      .eyebrow {
        color: white;

        text-shadow:
          0 1px 4px
          black;
      }

      h1,
      .author-name,
      .roll-author,
      .speech-text,
      .role-body,
      .fate-body {
        color: #241b14;
      }

      .room-description {
        color: #4f453b;
      }

      .action-text {
        color: #6f5336;
      }

      .role-entry,
      .roll-entry,
      .fate-entry {
        break-inside: avoid;
      }

      .role-entry {
        background: white;
      }

      .roll-entry {
        background: #f7f4ef;
      }

      .fate-entry {
        background: #f8f2e8;
      }

      .whisper-entry {
        background: #f5eff7;

        border-left-color:
          #76568a;
      }

      .portrait-wrap {
        border-color:
          #9c8a73;
      }

      time {
        color: #766a5d;
      }

      footer {
        color: #66594e;
      }
    }
  </style>
</head>

<body>
  <main>

    <header class="archive-header">

      ${
        roomImage
          ? `
            <div class="location-image">
              <img
                src="${escapeHtml(
                  roomImage,
                )}"
                alt="${escapeHtml(
                  room.name,
                )}"
              />

              <div class="location-image-title">
                <p class="eyebrow">
                  Sepulchria · Role Chronicle
                </p>

                <h1>
                  ${escapeHtml(
                    roomHeading,
                  )}
                </h1>
              </div>
            </div>
          `
          : ""
      }

      <div class="header-content">

        ${
          !roomImage
            ? `
              <p class="eyebrow">
                Sepulchria · Role Chronicle
              </p>

              <h1>
                ${escapeHtml(
                  roomHeading,
                )}
              </h1>
            `
            : ""
        }

        ${
          room.description
            ? `
              <div class="room-description">
                ${renderRichText(
                  room.description,
                )}
              </div>
            `
            : ""
        }

        <div class="metadata">

          <div class="metadata-item">
            <strong>
              Exported by
            </strong>

            <span>
              ${escapeHtml(
                character.display_name,
              )}
            </span>
          </div>

          <div class="metadata-item">
            <strong>
              Exported
            </strong>

            <span>
              ${escapeHtml(
                exportedAtLabel,
              )}
            </span>
          </div>

          <div class="metadata-item">
            <strong>
              Entries
            </strong>

            <span>
              ${messages.length}
            </span>
          </div>

          <div class="metadata-item">
            <strong>
              Participants
            </strong>

            <span>
              ${
                participants.length
                  ? escapeHtml(
                      participants.join(
                        ", ",
                      ),
                    )
                  : "None recorded"
              }
            </span>
          </div>

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
          : `
            <div class="empty">
              The room chronicle is empty.
            </div>
          `
      }
    </section>


    <footer>
      Sepulchria · Role Chronicle ·
      This archive contains only entries visible to the account that exported it.
      Private whispers remain subject to their original visibility rules.
    </footer>

  </main>
</body>
</html>`;

  const datePart =
    exportedAt
      .toISOString()
      .slice(
        0,
        10,
      );

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