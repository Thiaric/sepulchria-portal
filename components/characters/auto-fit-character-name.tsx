"use client";

import {
  type ReactNode,
  useLayoutEffect,
  useRef,
} from "react";

type AutoFitCharacterNameProps = {
  characterId?: string;
  children: ReactNode;
  className?: string;
  minFontSizePx?: number;
};

export function AutoFitCharacterName({
  characterId,
  children,
  className,
  minFontSizePx = 12,
}: AutoFitCharacterNameProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    const heading = headingRef.current;
    const text = textRef.current;

    if (!heading || !text) {
      return;
    }

    const row = heading.parentElement;

    if (!row) {
      return;
    }

    const headingElement: HTMLHeadingElement = heading;
    const textElement: HTMLSpanElement = text;
    const rowElement: HTMLElement = row;

    let frame = 0;

    const fit = () => {
      window.cancelAnimationFrame(frame);

      frame = window.requestAnimationFrame(() => {
        // Always begin from the normal CSS/Tailwind size.
        headingElement.style.removeProperty("font-size");

        const headingStyle = window.getComputedStyle(headingElement);
        const rowStyle = window.getComputedStyle(rowElement);

        const originalFontSize =
          Number.parseFloat(headingStyle.fontSize) || 16;

        const gap =
          Number.parseFloat(
            rowStyle.columnGap || rowStyle.gap || "0",
          ) || 0;

        const sibling = headingElement.nextElementSibling;
        const trophies =
          sibling instanceof HTMLElement ? sibling : null;

        const trophiesWidth = trophies
          ? trophies.getBoundingClientRect().width
          : 0;

        const availableWidth = Math.max(
          1,
          rowElement.clientWidth -
            trophiesWidth -
            (trophiesWidth > 0 ? gap : 0),
        );

        const textWidth =
          textElement.getBoundingClientRect().width;

        const horizontalPadding =
          (Number.parseFloat(headingStyle.paddingLeft) || 0) +
          (Number.parseFloat(headingStyle.paddingRight) || 0);

        const crestReserve =
          headingElement.dataset.hasProfileCrest === "true"
            ? 18
            : 0;

        const requiredWidth =
          textWidth + horizontalPadding + crestReserve;

        // If it fits normally, leave the normal size untouched.
        if (requiredWidth <= availableWidth) {
          return;
        }

        const fittedSize = Math.max(
          minFontSizePx,
          Math.min(
            originalFontSize,
            originalFontSize *
              (availableWidth / requiredWidth) *
              0.985,
          ),
        );

        headingElement.style.fontSize = `${fittedSize}px`;
      });
    };

    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(rowElement);

    const sibling = headingElement.nextElementSibling;
    if (sibling instanceof HTMLElement) {
      resizeObserver.observe(sibling);
    }

    const mutationObserver = new MutationObserver(fit);
    mutationObserver.observe(headingElement, {
      attributes: true,
      attributeFilter: [
        "data-has-nameplate",
        "data-has-profile-crest",
      ],
    });

    fit();

    if ("fonts" in document) {
      void document.fonts.ready.then(fit);
    }

    window.addEventListener("resize", fit);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [children, minFontSizePx]);

  return (
    <h1
      ref={headingRef}
      data-cosmetic-character-id={characterId}
      data-cosmetic-surface="nameplate"
      className={[(([
        "min-w-0 whitespace-nowrap font-serif",
        className ?? "",
      ].join(" "))), "components_characters_auto_fit_character_name_h1_title"].filter(Boolean).join(" ")}
    >
      <span
        ref={textRef}
        className="inline-block whitespace-nowrap components_characters_auto_fit_character_name_span_text"
      >
        {children}
      </span>
    </h1>
  );
}
