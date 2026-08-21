import { CodexEntryImageLightbox } from "@/components/codex/codex-entry-image-lightbox";
import { RichTextContent } from "@/components/editor/rich-text-content";
import {
  stripRichTextForPreview,
} from "@/lib/rich-text-shared";
import type { ReactNode } from "react";
import Link from "next/link";

type CodexEntryCardProps = {
  name: string;
  slug: string;
  summary: string;
  hrefBase: string;
  imageUrl: string | null;
  iconUrl: string | null;
  colour: string | null;
  categoryLabel: string;
  anchorId?: string;
  enableImagePreview?: boolean;
  expandedExtra?: ReactNode;
};

function makePreview(
  value: string,
  maxLength = 145,
) {
  const plain =
    stripRichTextForPreview(value)
      .replace(/\s+/g, " ")
      .trim();

  if (
    plain.length <= maxLength
  ) {
    return plain;
  }

  const shortened =
    plain.slice(0, maxLength);

  const lastSpace =
    shortened.lastIndexOf(" ");

  return `${
    lastSpace > 80
      ? shortened.slice(
          0,
          lastSpace,
        )
      : shortened
  }…`;
}

export function CodexEntryCard({
  name,
  slug,
  summary,
  hrefBase,
  imageUrl,
  iconUrl,
  colour,
  categoryLabel,
  anchorId,
  enableImagePreview = false,
  expandedExtra,
}: CodexEntryCardProps) {
  const accentColour =
    colour ?? "#8a6840";

  const preview =
    summary
      ? makePreview(summary)
      : "";

  return (
    <article
      id={anchorId}
      className="group relative flex scroll-mt-6 flex-col overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-15100d))] transition duration-300 hover:-translate-y-1 hover:border-[rgb(var(--sep-colour-9a7344))]/80 hover:shadow-[0_20px_45px_rgba(var(--sep-rgb-0-0-0),0.35)]"
      style={{
        boxShadow: `inset 0 3px 0 ${accentColour}`,
      }}
    >
      <div className="relative h-44 overflow-hidden border-b border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-0d0a08))]">
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105 group-hover:opacity-90"
            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgb(var(--sep-colour-15100d))] via-transparent to-black/20" />

            {enableImagePreview ? (
              <CodexEntryImageLightbox
                src={imageUrl}
                name={name}
              />
            ) : null}
          </>
        ) : (
          <div
            className="absolute inset-0 opacity-60"
            style={{
              background: `radial-gradient(circle at top, ${accentColour}55 0%, #17100c 45%, #0d0907 100%)`,
            }}
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 p-5">
          <div>
  <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-ead6ad))]">
    {name}
  </h2>
</div>

          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border bg-[rgb(var(--sep-colour-100c09))]/90"
            style={{
              borderColor: `${accentColour}aa`,
            }}
          >
            {iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={iconUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                className="font-serif text-2xl"
                style={{
                  color:
                    accentColour,
                }}
              >
                {name
                  .slice(0, 1)
                  .toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col p-5">
        {summary ? (
          <details className="group/details">
            <div className="group-open/details:hidden">
              <p className="text-sm leading-6 text-[rgb(var(--sep-colour-a99b89))]">
                {preview}
              </p>
            </div>

            <div className="hidden group-open/details:block">
              <RichTextContent
                body={summary}
                className="text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]"
              />

              {expandedExtra}
            </div>

            <summary className="mt-3 cursor-pointer list-none text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-b88d54))] transition hover:text-[rgb(var(--sep-colour-e0bb7f))]">
              <span className="group-open/details:hidden">
                Read more ↓
              </span>

              <span className="hidden group-open/details:inline">
                Show less ↑
              </span>
            </summary>
          </details>
        ) : (
          <p className="text-sm leading-6 text-[rgb(var(--sep-colour-a99b89))]">
            No summary is currently
            available.
          </p>
        )}

        <Link
          href={`${hrefBase}/${slug}`}
          className="mt-5 inline-flex items-center justify-between border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-271c12))] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-dfc79c))] transition hover:border-[rgb(var(--sep-colour-a17a45))] hover:bg-[rgb(var(--sep-colour-3b2919))]"
        >
          <span>
            Open full entry
          </span>

          <span aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </article>
  );
}