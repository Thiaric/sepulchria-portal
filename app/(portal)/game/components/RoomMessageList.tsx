"use client";

import {
  Fragment,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { CharacterOrderIdentity } from "@/components/characters/character-order-identity";
import { ReportButton } from "@/components/reports/report-button";
import { PriceTooltip } from "@/components/warping/price-tooltip";
import { cosmeticFrameStyle } from "@/components/cosmetics/cosmetic-frame-overlay";
import { createClient } from "@/lib/supabase/client";
import {
  ROOM_HISTORY_HOURS,
  ROOM_INACTIVITY_RESET_HOURS,
} from "@/lib/game/constants";
import type {
  CharacterAttributeKey,
  CharacterSummary,
  RoomMessage,
  RoomMessageType,
} from "@/types/game";

type PrivateLocationMessageTheme = {
  backgroundColour: string;
  speechColour: string;
  actionColour: string;
  systemColour: string;
  whisperBackgroundColour: string;
  whisperTextColour: string;
  offgameBackgroundColour: string;
  offgameTextColour: string;
};

type RoomMessageListProps = {
  roomId: string;
  roomName: string;
  messages: RoomMessage[];
  viewerCharacterId: string;
  canViewAllWhispers: boolean;
  privateLocationTheme:
    | PrivateLocationMessageTheme
    | null;
};

type InsertedRoomMessage = {
  id: string;
  room_id: string;
  character_id: string;
  message: string;
  message_type: RoomMessageType;
  roll_label: string | null;
  dice_sides: number | null;
  dice_result: number | null;
  attribute_key:
    | CharacterAttributeKey
    | null;
  attribute_value: number | null;
  roll_total: number | null;
  whisper_recipient_character_id:
    | string
    | null;
  created_at: string;
};

type RealtimeConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected";

function normaliseRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function CharacterIdentityIcons({
  author,
}: {
  author: CharacterSummary | null;
}) {
  const race = author
    ? normaliseRelation(author.race)
    : null;

  if (!author) {
    return null;
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
      {race?.icon_url ? (
        <img
          src={race.icon_url}
          alt={race.name}
          title={race.name}
          className="h-4 w-4 object-contain"
        />
      ) : null}

      <CharacterOrderIdentity
        characterId={author.id}
        variant="chat"
      />
    </div>
  );
}


function mergeMessages(
  currentMessages: RoomMessage[],
  incomingMessages: RoomMessage[],
): RoomMessage[] {
  const messagesById =
    new Map<string, RoomMessage>();

  for (const message of
    currentMessages) {
    messagesById.set(
      message.id,
      message,
    );
  }

  for (const message of
    incomingMessages) {
    messagesById.set(
      message.id,
      message,
    );
  }

  return Array.from(
    messagesById.values(),
  ).sort(
    (first, second) =>
      Date.parse(
        first.created_at,
      ) -
      Date.parse(
        second.created_at,
      ),
  );
}

function getCharacterHref(
  character:
    | CharacterSummary
    | null
    | undefined,
): string {
  if (!character?.public_slug) {
    return "#";
  }

  return `/characters/${character.public_slug}?from=game`;
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

function formatRollText(
  item: RoomMessage,
): string {
  if (
    item.message_type ===
      "dice_roll" &&
    item.dice_sides &&
    item.dice_result
  ) {
    return `d${item.dice_sides} → ${item.dice_result}`;
  }

  if (
  item.message_type ===
    "attribute_check" &&
  item.roll_label &&
  item.dice_result !== null &&
  item.attribute_value !==
    null &&
  item.roll_total !== null
) {
  return `${mechanicalBracket(
    item.roll_label,
  )} - d20 -> ${mechanicalBracket(
    `${item.dice_result} + ${getAttributeLabel(
      item.attribute_key,
    )} (${item.attribute_value >= 0 ? "+" : ""}${item.attribute_value}) = ${item.roll_total}`,
  )}`;
}

    return item.message.replace(
    /^◆\s*/,
    "",
  );
}

function isMechanicalActionMessage(
  item: RoomMessage,
): boolean {
  if (
    item.message_type !== "action" ||
    !item.message.trimStart().startsWith("◆")
  ) {
    return false;
  }

  const text = item.message.replace(/^◆\s*/, "");

  return (
    /^Warp\s+/i.test(text) ||
    /^used\s+"/i.test(text) ||
    /\battacks?\b/i.test(text) ||
    /\buses\s+(?:dodge|defend|resist)/i.test(text) ||
    /\bchooses\s+do nothing\b/i.test(text) ||
    /\bawaiting\s+(?:dodge|defend|resist)/i.test(text) ||
    /\bsuccess roll:/i.test(text) ||
    /\bshape succeeds\b/i.test(text) ||
    /\bno counter attempted\b/i.test(text) ||
    /\bpotential damage:/i.test(text) ||
    /\bfate resolves the result\b/i.test(text) ||
    /\bcurrent hp\s+-?\d+\s*(?:->|→)\s*-?\d+/i.test(text) ||
    /\bhealing\s+\d+/i.test(text) ||
    /\bdamage\s+\d+/i.test(text) ||
    /\b\d+\s+damage\b/i.test(text)
  );
}

function mechanicalBracket(
  value: string,
): string {
  const clean = value
    .trim()
    .replace(/^\[|\]$/g, "");

  return `[${clean}]`;
}

function formatMechanicalSegment(
  rawSegment: string,
  index: number,
): string {
  const segment = rawSegment.trim();

  if (!segment) {
    return "";
  }

  if (
    index === 0 &&
    /^Warp\s+/i.test(segment)
  ) {
    return `warps ${mechanicalBracket(
      segment.replace(/^Warp\s+/i, ""),
    )}`;
  }

  const used = segment.match(
    /^used\s+"([^"]+)"\s+on\s+(.+)$/i,
  );

  if (used) {
    return `uses ${mechanicalBracket(
      used[1],
    )} on ${mechanicalBracket(
      used[2],
    )}`;
  }

  const counterAgainst = segment.match(
    /^(.+?)\s+uses\s+(.+?)\s+against\s+(.+)$/i,
  );

  if (
    counterAgainst &&
    /^(Dodge|Defend|Resist)/i.test(
      counterAgainst[2],
    )
  ) {
    return `${counterAgainst[1]} uses ${mechanicalBracket(
      counterAgainst[2],
    )} against ${mechanicalBracket(
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
    return `${counter[1]} uses ${mechanicalBracket(
      counter[2],
    )}`;
  }

  const doNothing = segment.match(
    /^(.+?)\s+chooses\s+Do nothing$/i,
  );

  if (doNothing) {
    return `${doNothing[1]} chooses ${mechanicalBracket(
      "Do Nothing",
    )}`;
  }

  const attackOn = segment.match(
    /^attacks\s+on\s+(.+?)\s+with\s+"([^"]+)"$/i,
  );

  if (attackOn) {
    return `attacks ${mechanicalBracket(
      attackOn[1],
    )} with ${mechanicalBracket(
      attackOn[2],
    )}`;
  }

  const attackWith = segment.match(
    /^attacks\s+(.+?)\s+with\s+"([^"]+)"$/i,
  );

  if (attackWith) {
    return `attacks ${mechanicalBracket(
      attackWith[1],
    )} with ${mechanicalBracket(
      attackWith[2],
    )}`;
  }

  const unarmed = segment.match(
    /^attacks\s+(.+?)\s+Unarmed$/i,
  );

  if (unarmed) {
    return `attacks ${mechanicalBracket(
      unarmed[1],
    )} with ${mechanicalBracket(
      "Unarmed",
    )}`;
  }

  const level = segment.match(
  /^Level\s+(.+)$/i,
);

if (level) {
  return mechanicalBracket(
    `Level ${level[1]}`,
  );
}

const useAttribute = segment.match(
  /^Use your\s+(.+)$/i,
);

if (useAttribute) {
  return mechanicalBracket(
    `Use your ${useAttribute[1]}`,
  );
}

const labelled = segment.match(
  /^(Target|Targets|Automatic|Save required|Movement|Components|Duration|Resolved|Condition|Effect):\s*(.+)$/i,
);

if (labelled) {
  const label = labelled[1];
  const value = labelled[2];

  return `${label}: ${mechanicalBracket(value)}`;
}

  const successRoll = segment.match(
    /^Success Roll:\s*(.+)$/i,
  );

  if (successRoll) {
    return `Success Roll ${mechanicalBracket(
      successRoll[1],
    )}`;
  }

  const diceRoll = segment.match(
    /^(d(?:4|6|8|10|12|20|100)\s*(?:->|→))\s*(.+)$/i,
  );

  if (diceRoll) {
    const dcMatch = diceRoll[2].match(
      /^(.+?)\s+vs\s+DC\s+(-?\d+)$/i,
    );

    if (dcMatch) {
      return `${diceRoll[1]} ${mechanicalBracket(
        dcMatch[1],
      )} vs DC ${mechanicalBracket(
        dcMatch[2],
      )}`;
    }

    return `${diceRoll[1]} ${mechanicalBracket(
      diceRoll[2],
    )}`;
  }

  const awaiting = segment.match(
    /^Awaiting\s+(.+)$/i,
  );

  if (awaiting) {
    return `Awaiting ${mechanicalBracket(
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
    return mechanicalBracket(segment);
  }

  const resolvedDamage = segment.match(
    /^(.+?(?:→|->)\s*)(\d+\s+Damage)$/i,
  );

  if (resolvedDamage) {
    return `${resolvedDamage[1]}${mechanicalBracket(
      resolvedDamage[2],
    )}`;
  }

  const potentialDamage = segment.match(
    /^Potential Damage:\s*(.+)$/i,
  );

  if (potentialDamage) {
    return `Potential Damage ${mechanicalBracket(
      potentialDamage[1],
    )}`;
  }

  return segment;
}

function formatItemUseDisplayText(
  rawText: string,
): string {
  const clean = rawText
    .trim()
    .replace(/^◆\s*/, "");

  const head = clean.match(
    /^used\s+"([^"]+)"(?:\s+on\s+(.+?))?(?:\s+-\s+|$)/i,
  );

  if (!head) {
    return clean;
  }

  const itemName = head[1];
  const target = head[2]?.trim() || "";
  const rest = clean.slice(head[0].length).trim();

  const output: string[] = [
    `uses ${mechanicalBracket(itemName)}${
      target
        ? ` on ${mechanicalBracket(target)}`
        : ""
    }`,
  ];

  if (!rest) {
    return output.join(" - ");
  }

  const parts = rest
    .split(/\s+-\s+/g)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const description = part.match(
      /^Description:\s*(.+)$/i,
    );

    if (description) {
      output.push(
        `Description: ${mechanicalBracket(
          description[1],
        )}`,
      );
      continue;
    }

    const duration = part.match(
      /^Duration:\s*(.+)$/i,
    );

    if (duration) {
      output.push(
        `Duration: ${mechanicalBracket(
          duration[1],
        )}`,
      );
      continue;
    }

    const successRoll = part.match(
      /^Success Roll:\s*(.+)$/i,
    );

    if (successRoll) {
      output.push(
        `Success Roll ${mechanicalBracket(
          successRoll[1],
        )}`,
      );
      continue;
    }

    const awaiting = part.match(
      /^Awaiting\s+(.+)$/i,
    );

    if (awaiting) {
      output.push(
        `Awaiting ${mechanicalBracket(
          awaiting[1],
        )}`,
      );
      continue;
    }

    const diceRoll = part.match(
      /^(d(?:4|6|8|10|12|20|100)\s*(?:->|→))\s*(.+)$/i,
    );

    if (diceRoll) {
      output.push(
        `${diceRoll[1]} ${mechanicalBracket(
          diceRoll[2],
        )}`,
      );
      continue;
    }

    /*
     * Item use effects currently arrive as unlabelled segments
     * (attribute modifiers, Health, Max Health, damage, etc.).
     * Those are all item Effects, so highlight the complete value.
     */
    output.push(
      mechanicalBracket(part),
    );
  }

  return output.join(" - ");
}

