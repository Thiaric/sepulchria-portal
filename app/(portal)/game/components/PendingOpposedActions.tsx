"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { ActionState, CharacterAttributes } from "@/types/game";
import { loadMyEffectiveAttributes } from "../deferred-actions";
import { counterOpposedAction } from "../opposed-actions";

const initialState: ActionState = { ok: false, message: "" };

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

const COUNTER_ATTRIBUTES: Record<string, keyof CharacterAttributes> = {
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

export function PendingOpposedActions() {
  const supabase = useMemo(() => createClient(), []);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [attributes, setAttributes] =
    useState<CharacterAttributes | null>(null);
  const [state, action] = useActionState(counterOpposedAction, initialState);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: characterId } =
        await supabase.rpc("my_character_id");
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
    const timer = window.setInterval(() => void load(), 3000);
    const channel = supabase
      .channel(`opposed-actions-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "opposed_actions" },
        () => void load(),
      )
      .subscribe();

    return () => {
      active = false;
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [supabase, state.submittedAt]);

  useEffect(() => {
    if (!pendingActions.length || attributes) return;
    let active = true;

    void loadMyEffectiveAttributes()
      .then((result) => {
        if (active) setAttributes(result.attributes);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [pendingActions.length, attributes]);

  if (!pendingActions.length) return null;

  return (
    <div className="mb-2 space-y-2 game_components_pendingopposedactions_div_container">
      {pendingActions.map((pendingAction) => {
        const attacker = Array.isArray(pendingAction.attacker)
          ? pendingAction.attacker[0] ?? null
          : pendingAction.attacker;

        return (
          <section
            key={pendingAction.id}
            className="border border-[rgb(var(--sep-colour-986a37))]/60 bg-[rgb(var(--sep-colour-20140c))] p-3 game_components_pendingopposedactions_section_section"
          >
            <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-b88c55))] game_components_pendingopposedactions_p_text">
              Incoming Action
            </p>
            <p className="mt-1 font-serif text-base text-[rgb(var(--sep-colour-efd2a0))] game_components_pendingopposedactions_p_text_2">
              {attacker?.display_name ?? "Someone"} — {pendingAction.action_label}
            </p>
            <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-a18d6e))] game_components_pendingopposedactions_p_text_3">
              Action total: {pendingAction.attack_total}
            </p>

            <form action={action} className="mt-3 flex flex-wrap gap-2 game_components_pendingopposedactions_form_action">
              <input className="game_components_pendingopposedactions_input_opposed_action_id"
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
                  className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-dfc18f))] transition hover:border-[rgb(var(--sep-colour-a47b48))] game_components_pendingopposedactions_button_counter_kind"
                >
                  {COUNTER_LABELS[counter] ?? counter} (
                  {attributes
                    ? signed(
                        Number(
                          attributes[COUNTER_ATTRIBUTES[counter]] ?? 0,
                        ),
                      )
                    : "…"}
                  )
                </button>
              ))}

              <button
                type="submit"
                name="counter_kind"
                value="__do_nothing__"
                className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-2a1c11))] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-dfc18f))] transition hover:border-[rgb(var(--sep-colour-a47b48))] game_components_pendingopposedactions_button_do_nothing"
              >
                Do nothing
              </button>
            </form>
          </section>
        );
      })}

      {state.message ? (
        <p
          className={[((`text-xs ${
            state.ok
              ? "text-[rgb(var(--sep-colour-9bb58c))]"
              : "text-[rgb(var(--sep-colour-d58d82))]"
          }`)), "game_components_pendingopposedactions_p_text_4"].filter(Boolean).join(" ")}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
