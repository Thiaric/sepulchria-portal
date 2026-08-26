"use client";

import {
  useState,
} from "react";

import {
  RichTextContentClient,
} from "@/components/editor/rich-text-content-client";

export function ShapeExtendedDescription({
  body,
}: {
  body: string;
}) {
  const [
    expanded,
    setExpanded,
  ] = useState(false);

  if (!body?.trim()) {
    return null;
  }

  return (
    <div className="mt-2">
      <button
  type="button"
  aria-expanded={expanded}
  onClick={() =>
    setExpanded(
      (current) =>
        !current,
    )
  }
  className="group flex w-full items-center gap-3 py-1.5"
>
  <span className="h-px flex-1 bg-[rgb(var(--sep-colour-60482e))]/45 transition group-hover:bg-[rgb(var(--sep-colour-8d6d3e))]/65" />

  <span className="inline-flex shrink-0 items-center gap-1.5 text-[7px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-a88d67))] transition group-hover:text-[rgb(var(--sep-colour-d3b278))]">
    {expanded
      ? "Show Less Info"
      : "Show More Info"}

    <span
      aria-hidden="true"
      className={`inline-block transition-transform ${
        expanded
          ? "rotate-180"
          : ""
      }`}
    >
      ▼
    </span>
  </span>

  <span className="h-px flex-1 bg-[rgb(var(--sep-colour-60482e))]/45 transition group-hover:bg-[rgb(var(--sep-colour-8d6d3e))]/65" />
</button>

      {expanded ? (
        <div className="mt-2 border-l-2 border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120e0b))]/55 px-3 py-2.5">
          <RichTextContentClient
            body={body}
            className="
              text-[10px]
              leading-5
              text-[rgb(var(--sep-colour-b9aa94))]
              [&_p]:my-1.5
              [&_div]:my-1.5
              [&_h1]:my-2
              [&_h1]:text-lg
              [&_h2]:my-2
              [&_h2]:text-base
              [&_h3]:my-2
              [&_h3]:text-sm
              [&_h4]:my-2
              [&_h4]:text-xs
              [&_blockquote]:my-2
              [&_blockquote]:pl-3
              [&_ul]:my-2
              [&_ul]:pl-5
              [&_ol]:my-2
              [&_ol]:pl-5
              [&_img]:my-2
              [&_img]:max-h-[360px]
              [&_table]:text-[9px]
            "
          />
        </div>
      ) : null}
    </div>
  );
}
