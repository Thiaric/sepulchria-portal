"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  acceptCharacterDeath,
  getMyDeathState,
  type MyDeathState,
  useDeathRescueFeat,
} from "../death-actions";

const ALIVE: MyDeathState = {
  lifeState: "alive",
  currentHealth: null,
  zeroHpAt: null,
  deadUntil: null,
  eventId: null,
  rescueAttempted: false,
  rescueFeats: [],
};

export function CharacterDeathGate({ characterId }: { characterId: string }) {
  const [state, setState] = useState<MyDeathState>(ALIVE);
  const [status, setStatus] = useState("");
  const [pending, startTransition] = useTransition();
  const supabase = useMemo(() => createClient(), []);

  const refresh = useCallback(async () => {
    try {
      setState(await getMyDeathState());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load Death state.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    void refresh();

    const channel = supabase
      .channel(`death-gate-${characterId}-${crypto.randomUUID()}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "characters",
        filter: `id=eq.${characterId}`,
      }, () => {
        if (active) void refresh();
      })
      .subscribe();

    const timer = window.setInterval(() => {
      if (active) void refresh();
    }, 30_000);

    return () => {
      active = false;
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [characterId, refresh, supabase]);

  if (state.lifeState === "alive") return null;

  if (state.lifeState === "dead") {
    const until = state.deadUntil
      ? new Intl.DateTimeFormat("en-GB", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(state.deadUntil))
      : null;

    return (
      <div className="mb-2 border border-[rgb(var(--sep-colour-754137))]/55 bg-[rgb(var(--sep-colour-2b1714))] px-3 py-2.5">
        <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-d28e82))]">
          Character Dead
        </p>
        <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-bc9d91))]">
          {until ? `This Character remains dead until ${until}.` : "This Character is dead."}
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-4">
      <section className="w-full max-w-xl border border-[rgb(var(--sep-colour-bd8d4d))]/65 bg-[rgb(var(--sep-colour-100c09))] p-5 shadow-2xl">
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-bd8d4d))]">
          Death&apos;s Threshold
        </p>
        <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-ead5ac))]">
          Your Health has reached 0
        </h2>
        <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-a99a84))]">
          You have exactly one opportunity to use one eligible Feat to prevent Death.
          If the Feat fails, or you accept Death, the Character becomes dead.
        </p>

        {state.rescueFeats.length ? (
          <div className="mt-4 space-y-2">
            {state.rescueFeats.map((feat) => (
              <button
                key={feat.characterGiftId}
                type="button"
                disabled={pending || !state.eventId}
                onClick={() => {
                  if (!state.eventId) return;
                  startTransition(async () => {
                    const result = await useDeathRescueFeat(
                      state.eventId!,
                      feat.characterGiftId,
                    );
                    setStatus(result.message);
                    await refresh();
                  });
                }}
                className="block w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-17110d))] px-4 py-3 text-left transition hover:border-[rgb(var(--sep-colour-a17a49))] hover:bg-[rgb(var(--sep-colour-21190f))] disabled:cursor-wait disabled:opacity-50"
              >
                <span className="block font-serif text-sm text-[rgb(var(--sep-colour-e1c99d))]">
                  {feat.name}
                </span>
                <span className="mt-1 block text-[9px] leading-4 text-[rgb(var(--sep-colour-8f8170))]">
                  {feat.description || "No description"}
                </span>
                <span className="mt-1.5 block text-[8px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-b99765))]">
                  Health +{feat.healthDelta}
                  {feat.successDie
                    ? ` · d${feat.successDie} vs ${feat.successThreshold ?? "?"}`
                    : " · Automatic"}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))] px-3 py-3 text-[10px] text-[rgb(var(--sep-colour-8f8170))]">
            No eligible rescue Feat is available.
          </p>
        )}

        {status ? (
          <p className="mt-3 text-[10px] text-[rgb(var(--sep-colour-d3b486))]">{status}</p>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await acceptCharacterDeath();
                setStatus(result.message);
                await refresh();
              });
            }}
            className="border border-[rgb(var(--sep-colour-754137))]/70 bg-[rgb(var(--sep-colour-2b1714))] px-4 py-2.5 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d28e82))] transition hover:bg-[rgb(var(--sep-colour-3a1c17))] disabled:cursor-wait disabled:opacity-50"
          >
            Accept Death
          </button>
        </div>
      </section>
    </div>
  );
}
