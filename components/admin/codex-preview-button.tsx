"use client";

import {
  useEffect,
  useState,
} from "react";

type CodexPreviewButtonProps = {
  chapterId: string;
};

export function CodexPreviewButton({
  chapterId,
}: CodexPreviewButtonProps) {
  const [open, setOpen] =
    useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      onKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        onKeyDown,
      );
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-17110d))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-a78d68))] transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:text-[rgb(var(--sep-colour-d8bb8a))]"
      >
        Preview
      </button>

      {open ? (
        <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6">
          <section className="pointer-events-auto flex h-[88dvh] w-[92vw] max-w-[1400px] flex-col overflow-hidden border border-[rgb(var(--sep-colour-8d693e))]/65 bg-[rgb(var(--sep-colour-0d0a08))] shadow-2xl">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3">
              <div>
                <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-c79b5e))]">
                  Staff preview
                </p>
                <p className="mt-1 text-xs text-[rgb(var(--sep-colour-8f806c))]">
                  Draft content is visible here but not on the public Codex.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-bca27b))] hover:border-[rgb(var(--sep-colour-9b7446))] hover:text-[rgb(var(--sep-colour-ecd2a3))]"
              >
                Close
              </button>
            </header>

            <iframe
              src={`/codex-preview/${chapterId}`}
              title="Codex chapter preview"
              className="min-h-0 flex-1 border-0 bg-[rgb(var(--sep-colour-090705))]"
            />
          </section>
        </div>
      ) : null}
    </>
  );
}
