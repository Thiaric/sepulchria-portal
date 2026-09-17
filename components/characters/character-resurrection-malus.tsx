"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CharacterResurrectionMalus({
  characterId,
}: {
  characterId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [malus, setMalus] = useState<{
    name: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error } = await supabase
        .from("character_resurrection_maluses")
        .select(`
          narrative_text,
          malus:death_resurrection_maluses(name,description)
        `)
        .eq("character_id", characterId)
        .is("cleared_at", null)
        .order("applied_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(
          "Unable to load Resurrection Malus:",
          error.message,
        );
        return;
      }

      if (!active) return;

      if (!data) {
        setMalus(null);
        return;
      }

      const relation = Array.isArray(data.malus)
        ? data.malus[0] ?? null
        : data.malus;

      setMalus({
        name: String(relation?.name ?? "Resurrection Scar"),
        description: String(
          data.narrative_text ??
          relation?.description ??
          "",
        ),
      });
    }

    void load();

    const channel = supabase
      .channel(`character-resurrection-malus-${characterId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "character_resurrection_maluses",
          filter: `character_id=eq.${characterId}`,
        },
        () => void load(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [characterId, supabase]);

  if (!malus) return null;

  return (
    <section className="mt-4 border border-[rgb(var(--sep-colour-754137))]/45 bg-[rgb(var(--sep-colour-2b1714))]/55 p-4">
      <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-d28e82))]">
        Resurrection Malus
      </p>
      <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-e0c39a))]">
        {malus.name}
      </h3>
      <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-bc9d91))]">
        {malus.description}
      </p>
      <p className="mt-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-88756c))]">
        Lasting narrative scar · remains until changed or cleared by staff
      </p>
    </section>
  );
}
