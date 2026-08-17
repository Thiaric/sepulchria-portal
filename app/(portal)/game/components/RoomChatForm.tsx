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
import type {
  ActionState,
  CharacterAttributeKey,
  CharacterAttributes,
  PresentRoomCharacter,
} from "@/types/game";
import {
  activateRoomGift,
  useRoomGift,
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
  presentCharacters,
  canUseFate,
}: {
  attributes: CharacterAttributes;
  attributeBreakdown: AttributeBreakdown;
  gifts: ChatGift[];
  presentCharacters: PresentRoomCharacter[];
  canUseFate: boolean;
}) {
  const router = useRouter();

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
    giftUseState.message ||
    giftState.message ||
    checkState.message ||
    diceState.message;

  const utilityOk =
    giftUseState.message
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

  return (
    <div className="shrink-0 border-t border-[#59432c]/40 bg-[#17110d] p-3 sm:p-4">
      <form
  action={messageAction}
  ref={messageFormRef}
>
        <input
          ref={nonceInputRef}
          type="hidden"
          name="client_nonce"
          defaultValue={messageNonce}
        />

        <input
          type="hidden"
          name="whisper_recipient_id"
          value={whisperRecipientId}
        />

        <input
          type="hidden"
          name="character_gift_id"
          value={
            selectedGift?.characterGiftId ?? ""
          }
        />

        <div className="relative h-24 overflow-hidden border border-[#60482e]/50 bg-[#0f0c09] transition focus-within:border-[#927047]">
          <textarea
            ref={textareaRef}
            name="message"
            required
            maxLength={CHAT_MAX_LENGTH}
            value={value}
            lang="en-GB"
            onClick={
    handleSpellingClick
  }
            
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

  if (nonceInputRef.current) {
    nonceInputRef.current.value =
      messageNonce;
  }

  messageFormRef.current?.requestSubmit();
}}
            onScroll={(event) =>
              setTextareaScrollTop(
                event.currentTarget
                  .scrollTop,
              )
            }
            onChange={(event) =>
              handleMessageChange(
                event.target.value,
              )
            }
            placeholder="Speech outside brackets; actions, movement, descriptions inside < > or ( ) or [ ] or { }. Out-of-character messages must be preceded by //. To whisper to a character, select them from the dropdown and begin your message with @CharacterName@."
            className="relative z-10 h-full w-full resize-none border-0 bg-transparent px-4 py-3 text-sm leading-6 text-[#d0bea1] outline-none placeholder:text-[#5f574d]"
          />

          <SpellingTextareaOverlay
  text={value}
  issues={visibleSpellingIssues}
            scrollTop={
              textareaScrollTop
            }
          />
        </div>

        {spellingMenu ? (
  <div
    className="fixed z-[9999] w-[220px] border border-[#60482e]/70 bg-[#100c09] p-2 shadow-[0_12px_30px_rgba(0,0,0,0.65)]"
    style={{
      left:
        spellingMenu.x,
      top:
        spellingMenu.y,
    }}
  >
    <p className="border-b border-[#59432c]/40 px-2 pb-2 text-[8px] uppercase tracking-[0.18em] text-[#806c52]">
      Spelling
    </p>

    {spellingMenu.suggestions
      .length > 0 ? (
      <div className="mt-1 max-h-52 overflow-y-auto">
        {spellingMenu.suggestions.map(
          (suggestion) => (
            <button
              key={
                suggestion
              }
              type="button"
              onMouseDown={(
                event,
              ) => {
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

        <div className="mt-3 grid items-center gap-2 xl:grid-cols-[auto_minmax(0,1fr)_auto]">
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
                title={
                  visibleStatusMessage
                }
              >
                {visibleStatusMessage}
              </p>
            ) : null}
          </div>

          <div className="grid min-w-0 gap-2 md:grid-cols-[auto_minmax(250px,1fr)_minmax(180px,0.62fr)]">
            <div className="flex min-w-0">
              <select
                name="dice_sides"
                defaultValue="20"
                aria-label="Choose a die"
                className="min-w-20 border border-r-0 border-[#654c31] bg-[#0f0c09] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#d8c29b] outline-none focus:border-[#a17a45]"
              >
                {DICE_OPTIONS.map(
                  (sides) => (
                    <option
                      key={sides}
                      value={sides}
                    >
                      d{sides}
                    </option>
                  ),
                )}
              </select>

              <RollButton
                label="Roll"
                formAction={diceAction}
                onPrepare={() => {
                  if (nonceInputRef.current) {
                    nonceInputRef.current.value =
                      diceNonce;
                  }
                }}
              />
            </div>

            <div className="flex min-w-0">
              <select
                name="check_key"
                defaultValue="use_muscles"
                disabled={
                  !attributesComplete
                }
                aria-label="Choose an attribute check"
                className="min-w-0 flex-1 border border-r-0 border-[#654c31] bg-[#0f0c09] px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-[#d8c29b] outline-none focus:border-[#a17a45] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {CHECK_OPTIONS.map(
                  (option) => {
                    const score =
                      attributes[
                        option.attribute
                      ];

                    const breakdown =
                      attributeBreakdown[
                        option.attribute
                      ];

                    const effectiveLabel =
                      score === null
                        ? "—"
                        : formatSigned(score);

                    return (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label} — {
                          ATTRIBUTE_LABELS[
                            option.attribute
                          ]
                        }: {breakdown.base ?? "—"} Base{" "}
                        {formatSigned(
                          breakdown.gifts,
                        )} Feats ={" "}
                        {breakdown.adjustedBase ?? "—"} Adjusted Base{" "}
                        {formatSigned(
                          breakdown.ancestry,
                        )} Ancestry{" "}
                        {formatSigned(
                          breakdown.order,
                        )} Order ={" "}
                        {effectiveLabel}
                      </option>
                    );
                  },
                )}
              </select>

              <RollButton
                label="Check"
                disabled={
                  !attributesComplete
                }
                formAction={checkAction}
                onPrepare={() => {
                  if (nonceInputRef.current) {
                    nonceInputRef.current.value =
                      checkNonce;
                  }
                }}
              />
            </div>

            <select
              value={whisperRecipientId}
              onChange={(event) =>
                selectWhisperRecipient(
                  event.target.value,
                )
              }
              disabled={
                presentCharacters.length ===
                0
              }
              aria-label="Whisper to a character"
              className="min-w-0 border border-[#654c31] bg-[#0f0c09] px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-[#d8c29b] outline-none focus:border-[#a17a45] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <option value="">
                {presentCharacters.length >
                0
                  ? "Whisper to..."
                  : "No one to whisper to"}
              </option>

              {presentCharacters.map(
                (entry) => (
                  <option
                    key={entry.id}
                    value={entry.id}
                  >
                    {entry.display_name}
                  </option>
                ),
              )}
            </select>
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

        {gifts.length ? (
          <div className="mt-2 border border-[#59432c]/35 bg-[#100c09] p-2.5">
            <div className="grid gap-2 md:grid-cols-[minmax(220px,0.8fr)_auto_minmax(0,1.2fr)] md:items-center">
              <select
                value={
                  selectedGift?.characterGiftId ?? ""
                }
                onChange={(event) =>
                  setSelectedGiftId(
                    event.target.value,
                  )
                }
                aria-label="Choose a Gift"
                className="min-w-0 border border-[#654c31] bg-[#0f0c09] px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-[#d8c29b] outline-none focus:border-[#a17a45]"
              >
                {gifts.map((gift) => (
                  <option
                    key={gift.characterGiftId}
                    value={gift.characterGiftId}
                  >
                    {gift.name} —{" "}
                    {gift.effectMode === "passive"
                      ? "Passive"
                      : gift.effectMode === "temporary"
                        ? gift.activeUntil
                          ? "Active"
                          : `${gift.durationMinutes ?? "?"} min`
                        : "Feat"}
                  </option>
                ))}
              </select>

              {selectedGift?.effectMode === "temporary" ? (
                selectedGiftIsActive ? (
                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed border border-[#59432c]/35 bg-[#17120e] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[#756958] opacity-60"
                  >
                    Active
                  </button>
                ) : selectedGiftIsOnCooldown &&
                  selectedGift?.cooldownUntil ? (
                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed border border-[#59432c]/35 bg-[#17120e] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[#756958] opacity-60"
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
                    className="border border-[#85653c] bg-[#342617] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[#efd4a0] transition hover:bg-[#4a351f]"
                  >
                    Activate Feat
                  </button>
                )
              ) : (
                <button
                  type="submit"
                  formAction={giftUseAction}
                  formNoValidate
                  className="border border-[#765937] bg-[#21190f] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[#d6bb8d] transition hover:border-[#a17a49]"
                >
                  Use Feat
                </button>
              )}

              <div className="min-w-0">
                <p className="text-[8px] uppercase tracking-[0.12em] text-[#8b7657]">
                  {selectedGift?.effectMode === "passive"
                    ? "Passive effect is already active"
                    : selectedGift?.effectMode ===
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
                      : selectedGift?.effectMode ===
                          "temporary"
                        ? "Activate to apply its temporary Attribute effect"
                        : "No automatic Attribute effect"}
                </p>

                {selectedGift?.description ? (
                  <p
                    className="mt-1 truncate text-[9px] text-[#817565]"
                    title={selectedGift.description}
                  >
                    {selectedGift.description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[8px] leading-4 text-[#756958]">
          <p>
            Dialogue is written normally.
            Put movements and expressions
            inside &lt; &gt; or ( ) or &#91; &#93; or &#123; &#125;. Out-of-character messages must be preceeded by //.
          </p>

          {canUseFate ? (
            <p className="text-[#a88658]">
              Fate action: begin the
              message with{" "}
              <strong>^</strong>
            </p>
          ) : null}
        </div>

        {!attributesComplete ? (
          <p className="mt-1.5 text-[9px] leading-4 text-[#a78264]">
            Attribute checks are unavailable
            until all six character attributes
            have been assigned.
          </p>
        ) : null}
      </form>
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