function formatMechanicalDisplayText(
  item: RoomMessage,
): string {
  const raw = formatRollText(item);

  /*
   * Feat use is emitted with middle-dot separators:
   * used "Feat" on target · DESCRIPTION · Success Roll... · Duration...
   *
   * The second segment is therefore the Feat description.
   */
  const dotSegments = raw.split(/\s+·\s+/g);
  const isFeatUse =
    /^used\s+"[^"]+"(?:\s+on\s+.+)?$/i.test(
      dotSegments[0]?.trim() ?? "",
    ) &&
    dotSegments.length > 1;

  /*
   * Items use hyphen-separated payloads instead of middle dots.
   * Format them independently so Item name, Description, Duration,
   * and all Effect values are bracketed.
   */
  if (
    /^used\s+"[^"]+"/i.test(raw.trim()) &&
    !isFeatUse
  ) {
    return formatItemUseDisplayText(raw);
  }

  return dotSegments
    .map((segment, index) => {
      if (
        isFeatUse &&
        index === 1
      ) {
        return mechanicalBracket(segment);
      }

      return formatMechanicalSegment(
        segment,
        index,
      );
    })
    .filter(Boolean)
    .join(" - ");
}

function renderMechanicalText(
  item: RoomMessage,
  actionColour?: string,
): ReactNode {
  const text =
    formatMechanicalDisplayText(item);

  return (
    <span data-room-mechanical-action="true">
      {text
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
              style={
                highlighted &&
                actionColour
                  ? {
                      color:
                        actionColour,
                    }
                  : undefined
              }
            >
              {segment}
            </span>
          );
        })}
    </span>
  );
}

