import "server-only";

import { saveDisplayTrophies } from "@/app/(portal)/character/actions";
import { PendingSubmitButton } from "@/components/forms/pending-submit-button";
import { createAdminClient } from "@/lib/supabase/admin";

type EarnedRow = {
  trophy_id: string;
};

type DisplayRow = {
  trophy_id: string;
  slot: number;
};

type TrophyDefinition = {
  id: string;
  name: string;
  category: string;
  sort_order: number;
};

export async function DisplayTrophySelector({
  characterId,
}: {
  characterId: string;
}) {
  const admin = createAdminClient();

  const [earnedResult, selectedResult] =
    await Promise.all([
      admin
        .from("character_trophies")
        .select("trophy_id")
        .eq("character_id", characterId),
      admin
        .from("character_display_trophies")
        .select("trophy_id, slot")
        .eq("character_id", characterId)
        .order("slot", { ascending: true }),
    ]);

  if (earnedResult.error) {
    throw new Error(
      `Unable to load earned Trophies: ${earnedResult.error.message}`,
    );
  }

  if (selectedResult.error) {
    throw new Error(
      `Unable to load displayed Trophies: ${selectedResult.error.message}`,
    );
  }

  const earnedIds = (
    (earnedResult.data ?? []) as EarnedRow[]
  ).map((row) => row.trophy_id);

  const selectedRows =
    (selectedResult.data ?? []) as DisplayRow[];

  let trophies: TrophyDefinition[] = [];

  if (earnedIds.length) {
    const { data, error } = await admin
      .from("trophy_definitions")
      .select("id, name, category, sort_order")
      .in("id", earnedIds)
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      throw new Error(
        `Unable to load Trophy options: ${error.message}`,
      );
    }

    trophies = (data ?? []) as TrophyDefinition[];
  }

  const selectedBySlot = new Map(
    selectedRows.map((row) => [
      row.slot,
      row.trophy_id,
    ]),
  );

  return (
    <section className="mt-4 border border-[rgb(var(--sep-colour-6b5032))]/50 bg-[rgb(var(--sep-colour-17110d))]">
      <div className="px-4 py-3 sm:px-5">
        <h2 className="font-serif text-lg text-[rgb(var(--sep-colour-dfc79c))] sm:text-xl">
          Display Trophies
        </h2>

        <p className="mt-1 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          Choose up to five earned Trophies to display
          beside your character&apos;s name. Slot order
          controls their display order.
        </p>
      </div>

      <div className="border-t border-[rgb(var(--sep-colour-5d452d))]/40 px-4 py-5 sm:px-5">
        {trophies.length ? (
          <form
            action={saveDisplayTrophies}
            className="space-y-4"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[1, 2, 3, 4, 5].map((slot) => (
                <label key={slot} className="block">
                  <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                    Slot {slot}
                  </span>

                  <select
                    name={`display_trophy_${slot}`}
                    defaultValue={
                      selectedBySlot.get(slot) ?? ""
                    }
                    className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-[11px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
                  >
                    <option value="">None</option>

                    {trophies.map((trophy) => (
                      <option
                        key={trophy.id}
                        value={trophy.id}
                      >
                        {trophy.category} — {trophy.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <p className="text-[9px] leading-4 text-[rgb(var(--sep-colour-756957))]">
              Only Trophies this character has already
              earned can be selected.
            </p>

            <div className="flex justify-end border-t border-[rgb(var(--sep-colour-5d452d))]/40 pt-4">
              <PendingSubmitButton
                idleText="Save display Trophies"
                pendingText="Saving Trophies..."
                className="border border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))] px-5 py-2.5 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd9aa))] transition hover:bg-[rgb(var(--sep-colour-49351f))] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </form>
        ) : (
          <p className="text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
            Earn a Trophy before choosing Display Trophies.
          </p>
        )}
      </div>
    </section>
  );
}
