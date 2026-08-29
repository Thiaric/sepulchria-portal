import type { ReactNode } from "react";
import { RichTextContent } from "@/components/editor/rich-text-content";
import Link from "next/link";
import { ImagePreviewButton } from "@/components/world/image-preview-button";

type CodexEntryHeroProps = {
  name: string;
  summary: string;
  description: string;
  bannerUrl: string | null;
  imageUrl: string | null;
  iconUrl: string | null;
  colour: string | null;
  categoryLabel: string;
  returnHref: string;
  returnLabel: string;
  betweenHeroAndRecord?: ReactNode;
  recordReplacement?: ReactNode;
};

export function CodexEntryHero({
  name,
  summary,
  description,
  bannerUrl,
  imageUrl,
  iconUrl,
  colour,
  categoryLabel,
  returnHref,
  returnLabel,
  betweenHeroAndRecord,
  recordReplacement,
}: CodexEntryHeroProps) {
  const accentColour = colour ?? "#8a6840";
  const heroImage = bannerUrl ?? imageUrl;

  return (
    <article data-sep-interaction-ignore="true" className="space-y-5">
      <Link
        href={returnHref}
        className="inline-flex items-center gap-2 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c6ab80))] transition hover:border-[rgb(var(--sep-colour-987344))] hover:bg-[rgb(var(--sep-colour-261b12))] hover:text-[rgb(var(--sep-colour-ead2a5))]"
      >
        <span aria-hidden="true">←</span>
        {returnLabel}
      </Link>

      <section
        data-sep-interaction-ignore="true"
        className="relative overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-110d0a))]"
        style={{
          boxShadow: `inset 0 4px 0 ${accentColour}`,
        }}
      >
        <div className="relative min-h-[360px] overflow-hidden">
          {heroImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-45"
              />

              <ImagePreviewButton
                src={heroImage}
                name={name}
              />

              <div className="absolute inset-0 bg-gradient-to-r from-[rgb(var(--sep-colour-100c09))] via-[rgb(var(--sep-colour-100c09))]/90 to-[rgb(var(--sep-colour-100c09))]/35" />
              <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--sep-colour-100c09))] via-transparent to-black/30" />
            </>
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at top right, ${accentColour}55 0%, #17100c 42%, #0d0907 100%)`,
              }}
            />
          )}

          <div className="relative flex min-h-[360px] items-end p-6 sm:p-8 lg:p-10">
            <div className="w-full">
              <div className="flex flex-wrap items-center gap-4">
                <div
                  className="flex h-20 w-20 items-center justify-center overflow-hidden border bg-[rgb(var(--sep-colour-100c09))]/90"
                  style={{
                    borderColor: `${accentColour}bb`,
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
                      className="font-serif text-4xl"
                      style={{ color: accentColour }}
                    >
                      {name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>

                <div>
                  <p
                    className="text-[10px] uppercase tracking-[0.3em]"
                    style={{ color: accentColour }}
                  >
                    {categoryLabel}
                  </p>

                  <h1 className="mt-2 font-serif text-4xl leading-tight text-[rgb(var(--sep-colour-ead6ad))] sm:text-5xl lg:text-6xl">
                    {name}
                  </h1>
                </div>
              </div>

              {summary ? (
                <RichTextContent
                  body={summary}
                  className="mt-6 w-full font-serif text-sm leading-7 text-[rgb(var(--sep-colour-c7b494))] sm:text-base"
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div data-sep-interaction-ignore="true">
        {betweenHeroAndRecord}
      </div>

      <div data-sep-interaction-ignore="true">
      {recordReplacement ?? (
      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <span
            className="h-px flex-1"
            style={{
              background: `linear-gradient(to right, ${accentColour}, transparent)`,
            }}
          />

          <p className="text-[9px] uppercase tracking-[0.3em] text-[rgb(var(--sep-colour-8d7759))]">
            Codex record
          </p>

          <span
            className="h-px flex-1"
            style={{
              background: `linear-gradient(to left, ${accentColour}, transparent)`,
            }}
          />
        </div>

        {description?.trim() ? (
          <RichTextContent
            body={description}
            className="mt-7 w-full text-sm leading-8 text-[rgb(var(--sep-colour-b9aa96))] sm:text-[15px]"
          />
        ) : (
          <p className="mx-auto mt-7 max-w-3xl text-center text-sm leading-7 text-[rgb(var(--sep-colour-8f8373))]">
            A complete description has not yet been added to this Codex entry.
          </p>
        )}
      </section>
      )}
      </div>
    </article>
  );
}