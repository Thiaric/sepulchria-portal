"use client";

import { useEffect, useState } from "react";

export function RegistrationLeftMessage() {
  const [infoOpen, setInfoOpen] =
    useState(false);

  useEffect(() => {
    if (!infoOpen) return;

    const previous =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function onKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setInfoOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      onKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previous;

      window.removeEventListener(
        "keydown",
        onKeyDown,
      );
    };
  }, [infoOpen]);

  return (
    <>
      <div>
        <p>
          Sepulchria is accepting applications for its closed Alpha.
        </p>

        <p className="mt-5 text-sm leading-7 text-[rgb(var(--sep-colour-8f8271))]">
          Applications are reviewed individually and invitations are limited.{" "}
          <span className="text-[rgb(var(--sep-colour-c8a46e))]">
            <u>
              The first 50 accepted Alpha players will also receive exclusive Early Alpha features, on successful Character creation.
            </u>
          </span>{" "}
          <button
            type="button"
            onClick={() =>
              setInfoOpen(true)
            }
            className="text-[rgb(var(--sep-colour-d0aa72))] underline decoration-[rgb(var(--sep-colour-725636))] underline-offset-4 transition hover:text-[rgb(var(--sep-colour-efd5a7))]"
          >
            Learn more
          </button>
          .
        </p>
      </div>

      {infoOpen ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="alpha-rewards-title"
          onMouseDown={(event) => {
            if (
              event.currentTarget ===
              event.target
            ) {
              setInfoOpen(false);
            }
          }}
        >
          <div className="max-h-[90dvh] w-full max-w-4xl overflow-hidden border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-120d09))] shadow-2xl">
            <div className="flex items-start justify-between gap-5 border-b border-[rgb(var(--sep-colour-60482e))]/35 px-5 py-4 sm:px-7">
              <div>
                <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8b704e))]">
                  Early Alpha
                </p>

                <h2
                  id="alpha-rewards-title"
                  className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-e2cda4))]"
                >
                  First 50 Player Features
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setInfoOpen(false)
                }
                className="text-xl text-[rgb(var(--sep-colour-9b876a))] hover:text-[rgb(var(--sep-colour-e0c99d))]"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <iframe
              src="/early-alpha-rewards"
              title="Early Alpha rewards"
              className="h-[72dvh] w-full border-0 bg-[rgb(var(--sep-colour-090706))]"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}