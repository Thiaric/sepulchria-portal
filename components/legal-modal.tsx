"use client";

import {
  useEffect,
} from "react";
import { X } from "lucide-react";

type LegalModalProps = {
  title: string;
  eyebrow: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function LegalModal({
  title,
  eyebrow,
  open,
  onClose,
  children,
}: LegalModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label={`Close ${title}`}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <section className="relative z-10 flex max-h-[88dvh] w-full max-w-3xl flex-col border border-[rgb(var(--sep-colour-765937))]/75 bg-[rgb(var(--sep-colour-110c09))] shadow-[0_30px_100px_rgba(var(--sep-rgb-0-0-0),.7)]">
        <header className="flex shrink-0 items-start justify-between gap-5 border-b border-[rgb(var(--sep-colour-60482e))]/55 px-5 py-5 sm:px-7">
          <div>
            <p className="text-[8px] uppercase tracking-[0.34em] text-[rgb(var(--sep-colour-876c4c))]">
              {eyebrow}
            </p>

            <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-e5cfa6))] sm:text-3xl">
              {title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-62482f))] bg-[rgb(var(--sep-colour-17100c))] text-[rgb(var(--sep-colour-b49a76))] transition hover:border-[rgb(var(--sep-colour-9c7546))] hover:text-[rgb(var(--sep-colour-efd5a7))]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {children}
        </div>

        <footer className="shrink-0 border-t border-[rgb(var(--sep-colour-60482e))]/45 px-5 py-4 text-right sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="border border-[rgb(var(--sep-colour-a77a42))]/75 bg-[rgb(var(--sep-colour-382313))] px-5 py-2.5 font-serif text-sm text-[rgb(var(--sep-colour-ead3a6))] transition hover:border-[rgb(var(--sep-colour-d4a460))] hover:bg-[rgb(var(--sep-colour-472c17))]"
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}
