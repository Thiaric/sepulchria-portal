import "server-only";

import { getCharacterAttributeBreakdown } from "@/lib/characters/get-effective-character-attributes";
import { createClient } from "@/lib/supabase/server";

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
            breakdown.itemMaxHealth +
            breakdown.activeItemMaxHealth,
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
    <div className="space-y-4">
      <section className="border border-[#60482e]/45 bg-[#15100d]/95 p-5 sm:p-6">
        <h2 className="mt-[-8] font-serif text-2xl text-[#dec89f]">
          Attributes
        </h2>

        <div className="mt-5 grid gap-px bg-[#4f3b28]/35 sm:grid-cols-2">
          {DEFINITIONS.map(([key, label]) => {
            const entry = breakdown[key];

            return (
              <div
                key={key}
                className="bg-[#120e0b] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[8px] uppercase tracking-[0.16em] text-[#8b7455]">
                    {label}
                  </span>

                  <span className="group relative inline-flex">
                    <span
                      tabIndex={entry.base !== null ? 0 : -1}
                      className={`font-serif text-2xl text-[#e1c28d] ${
                        entry.base !== null
                          ? "cursor-help outline-none transition hover:text-[#f0d49f] focus:text-[#f0d49f]"
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
                        className="pointer-events-none absolute bottom-full right-0 z-30 mb-2 hidden w-max max-w-[340px] border border-[#765937]/70 bg-[#0b0806] px-3 py-2 text-left shadow-xl group-hover:block group-focus-within:block"
                      >
                        <span className="block whitespace-nowrap text-[7px] uppercase leading-4 tracking-[0.08em] text-[#756958]">
                          {entry.base} Base ·{" "}
                          <span className={entry.gifts === 0 ? "" : "text-[#b99765]"}>
                            {signed(entry.gifts)} Feats
                          </span>
                          {" · "}
                          <span className={entry.items === 0 ? "" : "text-[#b99765]"}>
                            {signed(entry.items)} Items
                          </span>
                          {" · "}
                          <span className={entry.activeItems === 0 ? "" : "text-emerald-400"}>
                            {signed(entry.activeItems)} Active Effects
                          </span>
                          {" = "}
                          <span className="text-[#99866a]">
                            {entry.adjustedBase} Adjusted Base
                          </span>
                        </span>

                        <span className="mt-0.5 block whitespace-nowrap text-[7px] uppercase leading-4 tracking-[0.08em] text-[#756958]">
                          {signed(entry.ancestry)} Ancestry ·{" "}
                          {signed(entry.order)} Order ={" "}
                          <span className="text-[#c8a879]">
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

        <p className="mt-3 text-center text-[7px] uppercase tracking-[0.12em] text-[#6f6252]">
          Hover over a number to see calculations
        </p>
      </section>

      <section className="border border-[#60482e]/45 bg-[#15100d]/95 p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="mt-[-8] font-serif text-2xl text-[#dec89f]">
            Health
          </h2>

          <p className="font-serif text-2xl text-[#e1c28d]">
            {currentHealth === null || maxHealth === null
              ? "—"
              : `${currentHealth} / ${maxHealth}`}
          </p>
        </div>

        <div className="mt-3 h-2 overflow-hidden border border-[#60482e]/45 bg-[#0d0907]">
          <div
            className="h-full bg-gradient-to-r from-[#7b2f2a] via-[#a94f3f] to-[#c26a50] transition-[width] duration-300"
            style={{ width: `${healthPercentage}%` }}
          />
        </div>

        {maxHealth !== null ? (
          <p className="mt-2 text-[8px] uppercase tracking-[0.14em] text-[#776957]">
            Maximum Health = Effective Vigour × 10
            {breakdown.itemMaxHealth !== 0
              ? ` ${signed(breakdown.itemMaxHealth)} Passive Item Max Health`
              : ""}
            {breakdown.activeItemMaxHealth !== 0
              ? ` ${signed(breakdown.activeItemMaxHealth)} Active Item Max Health`
              : ""}
          </p>
        ) : null}
      </section>
    </div>
  );
}
