"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import { PRIVATE_MESSAGE_MAX_LENGTH } from "@/lib/messages/constants";
import { stripRichTextForPreview } from "@/lib/rich-text-shared";
import { RichMessageEditor } from "@/components/messages/rich-message-editor";
import { SanctionRestrictionNotice, useSanctionCapability } from "@/components/sanctions/sanction-capability-ui";
import type {
  MessageActionState,
  PrivateMessageMode,
} from "@/types/messages";

import { sendTypedPrivateMessage } from "../send-typed-message-action";

const initialState: MessageActionState = {
  ok: false,
  message: "",
};

const PRIVATE_MESSAGE_SENT_EVENT =
  "sepulchria:private-message-sent";

const PRIVATE_MESSAGE_OPTIMISTIC_EVENT =
  "sepulchria:private-message-optimistic";

const PRIVATE_MESSAGE_SEND_RESULT_EVENT =
  "sepulchria:private-message-send-result";

export default function MessageComposer({
  conversationId,
}: {
  conversationId: string;
}) {
  const [state, action, pending] =
    useActionState(
      sendTypedPrivateMessage,
      initialState,
    );

  const communication =
    useSanctionCapability(
      "communication",
    );

  const [body, setBody] =
    useState("");

  const [messageMode, setMessageMode] =
    useState<PrivateMessageMode>(
      "ongame",
    );

  const [nonce, setNonce] =
    useState(() =>
      crypto.randomUUID(),
    );

  const formRef =
    useRef<HTMLFormElement>(null);

  const submittedNonceRef =
    useRef<string | null>(null);

  const submittedBodyRef =
    useRef<string>("");

  useEffect(() => {
    const submittedNonce =
      submittedNonceRef.current;

    if (!submittedNonce || !state.message) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent(
        PRIVATE_MESSAGE_SEND_RESULT_EVENT,
        {
          detail: {
            conversationId,
            nonce: submittedNonce,
            ok: state.ok,
          },
        },
      ),
    );

    submittedNonceRef.current = null;

    if (!state.ok) {
      const submittedBody =
        submittedBodyRef.current;

      if (submittedBody) {
        setBody((current) =>
          current ? current : submittedBody,
        );
      }

      submittedBodyRef.current = "";
      return;
    }

    submittedBodyRef.current = "";

    if (state.submittedAt) {
      setNonce(crypto.randomUUID());

      window.dispatchEvent(
        new CustomEvent(
          PRIVATE_MESSAGE_SENT_EVENT,
          {
            detail: {
              conversationId,
            },
          },
        ),
      );

      formRef.current
        ?.querySelector<HTMLTextAreaElement>(
          "textarea",
        )
        ?.focus();
    }
  }, [
    conversationId,
    state.message,
    state.ok,
    state.submittedAt,
  ]);

  const isOnGame =
    messageMode === "ongame";

  if (communication.blocked) {
    return (
      <div className="border-t border-[rgb(var(--sep-colour-59432c))]/40 p-3 sm:p-4">
        <SanctionRestrictionNotice
          message={communication.message}
        />
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={() => {
        submittedNonceRef.current = nonce;
        submittedBodyRef.current = body;

        window.dispatchEvent(
          new CustomEvent(
            PRIVATE_MESSAGE_OPTIMISTIC_EVENT,
            {
              detail: {
                conversationId,
                nonce,
                body,
                messageMode,
              },
            },
          ),
        );

        setBody("");

        requestAnimationFrame(() => {
          formRef.current
            ?.querySelector<HTMLTextAreaElement>(
              "textarea",
            )
            ?.focus();
        });
      }}
      className="border-t border-[rgb(var(--sep-colour-59432c))]/40 p-5 sm:p-6"
    >
      <input
        type="hidden"
        name="conversationId"
        value={conversationId}
      />

      <input
        type="hidden"
        name="client_nonce"
        value={nonce}
      />

      <input
        type="hidden"
        name="messageMode"
        value={messageMode}
      />

      <fieldset>
        <legend className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
          Message type
        </legend>

        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              setMessageMode("ongame")
            }
            aria-pressed={isOnGame}
            className={`border px-3 py-2 text-left transition ${
              isOnGame
                ? "border-[rgb(var(--sep-colour-a77a42))] bg-[rgb(var(--sep-colour-3b2919))] text-[rgb(var(--sep-colour-f0d3a1))]"
                : "border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-100c09))] text-[rgb(var(--sep-colour-8e806d))] hover:border-[rgb(var(--sep-colour-80613c))]"
            }`}
          >
            <span className="block text-[9px] uppercase tracking-[0.18em]">
              On-game
            </span>

            <span className="mt-0.5 block text-[9px] leading-4 opacity-75">
              Written by the character.
            </span>
          </button>

          <button
            type="button"
            id="sep-offgame-message-selector"
            data-sep-offgame-selector="true"
            onClick={() =>
              setMessageMode("offgame")
            }
            aria-pressed={!isOnGame}
            className={`border px-3 py-2 text-left transition ${
              !isOnGame
                ? "border-[rgb(var(--sep-colour-6d7488))] bg-[rgb(var(--sep-colour-0d0907))] text-[rgb(var(--sep-colour-d6dae5))]"
                : "border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-0d0907))] text-[rgb(var(--sep-colour-8e806d))] hover:border-[rgb(var(--sep-colour-6d7488))]"
            }`}
          >
            <span className="block text-[9px] uppercase tracking-[0.18em]">
              Off-game
            </span>

            <span className="mt-0.5 block text-[9px] leading-4 opacity-75">
              Written by the player.
            </span>
          </button>
        </div>
      </fieldset>

      <div
        className={`mt-2 border-l-2 px-3 py-1.5 text-[9px] leading-4 ${
          isOnGame
            ? "border-[rgb(var(--sep-colour-a77a42))] bg-[rgb(var(--sep-colour-24190f))] text-[rgb(var(--sep-colour-bfa37a))]"
            : "border-[rgb(var(--sep-colour-6d7488))] bg-[rgb(var(--sep-colour-191b21))] text-[rgb(var(--sep-colour-aeb4c2))]"
        }`}
      >
        {isOnGame
          ? "This message belongs to the story and is visible as character correspondence."
          : "This message is out of character and should only contain player communication."}
      </div>

      <div className="mt-2">
        <RichMessageEditor
          value={body}
          onChange={setBody}
          maxLength={
            PRIVATE_MESSAGE_MAX_LENGTH
          }
          mode={messageMode}
          placeholder={
            isOnGame
              ? "Write as your character..."
              : "Write an off-game message..."
          }
        />

        <input
          type="hidden"
          name="body"
          value={body}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-776b5c))]">
            {stripRichTextForPreview(
              body,
            ).length.toLocaleString(
              "en-GB",
            )}{" "}
            /{" "}
            {PRIVATE_MESSAGE_MAX_LENGTH.toLocaleString(
              "en-GB",
            )}
          </p>

          {state.message ? (
            <p
              className={`mt-2 text-xs ${
                state.ok
                  ? "text-[rgb(var(--sep-colour-8ebc87))]"
                  : "text-[rgb(var(--sep-colour-d88d79))]"
              }`}
            >
              {state.message}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={
            pending ||
            !stripRichTextForPreview(
              body,
            )
          }
          className={`border px-4 py-2 text-[10px] uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-40 ${
            isOnGame
              ? "border-[rgb(var(--sep-colour-967342))] bg-[rgb(var(--sep-colour-3b2b1b))] text-[rgb(var(--sep-colour-f1d9a7))]"
              : "border-[rgb(var(--sep-colour-697185))] bg-[rgb(var(--sep-colour-292d36))] text-[rgb(var(--sep-colour-e2e5ec))]"
          }`}
        >
          {pending
            ? "Sending..."
            : `Send ${
                isOnGame
                  ? "on-game"
                  : "off-game"
              }`}
        </button>
      </div>
    </form>
  );
}
