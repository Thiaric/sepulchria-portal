import "server-only";

import {
  getCharacterActiveItemEffects,
  itemEffectDuration,
} from "@/lib/items/active-item-effects";

const signed = (
  value: number,
) =>
  value > 0
    ? `+${value}`
    : String(value);

export async function ActiveItemEffects({
  characterId,
}: {
  characterId: string;
}) {
  const rows =
    await getCharacterActiveItemEffects(
      characterId,
    );

  if (!rows.length) {
    return null;
  }

  return (
    <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-5 sm:p-6 components_characters_activeitemeffects_section_active_item_effects">
      <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-dec89f))] components_characters_activeitemeffects_h2_active_item_effects">
        Active Item Effects
      </h2>

      <div className="mt-4 flex flex-wrap gap-2 components_characters_activeitemeffects_div_active_item_effects">
        {rows.flatMap(
          (effect) => {
            const tags = [
              ...(
                effect.conditions ??
                []
              ),
              effect.muscles_modifier
                ? `Muscles ${signed(
                    effect.muscles_modifier,
                  )}`
                : "",
              effect.reflexes_modifier
                ? `Reflexes ${signed(
                    effect.reflexes_modifier,
                  )}`
                : "",
              effect.vigour_modifier
                ? `Vigour ${signed(
                    effect.vigour_modifier,
                  )}`
                : "",
              effect.brains_modifier
                ? `Brains ${signed(
                    effect.brains_modifier,
                  )}`
                : "",
              effect.shrewd_modifier
                ? `Shrewd ${signed(
                    effect.shrewd_modifier,
                  )}`
                : "",
              effect.presence_modifier
                ? `Presence ${signed(
                    effect.presence_modifier,
                  )}`
                : "",
              effect.max_health_modifier
                ? `Max HP ${signed(
                    effect.max_health_modifier,
                  )}`
                : "",
              effect.warping_affinity_modifier
                ? `Affinity ${signed(
                    effect.warping_affinity_modifier,
                  )}`
                : "",
              effect.warps_per_day_modifier
                ? `Shapes/day ${signed(
                    effect.warps_per_day_modifier,
                  )}`
                : "",
            ].filter(Boolean);

            return tags.map(
              (tag, index) => (
                <span
                  key={`${effect.id}-${index}`}
                  title={`${effect.source_name} · ${itemEffectDuration(
                    effect,
                  )}`}
                  className="border border-[rgb(var(--sep-colour-765937))]/70 bg-[rgb(var(--sep-colour-21170f))] px-2 py-1 text-[8px] uppercase tracking-[.08em] text-[rgb(var(--sep-colour-d9b77f))] components_characters_activeitemeffects_span_text"
                >
                  {tag}
                </span>
              ),
            );
          },
        )}
      </div>
    </section>
  );
}