function renderRollText(
  item: RoomMessage,
  actionColour?: string,
): ReactNode {
  if (
    isMechanicalActionMessage(item)
  ) {
    return renderMechanicalText(
      item,
      actionColour,
    );
  }

  const text = formatRollText(item);

  return (
    <>
      {text
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
              style={
                highlighted &&
                actionColour
                  ? {
                      color:
                        actionColour,
                    }
                  : undefined
              }
            >
              {segment}
            </span>
          );
        })}
    </>
  );
}

function formatTime(
  createdAt: string,
): string {
  const date =
    new Date(createdAt);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
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

function ActionSpeechText({
  content,
  speechColour,
  actionColour,
}: {
  content: string;
  speechColour?: string;
  actionColour?: string;
}) {
  const segments =
  content.split(
    /(<[^<>]*>|\([^()]*\)|\[[^\[\]]*\]|\{[^{}]*\})/g,
  );

  const rendered:
    ReactNode[] = [];

  segments.forEach(
    (segment, index) => {
      if (!segment) {
        return;
      }

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

      const displayText = segment;

      rendered.push(
        <Fragment key={index}>
          <span
  data-room-message-segment={
    isAction ? "action" : "speech"
  }
  className={
    isAction
      ? "italic text-[rgb(var(--sep-colour-a98a60))]"
      : "text-[rgb(var(--sep-colour-d3c2aa))]"
  }
  style={{
    lineHeight: "18px",
    color:
      isAction
        ? (
            actionColour ??
            "rgb(var(--sep-skin-c1, var(--sep-colour-a98a60)))"
          )
        : (
            speechColour ??
            "rgb(var(--sep-skin-c2, var(--sep-colour-d3c2aa)))"
          ),
  }}
>
  {displayText}
</span>
        </Fragment>,
      );
    },
  );

  return (
    <span
  className="whitespace-pre-wrap break-words text-[13px]"
  style={{
    lineHeight: "18px",
  }}
>
      {rendered}
    </span>
  );
}

function CharacterPortrait({
  author,
  characterHref,
}: {
  author: CharacterSummary | null;
  characterHref: string;
}) {
  const portrait = (
    <div
      data-cosmetic-character-id={author?.id}
      data-cosmetic-surface="portrait"
      className="h-9 w-9 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0d0a08))]"
    >
      {author?.portrait_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={author.portrait_url}
          alt={`Portrait of ${author.first_name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full items-center justify-center text-[rgb(var(--sep-colour-806b4e))]">
          ?
        </span>
      )}
    </div>
  );

  if (!author?.public_slug) {
    return portrait;
  }

  return (
    <Link
      href={characterHref}
      className="shrink-0"
    >
      {portrait}
    </Link>
  );
}

export default function RoomMessageList({
  roomId,
  roomName,
  messages,
  viewerCharacterId,
  canViewAllWhispers,
  privateLocationTheme,
}: RoomMessageListProps) {
  const [
    liveMessages,
    setLiveMessages,
  ] = useState<RoomMessage[]>(
    messages,
  );

  const [
    connectionStatus,
    setConnectionStatus,
  ] =
    useState<RealtimeConnectionStatus>(
      "connecting",
    );

  type ActivePriceChatTag = {
  label: string;
  price_key: string;
  expires_at: string;
};

const [chatFrames,setChatFrames]=useState<
  Record<string,string>
>({});

const chatCharacterIdsKey =
  Array.from(
    new Set(
      liveMessages
        .map(
          (message) =>
            message.character_id,
        )
        .filter(Boolean),
    ),
  )
    .sort()
    .join(",");

const [activeShapeTags,setActiveShapeTags]=useState<
  Record<
    string,
    {
      buffs:string[];
      debuffs:string[];
      conditions:string[];
      prices:ActivePriceChatTag[];
    }
  >
>({});

  const scrollContainerRef =
    useRef<HTMLDivElement>(null);

  const shouldScrollRef =
    useRef(true);

  useEffect(() => {
    setLiveMessages(
      (currentMessages) =>
        mergeMessages(
          currentMessages,
          messages,
        ),
    );
  }, [messages]);

  useEffect(() => {
    const characterIds =
      Array.from(
        new Set(
          liveMessages
            .map(
              (message) =>
                message.character_id,
            )
            .filter(Boolean),
        ),
      );

    if (
      characterIds.length === 0
    ) {
      return;
    }

    const needsIdentityData =
      liveMessages.some(
        (message) => {
          const author =
            normaliseRelation(
              message.character,
            );

          return (
            author &&
            (
              author.race ===
                undefined ||
              author.association ===
                undefined ||
              author.first_name ===
                undefined
            )
          );
        },
      );

    if (!needsIdentityData) {
      return;
    }

    let cancelled = false;

    async function enrichAuthors() {
      const supabase =
        createClient();

      const {
        data,
        error,
      } = await supabase
        .from("characters")
        .select(`
          id,
          first_name,
          display_name,
          portrait_url,
          public_slug,
          race:races(
            id,
            name,
            icon_url
          ),
          association:associations(
            id,
            name,
            icon_url
          )
        `)
        .in(
          "id",
          characterIds,
        );

      if (
        error ||
        !data ||
        cancelled
      ) {
        if (error) {
          console.error(
            "Unable to load character identity icons:",
            error.message,
          );
        }
        return;
      }

      const byId =
        new Map(
          data.map(
            (character) => [
              character.id,
              character as CharacterSummary,
            ],
          ),
        );

      setLiveMessages(
        (currentMessages) =>
          currentMessages.map(
            (message) => {
              const enriched =
                byId.get(
                  message.character_id,
                );

              if (!enriched) {
                return message;
              }

              return {
                ...message,
                character:
                  enriched,
              };
            },
          ),
      );
    }

    void enrichAuthors();

    return () => {
      cancelled = true;
    };
  }, [liveMessages]);

  useEffect(() => {
    let active = true;

    async function loadChatFrames() {
      if (!chatCharacterIdsKey) {
        if (active) {
          setChatFrames({});
        }
        return;
      }

      try {
        const response = await fetch(
          `/api/cosmetics/chat?ids=${encodeURIComponent(
            chatCharacterIdsKey,
          )}`,
          {
            cache: "no-store",
          },
        );

        const data = await response.json() as {
          error?: string;
          frames?: Record<string,string>;
        };

        if (!response.ok) {
          throw new Error(
            data.error ??
              "Unable to load chat cosmetics.",
          );
        }

        if (active) {
          setChatFrames(
            data.frames ?? {},
          );
        }
      } catch (error) {
        console.error(
          "Unable to load Chat Frames:",
          error,
        );
      }
    }

    void loadChatFrames();

    const timer =
      window.setInterval(
        () =>
          void loadChatFrames(),
        30000,
      );

    function handleFocus() {
      void loadChatFrames();
    }

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      active = false;
      window.clearInterval(
        timer,
      );
      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [chatCharacterIdsKey]);

  useEffect(()=>{
    let active=true;
    const supabase=createClient();

    async function loadShapeTags(){
      const ids=Array.from(new Set(liveMessages.map(message=>message.character_id).filter(Boolean)));

      if(!ids.length){
        if(active)setActiveShapeTags({});
        return;
      }

      const [shapeResult,priceResult]=await Promise.all([
        supabase.rpc("get_active_shape_chat_tags",{p_character_ids:ids}),
        supabase.rpc("get_active_price_chat_tags",{p_character_ids:ids}),
      ]);

      if(shapeResult.error){
        console.error("Unable to load Shape chat tags:",shapeResult.error.message);
        return;
      }

      if(priceResult.error){
        console.error("Unable to load Price chat tags:",priceResult.error.message);
        return;
      }

      if(active){
        const next:Record<
  string,
  {
    buffs:string[];
    debuffs:string[];
    conditions:string[];
    prices:ActivePriceChatTag[];
  }
>={};

        for(const id of ids){
          next[String(id)]={buffs:[],debuffs:[],conditions:[],prices:[]};
        }

        for(const row of shapeResult.data??[]){
          const id=String(row.character_id);
          next[id]={
            buffs:row.buffs??[],
            debuffs:row.debuffs??[],
            conditions:row.conditions??[],
            prices:next[id]?.prices??[],
          };
        }

        for(const row of priceResult.data??[]){
          const id=String(row.character_id);
          if(!next[id])next[id]={buffs:[],debuffs:[],conditions:[],prices:[]};
          next[id].prices=row.prices??[];
        }

        setActiveShapeTags(next);
      }
    }

    void loadShapeTags();

    const channel=supabase
      .channel(`shape-chat-effects-${crypto.randomUUID()}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"character_shape_effects"},()=>void loadShapeTags())
      .on("postgres_changes",{event:"*",schema:"public",table:"character_price_effects"},()=>void loadShapeTags())
      .subscribe();

    const timer=window.setInterval(()=>void loadShapeTags(),30000);

    return()=>{
      active=false;
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  },[liveMessages]);

  function renderShapeTagGroups(
    characterId:string,
    trailingDivider:boolean,
    metadataColour?:string,
  ){
    const tags=activeShapeTags[characterId];
    if(!tags)return null;

    const normalGroups:string[]=[];
    if(tags.buffs.length)normalGroups.push(tags.buffs.join(" - "));
    if(tags.debuffs.length)normalGroups.push(tags.debuffs.join(" - "));
    if(tags.conditions.length)normalGroups.push(tags.conditions.join(" - "));

    if(!normalGroups.length&&!tags.prices.length)return null;

    return (
      <span
        className="text-[9px] uppercase tracking-[.04em] text-[rgb(var(--sep-colour-b99765))]"
        style={
          metadataColour
            ? { color: metadataColour }
            : undefined
        }
      >
        {" | "}
        {normalGroups.length?normalGroups.join(" | "):null}
        {normalGroups.length&&tags.prices.length?" | ":null}
        {tags.prices.map((price,index)=>(
  <Fragment key={`${price.price_key}-${index}`}>
    {index>0?" - ":null}

    <PriceTooltip
      priceKey={price.price_key}
      displayText={price.label}
      expiresAt={price.expires_at}
    >
      <span className="underline decoration-dotted underline-offset-2">
        {price.label}
      </span>
    </PriceTooltip>
  </Fragment>
))}
        {trailingDivider?" | ":null}
      </span>
    );
  }

  function shapeTagText(characterId:string){
    return renderShapeTagGroups(characterId,true);
  }

  function shapeTagHeaderText(
    characterId:string,
    metadataColour?:string,
  ){
    return renderShapeTagGroups(
      characterId,
      false,
      metadataColour,
    );
  }

  useEffect(() => {
    const container =
      scrollContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTop =
      container.scrollHeight;
  }, []);

  useEffect(() => {
    if (
      !shouldScrollRef.current
    ) {
      return;
    }

    const container =
      scrollContainerRef.current;

    if (!container) {
      return;
    }

    const frame =
      requestAnimationFrame(
        () => {
          container.scrollTo({
            top:
              container.scrollHeight,
            behavior: "smooth",
          });
        },
      );

    return () =>
      cancelAnimationFrame(
        frame,
      );
  }, [liveMessages]);

  useEffect(() => {
    const historyWindow =
      ROOM_HISTORY_HOURS *
      60 *
      60 *
      1000;

    const inactivityWindow =
      ROOM_INACTIVITY_RESET_HOURS *
      60 *
      60 *
      1000;

    function pruneExpiredEntries() {
      setLiveMessages(
        (currentMessages) => {
          if (
            currentMessages.length ===
            0
          ) {
            return currentMessages;
          }

          const now = Date.now();

          const latestTimestamp =
            Date.parse(
              currentMessages[
                currentMessages.length -
                  1
              ].created_at,
            );

          if (
            Number.isNaN(
              latestTimestamp,
            ) ||
            now - latestTimestamp >=
              inactivityWindow
          ) {
            return [];
          }

          const historyStart =
            now - historyWindow;

          const filtered =
            currentMessages.filter(
              (message) => {
                const timestamp =
                  Date.parse(
                    message.created_at,
                  );

                return (
                  !Number.isNaN(
                    timestamp,
                  ) &&
                  timestamp >=
                    historyStart
                );
              },
            );

          return filtered.length ===
            currentMessages.length
            ? currentMessages
            : filtered;
        },
      );
    }

    pruneExpiredEntries();

    const timer =
      window.setInterval(
        pruneExpiredEntries,
        60_000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, []);

  useEffect(() => {
    const supabase =
      createClient();

    setConnectionStatus(
      "connecting",
    );

    const channel = supabase
      .channel(
        `room-messages-${roomId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table:
            "room_messages",
          filter:
            `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const inserted =
            payload.new as InsertedRoomMessage;

          const [
            authorResult,
            recipientResult,
          ] = await Promise.all([
            supabase
              .from("characters")
              .select(`
                id,
                first_name,
                display_name,
                portrait_url,
                public_slug,
                race:races(
                  id,
                  name,
                  icon_url
                ),
                association:associations(
                  id,
                  name,
                  icon_url
                )
              `)
              .eq(
                "id",
                inserted.character_id,
              )
              .maybeSingle(),

            inserted
              .whisper_recipient_character_id
              ? supabase
                  .from(
                    "characters",
                  )
                  .select(`
                    id,
                    first_name,
                    display_name,
                    portrait_url,
                    public_slug
                  `)
                  .eq(
                    "id",
                    inserted
                      .whisper_recipient_character_id,
                  )
                  .maybeSingle()
              : Promise.resolve({
                  data: null,
                  error: null,
                }),
          ]);

          if (
            authorResult.error
          ) {
            console.error(
              "Unable to load message author:",
              authorResult.error
                .message,
            );
          }

          if (
            recipientResult.error
          ) {
            console.error(
              "Unable to load whisper recipient:",
              recipientResult.error
                .message,
            );
          }

          const newMessage:
            RoomMessage = {
              id: inserted.id,
              message:
                inserted.message,
              message_type:
                inserted.message_type,
              roll_label:
                inserted.roll_label,
              dice_sides:
                inserted.dice_sides,
              dice_result:
                inserted.dice_result,
              attribute_key:
                inserted.attribute_key,
              attribute_value:
                inserted.attribute_value,
              roll_total:
                inserted.roll_total,
              whisper_recipient_character_id:
                inserted
                  .whisper_recipient_character_id,
              created_at:
                inserted.created_at,
              character_id:
                inserted.character_id,
              character:
                authorResult.data as
                  | CharacterSummary
                  | null,
              whisperRecipient:
                recipientResult.data as
                  | CharacterSummary
                  | null,
            };

          setLiveMessages(
            (currentMessages) =>
              mergeMessages(
                currentMessages,
                [newMessage],
              ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table:
            "room_messages",
          filter:
            `room_id=eq.${roomId}`,
        },
        (payload) => {
          const updated =
            payload.new as
              InsertedRoomMessage;

          setLiveMessages(
            (currentMessages) =>
              currentMessages.map(
                (message) =>
                  message.id ===
                  updated.id
                    ? {
                        ...message,
                        message:
                          updated.message,
                      }
                    : message,
              ),
          );
        },
      )
      .subscribe((status) => {
        if (
          status ===
          "SUBSCRIBED"
        ) {
          setConnectionStatus(
            "connected",
          );
          return;
        }

        if (
          status ===
            "CHANNEL_ERROR" ||
          status ===
            "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setConnectionStatus(
            "disconnected",
          );
        }
      });

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [roomId]);

  function handleScroll() {
    const container =
      scrollContainerRef.current;

    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    shouldScrollRef.current =
      distanceFromBottom < 120;
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {connectionStatus !==
      "connected" ? (
        <div
          aria-live="polite"
          className={`border-b px-5 py-2 text-center text-[9px] uppercase tracking-[0.18em] ${
            connectionStatus ===
            "connecting"
              ? "border-[rgb(var(--sep-colour-6b5535))]/40 bg-[rgb(var(--sep-colour-21190f))] text-[rgb(var(--sep-colour-b89a68))]"
              : "border-[rgb(var(--sep-colour-754137))]/50 bg-[rgb(var(--sep-colour-2b1714))] text-[rgb(var(--sep-colour-d28e82))]"
          }`}
        >
          {connectionStatus ===
          "connecting"
            ? "Connecting to the room chronicle..."
            : "Realtime connection interrupted. Attempting to reconnect..."}
        </div>
      ) : null}

      <div
  id="room-chronicle"
  ref={scrollContainerRef}
  onScroll={handleScroll}
  data-sep-interaction-ignore="true"
  className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
>

        {liveMessages.length >
        0 ? (
          <div className="divide-y divide-[rgb(var(--sep-colour-4f3b28))]/35">
            {liveMessages.map(
              (item) => {
                const author =
                  normaliseRelation(
                    item.character,
                  );

                const recipient =
                  normaliseRelation(
                    item.whisperRecipient,
                  );

                const time =
                  formatTime(
                    item.created_at,
                  );

                const characterHref =
                  getCharacterHref(
                    author,
                  );

                if (
                  item.message_type ===
                  "fate"
                ) {
                  return (
                    <article
                      key={item.id}
                      className="relative border-y border-[rgb(var(--sep-colour-8a6637))]/40 bg-[rgb(var(--sep-colour-0d0a08))] py-2.5 pl-5 pr-12 sm:pl-7 sm:pr-12"
                    >
                      {item.character_id &&
                      item.character_id !== viewerCharacterId ? (
                        <div data-room-report-control="true" className="absolute right-3 top-3 z-50 pointer-events-auto">
                          <ReportButton
                            sourceType="room_message"
                            sourceId={item.id}
                            compact
                          />
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-c99b58))]">
                          The Voice of Fate
                        </span>

                        <time
                          dateTime={
                            item.created_at
                          }
                          className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-776b5b))]"
                        >
                          {time}
                        </time>

                      </div>

                      <p className="mt-1.5 whitespace-pre-wrap break-words font-serif text-[13px] leading-5 text-[rgb(var(--sep-colour-d6c09a))]">
                        {item.message}
                      </p>
                    </article>
                  );
                }

                const isMechanicalAction =
                  isMechanicalActionMessage(
                    item,
                  );

                const isNaturalTwenty =
                  item.dice_sides === 20 &&
                  item.dice_result === 20;

                const isNaturalOne =
                  item.dice_sides === 20 &&
                  item.dice_result === 1;

                const isOutOfCharacter =
                  item.message
                    .trimStart()
                    .startsWith("//");

                const isWhisper =
                  item.message_type ===
                  "whisper";

                const isSender =
                  item.character_id ===
                  viewerCharacterId;

                const isRecipient =
                  item.whisper_recipient_character_id ===
                  viewerCharacterId;

                const whisperLabel =
                  isSender
                    ? `Whisper to ${
                        recipient?.display_name ??
                        "character"
                      }`
                    : isRecipient
                      ? "Whisper to you"
                      : canViewAllWhispers
                        ? `Whisper to ${
                            recipient?.display_name ??
                            "character"
                          }`
                        : "Whisper";

                /*
                 * WHISPERS + OFF-GAME:
                 * restored to the original layout exactly:
                 * - left portrait/icons/time
                 * - separate label row above the message
                 * - original whisper/off-game backgrounds and borders
                 */
                if (isWhisper || isOutOfCharacter) {
                  return (
                    <article
                      key={item.id}
                      data-cosmetic-character-id={item.character_id}
                      data-cosmetic-surface={isWhisper ? "whisper" : "off-character"}
                      data-room-message-kind={
                        isOutOfCharacter
                          ? "ooc"
                          : "whisper"
                      }
                      className={`relative flex gap-3 py-3 pl-5 pr-12 sm:pl-7 sm:pr-12 ${
                        isOutOfCharacter
                          ? ""
                          : ""
                      }`}
                      style={
                        privateLocationTheme
                          ? isOutOfCharacter
                            ? {
                                backgroundColor:
                                  privateLocationTheme.backgroundColour,
                                color:
                                  privateLocationTheme.offgameTextColour,
                              }
                            : {
                                backgroundColor:
                                  privateLocationTheme.backgroundColour,
                                color:
                                  privateLocationTheme.whisperTextColour,
                              }
                          : undefined
                      }
                    >
                      {item.character_id &&
                      item.character_id !== viewerCharacterId ? (
                        <div data-room-report-control="true" className="absolute right-3 top-3 z-50 pointer-events-auto">
                          <ReportButton
                            sourceType="room_message"
                            sourceId={item.id}
                            compact
                          />
                        </div>
                      ) : null}

                      {/* Character identity + timestamp */}
                      <div className="flex w-[76px] shrink-0 flex-col">
                        <div className="flex items-start gap-1.5">
                          <CharacterPortrait
                            author={author}
                            characterHref={
                              characterHref
                            }
                          />

                          <CharacterIdentityIcons
                            author={author}
                          />
                        </div>

                        <time
                          dateTime={
                            item.created_at
                          }
                          className="mt-1.5 block text-[7px] uppercase leading-4 tracking-[0.12em] text-[rgb(var(--sep-colour-776b5b))]"
                          style={{
                            color:
                              privateLocationTheme
                                ? privateLocationTheme.offgameTextColour
                                : "rgb(var(--sep-colour-d3c2aa))",
                          }}
                        >
                          {time}
                        </time>
                      </div>

                      {/* Original whisper / off-game message layout */}
                      <div className="min-w-0 flex-1">
                        <div
                          className={`mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-b pb-1.5 ${
                            isOutOfCharacter
                              ? "border-[#627f9f]/40"
                              : "border-[#7d628f]/35"
                          }`}
                        >
                          {isOutOfCharacter ? (
                            <span
                              data-room-ooc-label="true"
                              className="text-[8px] uppercase tracking-[0.2em] text-[#a9c7e6]"
                              style={
                                privateLocationTheme
                                  ? {
                                      color:
                                        privateLocationTheme.offgameTextColour,
                                    }
                                  : undefined
                              }
                            >
                              Out of Character message
                            </span>
                          ) : null}

                          {isWhisper ? (
                            <span
                              className="text-[8px] uppercase tracking-[0.2em] text-[#c7add6]"
                              style={
                                privateLocationTheme
                                  ? {
                                      color:
                                        privateLocationTheme.whisperTextColour,
                                    }
                                  : undefined
                              }
                            >
                              {whisperLabel}
                            </span>
                          ) : null}
                        </div>

                        <p
                          className="min-w-0 whitespace-pre-wrap break-words text-[13px]"
                          style={{
                            lineHeight: "18px",
                          }}
                        >
                          {author?.public_slug ? (
                            <Link
                              href={characterHref}
                              className="inline font-serif text-sm leading-[18px] text-[rgb(var(--sep-colour-d8bf91))] transition hover:text-[rgb(var(--sep-colour-ecd29e))]"
                              style={
                                {
                                  color:
                                    privateLocationTheme
                                      ? privateLocationTheme.offgameTextColour
                                      : "rgb(var(--sep-colour-d3c2aa))",
                                }
                              }
                            >
                              {author.first_name ??
                                author.display_name}
                            </Link>
                          ) : (
                            <span
                              className="inline font-serif text-sm leading-[18px] text-[rgb(var(--sep-colour-d8bf91))]"
                              style={
                                {
                                  color:
                                    privateLocationTheme
                                      ? privateLocationTheme.offgameTextColour
                                      : "rgb(var(--sep-colour-d3c2aa))",
                                }
                              }
                            >
                              {author?.first_name ??
                                author?.display_name ??
                                "Unknown character"}
                            </span>
                          )}

                          {author
                            ? shapeTagHeaderText(
                                author.id,
                                privateLocationTheme
                                  ? privateLocationTheme.offgameTextColour
                                  : "rgb(var(--sep-colour-d3c2aa))",
                              )
                            : null}

                          <br />

                          <ActionSpeechText
                            content={
                              item.message
                            }
                            speechColour={
                              privateLocationTheme?.speechColour
                            }
                            actionColour={
                              privateLocationTheme?.actionColour
                            }
                          />
                        </p>
                      </div>
                    </article>
                  );
                }

                /*
                 * EVERY OTHER NON-FATE OUTPUT:
                 * left portrait/icons/time;
                 * right one single paragraph:
                 * Character name | Conditions | output.
                 */
                const isMechanicalOutput =
                  item.message_type ===
                    "dice_roll" ||
                  item.message_type ===
                    "attribute_check" ||
                  isMechanicalAction;

                const chatFrameUrl =
                  !isMechanicalOutput
                    ? chatFrames[
                        item.character_id
                      ] ?? null
                    : null;

                const chatFrameCss =
                  cosmeticFrameStyle(
                    chatFrameUrl,
                    "chat",
                  );

                return (
                  <article
                    key={item.id}
                    data-cosmetic-character-id={item.character_id}
                    data-cosmetic-surface={!isMechanicalOutput ? "action" : undefined}
                    className={`relative flex min-w-0 gap-3 py-3 pl-5 pr-12 sm:pl-7 sm:pr-12 ${
                      chatFrameUrl
                        ? "isolate "
                        : ""
                    }${
                      isMechanicalAction
                        ? "border-l-2 border-[rgb(var(--sep-colour-bd8d4d))]/45 bg-[rgb(var(--sep-colour-21170f))]/70"
                        : isNaturalTwenty
                          ? "bg-emerald-950/10"
                          : isNaturalOne
                            ? "bg-red-950/10"
                            : ""
                    }`}
                    style={{
                      ...(privateLocationTheme
                        ? {
                            backgroundColor:
                              privateLocationTheme.backgroundColour,
                          }
                        : {}),
                      ...(chatFrameCss ?? {}),
                      ...(chatFrameUrl
                        ? {
                            paddingLeft: "4px",
                            paddingRight: "4px",
                            paddingTop: "4px",
                            paddingBottom: "4px",
                          }
                        : {}),
                    }}
                  >
                    {item.character_id &&
                    item.character_id !== viewerCharacterId ? (
                      <div data-room-report-control="true" className="absolute right-3 top-3 z-50 pointer-events-auto">
                          <ReportButton
                          sourceType="room_message"
                          sourceId={item.id}
                          compact
                        />
                      </div>
                    ) : null}

                    {/* Left: portrait, identity icons and timestamp */}
                    <div className="relative z-10 flex w-[76px] shrink-0 flex-col">
                      <div className="flex items-start gap-1.5">
                        <CharacterPortrait
                          author={author}
                          characterHref={characterHref}
                        />

                        <CharacterIdentityIcons
                          author={author}
                        />
                      </div>

                      <time
                        dateTime={item.created_at}
                        className="mt-1.5 block text-[7px] uppercase leading-4 tracking-[0.12em] text-[rgb(var(--sep-colour-776b5b))]"
                      >
                        {time}
                      </time>
                    </div>

                    {/* Right: one single paragraph */}
                    <p
                      className={`relative z-10 min-w-0 flex-1 whitespace-pre-wrap break-words text-[13px] leading-[18px] ${
                        isNaturalTwenty
                          ? "text-emerald-300"
                          : isNaturalOne
                            ? "text-red-300"
                            : isMechanicalOutput
                              ? "text-[rgb(var(--sep-colour-c8b89f))]"
                              : "text-[rgb(var(--sep-colour-d3c2aa))]"
                      }`}
                      title={
                        isMechanicalOutput
                          ? formatRollText(item)
                          : undefined
                      }
                      style={
                        isMechanicalOutput &&
                        privateLocationTheme &&
                        !isNaturalTwenty &&
                        !isNaturalOne
                          ? {
                              color:
                                privateLocationTheme.systemColour,
                            }
                          : undefined
                      }
                    >
                      {author?.public_slug ? (
                        <Link
                          href={characterHref}
                          className="inline font-serif text-sm text-[rgb(var(--sep-colour-d8bf91))] transition hover:text-[rgb(var(--sep-colour-ecd29e))]"
                          style={
                            privateLocationTheme &&
                            isMechanicalOutput
                              ? {
                                  color:
                                    privateLocationTheme.systemColour,
                                }
                              : undefined
                          }
                        >
                          {author.first_name ??
                            author.display_name}
                        </Link>
                      ) : (
                        <span
                          className="inline font-serif text-sm text-[rgb(var(--sep-colour-d8bf91))]"
                          style={
                            privateLocationTheme &&
                            isMechanicalOutput
                              ? {
                                  color:
                                    privateLocationTheme.systemColour,
                                }
                              : undefined
                          }
                        >
                          {author?.first_name ??
                            author?.display_name ??
                            "Unknown character"}
                        </span>
                      )}

                      {author
                        ? shapeTagHeaderText(author.id)
                        : null}

                      <br />

                      {isMechanicalOutput ? (
                        renderRollText(
                          item,
                          privateLocationTheme?.actionColour,
                        )
                      ) : (
                        <ActionSpeechText
                          content={item.message}
                          speechColour={
                            privateLocationTheme?.speechColour
                          }
                          actionColour={
                            privateLocationTheme?.actionColour
                          }
                        />
                      )}
                    </p>
                  </article>
                );
              },
            )}

            <div id="chat-end" />
          </div>
        ) : (
          <div className="flex h-full min-h-0 items-center justify-center px-6 py-10 text-center font-serif italic text-[rgb(var(--sep-colour-8e7d66))]">
          The air awaits for a story to begin at {roomName}...
          </div>
        )}
      </div>
    </div>
  );
}