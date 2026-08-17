"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { CHAT_MAX_LENGTH } from "@/lib/game/constants";
import {
  SpellingTextareaOverlay,
  useSpellingIssues,
} from "@/components/editor/writing-assistant";
import { ItemExchangePanel } from "./ItemExchangePanel";
import { createClient } from "@/lib/supabase/client";
import type {
  ActionState,
  CharacterAttributeKey,
  CharacterAttributes,
  PresentRoomCharacter,
} from "@/types/game";
import {
  activateRoomGift,
  useRoomGift,
  useRoomItem,
  sendRoomAttributeCheck,
  sendRoomDiceRoll,
  sendRoomMessage,
} from "../actions";

const initialState: ActionState = {
  ok: false,
  message: "",
};

const DICE_OPTIONS = [
  4,
  6,
  8,
  10,
  12,
  20,
  100,
] as const;

type CheckOption = {
  value: string;
  label: string;
  attribute: CharacterAttributeKey;
};

const CHECK_OPTIONS: CheckOption[] = [
  { value: "unarmed_attack", label: "Unarmed Attack", attribute: "muscles" },
  { value: "melee_attack_muscles", label: "Melee Attack (Muscles)", attribute: "muscles" },
  { value: "melee_attack_reflexes", label: "Melee Attack (Reflexes)", attribute: "reflexes" },
  { value: "ranged_attack", label: "Ranged Attack", attribute: "reflexes" },
  { value: "defend", label: "Defend", attribute: "vigor" },
  { value: "dodge", label: "Dodge", attribute: "reflexes" },
  { value: "use_muscles", label: "Use your Muscles", attribute: "muscles" },
  { value: "use_reflexes", label: "Use your Reflexes", attribute: "reflexes" },
  { value: "use_brains", label: "Use your Brains", attribute: "brains" },
  { value: "use_shrewd", label: "Use your Shrewd", attribute: "shrewd" },
  { value: "use_presence", label: "Use your Presence", attribute: "presence_score" },
  { value: "resist_physical", label: "Resist (Physical)", attribute: "vigor" },
  { value: "resist_shrewd", label: "Resist (Shrewd)", attribute: "shrewd" },
  { value: "resist_brains", label: "Resist (Brains)", attribute: "brains" },
  { value: "resist_presence", label: "Resist (Presence)", attribute: "presence_score" },
];

const ATTRIBUTE_LABELS: Record<
  CharacterAttributeKey,
  string
> = {
  muscles: "Muscles",
  reflexes: "Reflexes",
  vigor: "Vigour",
  brains: "Brains",
  shrewd: "Shrewd",
  presence_score: "Presence",
};

type AttributeBreakdownEntry = {
  base: number | null;
  gifts: number;
  adjustedBase: number | null;
  ancestry: number;
  order: number;
  effective: number | null;
};

type ChatItem = {
  recordKind: "standard" | "unique";
  recordId: string;
  itemId: string;
  name: string;
  description: string;
  quantity: number;
  targetMode: "self" | "other" | "either";
  maxCharges: number | null;
  chargesRemaining: number | null;
  cooldownReadyAt: string | null;
  effects: {
    trigger_type: string;
    effect_mode: string;
    duration_minutes: number | null;
    muscles_modifier: number;
    reflexes_modifier: number;
    vigour_modifier: number;
    shrewd_modifier: number;
    brains_modifier: number;
    presence_modifier: number;
    health_delta: number;
    max_health_modifier: number;
  }[];
};

type ChatGift = {
  characterGiftId: string;
  giftId: string;
  name: string;
  description: string;
  effectMode:
    | "none"
    | "passive"
    | "temporary";
  durationMinutes: number | null;
  activeUntil: string | null;
  cooldownUntil: string | null;
};

type AttributeBreakdown = Record<
  CharacterAttributeKey,
  AttributeBreakdownEntry
>;

function formatSigned(
  value: number,
): string {
  return value >= 0
    ? `+${value}`
    : String(value);
}

