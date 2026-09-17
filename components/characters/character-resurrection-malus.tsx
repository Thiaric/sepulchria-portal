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
      1500,
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
