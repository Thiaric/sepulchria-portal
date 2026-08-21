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

  useEffect(() => {
    if (
      state.ok &&
      state.submittedAt
    ) {
      setBody("");
      setNonce(
        crypto.randomUUID(),
      );

      /*
       * Tell the open conversation that a successful send just happened.
       * ConversationRealtime owns the actual scroll behaviour.
       */
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
    state.ok,
    state.submittedAt,
  ]);

  const isOnGame =
    messageMode === "ongame";

  return (
    <form
      ref={formRef}
      action={action}
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

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              setMessageMode("ongame")
            }
            aria-pressed={isOnGame}
            className={`border px-4 py-3 text-left transition ${
              isOnGame
                ? "border-[rgb(var(--sep-colour-a77a42))] bg-[rgb(var(--sep-colour-3b2919))] text-[rgb(var(--sep-colour-f0d3a1))]"
                : "border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-100c09))] text-[rgb(var(--sep-colour-8e806d))] hover:border-[rgb(var(--sep-colour-80613c))]"
            }`}
          >
            <span className="block text-[9px] uppercase tracking-[0.18em]">
              On-game
            </span>

            <span className="mt-1 block text-[10px] leading-4 opacity-75">
              Written by the character.
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setMessageMode("offgame")
            }
            aria-pressed={!isOnGame}
            className={`border px-4 py-3 text-left transition ${
              !isOnGame
                ? "border-[rgb(var(--sep-colour-6d7488))] bg-[rgb(var(--sep-colour-20232b))] text-[rgb(var(--sep-colour-d6dae5))]"
                : "border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-100c09))] text-[rgb(var(--sep-colour-8e806d))] hover:border-[rgb(var(--sep-colour-6d7488))]"
            }`}
          >
            <span className="block text-[9px] uppercase tracking-[0.18em]">
              Off-game
            </span>

            <span className="mt-1 block text-[10px] leading-4 opacity-75">
              Written by the player.
            </span>
          </button>
        </div>
      </fieldset>

      <div
        className={`mt-4 border-l-2 px-3 py-2 text-[10px] leading-5 ${
          isOnGame
            ? "border-[rgb(var(--sep-colour-a77a42))] bg-[rgb(var(--sep-colour-24190f))] text-[rgb(var(--sep-colour-bfa37a))]"
            : "border-[rgb(var(--sep-colour-6d7488))] bg-[rgb(var(--sep-colour-191b21))] text-[rgb(var(--sep-colour-aeb4c2))]"
        }`}
      >
        {isOnGame
          ? "This message belongs to the story and is visible as character correspondence."
          : "This message is out of character and should only contain player communication."}
      </div>

      <div className="mt-4">
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

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
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
          className={`border px-5 py-3 text-xs uppercase tracking-[0.22em] disabled:cursor-not-allowed disabled:opacity-40 ${
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
