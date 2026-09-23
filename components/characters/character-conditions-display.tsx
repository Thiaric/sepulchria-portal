"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

type ConditionRow = {
  id: string;
  label: string;
};

export function CharacterConditionsDisplay({
  characterId,
}: {
  characterId: string;
}) {
  const [
    conditions,
    setConditions,
  ] =
    useState<
      ConditionRow[]
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
      } =
        await (supabase as any)
          .from(
            "character_effects",
          )
          .select(
            "id,conditions",
          )
          .eq(
            "target_character_id",
            characterId,
          )
          .is(
            "ended_at",
            null,
          )
          .is(
            "dispelled_at",
            null,
          )
          .or(
            `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`,
          )
          .order(
            "starts_at",
            {
              ascending: true,
            },
          );

      if (!active) {
        return;
      }

      if (error) {
        console.error(
          "Unable to load Character Conditions:",
          error.message,
        );
        return;
      }

      const next:
        ConditionRow[] = [];

      for (
        const row
        of data ?? []
      ) {
        const values =
          Array.isArray(
            row.conditions,
          )
            ? row.conditions
            : [];

        values.forEach(
          (
            raw: unknown,
            index: number,
          ) => {
            const label =
              String(
                raw,
              ).trim();

            if (label) {
              next.push({
                id:
                  `${row.id}:${index}`,
                label,
              });
            }
          },
        );
      }

      setConditions(next);
    }

    void load();

    const channel =
      (supabase as any)
        .channel(
          `condition-display-${characterId}-${crypto.randomUUID()}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "character_effects",
            filter:
              `target_character_id=eq.${characterId}`,
          },
          () =>
            void load(),
        )
        .subscribe();

    return () => {
      active = false;
      void (supabase as any)
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
      className="mt-2 flex flex-wrap items-center gap-1.5 components_characters_character_conditions_display_div_container"
    >
      <span className="mr-1 text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-796448))] components_characters_character_conditions_display_span_text">
        Conditions
      </span>

      {conditions.length ? (
        conditions.map(
          condition => (
            <span
              key={
                condition.id
              }
              className="border border-[rgb(var(--sep-skin-c1))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2 py-1 text-[8px] text-[rgb(var(--sep-skin-c2))] components_characters_character_conditions_display_span_text_2"
            >
              {
                condition.label
              }
            </span>
          ),
        )
      ) : (
        <span className="text-[8px] italic text-[rgb(var(--sep-colour-756957))] components_characters_character_conditions_display_span_text_3">
          None
        </span>
      )}
    </div>
  );
}
