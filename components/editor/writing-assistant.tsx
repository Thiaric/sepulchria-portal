"use client";

import {
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from "react";

export type WritingIssue = {
  word: string;
  suggestions: string[];
};

const SPELLING_HIGHLIGHT_NAME =
  "sepulchria-spelling-error";

function escapeRegex(
  value: string,
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function issuePattern(
  issues: WritingIssue[],
) {
  const words = Array.from(
    new Set(
      issues
        .map((issue) =>
          issue.word.trim(),
        )
        .filter(Boolean),
    ),
  ).sort(
    (a, b) =>
      b.length - a.length,
  );

  if (words.length === 0) {
    return null;
  }

  const alternatives =
    words
      .map(escapeRegex)
      .join("|");

  return new RegExp(
    `(^|[^\\p{L}’'-])(${alternatives})(?=$|[^\\p{L}’'-])`,
    "giu",
  );
}

/**
 * Checks the draft against Sepulchria's existing British-English
 * spelling API. Nothing is rendered by this hook.
 */
export function useSpellingIssues(
  text: string,
  disabled = false,
) {
  const [issues, setIssues] =
    useState<WritingIssue[]>([]);

  useEffect(() => {
    if (
      disabled ||
      text.trim().length < 3
    ) {
      setIssues([]);
      return;
    }

    const controller =
      new AbortController();

    const timer =
      window.setTimeout(
        async () => {
          try {
            const response =
              await fetch(
                "/api/writing-assistant/spelling",
                {
                  method: "POST",
                  credentials:
                    "same-origin",
                  cache: "no-store",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body: JSON.stringify({
                    text,
                  }),
                  signal:
                    controller.signal,
                },
              );

            /*
             * Do not erase the last valid spelling result because of a
             * transient auth/routing/network response. The next normal
             * debounce will refresh the result.
             */
            if (
              !response.ok ||
              response.redirected
            ) {
              return;
            }

            const contentType =
              response.headers.get(
                "content-type",
              ) ?? "";

            if (
              !contentType.includes(
                "application/json",
              )
            ) {
              return;
            }

            const result =
              (await response.json()) as {
                issues?: WritingIssue[];
              };

            setIssues(
              Array.isArray(
                result.issues,
              )
                ? result.issues
                : [],
            );
          } catch (error) {
            if (
              error instanceof
                DOMException &&
              error.name ===
                "AbortError"
            ) {
              return;
            }

            /*
             * Keep the previous successful spelling result on a transient
             * failure. A later request will refresh it.
             */
          }
        },
        550,
      );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [disabled, text]);

  return issues;
}

/**
 * Underlines misspellings directly inside a contentEditable editor using
 * the CSS Custom Highlight API.
 *
 * Crucially, this does NOT insert spans or alter editor.innerHTML, so the
 * spelling marks can never be saved into forum posts or private messages.
 */
export function useRichTextSpellingHighlights(
  editorRef:
    RefObject<HTMLDivElement | null>,
  issues: WritingIssue[],
  disabled = false,
) {
  useEffect(() => {
    const editor =
      editorRef.current;

    const highlightRegistry =
      (
        CSS as unknown as {
          highlights?: {
            set: (
              name: string,
              value: unknown,
            ) => void;
            delete: (
              name: string,
            ) => boolean;
          };
        }
      ).highlights;

    const HighlightConstructor =
      (
        globalThis as unknown as {
          Highlight?: new (
            ...ranges: Range[]
          ) => unknown;
        }
      ).Highlight;

    if (
      !editor ||
      !highlightRegistry ||
      !HighlightConstructor
    ) {
      return;
    }

    highlightRegistry.delete(
      SPELLING_HIGHLIGHT_NAME,
    );

    if (
      disabled ||
      issues.length === 0
    ) {
      return;
    }

    const pattern =
      issuePattern(issues);

    if (!pattern) {
      return;
    }

    const ranges: Range[] = [];

    const walker =
      document.createTreeWalker(
        editor,
        NodeFilter.SHOW_TEXT,
      );

    let current =
      walker.nextNode();

    while (current) {
      const value =
        current.nodeValue ?? "";

      pattern.lastIndex = 0;

      let match:
        | RegExpExecArray
        | null;

      while (
        (
          match =
            pattern.exec(value)
        ) !== null
      ) {
        const prefix =
          match[1] ?? "";

        const word =
          match[2] ?? "";

        if (!word) {
          continue;
        }

        const start =
          match.index +
          prefix.length;

        const end =
          start + word.length;

        const range =
          document.createRange();

        range.setStart(
          current,
          start,
        );

        range.setEnd(
          current,
          end,
        );

        ranges.push(range);

        if (
          match.index ===
          pattern.lastIndex
        ) {
          pattern.lastIndex += 1;
        }
      }

      current =
        walker.nextNode();
    }

    if (ranges.length > 0) {
      highlightRegistry.set(
        SPELLING_HIGHLIGHT_NAME,
        new HighlightConstructor(
          ...ranges,
        ),
      );
    }

    return () => {
      highlightRegistry.delete(
        SPELLING_HIGHLIGHT_NAME,
      );
    };
  }, [
    disabled,
    editorRef,
    issues,
  ]);
}

/**
 * Mirror layer for a real <textarea>.
 * The textarea keeps all normal input/caret/selection behaviour.
 * This layer is pointer-events:none and draws ONLY the red squiggle.
 */
export function SpellingTextareaOverlay({
  text,
  issues,
  scrollTop = 0,
}: {
  text: string;
  issues: WritingIssue[];
  scrollTop?: number;
}) {
  const pattern = useMemo(
    () => issuePattern(issues),
    [issues],
  );

  const fragments =
    useMemo(() => {
      if (
        !pattern ||
        !text
      ) {
        return [
          {
            text,
            misspelled: false,
          },
        ];
      }

      pattern.lastIndex = 0;

      const output: Array<{
        text: string;
        misspelled: boolean;
      }> = [];

      let cursor = 0;
      let match:
        | RegExpExecArray
        | null;

      while (
        (
          match =
            pattern.exec(text)
        ) !== null
      ) {
        const prefix =
          match[1] ?? "";

        const word =
          match[2] ?? "";

        const wordStart =
          match.index +
          prefix.length;

        if (
          wordStart > cursor
        ) {
          output.push({
            text: text.slice(
              cursor,
              wordStart,
            ),
            misspelled: false,
          });
        }

        if (word) {
          output.push({
            text: word,
            misspelled: true,
          });
        }

        cursor =
          wordStart +
          word.length;

        if (
          match.index ===
          pattern.lastIndex
        ) {
          pattern.lastIndex += 1;
        }
      }

      if (
        cursor < text.length
      ) {
        output.push({
          text: text.slice(
            cursor,
          ),
          misspelled: false,
        });
      }

      return output;
    }, [pattern, text]);

  if (
    !text ||
    issues.length === 0
  ) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      <div
        className="whitespace-pre-wrap break-words px-4 py-3 text-sm leading-6"
        style={{
          transform:
            `translateY(-${scrollTop}px)`,
          color: "transparent",
          font: "inherit",
          overflowWrap:
            "break-word",
        }}
      >
        {fragments.map(
          (
            fragment,
            index,
          ) =>
            fragment.misspelled ? (
              <span
                key={index}
                style={{
                  color:
                    "transparent",
                  textDecorationLine:
                    "underline",
                  textDecorationStyle:
                    "wavy",
                  textDecorationColor:
                    "#d05d52",
                  textDecorationThickness:
                    "1.5px",
                  textUnderlineOffset:
                    "2px",
                }}
              >
                {fragment.text}
              </span>
            ) : (
              <span
                key={index}
              >
                {fragment.text}
              </span>
            ),
        )}

        {/*
         * Keeps a final blank line measurable in the same way as textarea.
         */}
        {text.endsWith("\n")
          ? "\u200b"
          : null}
      </div>
    </div>
  );
}
