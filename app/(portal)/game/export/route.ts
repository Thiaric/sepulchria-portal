import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

import { redirect } from "next/navigation";

import {
  ROOM_HISTORY_HOURS,
  ROOM_INACTIVITY_RESET_HOURS,
  ROOM_HISTORY_BATCH_SIZE,
} from "@/lib/game/constants";
import {
  legacyRichTextToHtml,
} from "@/lib/rich-text-shared";
import { createClient } from "@/lib/supabase/server";
import {
  getPrivateLocationAccess,
} from "@/lib/private-locations/access";
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


function formatCompactTime(
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
    presence_score:
      "Presence",
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


function toAbsoluteAssetUrl(
  value:
    | string
    | null
    | undefined,
  origin: string,
): string | null {
  if (!value?.trim()) {
    return null;
  }

  const clean =
    value.trim();

  try {
    if (
      clean.startsWith(
        "http://",
      ) ||
      clean.startsWith(
        "https://",
      )
    ) {
      return new URL(
        clean,
      ).toString();
    }

    const path =
      clean.startsWith("/")
        ? clean
        : `/${clean}`;

    return new URL(
      path,
      origin,
    ).toString();
  } catch {
    return null;
  }
}


function getImageMimeType(
  pathname: string,
): string {
  switch (
    extname(
      pathname,
    ).toLowerCase()
  ) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";

    case ".webp":
      return "image/webp";

    case ".gif":
      return "image/gif";

    case ".svg":
      return "image/svg+xml";

    case ".avif":
      return "image/avif";

    case ".png":
    default:
      return "image/png";
  }
}


