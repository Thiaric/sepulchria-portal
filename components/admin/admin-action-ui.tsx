"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ServerFormAction = (formData: FormData) => Promise<unknown>;
type Feedback = { kind: "success" | "error"; text: string; left: number; top: number };

function feedbackPosition(submitter: HTMLElement | null) {
  if (!submitter) return { left: 24, top: 24 };
  const rect = submitter.getBoundingClientRect();
  const desiredLeft = rect.right + 10;
  const maxLeft = Math.max(16, window.innerWidth - 360);
  if (desiredLeft <= maxLeft) {
    return { left: desiredLeft, top: Math.max(12, rect.top) };
  }
  return {
    left: Math.max(16, Math.min(rect.left, maxLeft)),
    top: Math.min(window.innerHeight - 64, rect.bottom + 8),
  };
}

export function AdminActionForm({
  action,
  successMessage,
  className,
  children,
}: {
  action: ServerFormAction;
  successMessage: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const timerRef = useRef<number | null>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  function showFeedback(kind: Feedback["kind"], text: string, submitter: HTMLElement | null) {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    const position = feedbackPosition(submitter);
    setFeedback({ kind, text, ...position });
    timerRef.current = window.setTimeout(() => {
      setFeedback(null);
      timerRef.current = null;
    }, 5_000);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const nativeEvent = event.nativeEvent as SubmitEvent;
    const submitter = nativeEvent.submitter instanceof HTMLElement ? nativeEvent.submitter : null;
    const form = event.currentTarget;
    const buttons = Array.from(
      form.querySelectorAll<HTMLButtonElement>('button[type="submit"], button:not([type])'),
    );
    const previouslyDisabled = buttons.map((button) => button.disabled);
    buttons.forEach((button) => { button.disabled = true; });
    submitter?.setAttribute("aria-busy", "true");
    setPending(true);
    setFeedback(null);

    try {
      await action(new FormData(form));
      showFeedback("success", successMessage, submitter);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "The action failed.";
      showFeedback("error", message, submitter);
    } finally {
      buttons.forEach((button, index) => { button.disabled = previouslyDisabled[index]; });
      submitter?.removeAttribute("aria-busy");
      setPending(false);
    }
  }

  return (
    <form className={className} onSubmit={handleSubmit} aria-busy={pending}>
      {children}
      {mounted && feedback
        ? createPortal(
            <div
              role={feedback.kind === "error" ? "alert" : "status"}
              className={`fixed z-[9999] max-w-[340px] border px-3 py-2 text-[10px] shadow-xl ${
                feedback.kind === "success"
                  ? "border-emerald-700/70 bg-emerald-950 text-emerald-200"
                  : "border-red-800/70 bg-red-950 text-red-200"
              }`}
              style={{ left: feedback.left, top: feedback.top }}
            >
              {feedback.text}
            </div>,
            document.body,
          )
        : null}
    </form>
  );
}

export function AdminCollapsibleSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="border border-[rgb(var(--sep-skin-c1,169_138_96))]/35 bg-[rgb(var(--sep-colour-15100d))]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
      >
        <span className="font-serif text-2xl text-[rgb(var(--sep-skin-c1,169_138_96))]">{title}</span>
        <span aria-hidden="true" className="text-lg text-[rgb(var(--sep-skin-c1,169_138_96))]">
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? (
        <div className="border-t border-[rgb(var(--sep-skin-c1,169_138_96))]/20 p-4 sm:p-5">
          {children}
        </div>
      ) : null}
    </section>
  );
}
