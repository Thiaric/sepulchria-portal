"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";
import {
  canDispelEffect,
  type DispelSourceType,
} from "@/lib/effects/dispel-rules";

type Row = {
  id: string;
  source_type:
    | "shape"
    | "feat"
    | "item"
    | "manual";
  source_name: string;
  source_level: number;
  effect_nature: string;
  conditions: string[];
  dispellable: boolean;
};

export function EffectDispelPicker({
  targetCharacterId,
  dispelSourceType,
  inputName,
  dispelLevel = 1,
}: {
  targetCharacterId: string;
  dispelSourceType:
    DispelSourceType;
  inputName: string;
  dispelLevel?: number;
}) {
  const db =
    useMemo(
      () => createClient(),
      [],
    );

  const [
    rows,
    setRows,
  ] =
    useState<Row[]>([]);

  const [
    selected,
    setSelected,
  ] =
    useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      if (
        !targetCharacterId
      ) {
        if (active) {
          setRows([]);
          setSelected("");
        }
        return;
      }

      const {
        data,
        error,
      } =
        await (db as any)
          .from(
            "character_effects",
          )
          .select(
            "id,source_type,source_name,source_level,effect_nature,conditions,dispellable,expires_at",
          )
          .eq(
            "target_character_id",
            targetCharacterId,
          )
          .eq(
            "dispellable",
            true,
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
          );

      if (
        !active
      ) {
        return;
      }

      if (error) {
        setRows([]);
        setSelected("");
        return;
      }

      const eligible =
        (
          data ?? []
        ).filter(
          (row: any) =>
            canDispelEffect({
              dispelSourceType,
              dispelLevel,
              effectSourceType:
                row.source_type,
              effectLevel:
                Number(
                  row.source_level ??
                    1,
                ),
            }),
        ) as Row[];

      setRows(
        eligible,
      );

      setSelected(
        current =>
          eligible.some(
            row =>
              row.id ===
              current,
          )
            ? current
            : "",
      );
    }

    void load();

    const channel =
      (db as any)
        .channel(
          `effect-dispel-${targetCharacterId}-${crypto.randomUUID()}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "character_effects",
            filter:
              `target_character_id=eq.${targetCharacterId}`,
          },
          () =>
            void load(),
        )
        .subscribe();

    return () => {
      active = false;
      void (db as any)
        .removeChannel(
          channel,
        );
    };
  }, [
    db,
    dispelLevel,
    dispelSourceType,
    targetCharacterId,
  ]);

  return (
    <div className="mt-3 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3">
      <input
        type="hidden"
        name={inputName}
        value={selected}
        readOnly
      />

      <p className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
        Effect to Dispel
      </p>

      {rows.length ? (
        <div className="mt-2 space-y-1.5">
          {rows.map(
            effect => (
              <button
                key={
                  effect.id
                }
                type="button"
                onClick={() =>
                  setSelected(
                    effect.id,
                  )
                }
                className={`block w-full border px-3 py-2 text-left text-[9px] ${
                  selected ===
                  effect.id
                    ? "border-[rgb(var(--sep-colour-a17a49))] bg-[rgb(var(--sep-colour-342617))] text-[rgb(var(--sep-colour-efd4a0))]"
                    : "border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-21170f))] text-[rgb(var(--sep-colour-d9bd91))]"
                }`}
              >
                {effect.source_name}
                {" · "}
                {effect.source_type ===
                "shape"
                  ? `Shape Level ${effect.source_level}`
                  : effect.source_type ===
                      "feat"
                    ? "Feat"
                    : "Item"}
                {" · "}
                {
                  effect.effect_nature
                }
                {effect.conditions?.length
                  ? ` · ${effect.conditions.join(", ")}`
                  : ""}
              </button>
            ),
          )}
        </div>
      ) : (
        <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-887865))]">
          No eligible active effects.
        </p>
      )}
    </div>
  );
}
