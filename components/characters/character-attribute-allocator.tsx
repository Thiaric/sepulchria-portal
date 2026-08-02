"use client";

import { useMemo, useState } from "react";

export const CHARACTER_ATTRIBUTE_KEYS = [
  "muscles",
  "reflexes",
  "vigor",
  "brains",
  "shrewd",
  "presence_score",
] as const;

export type CharacterAttributeKey =
  (typeof CHARACTER_ATTRIBUTE_KEYS)[number];

export type CharacterAttributeValues =
  Record<CharacterAttributeKey, number | null>;

const ATTRIBUTE_LABELS: Record<
  CharacterAttributeKey,
  string
> = {
  muscles: "Muscles",
  reflexes: "Reflexes",
  vigor: "Vigor",
  brains: "Brains",
  shrewd: "Shrewd",
  presence_score: "Presence",
};

const ATTRIBUTE_DESCRIPTIONS: Record<
  CharacterAttributeKey,
  string
> = {
  muscles:
    "Raw physical strength: lifting, forcing, grappling and powerful physical effort.",
  reflexes:
    "Speed, coordination and precision: dodging, balance, stealth and quick movement.",
  vigor:
    "Endurance and resilience: stamina, hardship, poison, illness and physical strain.",
  brains:
    "Knowledge and reason: study, investigation, planning, crafting and complex problems.",
  shrewd:
    "Awareness, instinct and practical judgement: perception, intuition and reading people.",
  presence_score:
    "Force of personality: persuasion, intimidation, leadership, deception and social influence.",
};

const MINIMUM_VALUE = 1;
const MAXIMUM_VALUE = 8;
const TOTAL_POINTS = 20;

function normaliseInitialValue(
  value: string | number | null | undefined,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed)
    ? parsed
    : null;
}

export function CharacterAttributeAllocator({
  initialValues,
  locked = false,
}: {
  initialValues?: Partial<
    Record<
      CharacterAttributeKey,
      string | number | null | undefined
    >
  >;
  locked?: boolean;
}) {
  const hasCompleteInitialValues =
    CHARACTER_ATTRIBUTE_KEYS.every(
      (key) =>
        normaliseInitialValue(
          initialValues?.[key],
        ) !== null,
    );

  const [values, setValues] =
    useState<CharacterAttributeValues>(() => {
      if (hasCompleteInitialValues) {
        return Object.fromEntries(
          CHARACTER_ATTRIBUTE_KEYS.map(
            (key) => [
              key,
              normaliseInitialValue(
                initialValues?.[key],
              ),
            ],
          ),
        ) as CharacterAttributeValues;
      }

      if (locked) {
        return Object.fromEntries(
          CHARACTER_ATTRIBUTE_KEYS.map(
            (key) => [key, null],
          ),
        ) as CharacterAttributeValues;
      }

      return {
        muscles: 1,
        reflexes: 1,
        vigor: 1,
        brains: 1,
        shrewd: 1,
        presence_score: 1,
      };
    });

  const spentPoints = useMemo(
    () =>
      CHARACTER_ATTRIBUTE_KEYS.reduce(
        (total, key) =>
          total + (values[key] ?? 0),
        0,
      ),
    [values],
  );

  const remainingPoints =
    TOTAL_POINTS - spentPoints;

  function changeValue(
    key: CharacterAttributeKey,
    difference: number,
  ) {
    setValues((current) => {
      const currentValue =
        current[key] ?? MINIMUM_VALUE;

      const nextValue =
        currentValue + difference;

      if (
        nextValue < MINIMUM_VALUE ||
        nextValue > MAXIMUM_VALUE
      ) {
        return current;
      }

      if (
        difference > 0 &&
        remainingPoints <= 0
      ) {
        return current;
      }

      return {
        ...current,
        [key]: nextValue,
      };
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border border-[#735735]/55 bg-[#21170f] p-5">
        <div>
          <p className="text-[9px] uppercase tracking-[0.24em] text-[#ad8753]">
            Character attributes
          </p>

          <h3 className="mt-2 font-serif text-2xl text-[#e3cba2]">
            {locked
              ? "Permanent attribute record"
              : "Distribute 20 points"}
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#998b78]">
            Every attribute must be between 1 and 8.
            New characters must spend exactly 20 points.
          </p>
        </div>

        <div className="border border-[#80603a]/55 bg-[#100c09] px-5 py-3 text-right">
          <p className="text-[8px] uppercase tracking-[0.18em] text-[#776957]">
            Points remaining
          </p>

          <p
            className={`mt-1 font-serif text-2xl ${
              remainingPoints === 0
                ? "text-[#9fc49d]"
                : remainingPoints > 0
                  ? "text-[#e1c187]"
                  : "text-[#d98578]"
            }`}
          >
            {locked &&
            !hasCompleteInitialValues
              ? "—"
              : remainingPoints}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {CHARACTER_ATTRIBUTE_KEYS.map(
          (key) => {
            const value = values[key];

            return (
              <article
                key={key}
                className="border border-[#60482e]/45 bg-[#120e0b] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="font-serif text-xl text-[#dfc79c]">
                      {ATTRIBUTE_LABELS[key]}
                    </h4>

                    <p className="mt-2 text-xs leading-5 text-[#887c6d]">
                      {ATTRIBUTE_DESCRIPTIONS[key]}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {!locked ? (
                      <button
                        type="button"
                        onClick={() =>
                          changeValue(key, -1)
                        }
                        disabled={
                          (value ??
                            MINIMUM_VALUE) <=
                          MINIMUM_VALUE
                        }
                        className="flex h-9 w-9 items-center justify-center border border-[#60482e]/60 bg-[#17110d] text-lg text-[#b99a6d] transition hover:border-[#967342] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        −
                      </button>
                    ) : null}

                    <span className="flex h-11 min-w-11 items-center justify-center border border-[#80603a]/60 bg-[#0d0907] px-3 font-serif text-2xl text-[#e3c28d]">
                      {value ?? "—"}
                    </span>

                    {!locked ? (
                      <button
                        type="button"
                        onClick={() =>
                          changeValue(key, 1)
                        }
                        disabled={
                          remainingPoints <= 0 ||
                          (value ??
                            MINIMUM_VALUE) >=
                            MAXIMUM_VALUE
                        }
                        className="flex h-9 w-9 items-center justify-center border border-[#60482e]/60 bg-[#17110d] text-lg text-[#b99a6d] transition hover:border-[#967342] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        +
                      </button>
                    ) : null}
                  </div>
                </div>

                <input
                  type="hidden"
                  name={key}
                  value={value ?? ""}
                />
              </article>
            );
          },
        )}
      </div>

      {!locked &&
      remainingPoints !== 0 ? (
        <p className="mt-4 border border-[#765937]/50 bg-[#1d150f] px-4 py-3 text-xs leading-5 text-[#b79b72]">
          Spend all remaining points before continuing.
        </p>
      ) : null}

      {locked &&
      !hasCompleteInitialValues ? (
        <p className="mt-4 border border-[#765937]/50 bg-[#1d150f] px-4 py-3 text-xs leading-5 text-[#b79b72]">
          Attributes have not yet been assigned. Staff can complete this record from character administration.
        </p>
      ) : null}
    </div>
  );
}
