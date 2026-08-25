import { NextResponse } from "next/server";
import enGb from "dictionary-en-gb";
import nspell from "nspell";

const MAX_TEXT_LENGTH = 50_000;
const MAX_UNIQUE_WORDS = 2_500;
const MAX_ISSUES = 250;
const MAX_SUGGESTIONS = 12;

/*
 * Words which are legitimate inside the Sepulchria setting and would
 * otherwise be flagged by a normal British-English dictionary.
 *
 * Keep this list intentionally small and canonical. Players can ignore
 * additional character names locally from the Writing Assistant UI.
 */
const SEPULCHRIA_WORDS = [
  "Sepulchria",
  "Asteros",
  "Aureth",
  "Vaskari",
  "Current",
  "Cinder",
  "Shaper",
  "Shapers",
  "Sepulchrian",
];

const checker = nspell(enGb);

for (const word of SEPULCHRIA_WORDS) {
  checker.add(word);
}

type SpellingIssue = {
  word: string;
  suggestions: string[];
};

function normaliseWord(value: string) {
  return value
    .replace(/^[’']+|[’']+$/g, "")
    .trim();
}

function adjacentSwapCorrections(
  word: string,
) {
  const corrections: string[] = [];

  for (
    let index = 0;
    index < word.length - 1;
    index += 1
  ) {
    const swapped =
      word.slice(0, index) +
      word[index + 1] +
      word[index] +
      word.slice(index + 2);

    if (
      checker.correct(swapped) &&
      !corrections.some(
        (entry) =>
          entry.toLocaleLowerCase("en-GB") ===
          swapped.toLocaleLowerCase("en-GB"),
      )
    ) {
      corrections.push(swapped);
    }
  }

  return corrections;
}

function extractUniqueWords(text: string) {
  /*
   * Includes normal English apostrophes/hyphens while excluding URLs,
   * numbers, one-letter fragments and RP punctuation.
   */
  const rawWords =
    text.match(
      /[\p{L}][\p{L}’'-]{1,}/gu,
    ) ?? [];

  const seen = new Set<string>();
  const words: string[] = [];

  for (const rawWord of rawWords) {
    const word =
      normaliseWord(rawWord);

    if (
      word.length < 2 ||
      word.length > 64
    ) {
      continue;
    }

    const key =
      word.toLocaleLowerCase(
        "en-GB",
      );

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    words.push(word);

    if (
      words.length >=
      MAX_UNIQUE_WORDS
    ) {
      break;
    }
  }

  return words;
}

function shouldSkipWord(
  word: string,
) {
  /*
   * Avoid noisy warnings for all-uppercase abbreviations, URLs/domain-ish
   * tokens, mentions and words containing digits.
   */
  if (/\d/.test(word)) {
    return true;
  }

  if (
    word.length <= 4 &&
    word === word.toUpperCase()
  ) {
    return true;
  }

  return false;
}

export async function POST(
  request: Request,
) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        issues: [],
      },
      {
        status: 400,
      },
    );
  }

  const text =
    typeof payload === "object" &&
    payload !== null &&
    "text" in payload &&
    typeof (
      payload as {
        text?: unknown;
      }
    ).text === "string"
      ? (
          payload as {
            text: string;
          }
        ).text
      : "";

  if (!text.trim()) {
    return NextResponse.json({
      issues: [],
    });
  }

  const safeText =
    text.slice(
      0,
      MAX_TEXT_LENGTH,
    );

  const issues: SpellingIssue[] =
    [];

  for (
    const word of
    extractUniqueWords(safeText)
  ) {
    if (
  shouldSkipWord(word) ||
  isCorrectWord(word)
) {
  continue;
}

    const suggestions = Array.from(
  new Set([
    ...adjacentSwapCorrections(word),
    ...checker.suggest(word),
  ]),
)
  .filter(
    (suggestion) =>
      suggestion.length > 0 &&
      suggestion.length <= 64,
  )
  .slice(
    0,
    MAX_SUGGESTIONS,
  );

    issues.push({
      word,
      suggestions,
    });

    if (
      issues.length >=
      MAX_ISSUES
    ) {
      break;
    }
  }

  return NextResponse.json({
    issues,
  });
}

function isCorrectWord(
  word: string,
) {
  if (checker.correct(word)) {
    return true;
  }

  /*
   * Accept possessives when the underlying
   * word is already valid:
   *
   * Sepulchria's
   * Aureth's
   * Jordan's
   */
  const possessive =
    word.match(
      /^(.+?)[’']s$/iu,
    );

  if (
    possessive?.[1] &&
    checker.correct(
      possessive[1],
    )
  ) {
    return true;
  }

  return false;
}