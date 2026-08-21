type CharacterHealthSource = {
  vigor?: number | null;
  current_health?: number | null;
};

export function CharacterHealthDisplay({
  character,
  compact = false,
}: {
  character: CharacterHealthSource;
  compact?: boolean;
}) {
  const maxHealth =
    character.vigor === null ||
    character.vigor === undefined
      ? null
      : character.vigor * 10;

  const currentHealth =
    maxHealth === null
      ? null
      : Math.max(
          0,
          Math.min(
            character.current_health ??
              maxHealth,
            maxHealth,
          ),
        );

  const percentage =
    maxHealth && currentHealth !== null
      ? Math.round(
          (currentHealth / maxHealth) *
            100,
        )
      : 0;

  const healthText =
    currentHealth === null ||
    maxHealth === null
      ? "—"
      : `${currentHealth} / ${maxHealth}`;

  return (
    <section
      className={
        compact
          ? "border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/15 px-4 py-3"
          : "border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-5 sm:p-6"
      }
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
            Vital condition
          </p>

          <h2
            className={
              compact
                ? "mt-1 font-serif text-lg text-[rgb(var(--sep-colour-dec89f))]"
                : "mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dec89f))]"
            }
          >
            Health
          </h2>
        </div>

        <p
          className={
            compact
              ? "font-serif text-lg text-[rgb(var(--sep-colour-e1c28d))]"
              : "font-serif text-2xl text-[rgb(var(--sep-colour-e1c28d))]"
          }
        >
          {healthText}
        </p>
      </div>

      <div className="mt-3 h-2 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0907))]">
        <div
          className="h-full bg-gradient-to-r from-[rgb(var(--sep-colour-7b2f2a))] via-[rgb(var(--sep-colour-a94f3f))] to-[rgb(var(--sep-colour-c26a50))] transition-[width] duration-300"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      {maxHealth === null ? (
        <p className="mt-3 text-[10px] italic leading-5 text-[rgb(var(--sep-colour-756957))]">
          Health will be calculated when Vigor is assigned.
        </p>
      ) : (
        <p className="mt-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-776957))]">
          Maximum Health = Vigor × 10
        </p>
      )}
    </section>
  );
}
