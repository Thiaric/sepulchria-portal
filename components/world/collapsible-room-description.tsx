"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  RichTextContentClient,
} from "@/components/editor/rich-text-content-client";
import {
  stripRichTextForPreview,
} from "@/lib/rich-text-shared";

const PREVIEW_LENGTH = 350;

export function CollapsibleRoomDescription({
  body,
}: {
  body: string;
}) {
  const [expanded, setExpanded] =
    useState(false);

  const plainText =
    useMemo(
      () =>
        stripRichTextForPreview(
          body,
        )
          .replace(
            /\[Image\]/gi,
            "",
          )
          .replace(
            /\s+/g,
            " ",
          )
          .trim(),
      [body],
    );

  const needsToggle =
    plainText.length >
    PREVIEW_LENGTH;

  const preview =
    needsToggle
      ? `${plainText.slice(
          0,
          PREVIEW_LENGTH,
        ).trimEnd()}…`
      : plainText;

  if (!needsToggle) {
    return (
      <RichTextContentClient
        body={body}
        className="mt-1 text-[11px] leading-5 text-[rgb(var(--sep-colour-9e907d))] [&_p]:m-0 [&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-xs [&_img]:hidden [&_table]:hidden"
      />
    );
  }

  return (
    <div className="mt-1">
      {expanded ? (
        <RichTextContentClient
          body={body}
          className="text-[11px] leading-5 text-[rgb(var(--sep-colour-9e907d))] [&_p]:m-0 [&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-xs"
        />
      ) : (
        <p className="text-[11px] leading-5 text-[rgb(var(--sep-colour-9e907d))]">
          {preview}
        </p>
      )}

      <button
        type="button"
        onClick={() =>
          setExpanded(
            (current) =>
              !current,
          )
        }
        className="mt-2 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-b28b55))] transition hover:text-[rgb(var(--sep-colour-efd4a0))]"
        aria-expanded={
          expanded
        }
      >
        {expanded
          ? "Show less"
          : "Show more"}
      </button>
    </div>
  );
}