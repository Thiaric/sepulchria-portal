"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import type {
  ActionState,
  CharacterAttributes,
} from "@/types/game";
import { counterOpposedAction } from "../opposed-actions";

const initialState: ActionState = {
  ok: false,
  message: "",
};

type PendingAction = {
  id: string;
  action_label: string;
  attack_total: number;
  allowed_counters: string[];
  attacker:
    | { display_name: string }
    | { display_name: string }[]
    | null;
};

const COUNTER_LABELS: Record<string, string> = {
  dodge: "Dodge — Reflexes",
  defend: "Defend — Vigour",
  resist_vigour: "Resist — Vigour",
  resist_shrewd: "Resist — Shrewd",
  resist_brains: "Resist — Brains",
  resist_presence: "Resist — Presence",
};

const COUNTER_ATTRIBUTES: Record<
  string,
  keyof CharacterAttributes
> = {
  dodge: "reflexes",
  defend: "vigor",
  resist_vigour: "vigor",
  resist_shrewd: "shrewd",
  resist_brains: "brains",
  resist_presence: "presence_score",
};

function signed(value: number) {
  return value >= 0 ? `+${value}` : String(value);
}

export function PendingOpposedActions({
  attributes,
}: {
  attributes: CharacterAttributes;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [pendingActions, setPendingActions] =
    useState<PendingAction[]>([]);
  const [state, action] = useActionState(
    counterOpposedAction,
    initialState,
  );

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: characterId } = await supabase.rpc(
        "my_character_id",
      );

      if (!active || !characterId) return;

      const { data } = await supabase
        .from("opposed_actions")
        .select(`
          id,
          action_label,
          attack_total,
          allowed_counters,
          attacker:characters!opposed_actions_attacker_character_id_fkey(display_name)
        `)
        .eq("target_character_id", characterId)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });

      if (active) {
        setPendingActions((data ?? []) as PendingAction[]);
      }
    }

    void load();

    const channel = supabase
      .channel(`opposed-actions-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "opposed_actions",
        },
        () => void load(),
      )
      .subscribe();

    const timer = window.setInterval(() => void load(), 3000);

    return () => {
      active = false;
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [supabase, state.submittedAt]);

  if (!pendingActions.length) return null;

  return (
    <div className="mb-2 space-y-2">
      {pendingActions.map((pendingAction) => {
        const attacker = Array.isArray(pendingAction.attacker)
          ? pendingAction.attacker[0] ?? null
          : pendingAction.attacker;

        return (
          <section
            key={pendingAction.id}
            className="border border-[#986a37]/60 bg-[#20140c] p-3"
          >
            <p className="text-[7px] uppercase tracking-[0.18em] text-[#b88c55]">
              Incoming Action
            </p>
            <p className="mt-1 font-serif text-base text-[#efd2a0]">
              {attacker?.display_name ?? "Someone"} —{" "}
              {pendingAction.action_label}
            </p>
            <p className="mt-1 text-[9px] text-[#a18d6e]">
              Action total: {pendingAction.attack_total}
            </p>

            <form action={action} className="mt-3 flex flex-wrap gap-2">
              <input
                type="hidden"
                name="opposed_action_id"
                value={pendingAction.id}
                readOnly
              />

              {pendingAction.allowed_counters.map((counter) => (
                <button
                  key={counter}
                  type="submit"
                  name="counter_kind"
                  value={counter}
                  className="border border-[#765937] bg-[#2a1c11] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[#dfc18f] transition hover:border-[#a47b48]"
                >
                  {COUNTER_LABELS[counter] ?? counter}
{" "}
(
{signed(
  Number(
    attributes[
      COUNTER_ATTRIBUTES[counter]
    ] ?? 0,
  ),
)}
)
                </button>
              ))}
            </form>
          </section>
        );
      })}

      {state.message ? (
        <p
          className={`text-xs ${
            state.ok ? "text-[#9bb58c]" : "text-[#d58d82]"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
