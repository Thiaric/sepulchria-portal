"use client";

import {
  type ReactNode,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  getWarpingPriceDefinition,
  getWarpingPriceDefinitionFromText,
} from "@/lib/warping/price-definitions";

function formatExpiry(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function PriceTooltip({
  priceKey,
  displayText,
  expiresAt,
  children,
  className = "",
}: {
  priceKey?: string | null;
  displayText?: string | null;
  expiresAt?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const price =
    getWarpingPriceDefinition(priceKey) ??
    getWarpingPriceDefinitionFromText(displayText);

  const triggerRef =
    useRef<HTMLSpanElement>(null);

  const [open, setOpen] =
    useState(false);

  const [position, setPosition] =
    useState<{
      top: number;
      left: number;
    } | null>(null);

  if (!price) {
    return <>{children}</>;
  }

  function showTooltip() {
    const trigger =
      triggerRef.current;

    if (!trigger) {
      return;
    }

    const rect =
      trigger.getBoundingClientRect();

    const tooltipWidth = 280;

    // Approximate tooltip height.
    // Enough for name, stage, expiry and description.
    const tooltipHeight =
      expiresAt ? 145 : 125;

    const gap = 8;

    const spaceAbove =
      rect.top;

    const spaceBelow =
      window.innerHeight -
      rect.bottom;

    const openBelow =
      spaceAbove < tooltipHeight + gap &&
      spaceBelow > spaceAbove;

    let top = openBelow
      ? rect.bottom + gap
      : rect.top -
        tooltipHeight -
        gap;

    // Never leave the viewport vertically.
    top = Math.max(
      8,
      Math.min(
        top,
        window.innerHeight -
          tooltipHeight -
          8,
      ),
    );

    let left =
      rect.left +
      rect.width / 2 -
      tooltipWidth / 2;

    // Never leave the viewport horizontally.
    left = Math.max(
      8,
      Math.min(
        left,
        window.innerWidth -
          tooltipWidth -
          8,
      ),
    );

    setPosition({
      top,
      left,
    });

    setOpen(true);
  }

  function hideTooltip() {
    setOpen(false);
  }

  return (
    <>
      <span
        ref={triggerRef}
        className={`inline-flex cursor-help ${className}`}
        tabIndex={0}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </span>

      {open &&
      position &&
      typeof document !==
        "undefined"
        ? createPortal(
            <span
              role="tooltip"
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                width: "280px",
              }}
              className="pointer-events-none z-[9999] border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-0b0806))] px-3 py-2.5 text-left normal-case tracking-normal shadow-xl"
            >
              <span className="block font-serif text-[12px] text-[rgb(var(--sep-colour-dec89f))]">
                {price.name}
              </span>

              <span className="mt-1 block text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-b99765))]">
                Stage{" "}
                {price.stageLabel} ·{" "}
                {price.durationDays} days
              </span>

              {expiresAt ? (
                <span className="mt-1 block text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d9b77f))]">
                  Expires{" "}
                  {formatExpiry(
                    expiresAt,
                  )}
                </span>
              ) : null}

              <span className="mt-2 block text-[9px] leading-4 text-[rgb(var(--sep-colour-b9aa94))]">
                {price.manifestation}
              </span>
            </span>,
            document.body,
          )
        : null}
    </>
  );
}