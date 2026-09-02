import "server-only";

import { getCharacterAttributeBreakdown } from "@/lib/characters/get-effective-character-attributes";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveCharacterWarping } from "@/lib/warping/get-effective-character-warping";
import { ActiveShapeEffects } from "@/components/characters/ActiveShapeEffects";
import { ActivePriceEffects } from "@/components/characters/ActivePriceEffects";

const DEFINITIONS = [
  ["muscles", "Muscles"],
  ["reflexes", "Reflexes"],
  ["vigor", "Vigour"],
  ["shrewd", "Shrewd"],
  ["brains", "Brains"],
  ["presence_score", "Presence"],
] as const;

function signed(value: number) {
  return value >= 0 ? `+${value}` : String(value);
}

export async function CharacterMechanicsDisplay({
  characterId,
}: {
  characterId: string;
}) {
  const supabase = await createClient();

  const { data: character, error } = await supabase
    .from("characters")
    .select(
      "muscles, reflexes, vigor, brains, shrewd, presence_score, current_health",
    )
    .eq("id", characterId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load character mechanics: ${error.message}`,
    );
  }

  if (!character) {
    return null;
  }

  const warping = await getEffectiveCharacterWarping(characterId);

  const breakdown = await getCharacterAttributeBreakdown(
    characterId,
    {
      muscles: character.muscles,
      reflexes: character.reflexes,
      vigor: character.vigor,
      brains: character.brains,
      shrewd: character.shrewd,
      presence_score: character.presence_score,
    },
  );


  return (
    <div className="space-y-4">
      <ActivePriceEffects characterId={characterId} />
      <ActiveShapeEffects characterId={characterId} />
            <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-5 sm:p-6">
        <h2 className="font-serif text-[0.9rem] text-[rgb(var(--sep-colour-dec89f))]">Warping</h2>

        <div className="mt-5 grid gap-px bg-[rgb(var(--sep-colour-4f3b28))]/35 sm:grid-cols-2">
          <div className="bg-[rgb(var(--sep-colour-120e0b))] px-4 py-3">
            <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8b7455))]">
              Current Affinity
            </p>
            <p className="mt-1 font-serif text-[0.9rem] text-[rgb(var(--sep-colour-e1c28d))]">
              {warping.affinity}
            </p>
            <p className="mt-1 text-[7px] uppercase tracking-[0.08em] text-[rgb(var(--sep-colour-756958))]">
              {warping.baseAffinity} Base · {signed(warping.itemAffinity)} Items · {signed(warping.featAffinity)} Feats
            </p>
          </div>

          <div className="bg-[rgb(var(--sep-colour-120e0b))] px-4 py-3">
            <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8b7455))]">
              Shapes per day
            </p>
            <p className="mt-1 font-serif text-[0.9rem] text-[rgb(var(--sep-colour-e1c28d))]">
              {warping.warpsPerDay}
            </p>
            <p className="mt-1 text-[7px] uppercase tracking-[0.08em] text-[rgb(var(--sep-colour-756958))]">
              {warping.baseWarpsPerDay} Base · {signed(warping.itemWarpsPerDay)} Items · {signed(warping.featWarpsPerDay)} Feats
            </p>
          </div>
        </div>
      </section>

<section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-5 sm:p-6">
        <h2 className="mt-[-8] font-serif text-[0.9rem] text-[rgb(var(--sep-colour-dec89f))]">
          Attributes
        </h2>

        <div className="mt-5 grid gap-px bg-[rgb(var(--sep-colour-4f3b28))]/35 sm:grid-cols-2">
          {DEFINITIONS.map(([key, label]) => {
            const entry = breakdown[key];

            return (
              <div
                key={key}
                className="bg-[rgb(var(--sep-colour-120e0b))] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8b7455))]">
                    {label}
                  </span>

                  <span className="group relative inline-flex">
                    <span
                      tabIndex={entry.base !== null ? 0 : -1}
                      className={`font-serif text-[0.9rem] text-[rgb(var(--sep-colour-e1c28d))] ${
                        entry.base !== null
                          ? "cursor-help outline-none transition hover:text-[rgb(var(--sep-colour-f0d49f))] focus:text-[rgb(var(--sep-colour-f0d49f))]"
                          : ""
                      }`}
                      aria-label={
                        entry.base !== null
                          ? `${label}: ${entry.effective}. Hover or focus to see calculations.`
                          : `${label}: unavailable`
                      }
                    >
                      {entry.effective ?? "—"}
                    </span>

                    {entry.base !== null ? (
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full right-0 z-30 mb-2 hidden w-72 max-w-[calc(100vw-2rem)] border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-left group-hover:block group-focus-within:block"
                      >
                        <span className="block whitespace-normal break-words text-[7px] uppercase leading-4 tracking-[0.08em] text-[rgb(var(--sep-colour-756958))]">
                          {entry.base} Base ·{" "}
                          <span className={entry.gifts === 0 ? "" : "text-[rgb(var(--sep-colour-b99765))]"}>
                            {signed(entry.gifts)} Feats
                          </span>
                          {" · "}
                          <span className={entry.items === 0 ? "" : "text-[rgb(var(--sep-colour-b99765))]"}>
                            {signed(entry.items)} Items
                          </span>
                          {" · "}
                          <span className={entry.activeItems === 0 ? "" : "text-emerald-400"}>
                            {signed(entry.activeItems)} Active Item Effects
                          </span>
                          {" · "}
                          <span className={entry.shapes === 0 ? "" : "text-[rgb(var(--sep-colour-c59ae8))]"}>
                            {signed(entry.shapes)} Shapes
                          </span>
                          {" = "}
                          <span className="text-[rgb(var(--sep-colour-99866a))]">
                            {entry.adjustedBase} Adjusted Base
                          </span>
                        </span>

                        <span className="mt-1 block whitespace-normal break-words text-[7px] uppercase leading-4 tracking-[0.08em] text-[rgb(var(--sep-colour-756958))]">
                          {signed(entry.ancestry)} Ancestry ·{" "}
                          {signed(entry.order)} Order ={" "}
                          <span className="text-[rgb(var(--sep-colour-c8a879))]">
                            {entry.effective} Effective
                          </span>
                        </span>
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-center text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6252))]">
          Hover over a number to see calculations
        </p>
      </section>

    </div>
  );
}

export async function CharacterHealthDisplay({
  characterId,
}: {
  characterId: string;
}) {
  const supabase = await createClient();

  const { data: character, error } = await supabase
    .from("characters")
    .select(
      "muscles, reflexes, vigor, brains, shrewd, presence_score, current_health",
    )
    .eq("id", characterId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load character health: ${error.message}`,
    );
  }

  if (!character) {
    return null;
  }

  const breakdown = await getCharacterAttributeBreakdown(
    characterId,
    {
      muscles: character.muscles,
      reflexes: character.reflexes,
      vigor: character.vigor,
      brains: character.brains,
      shrewd: character.shrewd,
      presence_score: character.presence_score,
    },
  );

  const maxHealth =
    breakdown.vigor.effective === null
      ? null
      : Math.max(
          0,
          breakdown.vigor.effective * 10 +
            breakdown.giftMaxHealth +
            breakdown.itemMaxHealth +
            breakdown.activeItemMaxHealth +
            breakdown.shapeMaxHealth,
        );

  const currentHealth =
    maxHealth === null
      ? null
      : Math.max(
          0,
          Math.min(
            character.current_health ?? maxHealth,
            maxHealth,
          ),
        );

  const healthPercentage =
    maxHealth && currentHealth !== null
      ? Math.round((currentHealth / maxHealth) * 100)
      : 0;

  return (
    <section className="flex h-full min-h-[88px] flex-col justify-center border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 px-4 py-3">
      <div className="flex items-end justify-between gap-4">
        <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Health
        </p>

        <p className="font-serif text-xl text-[rgb(var(--sep-colour-e1c28d))]">
          {currentHealth === null || maxHealth === null
            ? "—"
            : `${currentHealth} / ${maxHealth}`}
        </p>
      </div>

      <div className="mt-2 h-2 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0907))]">
        <div
          className="h-full bg-gradient-to-r from-[rgb(var(--sep-colour-7b2f2a))] via-[rgb(var(--sep-colour-a94f3f))] to-[rgb(var(--sep-colour-c26a50))] transition-[width] duration-300"
          style={{ width: `${healthPercentage}%` }}
        />
      </div>

      {maxHealth !== null ? (
        <p className="mt-2 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-776957))]">
          Maximum = Effective Vigour × 10
          {breakdown.giftMaxHealth !== 0
            ? ` ${signed(breakdown.giftMaxHealth)} Feat`
            : ""}
          {breakdown.itemMaxHealth !== 0
            ? ` ${signed(breakdown.itemMaxHealth)} Item`
            : ""}
          {breakdown.activeItemMaxHealth !== 0
            ? ` ${signed(breakdown.activeItemMaxHealth)} Active Item`
            : ""}
          {breakdown.shapeMaxHealth !== 0
            ? ` ${signed(breakdown.shapeMaxHealth)} Shape`
            : ""}
        </p>
      ) : null}
    </section>
  );
}
