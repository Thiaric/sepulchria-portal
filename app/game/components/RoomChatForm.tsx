"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { CHAT_MAX_LENGTH } from "@/lib/game/constants";
import type { ActionState } from "@/types/game";
import { sendRoomMessage } from "../actions";

const initialState: ActionState = {
  ok: false,
  message: "",
};

export default function RoomChatForm() {
  const [state, formAction] = useActionState(sendRoomMessage, initialState);
  const [value, setValue] = useState("");
  const [nonce, setNonce] = useState(() => crypto.randomUUID());
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok || !state.submittedAt) {
      return;
    }

    setValue("");
    setNonce(crypto.randomUUID());
    formRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
  }, [state.ok, state.submittedAt]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border-t border-[#59432c]/40 p-4 sm:p-5"
    >
      <input type="hidden" name="client_nonce" value={nonce} />

      <textarea
        name="message"
        required
        maxLength={CHAT_MAX_LENGTH}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Write your action..."
        className="min-h-28 w-full resize-y border border-[#60482e]/50 bg-[#0f0c09] px-4 py-3 text-sm leading-7 text-[#d0bea1] outline-none transition placeholder:text-[#5f574d] focus:border-[#927047]"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.18em] text-[#685d50]">
            {value.length.toLocaleString("en-GB")} /{" "}
            {CHAT_MAX_LENGTH.toLocaleString("en-GB")}
          </p>

          {state.message ? (
            <p
              aria-live="polite"
              className={`mt-2 text-xs ${
                state.ok ? "text-[#9bb58c]" : "text-[#d58d82]"
              }`}
            >
              {state.message}
            </p>
          ) : null}
        </div>

        <SubmitButton disabled={!value.trim()} />
      </div>
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="border border-[#85653c] bg-[#342617] px-6 py-3 text-xs uppercase tracking-[0.23em] text-[#efd4a0] transition hover:bg-[#4a351f] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? "Sending..." : "Send action"}
    </button>
  );
}
