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
import type {
  ActionState,
  CharacterAttributeKey,
  CharacterAttributes,
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
  { value: "cast_a_spell", label: "Cast a Spell", attribute: "brains" },
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
}: {
  attributes: CharacterAttributes;
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

  const formRef =
    useRef<HTMLFormElement>(null);

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
    setMessageNonce(
      crypto.randomUUID(),
    );

    formRef.current
      ?.querySelector<HTMLTextAreaElement>(
        "textarea",
      )
      ?.focus();
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

  const utilityMessage =
    checkState.message ||
    diceState.message;

  const utilityOk =
    checkState.message
      ? checkState.ok
      : diceState.ok;

  return (
    <div className="shrink-0 border-t border-[#59432c]/40 bg-[#17110d] p-3 sm:p-4">
      <form
        ref={formRef}
        action={messageAction}
      >
        <input
          type="hidden"
          name="client_nonce"
          value={messageNonce}
        />

        <textarea
          name="message"
          required
          maxLength={CHAT_MAX_LENGTH}
          value={value}
          onChange={(event) =>
            setValue(event.target.value)
          }
          placeholder="Write your action..."
          className="h-24 w-full resize-none border border-[#60482e]/50 bg-[#0f0c09] px-4 py-3 text-sm leading-6 text-[#d0bea1] outline-none transition placeholder:text-[#5f574d] focus:border-[#927047]"
        />

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#685d50]">
              {value.length.toLocaleString(
                "en-GB",
              )}{" "}
              /{" "}
              {CHAT_MAX_LENGTH.toLocaleString(
                "en-GB",
              )}
            </p>

            {messageState.message ? (
              <p
                aria-live="polite"
                className={`mt-2 text-xs ${
                  messageState.ok
                    ? "text-[#9bb58c]"
                    : "text-[#d58d82]"
                }`}
              >
                {messageState.message}
              </p>
            ) : null}
          </div>

          <SubmitButton
            disabled={!value.trim()}
          />
        </div>
      </form>

      <div className="mt-3 grid gap-2 border-t border-[#59432c]/30 pt-3 lg:grid-cols-[auto_minmax(280px,1fr)]">
        <form
          action={diceAction}
          className="flex min-w-0"
        >
          <input
            type="hidden"
            name="client_nonce"
            value={diceNonce}
          />

          <select
            name="dice_sides"
            defaultValue="20"
            aria-label="Choose a die"
            className="min-w-24 border border-r-0 border-[#654c31] bg-[#0f0c09] px-3 py-2.5 text-[10px] uppercase tracking-[0.16em] text-[#d8c29b] outline-none focus:border-[#a17a45]"
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

          <RollButton label="Roll" />
        </form>

        <form
          action={checkAction}
          className="flex min-w-0"
        >
          <input
            type="hidden"
            name="client_nonce"
            value={checkNonce}
          />

          <select
            name="check_key"
            defaultValue="use_muscles"
            disabled={!attributesComplete}
            aria-label="Choose an attribute check"
            className="min-w-0 flex-1 border border-r-0 border-[#654c31] bg-[#0f0c09] px-3 py-2.5 text-[10px] uppercase tracking-[0.12em] text-[#d8c29b] outline-none focus:border-[#a17a45] disabled:cursor-not-allowed disabled:opacity-45"
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
            disabled={!attributesComplete}
          />
        </form>
      </div>

      {!attributesComplete ? (
        <p className="mt-2 text-[10px] leading-5 text-[#a78264]">
          Attribute checks are unavailable
          until all six character attributes
          have been assigned.
        </p>
      ) : null}

      {utilityMessage ? (
        <p
          aria-live="polite"
          className={`mt-2 text-xs ${
            utilityOk
              ? "text-[#9bb58c]"
              : "text-[#d58d82]"
          }`}
        >
          {utilityMessage}
        </p>
      ) : null}
    </div>
  );
}

function SubmitButton({
  disabled,
}: {
  disabled: boolean;
}) {
  const { pending } =
    useFormStatus();

  return (
    <button
      type="submit"
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
}: {
  label: string;
  disabled?: boolean;
}) {
  const { pending } =
    useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="shrink-0 border border-[#85653c] bg-[#342617] px-4 py-2.5 text-[9px] uppercase tracking-[0.18em] text-[#efd4a0] transition hover:bg-[#4a351f] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending
        ? "Rolling..."
        : label}
    </button>
  );
}
