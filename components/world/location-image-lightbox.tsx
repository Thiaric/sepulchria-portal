"use client";

import {
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { useLocationImageSource } from "@/components/world/location-atmospheric-image";

type LocationImageLightboxProps = {
  src: string;
  name: string;
};

export function LocationImageLightbox({
  src,
  name,
}: LocationImageLightboxProps) {
  const atmosphericSrc =
    useLocationImageSource(src);

  const [open, setOpen] =
    useState(false);

  const [mounted, setMounted] =
    useState(false);

  const [
    fallbackToBase,
    setFallbackToBase,
  ] = useState(false);

  useEffect(() => {
    setMounted(true);

    return () => {
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    setFallbackToBase(false);
  }, [atmosphericSrc]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

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
  }, [open]);

  const displayedSrc =
    fallbackToBase
      ? src
      : atmosphericSrc;

  const modal =
    mounted && open
      ? createPortal(
          <div
            data-sep-interaction-ignore="true"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-[3px] sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-label={`${name} image preview`}
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setOpen(false);
              }
            }}
          >
            <div className="relative flex max-h-[92vh] w-full max-w-6xl items-center justify-center border border-[rgb(var(--sep-skin-c1,var(--sep-colour-745633)))] bg-[rgb(var(--sep-colour-090705))] p-2 shadow-[0_30px_100px_rgba(var(--sep-rgb-0-0-0),0.95)] sm:p-3">
              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center border border-[rgb(var(--sep-skin-c1,var(--sep-colour-8b673d)))] bg-[rgb(var(--sep-colour-100c09))]/95 text-xl text-[rgb(var(--sep-skin-c2,var(--sep-colour-d7b47d)))]] shadow-[0_5px_18px_rgba(var(--sep-rgb-0-0-0),0.7)] transition hover:border-[rgb(var(--sep-skin-c2,var(--sep-colour-c18c4e)))] hover:bg-[rgb(var(--sep-colour-25180f))] hover:text-[rgb(var(--sep-colour-f0d6a7))]"
                aria-label="Close image preview"
                title="Close"
              >
                ×
              </button>

              <div className="flex max-h-[calc(92vh-1.5rem)] min-h-[240px] w-full items-center justify-center overflow-hidden bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={displayedSrc}
                  src={displayedSrc}
                  alt={`${name} preview`}
                  className="max-h-[calc(92vh-1.5rem)] max-w-full object-contain"
                  onError={() => {
                    if (
                      displayedSrc !== src
                    ) {
                      setFallbackToBase(true);
                    }
                  }}
                />
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        data-sep-interaction-ignore="true"
        onClick={() =>
          setOpen(true)
        }
        className="group/image absolute inset-0 z-10 cursor-zoom-in"
        aria-label={`View ${name} image`}
        title={`View ${name} image`}
      >
        <span data-sep-round-zoom-indicator="true" className="pointer-events-none absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-[rgb(var(--sep-skin-c1,var(--sep-colour-c69a60)))]/55 bg-[rgb(var(--sep-colour-100c09))]/75 text-[rgb(var(--sep-skin-c2,var(--sep-colour-d8b57e)))] opacity-0 shadow-[0_4px_14px_rgba(var(--sep-rgb-0-0-0),0.45)] backdrop-blur-sm transition group-hover/image:opacity-100">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle
              cx="10.5"
              cy="10.5"
              r="5.5"
            />
            <path d="m14.7 14.7 4.1 4.1" />
            <path d="M10.5 8v5" />
            <path d="M8 10.5h5" />
          </svg>
        </span>
      </button>

      {modal}
    </>
  );
}
