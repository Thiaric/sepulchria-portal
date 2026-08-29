import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type DisplayRow = {
  trophy_id: string;
  slot: number;
};

type TrophyDefinition = {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
};

export async function CharacterDisplayTrophies({
  characterId,
}: {
  characterId: string;
}) {
  const admin = createAdminClient();

  const { data: displayRows, error: displayError } =
    await admin
      .from("character_display_trophies")
      .select("trophy_id, slot")
      .eq("character_id", characterId)
      .order("slot", { ascending: true });

  if (displayError) {
    console.error(
      "Unable to load displayed Trophies:",
      displayError.message,
    );
    return null;
  }

  const rows = (displayRows ?? []) as DisplayRow[];

  if (!rows.length) {
    return null;
  }

  const trophyIds = rows.map((row) => row.trophy_id);

  const { data: definitions, error: definitionError } =
    await admin
      .from("trophy_definitions")
      .select("id, name, description, icon_url")
      .in("id", trophyIds)
      .eq("is_active", true);

  if (definitionError) {
    console.error(
      "Unable to load displayed Trophy definitions:",
      definitionError.message,
    );
    return null;
  }

  const byId = new Map(
    ((definitions ?? []) as TrophyDefinition[]).map(
      (trophy) => [trophy.id, trophy],
    ),
  );

  const trophies = rows
    .map((row) => ({
      slot: row.slot,
      trophy: byId.get(row.trophy_id) ?? null,
    }))
    .filter(
      (
        entry,
      ): entry is {
        slot: number;
        trophy: TrophyDefinition;
      } => entry.trophy !== null,
    );

  if (!trophies.length) {
    return null;
  }

  return (
    <span
      className="inline-flex flex-wrap items-center justify-end gap-1.5"
      aria-label="Displayed Trophies"
    >
      {trophies.map(({ slot, trophy }) => (
        <span
          key={`${slot}-${trophy.id}`}
          className="group relative inline-flex"
          tabIndex={0}
        >
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden bg-transparent">
            {trophy.icon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={trophy.icon_url}
                alt=""
                className="h-full w-full object-contain p-0.5"
              />
            ) : (
              <span
                aria-hidden="true"
                className="font-serif text-sm text-[rgb(var(--sep-colour-806e57))]"
              >
                ?
              </span>
            )}
          </span>

          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full right-0 z-40 mb-2 hidden w-56 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5 text-left group-hover:block group-focus:block group-focus-within:block"
          >
            <span className="block font-serif text-sm leading-5 text-[rgb(var(--sep-colour-e3c99a))]">
              {trophy.name}
            </span>

            <span className="mt-1 block text-[10px] leading-4 text-[rgb(var(--sep-colour-a99a84))]">
              {trophy.description}
            </span>
          </span>
        </span>
      ))}
    </span>
  );
}
