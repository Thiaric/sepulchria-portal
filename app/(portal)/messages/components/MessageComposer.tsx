"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendPrivateMessage } from "../actions";
import { PRIVATE_MESSAGE_MAX_LENGTH } from "@/lib/messages/constants";
import type { MessageActionState } from "@/types/messages";

const initialState: MessageActionState = { ok: false, message: "" };

export default function MessageComposer({ conversationId }: { conversationId: string }) {
  const [state, action, pending] = useActionState(sendPrivateMessage, initialState);
  const [body, setBody] = useState("");
  const [nonce, setNonce] = useState(() => crypto.randomUUID());
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && state.submittedAt) {
      setBody("");
      setNonce(crypto.randomUUID());
      formRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
    }
  }, [state.ok, state.submittedAt]);

  return (
    <form ref={formRef} action={action} className="border-t border-[#59432c]/40 p-5 sm:p-6">
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="client_nonce" value={nonce} />
      <textarea
        name="body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={PRIVATE_MESSAGE_MAX_LENGTH}
        rows={5}
        placeholder="Write a private message..."
        className="w-full resize-y border border-[#60482e] bg-[#0f0c09] p-4 text-sm leading-7 text-[#e4d4b5] outline-none placeholder:text-[#6f6251] focus:border-[#9b7543]"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#776b5c]">{body.length.toLocaleString("en-GB")} / {PRIVATE_MESSAGE_MAX_LENGTH.toLocaleString("en-GB")}</p>
          {state.message ? <p className={`mt-2 text-xs ${state.ok ? "text-[#8ebc87]" : "text-[#d88d79]"}`}>{state.message}</p> : null}
        </div>
        <button type="submit" disabled={pending || !body.trim()} className="border border-[#967342] bg-[#3b2b1b] px-5 py-3 text-xs uppercase tracking-[0.22em] text-[#f1d9a7] disabled:cursor-not-allowed disabled:opacity-40">
          {pending ? "Sending..." : "Send message"}
        </button>
      </div>
    </form>
  );
}
