"use client";

import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type CharacterExpertiseTotalProps = {
  characterId: string;
};

export function CharacterExpertiseTotal({
  characterId,
}: CharacterExpertiseTotalProps) {
  const [expertise, setExpertise] =
    useState<number | null>(null);

  const channelInstanceId =
    useRef(crypto.randomUUID());

  useEffect(() => {
    let cancelled = false;

    async function loadExpertise() {
      const supabase = createClient();

      const { data, error } =
        await supabase
          .from("characters")
          .select("expertise")
          .eq("id", characterId)
          .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        console.error(
          "Unable to load character Expertise:",
          error.message,
        );
        return;
      }

      setExpertise(
        Number(data?.expertise ?? 0),
      );
    }

    void loadExpertise();

    const supabase = createClient();

    const channel = supabase
      .channel(
        `character-expertise-${characterId}-${channelInstanceId.current}`,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "characters",
          filter: `id=eq.${characterId}`,
        },
        (payload) => {
          const nextValue = Number(
            payload.new?.expertise ?? 0,
          );

          if (
            !cancelled &&
            Number.isFinite(nextValue)
          ) {
            setExpertise(nextValue);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [characterId]);

  if (expertise === null) {
    return (
      <div>
        <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Expertise
        </p>
        <dd className="mt-1 text-sm text-[rgb(var(--sep-colour-7c7163))]">
          Loading…
        </dd>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
        Expertise
      </p>

      <dd className="mt-1 flex items-baseline gap-2">
        <span className="font-serif text-2xl text-[rgb(var(--sep-colour-e0c79d))]">
          {expertise.toFixed(1)}
        </span>

        <span className="text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-756957))]">
          points
        </span>
      </dd>
    </div>
  );
}
