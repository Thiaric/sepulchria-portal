import "server-only";

import {
  getCharacterActiveEffects,
} from "@/lib/effects/active-effects";

const signed =
  (value: number) =>
    value > 0
      ? `+${value}`
      : String(value);

function duration(
  expiresAt:
    string | null,
) {
  if (!expiresAt) {
    return "Until Dispelled";
  }

  const ms =
    Date.parse(
      expiresAt,
    ) -
    Date.now();

  if (ms <= 0) {
    return "Expired";
  }

  const minutes =
    Math.ceil(
      ms / 60_000,
    );

  if (minutes < 60) {
    return `${minutes}m remaining`;
  }

  const hours =
    Math.ceil(
      minutes / 60,
    );

  if (hours < 48) {
    return `${hours}h remaining`;
  }

  return `${Math.ceil(
    hours / 24,
  )}d remaining`;
}

export async function ActiveCharacterEffects({
  characterId,
}: {
  characterId: string;
}) {
  const rows =
    await getCharacterActiveEffects(
      characterId,
      [
        "shape",
        "feat",
        "item",
      ],
    );

  if (!rows.length) {
    return null;
  }

  return (
    <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-5 sm:p-6">
      <h2 className="font-serif text-[rgb(var(--sep-colour-dec89f))]">
        Active Effects
      </h2>

      <div className="mt-4 space-y-3">
        {rows.map(
          effect => {
            const tags = [
              ...effect.conditions,
              effect.muscles_modifier
                ? `Muscles ${signed(effect.muscles_modifier)}`
                : "",
              effect.reflexes_modifier
                ? `Reflexes ${signed(effect.reflexes_modifier)}`
                : "",
              effect.vigour_modifier
                ? `Vigour ${signed(effect.vigour_modifier)}`
                : "",
              effect.brains_modifier
                ? `Brains ${signed(effect.brains_modifier)}`
                : "",
              effect.shrewd_modifier
                ? `Shrewd ${signed(effect.shrewd_modifier)}`
                : "",
              effect.presence_modifier
                ? `Presence ${signed(effect.presence_modifier)}`
                : "",
              effect.max_health_modifier
                ? `Max HP ${signed(effect.max_health_modifier)}`
                : "",
            ].filter(Boolean);

            return (
              <div
                key={
                  effect.id
                }
                className="border border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-120d09))] p-3"
              >
                <p className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
                  {effect.source_type ===
                  "shape"
                    ? `Shape · Level ${effect.source_level}`
                    : effect.source_type ===
                        "feat"
                      ? "Feat"
                      : "Item"}
                  {" · "}
                  {
                    effect.source_name
                  }
                  {" · "}
                  {duration(
                    effect.expires_at,
                  )}
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map(
                    (
                      tag,
                      index,
                    ) => (
                      <span
                        key={`${effect.id}-${index}`}
                        className="border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-21170f))] px-2 py-1 text-[8px] uppercase tracking-[.08em] text-[rgb(var(--sep-colour-d9b77f))]"
                      >
                        {tag}
                      </span>
                    ),
                  )}
                </div>
              </div>
            );
          },
        )}
      </div>
    </section>
  );
}
