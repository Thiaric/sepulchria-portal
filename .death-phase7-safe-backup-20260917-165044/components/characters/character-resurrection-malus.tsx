"use client";

import { useEffect, useState } from "react";

type Malus = {
  name: string;
  description: string;
};

export function CharacterResurrectionMalus({
  characterId,
}: {
  characterId: string;
}) {
  const [malus, setMalus] = useState<Malus | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch(
          `/api/death/maluses?ids=${encodeURIComponent(characterId)}`,
          { cache: "no-store" },
        );

        const payload = (await response.json()) as {
          maluses?: Record<string, Malus>;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(
            payload.error ?? "Unable to load Resurrection Malus.",
          );
        }

        if (active) {
          setMalus(payload.maluses?.[characterId] ?? null);
        }
      } catch (error) {
        console.error("Unable to load Resurrection Malus:", error);
      }
    }

    void load();

    const timer = window.setInterval(
      () => void load(),
      20_000,
    );

    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [characterId]);

  if (!malus) return null;

  return (
    <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/80 p-4 components_characters_character_resurrection_malus_section">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-8c704b))]">
          Resurrection Malus
        </p>

        <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8f8271))]">
          Permanent · until cleared by staff
        </p>
      </div>

      <p className="mt-3 font-serif text-sm text-[rgb(var(--sep-colour-d7bf94))]">
        {malus.name}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-[rgb(var(--sep-colour-c9b99d))]">
        {malus.description}
      </p>
    </section>
  );
}
