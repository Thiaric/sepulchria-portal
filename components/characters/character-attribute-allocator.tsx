"use client";

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
  vigor: "Vigour",
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

const STANDARD_BASE_VALUE = 3;

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
  const values =
    Object.fromEntries(
      CHARACTER_ATTRIBUTE_KEYS.map(
        (key) => [
          key,
          locked
            ? normaliseInitialValue(
                initialValues?.[key],
              )
            : STANDARD_BASE_VALUE,
        ],
      ),
    ) as CharacterAttributeValues;

  const hasCompleteInitialValues =
    CHARACTER_ATTRIBUTE_KEYS.every(
      (key) => values[key] !== null,
    );

  const total =
    CHARACTER_ATTRIBUTE_KEYS.reduce(
      (sum, key) =>
        sum + (values[key] ?? 0),
      0,
    );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border border-[#735735]/55 bg-[#21170f] p-5">
        <div>
          <p className="text-[9px] uppercase tracking-[0.24em] text-[#ad8753]">
            Base attributes
          </p>

          <h3 className="mt-2 font-serif text-2xl text-[#e3cba2]">
            {locked
              ? "Permanent base attribute record"
              : "Standard starting attributes"}
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#998b78]">
            {locked
              ? "Base attributes cannot be changed by the player. Staff may alter them from character administration."
              : "Every new character begins with 3 points in each of the six base attributes. Ancestry and Order modifiers are applied separately."}
          </p>
        </div>

        <div className="border border-[#80603a]/55 bg-[#100c09] px-5 py-3 text-right">
          <p className="text-[8px] uppercase tracking-[0.18em] text-[#776957]">
            Base points
          </p>

          <p className="mt-1 font-serif text-2xl text-[#e1c187]">
            {locked && !hasCompleteInitialValues
              ? "—"
              : total}
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

                  <span className="flex h-11 min-w-11 shrink-0 items-center justify-center border border-[#80603a]/60 bg-[#0d0907] px-3 font-serif text-2xl text-[#e3c28d]">
                    {value ?? "—"}
                  </span>
                </div>

                {!locked ? (
                  <input
                    type="hidden"
                    name={key}
                    value={STANDARD_BASE_VALUE}
                  />
                ) : null}
              </article>
            );
          },
        )}
      </div>

      {locked &&
      !hasCompleteInitialValues ? (
        <p className="mt-4 border border-[#765937]/50 bg-[#1d150f] px-4 py-3 text-xs leading-5 text-[#b79b72]">
          This legacy character does not yet have a complete base Attribute record. Staff can complete it from character administration.
        </p>
      ) : null}
    </div>
  );
}
