export const CHARACTER_ATTRIBUTE_DEFINITIONS = [
  {
    key: "muscles",
    label: "Muscles",
  },
  {
    key: "reflexes",
    label: "Reflexes",
  },
  {
    key: "vigor",
    label: "Vigour",
  },
  {
    key: "shrewd",
    label: "Shrewd",
  },
  {
    key: "brains",
    label: "Brains",
  },
  {
    key: "presence_score",
    label: "Presence",
  },
] as const;

type AttributeSource = {
  muscles?: number | null;
  reflexes?: number | null;
  vigor?: number | null;
  brains?: number | null;
  shrewd?: number | null;
  presence_score?: number | null;
};

export function CharacterAttributesDisplay({
  character,
  compact = false,
}: {
  character: AttributeSource;
  compact?: boolean;
}) {
  const hasAnyAttribute =
    CHARACTER_ATTRIBUTE_DEFINITIONS.some(
      ({ key }) =>
        character[key] !== null &&
        character[key] !== undefined,
    );

  if (compact) {
    return (
      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/15 components_characters_character_attributes_display_section_section">
        <div className="flex items-center justify-between gap-4 border-b border-[rgb(var(--sep-colour-60482e))]/35 px-4 py-3 components_characters_character_attributes_display_div_container">
          <div className="components_characters_character_attributes_display_div_attributes">
            <p className="text-[7px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] components_characters_character_attributes_display_p_attributes">
              Character record
            </p>

            <h2 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-dec89f))] components_characters_character_attributes_display_h2_attributes">
              Attributes
            </h2>
          </div>

          {hasAnyAttribute ? (
            <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-776957))] components_characters_character_attributes_display_p_text">
              Effective values
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-px bg-[rgb(var(--sep-colour-4f3b28))]/35 components_characters_character_attributes_display_div_container_2">
          {CHARACTER_ATTRIBUTE_DEFINITIONS.map(
            ({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 bg-[rgb(var(--sep-colour-120e0b))]/95 px-3 py-2.5 components_characters_character_attributes_display_div_container_3"
              >
                <span className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8b7455))] components_characters_character_attributes_display_span_text">
                  {label}
                </span>

                <span className="font-serif text-lg text-[rgb(var(--sep-colour-e1c28d))] components_characters_character_attributes_display_span_text_2">
                  {character[key] ?? "—"}
                </span>
              </div>
            ),
          )}
        </div>

        {!hasAnyAttribute ? (
          <p className="border-t border-[rgb(var(--sep-colour-60482e))]/30 px-4 py-3 text-[10px] italic leading-5 text-[rgb(var(--sep-colour-756957))] components_characters_character_attributes_display_p_text_2">
            Attributes have not yet been assigned.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-5 sm:p-6 components_characters_character_attributes_display_section_section_2">
      <div className="flex flex-wrap items-end justify-between gap-3 components_characters_character_attributes_display_div_container_4">
        <div className="components_characters_character_attributes_display_div_attributes_2">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] components_characters_character_attributes_display_p_attributes_2">
            Character record
          </p>

          <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dec89f))] components_characters_character_attributes_display_h2_attributes_2">
            Attributes
          </h2>
        </div>

        {hasAnyAttribute ? (
          <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-776957))] components_characters_character_attributes_display_p_text_3">
            Base + Ancestry + Order
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-px bg-[rgb(var(--sep-colour-4f3b28))]/35 sm:grid-cols-2 lg:grid-cols-3 components_characters_character_attributes_display_div_container_5">
        {CHARACTER_ATTRIBUTE_DEFINITIONS.map(
          ({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-4 bg-[rgb(var(--sep-colour-120e0b))] px-4 py-4 components_characters_character_attributes_display_div_container_6"
            >
              <span className="text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-8b7455))] components_characters_character_attributes_display_span_text_3">
                {label}
              </span>

              <span className="font-serif text-2xl text-[rgb(var(--sep-colour-e1c28d))] components_characters_character_attributes_display_span_text_4">
                {character[key] ?? "—"}
              </span>
            </div>
          ),
        )}
      </div>

      {!hasAnyAttribute ? (
        <p className="mt-4 text-xs italic leading-5 text-[rgb(var(--sep-colour-756957))] components_characters_character_attributes_display_p_text_4">
          Attributes have not yet been assigned.
        </p>
      ) : null}
    </section>
  );
}
