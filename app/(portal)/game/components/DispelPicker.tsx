"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  prepareDispelEffect,
  type WarpingActionState,
} from "../warping-actions";

const initial: WarpingActionState = { ok: false, message: "" };

export function DispelPicker({
  castId,
  targetCharacterId,
  targetName,
  onDone,
}: {
  castId: string;
  targetCharacterId: string;
  targetName: string;
  onDone: () => void;
}) {
  const db = useMemo(() => createClient(), []);
  const [effects, setEffects] = useState<any[]>([]);
  const [state, action] = useActionState(prepareDispelEffect, initial);

  useEffect(() => {
    let active = true;

    async function load() {
      const result = await db.rpc(
        "get_character_active_shape_effects",
        { p_character_id: targetCharacterId },
      );

      if (active) {
        setEffects(result.data ?? []);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [db, castId, targetCharacterId, state.submittedAt]);

  return (
    <div className="mt-3 border border-[#765937]/60 bg-[#17100b] p-3">
      <p className="text-[8px] uppercase tracking-[0.16em] text-[#b88c55]">
        Choose effect to dispel from {targetName}
      </p>

      <form action={action} className="mt-2 space-y-2">
        <input type="hidden" name="cast_id" value={castId} />
        <input
          type="hidden"
          name="target_character_id"
          value={targetCharacterId}
        />

        {effects.length ? (
          effects.map((effect) => (
            <button
              key={effect.id}
              type="submit"
              name="effect_id"
              value={effect.id}
              className="block w-full border border-[#60482e]/55 bg-[#21170f] px-3 py-2 text-left text-[9px] text-[#d9bd91] transition hover:border-[#9b7446]"
            >
              {effect.shape_name} · Level {effect.shape_level} ·{" "}
              {effect.effect_nature} ·{" "}
              {(effect.conditions ?? []).join(", ") ||
                "attribute / Health effect"}
            </button>
          ))
        ) : (
          <p className="text-[9px] text-[#887865]">
            No active Shape effects on this character.
          </p>
        )}
      </form>

      {state.message ? (
        <p className="mt-2 text-[9px] text-[#c9b18a]">
          {state.message}
        </p>
      ) : null}

      {state.ok ? (
        <button
          type="button"
          onClick={onDone}
          className="mt-2 text-[8px] uppercase text-[#d6b37d]"
        >
          Done
        </button>
      ) : null}
    </div>
  );
}
