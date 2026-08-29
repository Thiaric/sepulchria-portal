"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { RichTextContentClient } from "@/components/editor/rich-text-content-client";
import type { PublicCodexChapter } from "@/lib/codex/get-codex";

type PublicCodexProps = {
  chapters: PublicCodexChapter[];
  embedded?: boolean;
};

const ROMAN_NUMERALS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
];

export function PublicCodex({
  chapters,
  embedded = false,
}: PublicCodexProps) {
  const orderedChapters = useMemo(
    () =>
      [...chapters].sort(
        (a, b) =>
          a.sort_order -
            b.sort_order ||
          a.chapter_number -
            b.chapter_number,
      ),
    [chapters],
  );

  const [
    selectedNumber,
    setSelectedNumber,
  ] = useState(() => {
    if (
      typeof window === "undefined"
    ) {
      return (
        orderedChapters[0]
          ?.chapter_number ?? 1
      );
    }

    const match =
      window.location.hash.match(
        /^#chapter-(\d+)$/,
      );

    const fromHash = match
      ? Number(match[1])
      : NaN;

    return orderedChapters.some(
      (chapter) =>
        chapter.chapter_number ===
        fromHash,
    )
      ? fromHash
      : (orderedChapters[0]
          ?.chapter_number ?? 1);
  });

  const selectedChapter =
    orderedChapters.find(
      (chapter) =>
        chapter.chapter_number ===
        selectedNumber,
    ) ??
    orderedChapters[0] ??
    null;

  useEffect(() => {
    if (!selectedChapter) {
      return;
    }

    const hash =
      `#chapter-${selectedChapter.chapter_number}`;

    if (
      window.location.hash !== hash
    ) {
      window.history.replaceState(
        null,
        "",
        hash,
      );
    }
  }, [selectedChapter]);

  function selectChapter(
    chapter: PublicCodexChapter,
    scrollToNavigation = false,
  ) {
    setSelectedNumber(
      chapter.chapter_number,
    );

    window.history.replaceState(
      null,
      "",
      `#chapter-${chapter.chapter_number}`,
    );

    /*
     * Only Previous / Next use this.
     *
     * Clicking I, II, III, etc. above does
     * NOT change the current scroll position.
     */
    if (scrollToNavigation) {
      window.requestAnimationFrame(
        () => {
          if (embedded) {
            document
              .getElementById(
                "codex-chapter-scroll",
              )
              ?.scrollTo({
                top: 0,
                behavior: "smooth",
              });

            return;
          }

          document
            .getElementById(
              "codex-chapter-navigation",
            )
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
        },
      );
    }
  }

  if (
    orderedChapters.length === 0
  ) {
    return (
      <main
        className={
          embedded
            ? "h-full min-h-0 overflow-y-auto bg-[rgb(var(--sep-colour-090705))] px-5 py-8 text-[rgb(var(--sep-colour-d6c3a3))]"
            : "min-h-screen bg-[rgb(var(--sep-colour-090705))] px-5 py-8 text-[rgb(var(--sep-colour-d6c3a3))]"
        }
      >
        <div className="mx-auto max-w-7xl border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-120e0b))] p-6 text-center">
          <h1 className="font-serif text-3xl text-[rgb(var(--sep-colour-ead5ac))]">
            The Codex of the First
          </h1>

          <p className="mt-2 text-sm text-[rgb(var(--sep-colour-9e907d))]">
            No published Codex chapters
            are available yet.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className={
        embedded
          ? "flex h-full min-h-0 flex-col overflow-hidden bg-[rgb(var(--sep-colour-090705))] text-[rgb(var(--sep-colour-d6c3a3))]"
          : "min-h-screen bg-[rgb(var(--sep-colour-090705))] text-[rgb(var(--sep-colour-d6c3a3))]"
      }
    >
      {/* COMPACT CODEX HEADER */}
      <header
        className={[
          "border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-0d0a08))]",
          embedded ? "shrink-0" : "",
        ].join(" ")}
      >
        <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div>
              <p className="text-[7px] uppercase tracking-[0.32em] text-[rgb(var(--sep-colour-92734d))]">
                Aureth · Public Record
              </p>

              <h1 className="mt-1 font-serif text-3xl leading-none text-[rgb(var(--sep-colour-ead5ac))] sm:text-4xl">
                The Codex of the First
              </h1>
            </div>

            <p className="max-w-xl text-xs leading-5 text-[rgb(var(--sep-colour-8f8271))] sm:text-right">
              Ten chapters preserving
              the known history and lore
              of Aureth.
            </p>
          </div>
        </div>
      </header>

      {/* CHAPTER NAVIGATION */}
      <div
        id="codex-chapter-navigation"
        className={[
          "scroll-mt-4 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))]",
          embedded ? "shrink-0" : "",
        ].join(" ")}
      >
        <nav
          aria-label="Codex chapters"
          className="mx-auto grid max-w-7xl grid-cols-5 px-3 sm:grid-cols-10 sm:px-5"
        >
          {orderedChapters.map(
            (chapter) => {
              const active =
                selectedChapter?.id ===
                chapter.id;

              return (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() =>
                    selectChapter(
                      chapter,
                      false,
                    )
                  }
                  title={`Chapter ${chapter.chapter_number}: ${chapter.title}`}
                  className={`h-10 border-x border-[rgb(var(--sep-colour-4c3926))]/25 px-1 font-serif text-sm transition ${
                    active
                      ? "bg-[rgb(var(--sep-colour-2b1f14))] text-[rgb(var(--sep-colour-e6c68f))]"
                      : "text-[rgb(var(--sep-colour-796342))] hover:bg-[rgb(var(--sep-colour-19120d))] hover:text-[rgb(var(--sep-colour-c9ad7c))]"
                  }`}
                >
                  {
                    ROMAN_NUMERALS[
                      chapter.chapter_number -
                        1
                    ]
                  }
                </button>
              );
            },
          )}
        </nav>
      </div>

      {selectedChapter ? (
        <article
          id="codex-chapter"
          className={
            embedded
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : undefined
          }
        >
          {/* CHAPTER TITLE */}
          <section
            className={[
              "border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))]",
              embedded ? "shrink-0" : "",
            ].join(" ")}
          >
            <div className="mx-auto max-w-7xl px-5 py-5 sm:px-8">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
                <p className="shrink-0 text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-997446))]">
                  Chapter{" "}
                  {
                    ROMAN_NUMERALS[
                      selectedChapter.chapter_number -
                        1
                    ]
                  }
                </p>

                <h2 className="font-serif text-2xl leading-tight text-[rgb(var(--sep-colour-ead5ac))] sm:text-3xl">
                  {
                    selectedChapter.title
                  }
                </h2>
              </div>

            </div>
          </section>

          {/* CHAPTER CONTENT */}
          <section
            id={
              embedded
                ? "codex-chapter-scroll"
                : undefined
            }
            className={
              embedded
                ? "mx-auto min-h-0 w-full max-w-7xl flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8"
                : "mx-auto max-w-7xl px-5 py-5 sm:px-8"
            }
          >
            <div className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-120e0b))] px-5 py-6 sm:px-8 sm:py-7">
              {selectedChapter.body?.trim() ? (
                <RichTextContentClient
                  body={
                    selectedChapter.body
                  }
                  className="mx-auto max-w-5xl text-[15px] leading-8 text-[rgb(var(--sep-colour-c0af95))] [&_h1]:mt-8 [&_h1]:font-serif [&_h1]:text-3xl [&_h1]:text-[rgb(var(--sep-colour-e2cba0))] [&_h2]:mt-7 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-[rgb(var(--sep-colour-dec69c))] [&_h3]:mt-6 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:text-[rgb(var(--sep-colour-d2b98e))] [&_p]:mb-4"
                />
              ) : (
                <div className="py-8 text-center">
                  <p className="font-serif text-lg text-[rgb(var(--sep-colour-a9916e))]">
                    This chapter has no
                    published content.
                  </p>

                  <p className="mt-1 text-xs text-[rgb(var(--sep-colour-756b5e))]">
                    Staff can add content
                    from Codex administration.
                  </p>
                </div>
              )}
            </div>

            <ChapterFooterNavigation
              chapters={
                orderedChapters
              }
              current={
                selectedChapter
              }
              onSelect={
                selectChapter
              }
            />
          </section>
        </article>
      ) : null}
    </main>
  );
}

