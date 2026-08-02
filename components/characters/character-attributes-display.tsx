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
    label: "Vigor",
  },
  {
    key: "brains",
    label: "Brains",
  },
  {
    key: "shrewd",
    label: "Shrewd",
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
            20 point allocation
          </p>
        ) : null}
      </div>

      <div
        className={`mt-5 grid gap-px bg-[#4f3b28]/35 ${
          compact
            ? "grid-cols-2"
            : "sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
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