export default function RoomChatForm({
  attributes,
  attributeBreakdown,
  gifts,
  items,
  presentCharacters,
  canUseFate,
}: {
  attributes: CharacterAttributes;
  attributeBreakdown: AttributeBreakdown;
  gifts: ChatGift[];
  items: ChatItem[];
  presentCharacters: PresentRoomCharacter[];
  canUseFate: boolean;
}) {
  const router = useRouter();

  const exchangeSupabase =
    useMemo(
      () => createClient(),
      [],
    );

  const [
    hasIncomingExchange,
    setHasIncomingExchange,
  ] = useState(false);

  useEffect(() => {
    let active = true;
    let myCharacterId:
      string | null = null;

    async function checkIncomingExchange() {
      const {
        data: characterId,
        error: characterError,
      } = await exchangeSupabase.rpc(
        "my_character_id",
      );

      if (
        !active ||
        characterError ||
        !characterId
      ) {
        return;
      }

      myCharacterId =
        String(characterId);

      const {
        data,
        error,
      } = await exchangeSupabase
        .from("item_trades")
        .select("id")
        .eq(
          "status",
          "open",
        )
        .eq(
          "character_two_id",
          myCharacterId,
        )
        .limit(1);

      if (!active || error) {
        return;
      }

      setHasIncomingExchange(
        Boolean(data?.length),
      );
    }

    void checkIncomingExchange();

    const channel =
      exchangeSupabase
        .channel(
          `incoming-item-exchange-${crypto.randomUUID()}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "item_trades",
          },
          () => {
            void checkIncomingExchange();
          },
        )
        .subscribe();

    const fallback =
      window.setInterval(
        () => {
          void checkIncomingExchange();
        },
        3000,
      );

    return () => {
      active = false;
      window.clearInterval(
        fallback,
      );
      void exchangeSupabase.removeChannel(
        channel,
      );
    };
  }, [exchangeSupabase]);

  const [messageState, messageAction] =
    useActionState(
      sendRoomMessage,
      initialState,
    );

  const [diceState, diceAction] =
    useActionState(
      sendRoomDiceRoll,
      initialState,
    );

  const [checkState, checkAction] =
    useActionState(
      sendRoomAttributeCheck,
      initialState,
    );

  const [giftState, giftAction] =
    useActionState(
      activateRoomGift,
      initialState,
    );

  const [
    giftUseState,
    giftUseAction,
  ] = useActionState(
    useRoomGift,
    initialState,
  );

  const [utilityMode, setUtilityMode] =
    useState<
      | "whisper"
      | "dice"
      | "attributes"
      | "feat"
      | "items"
      | "exchange"
      | null
    >(null);

  const [itemState, itemAction] =
    useActionState(
      useRoomItem,
      initialState,
    );

  const [selectedItemKey, setSelectedItemKey] =
    useState(
      items[0]
        ? `${items[0].recordKind}:${items[0].recordId}`
        : "",
    );

  const [itemTargetId, setItemTargetId] =
    useState("");

  const selectedItem = useMemo(
    () =>
      items.find(
        (item) =>
          `${item.recordKind}:${item.recordId}` ===
          selectedItemKey,
      ) ??
      items[0] ??
      null,
    [items, selectedItemKey],
  );

  useEffect(() => {
    setItemTargetId("");
  }, [selectedItemKey]);

  useEffect(() => {
    if (
      itemState.ok &&
      itemState.submittedAt
    ) {
      router.refresh();
    }
  }, [
    itemState.ok,
    itemState.submittedAt,
    router,
  ]);

  const [selectedGiftId, setSelectedGiftId] =
    useState(
      gifts[0]?.characterGiftId ?? "",
    );

  const selectedGift = useMemo(
    () =>
      gifts.find(
        (gift) =>
          gift.characterGiftId ===
          selectedGiftId,
      ) ??
      gifts[0] ??
      null,
    [gifts, selectedGiftId],
  );

  const selectedGiftIsActive =
    selectedGift?.effectMode === "temporary" &&
    Boolean(selectedGift.activeUntil);

  const selectedGiftIsOnCooldown =
    selectedGift?.effectMode === "temporary" &&
    !selectedGiftIsActive &&
    Boolean(selectedGift?.cooldownUntil);

  function giftCooldownLabel(cooldownUntil: string) {
    const remainingMs = Math.max(
      0,
      Date.parse(cooldownUntil) - Date.now(),
    );

    const hours = Math.floor(
      remainingMs / (60 * 60 * 1000),
    );

    const minutes = Math.ceil(
      (remainingMs % (60 * 60 * 1000)) /
        (60 * 1000),
    );

    return `${hours ? `${hours}h ` : ""}${minutes}m`;
  }

  const [value, setValue] =
    useState("");

  const [
    whisperRecipientId,
    setWhisperRecipientId,
  ] = useState("");

  const [
  ignoredSpellingWords,
  setIgnoredSpellingWords,
] = useState<string[]>([]);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  const messageFormRef =
  useRef<HTMLFormElement>(null);

  const [
    textareaScrollTop,
    setTextareaScrollTop,
  ] = useState(0);

  const spellingIssues =
  useSpellingIssues(value);

const visibleSpellingIssues =
  spellingIssues.filter(
    (issue) =>
      !ignoredSpellingWords.includes(
        issue.word.toLocaleLowerCase(
          "en-GB",
        ),
      ),
  );

  const [
  spellingMenu,
  setSpellingMenu,
] = useState<{
  word: string;
  start: number;
  end: number;
  suggestions: string[];
  x: number;
  y: number;
} | null>(null);

  const nonceInputRef =
    useRef<HTMLInputElement>(null);

  const [messageNonce, setMessageNonce] =
    useState(
      () => crypto.randomUUID(),
    );

  const [diceNonce, setDiceNonce] =
    useState(
      () => crypto.randomUUID(),
    );

  const [checkNonce, setCheckNonce] =
    useState(
      () => crypto.randomUUID(),
    );

  const attributesComplete =
    useMemo(
      () =>
        Object.values(
          attributes,
        ).every(
          (score) =>
            Number.isInteger(score) &&
            Number(score) >= 1,
        ),
      [attributes],
    );

  useEffect(() => {
    if (
      !messageState.ok ||
      !messageState.submittedAt
    ) {
      return;
    }

    setValue("");
    setWhisperRecipientId("");
    setMessageNonce(
      crypto.randomUUID(),
    );

    textareaRef.current?.focus();
  }, [
    messageState.ok,
    messageState.submittedAt,
  ]);

  useEffect(() => {
    if (
      diceState.ok &&
      diceState.submittedAt
    ) {
      setDiceNonce(
        crypto.randomUUID(),
      );
    }
  }, [
    diceState.ok,
    diceState.submittedAt,
  ]);

  useEffect(() => {
    if (
      checkState.ok &&
      checkState.submittedAt
    ) {
      setCheckNonce(
        crypto.randomUUID(),
      );
    }
  }, [
    checkState.ok,
    checkState.submittedAt,
  ]);

  useEffect(() => {
    if (
      giftState.ok &&
      giftState.submittedAt
    ) {
      router.refresh();
    }
  }, [
    giftState.ok,
    giftState.submittedAt,
    router,
  ]);

  useEffect(() => {
    if (
      giftUseState.ok &&
      giftUseState.submittedAt
    ) {
      router.refresh();
    }
  }, [
    giftUseState.ok,
    giftUseState.submittedAt,
    router,
  ]);

  function handleMessageChange(
    nextValue: string,
  ) {
    setValue(nextValue);

    if (!whisperRecipientId) {
      return;
    }

    const recipient =
      presentCharacters.find(
        (entry) =>
          entry.id ===
          whisperRecipientId,
      );

    if (!recipient) {
      setWhisperRecipientId("");
      return;
    }

    const marker =
      `@${recipient.display_name}@`;

    if (
      !nextValue.startsWith(
        marker,
      )
    ) {
      setWhisperRecipientId("");
    }
  }

  function selectWhisperRecipient(
    characterId: string,
  ) {
    setWhisperRecipientId(
      characterId,
    );

    const withoutExistingMarker =
      value.replace(
        /^@[^@\r\n]+@\s*/,
        "",
      );

    if (!characterId) {
      setValue(
        withoutExistingMarker,
      );

      textareaRef.current?.focus();
      return;
    }

    const recipient =
      presentCharacters.find(
        (entry) =>
          entry.id === characterId,
      );

    if (!recipient) {
      return;
    }

    setValue(
      `@${recipient.display_name}@ ${
        withoutExistingMarker
      }`,
    );

    requestAnimationFrame(() => {
      const textarea =
        textareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.focus();

      const position =
        textarea.value.length;

      textarea.setSelectionRange(
        position,
        position,
      );
    });
  }

  const utilityMessage =
    itemState.message ||
    giftUseState.message ||
    giftState.message ||
    checkState.message ||
    diceState.message;

  const utilityOk =
    itemState.message
      ? itemState.ok
      : giftUseState.message
        ? giftUseState.ok
      : giftState.message
        ? giftState.ok
        : checkState.message
          ? checkState.ok
          : diceState.ok;

  const hasCompleteWhisperMarker =
  /^@[^@\r\n]+@/.test(
    value,
  );

const hideMissingCharacterError =
  messageState.message ===
    "Character not at this Location" &&
  !hasCompleteWhisperMarker;

const visibleStatusMessage =
  hideMissingCharacterError
    ? utilityMessage
    : messageState.message ||
      utilityMessage;

const visibleStatusOk =
  hideMissingCharacterError
    ? utilityOk
    : messageState.message
      ? messageState.ok
      : utilityOk;

 function getWordAtPosition(
  position: number,
) {
  if (!value) {
    return null;
  }

  const isWordCharacter = (
    character: string,
  ) =>
    /[\p{L}’'-]/u.test(
      character,
    );

  let start = Math.min(
    position,
    value.length,
  );

  let end = start;

  if (
    start === value.length ||
    !isWordCharacter(
      value[start] ?? "",
    )
  ) {
    start -= 1;
    end = start + 1;
  }

  if (start < 0) {
    return null;
  }

  while (
    start > 0 &&
    isWordCharacter(
      value[start - 1],
    )
  ) {
    start -= 1;
  }

  while (
    end < value.length &&
    isWordCharacter(
      value[end],
    )
  ) {
    end += 1;
  }

  const word =
    value.slice(
      start,
      end,
    );

  if (!word) {
    return null;
  }

  return {
    word,
    start,
    end,
  };
}

function handleSpellingClick(
  event: React.MouseEvent<HTMLTextAreaElement>,
) {
  const textarea =
    event.currentTarget;

  /*
   * Let the browser first put the caret
   * where the user clicked.
   */
  window.requestAnimationFrame(() => {
    const position =
      textarea.selectionStart;

    const result =
      getWordAtPosition(
        position,
      );

    if (!result) {
      setSpellingMenu(null);
      return;
    }

    const issue =
  visibleSpellingIssues.find(
        (candidate) =>
          candidate.word.localeCompare(
            result.word,
            "en-GB",
            {
              sensitivity:
                "accent",
            },
          ) === 0,
      );

    if (!issue) {
      setSpellingMenu(null);
      return;
    }

    setSpellingMenu({
      word: result.word,
      start: result.start,
      end: result.end,
      suggestions:
        issue.suggestions,
      x: Math.min(
        event.clientX,
        window.innerWidth - 230,
      ),
      y: Math.min(
        event.clientY + 16,
        window.innerHeight - 320,
      ),
    });
  });
}

function preserveWordCase(
  original: string,
  replacement: string,
) {
  if (
    original ===
    original.toUpperCase()
  ) {
    return replacement.toUpperCase();
  }

  if (
    original[0] ===
    original[0]?.toUpperCase()
  ) {
    return (
      replacement
        .charAt(0)
        .toUpperCase() +
      replacement.slice(1)
    );
  }

  return replacement;
}

function applySpellingSuggestion(
  suggestion: string,
) {
  if (!spellingMenu) {
    return;
  }

  const replacement =
    preserveWordCase(
      spellingMenu.word,
      suggestion,
    );

  const nextValue =
    value.slice(
      0,
      spellingMenu.start,
    ) +
    replacement +
    value.slice(
      spellingMenu.end,
    );

  const caretPosition =
    spellingMenu.start +
    replacement.length;

  setValue(nextValue);
  setSpellingMenu(null);

  window.requestAnimationFrame(() => {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.focus();

    textarea.setSelectionRange(
      caretPosition,
      caretPosition,
    );
  });
}  

function ignoreSpellingWord() {
  if (!spellingMenu) {
    return;
  }

  const word =
    spellingMenu.word.toLocaleLowerCase(
      "en-GB",
    );

  setIgnoredSpellingWords(
    (current) =>
      current.includes(word)
        ? current
        : [...current, word],
  );

  setSpellingMenu(null);

  textareaRef.current?.focus();
}

  const utilityButtonClass =
    "border border-[#765937] bg-[#21190f] px-3 py-2 text-[8px] uppercase tracking-[0.13em] text-[#d6bb8d] transition hover:border-[#a17a49] hover:bg-[#2b2014] disabled:cursor-not-allowed disabled:opacity-40";

  const utilityButtonActiveClass =
    "border border-[#a17a49] bg-[#3a2919] px-3 py-2 text-[8px] uppercase tracking-[0.13em] text-[#f0d6a7]";

  const incomingExchangeButtonClass =
    "animate-pulse border border-[#d1a45f] bg-[#4a3218] px-3 py-2 text-[8px] uppercase tracking-[0.13em] text-[#ffe0a3] shadow-[0_0_14px_rgba(209,164,95,0.55)] transition hover:border-[#efc77c] hover:bg-[#5a3b1c]";

  function toggleUtility(
    mode:
      | "whisper"
      | "dice"
      | "attributes"
      | "feat"
      | "items"
      | "exchange",
  ) {
    setUtilityMode((current) =>
      current === mode ? null : mode,
    );
  }

  return (
    <div className="shrink-0 border-t border-[#59432c]/40 bg-[#17110d] p-3 sm:p-4">
      {utilityMode === null ? (
        <form
          action={messageAction}
          ref={messageFormRef}
        >
          <input
            ref={nonceInputRef}
            type="hidden"
            name="client_nonce"
            value={messageNonce ?? ""}
            readOnly
          />

          <input
            type="hidden"
            name="whisper_recipient_id"
            value=""
            readOnly
          />

          <div className="relative h-24 overflow-hidden border border-[#60482e]/50 bg-[#0f0c09] transition focus-within:border-[#927047]">
            <textarea
              ref={textareaRef}
              name="message"
              required
              maxLength={CHAT_MAX_LENGTH}
              value={value}
              lang="en-GB"
              onClick={handleSpellingClick}
              onKeyDown={(event) => {
                if (
                  event.key !== "Enter" ||
                  event.shiftKey ||
                  event.nativeEvent.isComposing
                ) {
                  return;
                }

                event.preventDefault();

                if (!value.trim()) {
                  return;
                }

                messageFormRef.current?.requestSubmit();
              }}
              onScroll={(event) =>
                setTextareaScrollTop(
                  event.currentTarget.scrollTop,
                )
              }
              onChange={(event) =>
                setValue(event.target.value)
              }
              placeholder="Speech outside brackets; actions, movement and descriptions inside < > or ( ) or [ ] or { }. Out-of-character messages must be preceded by //."
              className="relative z-10 h-full w-full resize-none border-0 bg-transparent px-4 py-3 text-sm leading-6 text-[#d0bea1] outline-none placeholder:text-[#5f574d]"
            />

            <SpellingTextareaOverlay
              text={value}
              issues={visibleSpellingIssues}
              scrollTop={textareaScrollTop}
            />
          </div>

          {spellingMenu ? (
            <div
              className="fixed z-[9999] w-[220px] border border-[#60482e]/70 bg-[#100c09] p-2 shadow-[0_12px_30px_rgba(0,0,0,0.65)]"
              style={{
                left: spellingMenu.x,
                top: spellingMenu.y,
              }}
            >
              <p className="border-b border-[#59432c]/40 px-2 pb-2 text-[8px] uppercase tracking-[0.18em] text-[#806c52]">
                Spelling
              </p>

              {spellingMenu.suggestions.length > 0 ? (
                <div className="mt-1 max-h-52 overflow-y-auto">
                  {spellingMenu.suggestions.map(
                    (suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          applySpellingSuggestion(
                            suggestion,
                          );
                        }}
                        className="block w-full px-2 py-1.5 text-left text-xs text-[#cdb894] transition hover:bg-[#2a1d12] hover:text-[#f0d3a2]"
                      >
                        {preserveWordCase(
                          spellingMenu.word,
                          suggestion,
                        )}
                      </button>
                    ),
                  )}
                </div>
              ) : (
                <p className="px-2 py-2 text-[10px] italic text-[#706557]">
                  No suggestions found.
                </p>
              )}

              <div className="mt-2 border-t border-[#60482e]/35 pt-2">
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    ignoreSpellingWord();
                  }}
                  className="w-full border border-[#60482e]/45 bg-[#15100d] px-2 py-2 text-[8px] uppercase tracking-[0.12em] text-[#a08c70] transition hover:border-[#87663b] hover:text-[#d4bb91]"
                >
                  Ignore once
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <p className="shrink-0 text-[9px] uppercase tracking-[0.18em] text-[#685d50]">
                {value.length.toLocaleString(
                  "en-GB",
                )}{" "}
                /{" "}
                {CHAT_MAX_LENGTH.toLocaleString(
                  "en-GB",
                )}
              </p>

              {visibleStatusMessage ? (
                <p
                  aria-live="polite"
                  className={`min-w-0 truncate text-xs ${
                    visibleStatusOk
                      ? "text-[#9bb58c]"
                      : "text-[#d58d82]"
                  }`}
                  title={visibleStatusMessage}
                >
                  {visibleStatusMessage}
                </p>
              ) : null}
            </div>

            <SubmitButton
              disabled={!value.trim()}
              onPrepare={() => {
                if (nonceInputRef.current) {
                  nonceInputRef.current.value =
                    messageNonce;
                }
              }}
            />
          </div>
        </form>
      ) : utilityMode === "whisper" ? (
        <form
          action={messageAction}
          ref={messageFormRef}
          className="border border-[#59432c]/35 bg-[#100c09] p-3"
        >
          <UtilityPanelHeader
            title="Whisper"
            description="Send a private in-room message to another character currently present."
            onClose={() => setUtilityMode(null)}
          />

          <input
            ref={nonceInputRef}
            type="hidden"
            name="client_nonce"
            value={messageNonce ?? ""}
            readOnly
          />

          <input
            type="hidden"
            name="whisper_recipient_id"
            value={whisperRecipientId ?? ""}
            readOnly
          />

          <label className="block">
            <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[#806b50]">
              Whisper to
            </span>

            <select
              value={whisperRecipientId}
              onChange={(event) =>
                selectWhisperRecipient(
                  event.target.value,
                )
              }
              className="w-full border border-[#654c31] bg-[#0f0c09] px-3 py-2.5 text-[10px] text-[#d8c29b] outline-none focus:border-[#a17a45]"
            >
              <option value="">
                Choose character...
              </option>
              {presentCharacters.map((entry) => (
                <option
                  key={entry.id}
                  value={entry.id}
                >
                  {entry.display_name}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-3 h-24 overflow-hidden border border-[#60482e]/50 bg-[#0f0c09]">
            <textarea
              ref={textareaRef}
              name="message"
              required
              maxLength={CHAT_MAX_LENGTH}
              value={value}
              onChange={(event) =>
                handleMessageChange(
                  event.target.value,
                )
              }
              placeholder={
                whisperRecipientId
                  ? "Write your whisper..."
                  : "Choose a character first..."
              }
              className="h-full w-full resize-none border-0 bg-transparent px-4 py-3 text-sm leading-6 text-[#d0bea1] outline-none placeholder:text-[#5f574d]"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p
              className={`text-xs ${
                messageState.ok
                  ? "text-[#9bb58c]"
                  : "text-[#d58d82]"
              }`}
            >
              {messageState.message}
            </p>

            <SubmitButton
              disabled={
                !whisperRecipientId ||
                !value.trim()
              }
              onPrepare={() => {
                if (nonceInputRef.current) {
                  nonceInputRef.current.value =
                    messageNonce;
                }
              }}
            />
          </div>
        </form>
      ) : utilityMode === "dice" ? (
        <form
          action={diceAction}
          className="border border-[#59432c]/35 bg-[#100c09] p-3"
        >
          <UtilityPanelHeader
            title="Roll Dice"
            description="Choose a die and make an authoritative room roll."
            onClose={() => setUtilityMode(null)}
          />

          <input
            type="hidden"
            name="client_nonce"
            value={diceNonce ?? ""}
            readOnly
          />

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label>
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[#806b50]">
                Die
              </span>
              <select
                name="dice_sides"
                defaultValue="20"
                className="w-full border border-[#654c31] bg-[#0f0c09] px-3 py-2.5 text-[10px] uppercase tracking-[0.16em] text-[#d8c29b] outline-none focus:border-[#a17a45]"
              >
                {DICE_OPTIONS.map((sides) => (
                  <option
                    key={sides}
                    value={sides}
                  >
                    d{sides}
                  </option>
                ))}
              </select>
            </label>

            <RollButton
              label="Roll Dice"
              formAction={diceAction}
              onPrepare={() => undefined}
            />
          </div>

          {diceState.message ? (
            <p
              className={`mt-3 text-xs ${
                diceState.ok
                  ? "text-[#9bb58c]"
                  : "text-[#d58d82]"
              }`}
            >
              {diceState.message}
            </p>
          ) : null}
        </form>
      ) : utilityMode === "attributes" ? (
        <form
          action={checkAction}
          className="border border-[#59432c]/35 bg-[#100c09] p-3"
        >
          <UtilityPanelHeader
            title="Use Attributes"
            description="Choose the check to perform. The current effective score is shown before rolling."
            onClose={() => setUtilityMode(null)}
          />

          <input
            type="hidden"
            name="client_nonce"
            value={checkNonce ?? ""}
            readOnly
          />

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label>
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[#806b50]">
                Attribute check
              </span>

              <select
                name="check_key"
                defaultValue="use_muscles"
                disabled={!attributesComplete}
                className="w-full border border-[#654c31] bg-[#0f0c09] px-3 py-2.5 text-[10px] text-[#d8c29b] outline-none focus:border-[#a17a45] disabled:opacity-45"
              >
                {CHECK_OPTIONS.map((option) => {
                  const score =
                    attributes[
                      option.attribute
                    ];
                  const breakdown =
                    attributeBreakdown[
                      option.attribute
                    ];

                  return (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label} —{" "}
                      {
                        ATTRIBUTE_LABELS[
                          option.attribute
                        ]
                      }
                      :{" "}
                      {score === null
                        ? "—"
                        : formatSigned(score)}
                      {" Effective · "}
                      {breakdown.base ?? "—"}{" "}
                      Base
                    </option>
                  );
                })}
              </select>
            </label>

            <RollButton
              label="Use Attribute"
              disabled={!attributesComplete}
              formAction={checkAction}
              onPrepare={() => undefined}
            />
          </div>

          {checkState.message ? (
            <p
              className={`mt-3 text-xs ${
                checkState.ok
                  ? "text-[#9bb58c]"
                  : "text-[#d58d82]"
              }`}
            >
              {checkState.message}
            </p>
          ) : null}
        </form>
      ) : utilityMode === "feat" ? (
        <form className="border border-[#59432c]/35 bg-[#100c09] p-3">
          <UtilityPanelHeader
            title="Use Feat"
            description="Choose one of your Feats and use or activate it from the room."
            onClose={() => setUtilityMode(null)}
          />

          {selectedGift ? (
            <>
              <input
                type="hidden"
                name="character_gift_id"
                value={
                  selectedGift.characterGiftId ??
                  ""
                }
                readOnly
              />

              <label className="block">
                <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[#806b50]">
                  Feat
                </span>
                <select
                  value={
                    selectedGift.characterGiftId
                  }
                  onChange={(event) =>
                    setSelectedGiftId(
                      event.target.value,
                    )
                  }
                  className="w-full border border-[#654c31] bg-[#0f0c09] px-3 py-2.5 text-[10px] text-[#d8c29b] outline-none focus:border-[#a17a45]"
                >
                  {gifts.map((gift) => (
                    <option
                      key={
                        gift.characterGiftId
                      }
                      value={
                        gift.characterGiftId
                      }
                    >
                      {gift.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-3 border border-[#59432c]/30 bg-[#15100d] p-3">
                <p className="font-serif text-base text-[#dec89f]">
                  {selectedGift.name}
                </p>
                {selectedGift.description ? (
                  <p className="mt-1 text-[10px] leading-5 text-[#817565]">
                    {
                      selectedGift.description
                    }
                  </p>
                ) : null}
                <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-[#8b7657]">
                  {selectedGift.effectMode ===
                  "passive"
                    ? "Passive effect is already active"
                    : selectedGift.effectMode ===
                          "temporary" &&
                        selectedGift.activeUntil
                      ? `Active until ${new Date(
                          selectedGift.activeUntil,
                        ).toLocaleTimeString(
                          "en-GB",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}`
                      : selectedGift.effectMode ===
                          "temporary"
                        ? `Duration: ${
                            selectedGift.durationMinutes ??
                            "?"
                          } min`
                        : "No automatic Attribute effect"}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p
                  className={`text-xs ${
                    giftUseState.message
                      ? giftUseState.ok
                        ? "text-[#9bb58c]"
                        : "text-[#d58d82]"
                      : giftState.message
                        ? giftState.ok
                          ? "text-[#9bb58c]"
                          : "text-[#d58d82]"
                        : "text-[#756958]"
                  }`}
                >
                  {giftUseState.message ||
                    giftState.message}
                </p>

                {selectedGift.effectMode ===
                "temporary" ? (
                  selectedGiftIsActive ? (
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed border border-[#59432c]/35 bg-[#17120e] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[#756958] opacity-60"
                    >
                      Active
                    </button>
                  ) : selectedGiftIsOnCooldown &&
                    selectedGift.cooldownUntil ? (
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed border border-[#59432c]/35 bg-[#17120e] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[#756958] opacity-60"
                    >
                      Cooldown{" "}
                      {giftCooldownLabel(
                        selectedGift.cooldownUntil,
                      )}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      formAction={giftAction}
                      formNoValidate
                      className="border border-[#85653c] bg-[#342617] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[#efd4a0] transition hover:bg-[#4a351f]"
                    >
                      Activate Feat
                    </button>
                  )
                ) : (
                  <button
                    type="submit"
                    formAction={giftUseAction}
                    formNoValidate
                    className="border border-[#765937] bg-[#21190f] px-4 py-2.5 text-[8px] uppercase tracking-[0.14em] text-[#d6bb8d] transition hover:border-[#a17a49]"
                  >
                    Use Feat
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm italic text-[#756958]">
              You have no Feats available.
            </p>
          )}
        </form>
      ) : utilityMode === "exchange" ? (
        <ItemExchangePanel
          presentCharacters={presentCharacters}
          onClose={() => setUtilityMode(null)}
        />
      ) : (
        <form
          action={itemAction}
          className="border border-[#59432c]/35 bg-[#100c09] p-3"
        >
          <UtilityPanelHeader
            title="Use Item"
            description="Choose a usable Item and its valid target."
            onClose={() => setUtilityMode(null)}
          />

          {selectedItem ? (
            <>
              <input
                type="hidden"
                name="item_record_kind"
                value={
                  selectedItem.recordKind ??
                  ""
                }
                readOnly
              />
              <input
                type="hidden"
                name="item_record_id"
                value={
                  selectedItem.recordId ?? ""
                }
                readOnly
              />
              <input
                type="hidden"
                name="item_target_character_id"
                value={itemTargetId ?? ""}
                readOnly
              />

              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[#806b50]">
                    Item
                  </span>
                  <select
                    value={selectedItemKey}
                    onChange={(event) =>
                      setSelectedItemKey(
                        event.target.value,
                      )
                    }
                    className="w-full border border-[#654c31] bg-[#0f0c09] px-3 py-2.5 text-[10px] text-[#d8c29b] outline-none focus:border-[#a17a45]"
                  >
                    {items.map((item) => (
                      <option
                        key={`${item.recordKind}:${item.recordId}`}
                        value={`${item.recordKind}:${item.recordId}`}
                      >
                        {item.name}
                        {item.quantity > 1
                          ? ` ×${item.quantity}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-1.5 block text-[8px] uppercase tracking-[0.14em] text-[#806b50]">
                    Target
                  </span>
                  <select
                    value={itemTargetId}
                    onChange={(event) =>
                      setItemTargetId(
                        event.target.value,
                      )
                    }
                    disabled={
                      selectedItem.targetMode ===
                      "self"
                    }
                    className="w-full border border-[#654c31] bg-[#0f0c09] px-3 py-2.5 text-[10px] text-[#d8c29b] outline-none focus:border-[#a17a45] disabled:opacity-55"
                  >
                    {selectedItem.targetMode !==
                    "other" ? (
                      <option value="">
                        Self
                      </option>
                    ) : (
                      <option value="">
                        Choose character...
                      </option>
                    )}

                    {selectedItem.targetMode !==
                    "self"
                      ? presentCharacters.map(
                          (entry) => (
                            <option
                              key={entry.id}
                              value={entry.id}
                            >
                              {
                                entry.display_name
                              }
                            </option>
                          ),
                        )
                      : null}
                  </select>
                </label>
              </div>

              <div className="mt-3 border border-[#59432c]/30 bg-[#15100d] p-3">
                <p className="font-serif text-base text-[#dec89f]">
                  {selectedItem.name}
                </p>

                {selectedItem.description ? (
                  <p className="mt-1 text-[10px] leading-5 text-[#8f8271]">
                    {
                      selectedItem.description
                    }
                  </p>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-2 text-[8px] uppercase tracking-[0.1em] text-[#9b8768]">
                  {selectedItem.effects
                    .filter(
                      (effect) =>
                        effect.trigger_type ===
                        "use",
                    )
                    .map((effect, index) => {
                      const parts: string[] = [];

                      if (effect.health_delta) {
                        parts.push(
                          `Health ${
                            effect.health_delta >
                            0
                              ? "+"
                              : ""
                          }${
                            effect.health_delta
                          }`,
                        );
                      }

                      const mods = [
                        [
                          "Muscles",
                          effect.muscles_modifier,
                        ],
                        [
                          "Reflexes",
                          effect.reflexes_modifier,
                        ],
                        [
                          "Vigour",
                          effect.vigour_modifier,
                        ],
                        [
                          "Shrewd",
                          effect.shrewd_modifier,
                        ],
                        [
                          "Brains",
                          effect.brains_modifier,
                        ],
                        [
                          "Presence",
                          effect.presence_modifier,
                        ],
                      ] as const;

                      for (const [
                        label,
                        modifier,
                      ] of mods) {
                        if (modifier) {
                          parts.push(
                            `${label} ${
                              modifier > 0
                                ? "+"
                                : ""
                            }${modifier}`,
                          );
                        }
                      }

                      if (
                        effect.effect_mode ===
                          "temporary" &&
                        effect.duration_minutes
                      ) {
                        parts.push(
                          `${effect.duration_minutes} min`,
                        );
                      }

                      return (
                        <span
                          key={index}
                          className="border border-[#60482e]/40 px-2 py-1"
                        >
                          {parts.join(" · ") ||
                            "Use effect"}
                        </span>
                      );
                    })}
                </div>

                {selectedItem.cooldownReadyAt &&
                Date.parse(
                  selectedItem.cooldownReadyAt,
                ) > Date.now() ? (
                  <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-amber-400">
                    On cooldown
                  </p>
                ) : null}

                {selectedItem.maxCharges !==
                null ? (
                  <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-[#8f7c61]">
                    {selectedItem.chargesRemaining ??
                      selectedItem.maxCharges}
                    {" / "}
                    {
                      selectedItem.maxCharges
                    }{" "}
                    charges
                  </p>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p
                  aria-live="polite"
                  className={`text-xs ${
                    itemState.ok
                      ? "text-[#9bb58c]"
                      : "text-[#d58d82]"
                  }`}
                >
                  {itemState.message}
                </p>

                <button
                  type="submit"
                  disabled={
                    Boolean(
                      selectedItem.cooldownReadyAt &&
                        Date.parse(
                          selectedItem.cooldownReadyAt,
                        ) > Date.now(),
                    ) ||
                    (selectedItem.targetMode ===
                      "other" &&
                      !itemTargetId)
                  }
                  className="border border-[#85653c] bg-[#342617] px-5 py-2.5 text-[9px] uppercase tracking-[0.18em] text-[#efd4a0] transition hover:bg-[#4a351f] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Use Item
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm italic text-[#756958]">
              You have no usable Items.
            </p>
          )}
        </form>
      )}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-[#59432c]/30 pt-3">
        <button
          type="button"
          onClick={() =>
            toggleUtility("whisper")
          }
          disabled={
            presentCharacters.length === 0
          }
          className={
            utilityMode === "whisper"
              ? utilityButtonActiveClass
              : utilityButtonClass
          }
        >
          Whisper
        </button>

        <button
          type="button"
          onClick={() =>
            toggleUtility("dice")
          }
          className={
            utilityMode === "dice"
              ? utilityButtonActiveClass
              : utilityButtonClass
          }
        >
          Roll Dice
        </button>

        <button
          type="button"
          onClick={() =>
            toggleUtility("attributes")
          }
          disabled={!attributesComplete}
          className={
            utilityMode === "attributes"
              ? utilityButtonActiveClass
              : utilityButtonClass
          }
        >
          Use Attributes
        </button>

        <button
          type="button"
          onClick={() =>
            toggleUtility("feat")
          }
          disabled={!gifts.length}
          className={
            utilityMode === "feat"
              ? utilityButtonActiveClass
              : utilityButtonClass
          }
        >
          Use Feat
        </button>

        <button
          type="button"
          onClick={() =>
            toggleUtility("items")
          }
          disabled={!items.length}
          className={
            utilityMode === "items"
              ? utilityButtonActiveClass
              : utilityButtonClass
          }
        >
          Use Items
        </button>

        <button
          type="button"
          onClick={() =>
            toggleUtility("exchange")
          }
          disabled={
            presentCharacters.length === 0
          }
          title={
            hasIncomingExchange &&
            utilityMode !== "exchange"
              ? "Incoming Item Exchange"
              : "Item Exchange"
          }
          className={
            utilityMode === "exchange"
              ? utilityButtonActiveClass
              : hasIncomingExchange
                ? incomingExchangeButtonClass
                : utilityButtonClass
          }
        >
          Item Exchange
        </button>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[8px] leading-4 text-[#756958]">
        <p>
          Dialogue is written normally.
          Put movements and expressions
          inside &lt; &gt; or ( ) or
          &#91; &#93; or &#123; &#125;.
          Out-of-character messages must
          be preceded by //.
        </p>

        {canUseFate ? (
          <p className="text-[#a88658]">
            Fate action: begin the message
            with <strong>^</strong>
          </p>
        ) : null}
      </div>
    </div>
  );
}


function UtilityPanelHeader({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-[#59432c]/30 pb-3">
      <div>
        <p className="text-[7px] uppercase tracking-[0.18em] text-[#806b50]">
          Chat Utility
        </p>
        <h3 className="mt-1 font-serif text-lg text-[#dec89f]">
          {title}
        </h3>
        <p className="mt-1 text-[9px] text-[#817565]">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="border border-[#60482e]/45 bg-[#15100d] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[#a08c70] transition hover:border-[#87663b] hover:text-[#d4bb91]"
      >
        Back to Chat
      </button>
    </div>
  );
}

function SubmitButton({
  disabled,
  onPrepare,
}: {
  disabled: boolean;
  onPrepare: () => void;
}) {
  const { pending } =
    useFormStatus();

    

  return (
    <button
      type="submit"
      onClick={onPrepare}
      disabled={disabled || pending}
      className="border border-[#85653c] bg-[#342617] px-6 py-3 text-xs uppercase tracking-[0.23em] text-[#efd4a0] transition hover:bg-[#4a351f] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending
        ? "Sending..."
        : "Send action"}
    </button>
  );
}

function RollButton({
  label,
  disabled = false,
  formAction,
  onPrepare,
}: {
  label: string;
  disabled?: boolean;
  formAction:
    | string
    | ((
        formData: FormData,
      ) => void | Promise<void>);
  onPrepare: () => void;
}) {
  const { pending } =
    useFormStatus();

    

  return (
    <button
      type="submit"
      onClick={onPrepare}
      formAction={formAction}
      formNoValidate
      disabled={disabled || pending}
      className="shrink-0 border border-[#85653c] bg-[#342617] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[#efd4a0] transition hover:bg-[#4a351f] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending
        ? "Rolling..."
        : label}
    </button>
  );
}