async function toEmbeddedExportAssetUrl(
  value:
    | string
    | null
    | undefined,
  origin: string,
): Promise<string | null> {
  if (!value?.trim()) {
    return null;
  }

  const clean =
    value.trim();

  if (
    clean.startsWith(
      "data:",
    )
  ) {
    return clean;
  }

  if (
    clean.startsWith(
      "http://",
    ) ||
    clean.startsWith(
      "https://",
    )
  ) {
    return toAbsoluteAssetUrl(
      clean,
      origin,
    );
  }

  const rawPath =
    clean.split(/[?#]/)[0] ??
    "";

  let relativePath: string;

  try {
    relativePath =
      decodeURIComponent(
        rawPath,
      ).replace(
        /^\/+/,
        "",
      );
  } catch {
    return toAbsoluteAssetUrl(
      clean,
      origin,
    );
  }

  if (
    !relativePath ||
    relativePath
      .split("/")
      .includes("..")
  ) {
    return toAbsoluteAssetUrl(
      clean,
      origin,
    );
  }

  try {
    const filePath =
      join(
        process.cwd(),
        "public",
        relativePath,
      );

    const file =
      await readFile(
        filePath,
      );

    const mimeType =
      getImageMimeType(
        relativePath,
      );

    return `data:${mimeType};base64,${file.toString(
      "base64",
    )}`;
  } catch {
    return toAbsoluteAssetUrl(
      clean,
      origin,
    );
  }
}


function normaliseHtmlUrls(
  html: string,
  origin: string,
): string {
  return html.replace(
    /\b(src|href)=(["'])(.*?)\2/gi,
    (
      fullMatch,
      attribute: string,
      quote: string,
      rawValue: string,
    ) => {
      const value =
        rawValue.trim();

      if (!value) {
        return fullMatch;
      }

      if (
        value.startsWith("#") ||
        value.startsWith("mailto:") ||
        value.startsWith("tel:") ||
        value.startsWith("data:") ||
        value.startsWith("blob:")
      ) {
        return fullMatch;
      }

      try {
        const absoluteUrl =
          value.startsWith(
            "http://",
          ) ||
          value.startsWith(
            "https://",
          )
            ? new URL(
                value,
              ).toString()
            : new URL(
                value.startsWith("/")
                  ? value
                  : `/${value}`,
                origin,
              ).toString();

        return `${attribute}=${quote}${escapeHtml(
          absoluteUrl,
        )}${quote}`;
      } catch {
        return fullMatch;
      }
    },
  );
}


function renderRichText(
  value: string,
  origin: string,
): string {
  const html =
    legacyRichTextToHtml(
      value,
    );

  return normaliseHtmlUrls(
    html,
    origin,
  );
}


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
      const isAngle =
        segment.startsWith(
          "<",
        ) &&
        segment.endsWith(
          ">",
        );

      const isRound =
        segment.startsWith(
          "(",
        ) &&
        segment.endsWith(
          ")",
        );

      const isSquare =
        segment.startsWith(
          "[",
        ) &&
        segment.endsWith(
          "]",
        );

      const isCurly =
        segment.startsWith(
          "{",
        ) &&
        segment.endsWith(
          "}",
        );

      const isAction =
        isAngle ||
        isRound ||
        isSquare ||
        isCurly;

      /*
       * Preserve action delimiters exactly as written.
       */
      const displayText =
        segment;

      const escaped =
        escapeHtml(
          displayText,
        ).replaceAll(
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
  origin: string,
): string {
  const absolutePortraitUrl =
    toAbsoluteAssetUrl(
      portraitUrl,
      origin,
    );

  if (absolutePortraitUrl) {
    return `
      <div class="portrait-wrap">
        <img
          class="portrait"
          src="${escapeHtml(
            absolutePortraitUrl,
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
  origin: string,
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
              The Voice of Fate
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
   * DICE / CHECK / GIFT USE
   */
  const isGiftUse =
    message.message_type ===
      "action" &&
    message.message.startsWith(
      '◆ used "',
    );

  if (
    message.message_type ===
      "dice_roll" ||
    message.message_type ===
      "attribute_check" ||
    isGiftUse
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
  const isOutOfCharacter =
    message.message
      .trimStart()
      .startsWith("//");

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
      isOutOfCharacter
        ? " ooc-entry"
        : isWhisper
          ? " whisper-entry"
          : ""
    }">

      ${renderPortrait(
        authorName,
        author?.portrait_url,
        origin,
      )}

      <div class="message-content">

        ${
          isWhisper || isOutOfCharacter
            ? `
              <div class="${
                isOutOfCharacter
                  ? "ooc-header"
                  : "whisper-header"
              }">
                <div class="special-message-labels">
                  ${
                    isOutOfCharacter
                      ? `
                        <span class="ooc-label">
                          Out of Character message
                        </span>
                      `
                      : ""
                  }

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
            `
            : ""
        }

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
          </div>

          ${
            !isWhisper && !isOutOfCharacter
              ? `
                <time>
                  ${escapeHtml(
                    time,
                  )}
                </time>
              `
              : ""
          }

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
    .eq(
      "room_id",
      roomId,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    )
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
          first_name,
          display_name,
          portrait_url,
          public_slug
        ),

        whisperRecipient:characters!room_messages_whisper_recipient_character_id_fkey(
          id,
          first_name,
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


export async function GET(
  request: Request,
) {
  const origin =
    new URL(
      request.url,
    ).origin;

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

  const privateAccess =
    await getPrivateLocationAccess(
      room.id,
      character.id,
    );

  if (
    privateAccess.isPrivate &&
    !privateAccess.allowed
  ) {
    redirect("/game");
  }

  const privateTheme =
    privateAccess.metadata;

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
    await toEmbeddedExportAssetUrl(
      room.image_url,
      origin,
    );

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
  )} · Sepulchria Role Chronicle</title>

  <style>
    :root {
      color-scheme: dark;

      font-family:
        Arial,
        Helvetica,
        sans-serif;

      background: #090706;
      color: #c9bba6;

      --chat-background: ${
        privateTheme
          ? escapeHtml(
              privateTheme.backgroundColour,
            )
          : "#110d0a"
      };

      --speech-colour: ${
        privateTheme
          ? escapeHtml(
              privateTheme.speechColour,
            )
          : "#cdbda7"
      };

      --action-colour: ${
        privateTheme
          ? escapeHtml(
              privateTheme.actionColour,
            )
          : "#a78760"
      };

      --system-colour: ${
        privateTheme
          ? escapeHtml(
              privateTheme.systemColour,
            )
          : "#aa9c87"
      };

      --whisper-background: ${
        privateTheme
          ? escapeHtml(
              privateTheme.whisperBackgroundColour,
            )
          : "#241b2a"
      };

      --whisper-text: ${
        privateTheme
          ? escapeHtml(
              privateTheme.whisperTextColour,
            )
          : "#bda5cb"
      };

      --offgame-background: ${
        privateTheme
          ? escapeHtml(
              privateTheme.offgameBackgroundColour,
            )
          : "#182536"
      };

      --offgame-text: ${
        privateTheme
          ? escapeHtml(
              privateTheme.offgameTextColour,
            )
          : "#a9c7e6"
      };
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
          circle at 50% -10%,
          #2a1c11 0,
          #130e0a 30%,
          #090706 72%
        );

      color: #c9bba6;

      font-size: 13px;
      line-height: 1.5;
    }

    main {
      width: min(
        980px,
        calc(100% - 28px)
      );

      margin:
        16px auto 26px;
    }


    /*
     * ===================================
     * HEADER
     * ===================================
     */

    .archive-header {
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
          130px,
          18vw,
          190px
        );

      overflow: hidden;

      border-bottom:
        1px solid
        #60482e;

      background: #0d0907;
    }

    .location-image img {
      display: block;

      width: 100%;
      height: 100%;

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
          rgba(var(--sep-rgb-14-10-8),0.92) 0%,
          rgba(var(--sep-rgb-14-10-8),0.22) 55%,
          rgba(var(--sep-rgb-14-10-8),0.02) 100%
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

    .header-content {
      padding:
        13px 18px;
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

    .location-image-title h1 {
      color: #ead2a5;

      text-shadow:
        0 2px 8px
        rgba(var(--sep-rgb-0-0-0),0.95);
    }


    /*
     * DESCRIPTION / STORED RICH TEXT
     */

    .room-description {
      max-width: 100%;

      margin-top: 9px;

      color: #9f927f;

      font-size: 11px;
      line-height: 1.55;
    }

    .room-description p {
      margin:
        4px 0;
    }

    .room-description strong,
    .room-description b {
      color: #cdb892;
      font-weight: 700;
    }

    .room-description em,
    .room-description i {
      color: #b09b7c;
    }

    .room-description h1,
    .room-description h2,
    .room-description h3 {
      margin:
        9px 0 4px;

      color: #cfb78f;

      font-family:
        Georgia,
        "Times New Roman",
        serif;

      font-weight: 400;
    }

    .room-description h1 {
      font-size: 17px;
    }

    .room-description h2 {
      font-size: 15px;
    }

    .room-description h3 {
      font-size: 13px;
    }

    .room-description ul,
    .room-description ol {
      margin:
        5px 0;

      padding-left: 21px;
    }

    .room-description blockquote {
      margin:
        7px 0;

      border-left:
        2px solid
        #745536;

      padding:
        3px 9px;

      color: #8f816e;

      font-style: italic;
    }

    .room-description a {
      color: #c69a60;
    }

    .room-description img {
      display: block;

      max-width: 100%;
      max-height: 260px;

      margin:
        7px auto;

      object-fit: contain;
    }


    /*
     * METADATA
     */

    .metadata {
      display: flex;
      flex-wrap: wrap;

      gap:
        5px 22px;

      margin-top: 10px;

      border-top:
        1px solid
        rgba(var(--sep-rgb-96-72-46),0.45);

      padding-top: 8px;
    }

    .metadata-item {
      display: flex;

      min-width: 0;

      align-items: baseline;

      gap: 6px;
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
     * ===================================
     * CHRONICLE
     * ===================================
     */

    .chronicle {
      margin-top: 9px;

      overflow: hidden;

      border:
        1px solid
        #60482e;

      background:
        var(
          --chat-background,
          rgba(var(--sep-rgb-17-13-10),0.97)
        );
    }

    .entry {
      border-bottom:
        1px solid
        rgba(var(--sep-rgb-75-56-37),0.46);
    }

    .entry:last-child {
      border-bottom: 0;
    }


    /*
     * NORMAL ROLE ENTRY
     */

    .role-entry {
      display: grid;

      grid-template-columns:
        36px
        minmax(
          0,
          1fr
        );

      gap: 10px;

      padding:
        9px 16px;
    }

    .portrait-wrap {
      width: 36px;
      height: 36px;

      overflow: hidden;

      align-self: start;

      border:
        1px solid
        rgba(var(--sep-rgb-118-89-55),0.65);

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

      min-height: 17px;

      align-items: center;
      justify-content:
        space-between;

      gap: 12px;
    }

    .author-line {
      display: flex;

      min-width: 0;

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
      margin-top: 2px;

      color: #c9b9a2;

      font-size: 13px;

      line-height: 1.65;

      overflow-wrap:
        anywhere;
    }

    .speech-text {
      color:
        var(
          --speech-colour,
          #cdbda7
        );
    }

    .action-text {
      color:
        var(
          --action-colour,
          #a78760
        );

      font-style: italic;
    }


    /*
     * WHISPER
     */

    .whisper-entry {
      border-left:
        2px solid
        #76568a;

      background:
        var(
          --whisper-background,
          #241b2a
        );
    }

    .whisper-header {
      display: flex;

      align-items: center;
      justify-content:
        space-between;

      gap: 10px;

      margin-bottom: 3px;

      border-bottom:
        1px solid
        rgba(var(--sep-rgb-125-98-143),0.3);

      padding-bottom: 3px;
    }

    .whisper-label {
      color:
        var(
          --whisper-text,
          #bda5cb
        );

      font-size: 7px;

      letter-spacing:
        0.14em;

      text-transform:
        uppercase;
    }


    .whisper-entry
    .author-name,
    .whisper-entry
    .speech-text,
    .whisper-entry
    .action-text,
    .whisper-entry
    .role-body {
      color:
        var(
          --whisper-text,
          #bda5cb
        );
    }


    /*
     * OUT OF CHARACTER
     */

    .ooc-entry {
      border-left:
        2px solid
        #627f9f;

      background:
        var(
          --offgame-background,
          #182536
        );
    }

    .ooc-header {
      display: flex;

      align-items: center;
      justify-content:
        space-between;

      gap: 10px;

      margin-bottom: 3px;

      border-bottom:
        1px solid
        rgba(var(--sep-rgb-98-127-159),0.38);

      padding-bottom: 3px;
    }

    .special-message-labels {
      display: flex;
      flex-wrap: wrap;

      align-items: center;

      gap: 5px 12px;
    }

    .ooc-label {
      color:
        var(
          --offgame-text,
          #a9c7e6
        );

      font-size: 7px;
      font-weight: 600;

      letter-spacing:
        0.14em;

      text-transform:
        uppercase;
    }


    .ooc-entry
    .author-name,
    .ooc-entry
    .speech-text,
    .ooc-entry
    .action-text,
    .ooc-entry
    .role-body {
      color:
        var(
          --offgame-text,
          #a9c7e6
        );
    }


    /*
     * ROLLS
     */

    .roll-entry {
      display: grid;

      grid-template-columns:
        14px
        auto
        minmax(
          0,
          1fr
        )
        auto;

      min-height: 32px;

      align-items: center;

      gap: 8px;

      padding:
        5px 16px;

      background:
        rgba(var(--sep-rgb-31-23-16),0.64);
    }

    .roll-symbol {
      color:
        var(
          --system-colour,
          #b98849
        );

      font-size: 9px;
    }

    .roll-author {
      color:
        var(
          --system-colour,
          #cdb486
        );

      font-family:
        Georgia,
        "Times New Roman",
        serif;

      font-size: 11px;

      white-space: nowrap;
    }

    .roll-result {
      min-width: 0;

      color:
        var(
          --system-colour,
          #aa9c87
        );

      font-size: 10px;

      overflow-wrap:
        anywhere;
    }

    .critical-success {
      background:
        linear-gradient(
          90deg,
          rgba(var(--sep-rgb-6-78-59),0.22),
          rgba(var(--sep-rgb-17-13-10),0.8)
        );
    }

    .critical-success
    .roll-symbol,
    .critical-success
    .roll-result {
      color: #86d9a6 !important;
    }

    .critical-failure {
      background:
        linear-gradient(
          90deg,
          rgba(var(--sep-rgb-127-29-29),0.22),
          rgba(var(--sep-rgb-17-13-10),0.8)
        );
    }

    .critical-failure
    .roll-symbol,
    .critical-failure
    .roll-result {
      color: #e99797 !important;
    }


    /*
     * FATE
     */

    .fate-entry {
      display: grid;

      grid-template-columns:
        22px
        minmax(
          0,
          1fr
        );

      gap: 8px;

      padding:
        7px 16px;

      border-top:
        1px solid
        rgba(var(--sep-rgb-138-102-55),0.5);

      border-bottom:
        1px solid
        rgba(var(--sep-rgb-138-102-55),0.5);

      background:
        linear-gradient(
          90deg,
          rgba(var(--sep-rgb-91-56-24),0.27),
          rgba(var(--sep-rgb-24-16-11),0.72) 55%,
          rgba(var(--sep-rgb-91-56-24),0.08)
        );
    }

    .fate-marker {
      display: flex;

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
        0.2em;

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

      line-height: 1.55;

      overflow-wrap:
        anywhere;
    }


    /*
     * EMPTY
     */

    .empty {
      padding:
        26px 18px;

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
      margin-top: 9px;

      color: #62574a;

      font-size: 8px;

      line-height: 1.5;

      text-align: center;
    }


    /*
     * MOBILE
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
          11px 13px;
      }

      .location-image-title {
        left: 13px;
        right: 13px;
        bottom: 10px;
      }

      .metadata {
        gap:
          4px 14px;
      }

      .role-entry {
        grid-template-columns:
          32px
          minmax(
            0,
            1fr
          );

        gap: 8px;

        padding:
          8px 11px;
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
          12px
          auto
          1fr;

        gap: 6px;

        padding:
          5px 11px;
      }

      .roll-entry time {
        display: none;
      }

      .fate-entry {
        padding:
          7px 11px;
      }
    }


    /*
     * PRINT
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
                  origin,
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
                (message) =>
                  renderMessage(
                    message,
                    origin,
                  ),
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