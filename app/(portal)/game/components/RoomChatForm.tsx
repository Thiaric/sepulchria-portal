"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";

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
  vigor: "Vigor",
  brains: "Brains",
  shrewd: "Shrewd",
  presence_score: "Presence",
};

export default function RoomChatForm({
  attributes,
  presentCharacters,
  canUseFate,
}: {
  attributes: CharacterAttributes;
  presentCharacters: PresentRoomCharacter[];
  canUseFate: boolean;
}) {
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

  const [value, setValue] =
    useState("");

  const [
    whisperRecipientId,
    setWhisperRecipientId,
  ] = useState("");

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
            Number(score) >= 1 &&
            Number(score) <= 8,
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
    checkState.message ||
    diceState.message;

  const utilityOk =
    checkState.message
      ? checkState.ok
      : diceState.ok;

  const visibleStatusMessage =
    messageState.message ||
    utilityMessage;

  const visibleStatusOk =
    messageState.message
      ? messageState.ok
      : utilityOk;

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

        <div className="relative h-24 overflow-hidden border border-[#60482e]/50 bg-[#0f0c09] transition focus-within:border-[#927047]">
          <textarea
            ref={textareaRef}
            name="message"
            required
            maxLength={CHAT_MAX_LENGTH}
            value={value}
            lang="en-GB"
            
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
            issues={spellingIssues}
            scrollTop={
              textareaScrollTop
            }
          />
        </div>

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

                    return (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label} (
                        {
                          ATTRIBUTE_LABELS[
                            option.attribute
                          ]
                        }{" "}
                        +{score ?? "—"})
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
              aria-label="Whisper to a character in this room"
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
