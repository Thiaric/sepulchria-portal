"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";
import type {
  CharacterCondition,
} from "@/types/game";

export function CharacterConditionsDisplay({
  characterId,
}: {
  characterId: string;
}) {
  const [
    conditions,
    setConditions,
  ] = useState<
    CharacterCondition[]
  >([]);

  const supabase =
    useMemo(
      () => createClient(),
      [],
    );

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data,
        error,
      } = await supabase
        .from(
          "character_conditions",
        )
        .select(
          "id, character_id, label, created_at",
        )
        .eq(
          "character_id",
          characterId,
        )
        .order(
          "created_at",
          {
            ascending: true,
          },
        )
        .order(
          "id",
          {
            ascending: true,
          },
        );

      if (
        !active
      ) {
        return;
      }

      if (error) {
        console.error(
          "Unable to load Character Conditions:",
          error.message,
        );
        return;
      }

      setConditions(
        (data ?? []) as
          CharacterCondition[],
      );
    }

    void load();

    const channel =
      supabase
        .channel(
          `condition-display-${characterId}-${crypto.randomUUID()}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "character_conditions",
            filter:
              `character_id=eq.${characterId}`,
          },
          () => {
            void load();
          },
        )
        .subscribe();

    return () => {
      active = false;

      void supabase
        .removeChannel(
          channel,
        );
    };
  }, [
    characterId,
    supabase,
  ]);

  return (
    <div
      data-character-conditions-display="true"
      className="mt-2 flex flex-wrap items-center gap-1.5"
    >
      <span className="mr-1 text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-796448))]">
        Conditions
      </span>

      {conditions.length ? (
        conditions.map(
          (condition) => (
            <span
              key={condition.id}
              className="border border-[rgb(var(--sep-skin-c1))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2 py-1 text-[8px] text-[rgb(var(--sep-skin-c2))]"
            >
              {
                condition.label
              }
            </span>
          ),
        )
      ) : (
        <span className="text-[8px] italic text-[rgb(var(--sep-colour-756957))]">
          None
        </span>
      )}
    </div>
  );
}
