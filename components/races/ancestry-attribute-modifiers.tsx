type AncestryModifierSource = {
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  shrewd_modifier: number;
  brains_modifier: number;
  presence_modifier: number;
};

const MODIFIERS = [
  { key: "muscles_modifier", label: "Muscles" },
  { key: "reflexes_modifier", label: "Reflexes" },
  { key: "vigour_modifier", label: "Vigour" },
  { key: "shrewd_modifier", label: "Shrewd" },
  { key: "brains_modifier", label: "Brains" },
  { key: "presence_modifier", label: "Presence" },
] as const;

function formatModifier(value: number) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

export function AncestryAttributeModifiers({
  modifiers,
  compact = false,
}: {
  modifiers: AncestryModifierSource;
  compact?: boolean;
}) {
  return (
    <section
      className={
        compact
          ? "mt-5 border-t border-[#60482e]/35 pt-4"
          : "border border-[#60482e]/45 bg-[#15100d]/95 p-5 sm:p-6"
      }
    >
      <div>
        <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
          Ancestry Attributes Modifiers
        </p>

        

        
      </div>

      <div
        className={
  compact
    ? "mt-3 grid grid-cols-2 gap-px bg-[#4f3b28]/35 sm:grid-cols-3"
    : "mt-5 grid grid-cols-2 gap-px bg-[#4f3b28]/35 sm:grid-cols-3 lg:grid-cols-6"
}
      >
        {MODIFIERS.map(({ key, label }) => {
          const value = modifiers[key] ?? 0;

          return (
            <div
              key={key}
              className={
                compact
                  ? "flex items-center justify-between gap-3 bg-[#120e0b] px-3 py-2.5"
                  : "flex items-center justify-between gap-4 bg-[#120e0b] px-4 py-4"
              }
            >
              <span
                className={
                  compact
                    ? "text-[7px] uppercase tracking-[0.14em] text-[#8b7455]"
                    : "text-[9px] uppercase tracking-[0.18em] text-[#8b7455]"
                }
              >
                {label}
              </span>

              <span
                className={
                  compact
                    ? "font-serif text-lg text-[#e1c28d]"
                    : "font-serif text-2xl text-[#e1c28d]"
                }
              >
                {formatModifier(value)}
              </span>
            </div>
          );
        })}
      </div>

      
    </section>
  );
}
