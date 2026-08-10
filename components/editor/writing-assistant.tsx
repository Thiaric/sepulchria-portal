"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

export type WritingIssue = {
  word: string;
  suggestions: string[];
};

type WritingAssistantProps = {
  text: string;
  onReplace: (
    word: string,
    replacement: string,
  ) => void;
  disabled?: boolean;
  compact?: boolean;
};

const STORAGE_KEY =
  "sepulchria-writing-assistant-ignored";

function readIgnoredWords() {
  if (
    typeof window ===
    "undefined"
  ) {
    return new Set<string>();
  }

  try {
    const stored =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    const values =
      stored
        ? (JSON.parse(
            stored,
          ) as unknown)
        : [];

    if (
      !Array.isArray(values)
    ) {
      return new Set<string>();
    }

    return new Set(
      values
        .filter(
          (value):
            value is string =>
            typeof value ===
            "string",
        )
        .map((value) =>
          value.toLocaleLowerCase(
            "en-GB",
          ),
        ),
    );
  } catch {
    return new Set<string>();
  }
}

function saveIgnoredWords(
  words: Set<string>,
) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        Array.from(words),
      ),
    );
  } catch {
    // localStorage can be unavailable in privacy modes.
  }
}

export function WritingAssistant({
  text,
  onReplace,
  disabled = false,
  compact = false,
}: WritingAssistantProps) {
  const [issues, setIssues] =
    useState<WritingIssue[]>(
      [],
    );

  const [ignored, setIgnored] =
    useState<Set<string>>(
      () => new Set(),
    );

  const [checking, setChecking] =
    useState(false);

  const [available, setAvailable] =
    useState(true);

  useEffect(() => {
    setIgnored(
      readIgnoredWords(),
    );
  }, []);

  useEffect(() => {
    if (
      disabled ||
      text.trim().length < 3
    ) {
      setIssues([]);
      setChecking(false);
      return;
    }

    const controller =
      new AbortController();

    const timer =
      window.setTimeout(
        async () => {
          setChecking(true);

          try {
            const response =
              await fetch(
                "/api/writing-assistant/spelling",
                {
                  method: "POST",
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

            if (!response.ok) {
              setAvailable(false);
              return;
            }

            const result =
              (await response.json()) as {
                issues?: WritingIssue[];
              };

            setAvailable(true);
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

            setAvailable(false);
          } finally {
            if (
              !controller.signal
                .aborted
            ) {
              setChecking(false);
            }
          }
        },
        650,
      );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [disabled, text]);

  const visibleIssues =
    useMemo(
      () =>
        issues.filter(
          (issue) =>
            !ignored.has(
              issue.word.toLocaleLowerCase(
                "en-GB",
              ),
            ),
        ),
      [ignored, issues],
    );

  function ignoreWord(
    word: string,
  ) {
    const next =
      new Set(ignored);

    next.add(
      word.toLocaleLowerCase(
        "en-GB",
      ),
    );

    setIgnored(next);
    saveIgnoredWords(next);
  }

  if (
    disabled ||
    (!checking &&
      available &&
      visibleIssues.length ===
        0)
  ) {
    return null;
  }

  return (
    <div
      className={`border border-[#60482e]/40 bg-[#100c09] ${
        compact
          ? "mt-2 px-3 py-2"
          : "border-t-0 px-4 py-3"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[8px] uppercase tracking-[0.2em] text-[#9e7d52]">
          Writing assistant
        </p>

        {checking ? (
          <span className="text-[9px] text-[#766a5a]">
            Checking…
          </span>
        ) : !available ? (
          <span className="text-[9px] text-[#b27d6e]">
            Spell checker unavailable
          </span>
        ) : (
          <span className="text-[9px] text-[#766a5a]">
            {visibleIssues.length}{" "}
            {visibleIssues.length ===
            1
              ? "possible issue"
              : "possible issues"}
          </span>
        )}
      </div>

      {available &&
      visibleIssues.length > 0 ? (
        <div className="mt-2 space-y-2">
          {visibleIssues
            .slice(
              0,
              compact ? 4 : 8,
            )
            .map((issue) => (
              <div
                key={issue.word.toLocaleLowerCase(
                  "en-GB",
                )}
                className="flex flex-wrap items-center gap-2 border-t border-[#60482e]/25 pt-2 first:border-t-0 first:pt-0"
              >
                <span className="font-serif text-sm text-[#e0b98a]">
                  {issue.word}
                </span>

                <span className="text-[9px] text-[#6f6354]">
                  →
                </span>

                {issue.suggestions.length >
                0 ? (
                  issue.suggestions.map(
                    (suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() =>
                          onReplace(
                            issue.word,
                            suggestion,
                          )
                        }
                        className="border border-[#715537]/55 bg-[#1b140f] px-2 py-1 text-[9px] text-[#cdb28a] transition hover:border-[#9a7244] hover:text-[#efd4a0]"
                      >
                        {suggestion}
                      </button>
                    ),
                  )
                ) : (
                  <span className="text-[9px] italic text-[#75695b]">
                    No suggestions
                  </span>
                )}

                <button
                  type="button"
                  onClick={() =>
                    ignoreWord(
                      issue.word,
                    )
                  }
                  className="ml-auto text-[8px] uppercase tracking-[0.12em] text-[#796b5a] underline decoration-[#5e503f] underline-offset-2 transition hover:text-[#b69a75]"
                >
                  Ignore
                </button>
              </div>
            ))}
        </div>
      ) : null}
    </div>
  );
}
