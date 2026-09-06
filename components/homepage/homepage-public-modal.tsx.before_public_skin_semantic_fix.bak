"use client";

import {
  useEffect,
} from "react";

type HomepagePublicModalProps = {
  modal: {
    title: string;
    href: string;
  } | null;
  onClose: () => void;
};

export function HomepagePublicModal({
  modal,
  onClose,
}: HomepagePublicModalProps) {
  useEffect(() => {
    if (!modal) {
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
  }, [modal, onClose]);

  if (!modal) {
    return null;
  }

  const separator =
    modal.href.includes("?")
      ? "&"
      : "?";

  const iframeSrc =
    `${modal.href}${separator}embedded=1`;

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-2 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={modal.title}
    >
      <button
        type="button"
        aria-label={`Close ${modal.title}`}
        onClick={onClose}
        className="absolute inset-0 bg-[rgb(var(--sep-colour-050403))]/85 backdrop-blur-[2px]"
      />

      <section className="relative z-10 flex h-[92dvh] w-[96vw] max-w-[1280px] flex-col overflow-hidden border border-[rgb(var(--sep-colour-795a34))]/70 bg-[rgb(var(--sep-colour-0d0907))] shadow-[0_30px_100px_rgba(var(--sep-rgb-0-0-0),0.88)] sm:h-[88dvh] sm:w-[92vw]">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-120d0a))] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[7px] uppercase tracking-[0.26em] text-[rgb(var(--sep-colour-80684c))]">
              Sepulchria
            </p>

            <h2 className="truncate font-serif text-lg text-[rgb(var(--sep-colour-e0c99e))] sm:text-xl">
              {modal.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${modal.title}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-17110d))] text-lg text-[rgb(var(--sep-colour-bda57f))] transition hover:border-[rgb(var(--sep-colour-9b7443))] hover:text-[rgb(var(--sep-colour-f1d7a5))]"
          >
            ×
          </button>
        </div>

        <iframe
          key={iframeSrc}
          src={iframeSrc}
          title={modal.title}
          onLoad={(event) => {
            try {
              const frameDocument =
                event.currentTarget
                  .contentDocument;

              frameDocument
                ?.querySelectorAll(
                  'a[href="/homepage"], a[href^="/homepage?"]',
                )
                .forEach((link) => {
                  link.remove();
                });
            } catch (error) {
              console.warn(
                "Unable to remove homepage links from embedded public page:",
                error,
              );
            }
          }}
          className="min-h-0 flex-1 border-0 bg-[rgb(var(--sep-colour-090706))]"
        />
      </section>
    </div>
  );
}
