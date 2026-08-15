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
      <section className="border border-[#60482e]/45 bg-black/15">
        <div className="flex items-center justify-between gap-4 border-b border-[#60482e]/35 px-4 py-3">
          <div>
            <p className="text-[7px] uppercase tracking-[0.22em] text-[#806b50]">
              Character record
            </p>

            <h2 className="mt-1 font-serif text-lg text-[#dec89f]">
              Attributes
            </h2>
          </div>

          {hasAnyAttribute ? (
            <p className="text-[7px] uppercase tracking-[0.14em] text-[#776957]">
              Effective values
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-px bg-[#4f3b28]/35">
          {CHARACTER_ATTRIBUTE_DEFINITIONS.map(
            ({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 bg-[#120e0b]/95 px-3 py-2.5"
              >
                <span className="text-[7px] uppercase tracking-[0.14em] text-[#8b7455]">
                  {label}
                </span>

                <span className="font-serif text-lg text-[#e1c28d]">
                  {character[key] ?? "—"}
                </span>
              </div>
            ),
          )}
        </div>

        {!hasAnyAttribute ? (
          <p className="border-t border-[#60482e]/30 px-4 py-3 text-[10px] italic leading-5 text-[#756957]">
            Attributes have not yet been assigned.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="border border-[#60482e]/45 bg-[#15100d]/95 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
            Character record
          </p>

          <h2 className="mt-2 font-serif text-2xl text-[#dec89f]">
            Attributes
          </h2>
        </div>

        {hasAnyAttribute ? (
          <p className="text-[8px] uppercase tracking-[0.16em] text-[#776957]">
            Base + Ancestry + Order
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-px bg-[#4f3b28]/35 sm:grid-cols-2 lg:grid-cols-3">
        {CHARACTER_ATTRIBUTE_DEFINITIONS.map(
          ({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-4 bg-[#120e0b] px-4 py-4"
            >
              <span className="text-[9px] uppercase tracking-[0.18em] text-[#8b7455]">
                {label}
              </span>

              <span className="font-serif text-2xl text-[#e1c28d]">
                {character[key] ?? "—"}
              </span>
            </div>
          ),
        )}
      </div>

      {!hasAnyAttribute ? (
        <p className="mt-4 text-xs italic leading-5 text-[#756957]">
          Attributes have not yet been assigned.
        </p>
      ) : null}
    </section>
  );
}
