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

function formatModifier(value: number) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

export function CharacterAttributeAllocator({
  initialValues,
  ancestryModifiers,
  locked = false,
}: {
  initialValues?: Partial<
    Record<
      CharacterAttributeKey,
      string | number | null | undefined
    >
  >;
  ancestryModifiers?: Partial<
    Record<CharacterAttributeKey, number | null | undefined>
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

  const modifiers =
    Object.fromEntries(
      CHARACTER_ATTRIBUTE_KEYS.map(
        (key) => [
          key,
          Number(
            ancestryModifiers?.[key] ?? 0,
          ),
        ],
      ),
    ) as Record<CharacterAttributeKey, number>;

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
    <div className="components_characters_character_attribute_allocator_div_container">
      <div className="flex flex-wrap items-end justify-between gap-4 border border-[rgb(var(--sep-colour-735735))]/55 bg-[rgb(var(--sep-colour-21170f))] p-5 components_characters_character_attribute_allocator_div_container_2">
        <div className="components_characters_character_attribute_allocator_div_container_3">
          <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-ad8753))] components_characters_character_attribute_allocator_p_text">
            Character attributes
          </p>

          <h3 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-e3cba2))] components_characters_character_attribute_allocator_h3_heading">
            {locked
              ? "Permanent base attribute record"
              : "Standard starting attributes"}
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[rgb(var(--sep-colour-998b78))] components_characters_character_attribute_allocator_p_text_2">
            The base value always remains separate. Your selected Ancestry modifier is applied on top of it to produce the Effective Attribute used by the game. Order modifiers may be added later through play.
          </p>
        </div>

        <div className="border border-[rgb(var(--sep-colour-80603a))]/55 bg-[rgb(var(--sep-colour-100c09))] px-5 py-3 text-right components_characters_character_attribute_allocator_div_container_4">
          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-776957))] components_characters_character_attribute_allocator_p_text_3">
            Base points
          </p>

          <p className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-e1c187))] components_characters_character_attribute_allocator_p_text_4">
            {locked && !hasCompleteInitialValues
              ? "—"
              : total}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 components_characters_character_attribute_allocator_div_container_5">
        {CHARACTER_ATTRIBUTE_KEYS.map(
          (key) => {
            const base = values[key];
            const ancestry = modifiers[key];
            const effective =
              base === null
                ? null
                : base + ancestry;

            return (
              <article
                key={key}
                className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-120e0b))] p-4 components_characters_character_attribute_allocator_article_article"
              >
                <div className="flex items-start justify-between gap-4 components_characters_character_attribute_allocator_div_container_6">
                  <div className="min-w-0 components_characters_character_attribute_allocator_div_container_7">
                    <h4 className="font-serif text-xl text-[rgb(var(--sep-colour-dfc79c))] components_characters_character_attribute_allocator_h4_heading">
                      {ATTRIBUTE_LABELS[key]}
                    </h4>

                    <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-887c6d))] components_characters_character_attribute_allocator_p_text_5">
                      {ATTRIBUTE_DESCRIPTIONS[key]}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 components_characters_character_attribute_allocator_div_container_8">
                  <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0907))] p-3 text-center components_characters_character_attribute_allocator_div_container_9">
                    <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-776957))] components_characters_character_attribute_allocator_p_text_6">
                      Base
                    </p>
                    <p className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8c29e))] components_characters_character_attribute_allocator_p_text_7">
                      {base ?? "—"}
                    </p>
                  </div>

                  <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0907))] p-3 text-center components_characters_character_attribute_allocator_div_container_10">
                    <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-776957))] components_characters_character_attribute_allocator_p_text_8">
                      Ancestry
                    </p>
                    <p className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8c29e))] components_characters_character_attribute_allocator_p_text_9">
                      {formatModifier(ancestry)}
                    </p>
                  </div>

                  <div className="border border-[rgb(var(--sep-colour-8a6638))]/60 bg-[rgb(var(--sep-colour-1b130d))] p-3 text-center components_characters_character_attribute_allocator_div_container_11">
                    <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-9a794d))] components_characters_character_attribute_allocator_p_text_10">
                      Effective
                    </p>
                    <p className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-e8c98e))] components_characters_character_attribute_allocator_p_text_11">
                      {effective ?? "—"}
                    </p>
                  </div>
                </div>

                {!locked ? (
                  <input className="components_characters_character_attribute_allocator_input_field"
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

      <div className="mt-4 border border-[rgb(var(--sep-colour-735735))]/45 bg-[rgb(var(--sep-colour-17100c))] px-4 py-3 components_characters_character_attribute_allocator_div_container_12">
        <p className="text-xs leading-5 text-[rgb(var(--sep-colour-9a8a74))] components_characters_character_attribute_allocator_p_text_12">
          Health uses <strong className="text-[rgb(var(--sep-colour-d8bd91))] components_characters_character_attribute_allocator_strong_emphasis">Effective Vigour × 10</strong>. For example, Base Vigour 3 with Ancestry +2 starts at 50 / 50 Health.
        </p>
      </div>

      {locked &&
      !hasCompleteInitialValues ? (
        <p className="mt-4 border border-[rgb(var(--sep-colour-765937))]/50 bg-[rgb(var(--sep-colour-1d150f))] px-4 py-3 text-xs leading-5 text-[rgb(var(--sep-colour-b79b72))] components_characters_character_attribute_allocator_p_text_13">
          This legacy character does not yet have a complete base Attribute record. Staff can complete it from character administration.
        </p>
      ) : null}
    </div>
  );
}