function ChapterFooterNavigation({
  chapters,
  current,
  onSelect,
}: {
  chapters: PublicCodexChapter[];
  current: PublicCodexChapter;
  onSelect: (
    chapter: PublicCodexChapter,
    scrollToNavigation?: boolean,
  ) => void;
}) {
  const currentIndex =
    chapters.findIndex(
      (chapter) =>
        chapter.id === current.id,
    );

  const previous =
    currentIndex > 0
      ? chapters[
          currentIndex - 1
        ]
      : null;

  const next =
    currentIndex <
    chapters.length - 1
      ? chapters[
          currentIndex + 1
        ]
      : null;

  return (
    <div className="mt-3 flex items-stretch justify-between gap-3">
      {previous ? (
        <button
          type="button"
          onClick={() =>
            onSelect(
              previous,
              true,
            )
          }
          className="min-w-0 flex-1 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-left transition hover:border-[rgb(var(--sep-colour-85633a))] hover:bg-[rgb(var(--sep-colour-19120d))]"
        >
          <span className="block text-[7px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-756550))]">
            ← Previous
          </span>

          <span className="mt-1 block truncate font-serif text-sm text-[rgb(var(--sep-colour-bca47e))]">
            {previous.title}
          </span>
        </button>
      ) : (
        <div className="flex-1" />
      )}

      {next ? (
        <button
          type="button"
          onClick={() =>
            onSelect(
              next,
              true,
            )
          }
          className="min-w-0 flex-1 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-right transition hover:border-[rgb(var(--sep-colour-85633a))] hover:bg-[rgb(var(--sep-colour-19120d))]"
        >
          <span className="block text-[7px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-756550))]">
            Next →
          </span>

          <span className="mt-1 block truncate font-serif text-sm text-[rgb(var(--sep-colour-bca47e))]">
            {next.title}
          </span>
        </button>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}