"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type LifeState = "alive" | "death_save_pending" | "dead";
type Snapshot = { lifeState: LifeState; deadUntil: string | null };

function GhostIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}
      fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 19.5V10a6.5 6.5 0 0 1 13 0v9.5l-2.7-1.9-2.1 2-1.7-2-1.7 2-2.1-2-2.7 1.9Z" />
      <path d="M9.2 10.2h.01M14.8 10.2h.01" />
      <path d="M9.8 13.6c1.4 1 3 1 4.4 0" />
    </svg>
  );
}

function useLifeState(characterId: string): Snapshot {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    lifeState: "alive",
    deadUntil: null,
  });
  const [, setTick] = useState(0);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error } = await supabase
        .from("characters")
        .select("life_state,dead_until")
        .eq("id", characterId)
        .maybeSingle();

      if (!active || error || !data) return;

      const row = data as unknown as {
        life_state?: LifeState | null;
        dead_until?: string | null;
      };

      setSnapshot({
        lifeState: row.life_state ?? "alive",
        deadUntil: row.dead_until ?? null,
      });
    }

    void load();

    const channel = supabase
      .channel(`life-${characterId}-${crypto.randomUUID()}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "characters",
        filter: `id=eq.${characterId}`,
      }, () => void load())
      .subscribe();

    const timer = window.setInterval(() => setTick((n) => n + 1), 30_000);

    return () => {
      active = false;
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [characterId, supabase]);

  return snapshot;
}

function currentlyDead(snapshot: Snapshot) {
  if (snapshot.lifeState !== "dead") return false;
  if (!snapshot.deadUntil) return true;
  const expiry = Date.parse(snapshot.deadUntil);
  return Number.isNaN(expiry) || expiry > Date.now();
}

export function CharacterLifeIcon({
  characterId,
  raceIconUrl,
  raceName,
  className = "h-4 w-4",
}: {
  characterId: string;
  raceIconUrl: string | null;
  raceName: string | null;
  className?: string;
}) {
  const snapshot = useLifeState(characterId);

  if (currentlyDead(snapshot)) {
    return (
      <span title="Dead" aria-label="Dead"
        className="inline-flex text-[rgb(var(--sep-colour-c6ab80))]">
        <GhostIcon className={className} />
      </span>
    );
  }

  if (!raceIconUrl) return <span className={className} aria-hidden="true" />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={raceIconUrl}
      alt={raceName ?? "Ancestry"}
      title={raceName ? `Ancestry: ${raceName}` : "Ancestry"}
      className={`${className} object-contain`}
    />
  );
}

export function CharacterLifeStateBadge({ characterId }: { characterId: string }) {
  const snapshot = useLifeState(characterId);

  if (snapshot.lifeState === "alive") return null;

  if (snapshot.lifeState === "death_save_pending") {
    return (
      <div className="mt-2 inline-flex items-center gap-2 border border-[rgb(var(--sep-colour-bd8d4d))]/45 bg-[rgb(var(--sep-colour-21170f))]/80 px-2.5 py-1.5 text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-d8bf91))]">
        ◇ Death&apos;s Threshold
      </div>
    );
  }

  const until = snapshot.deadUntil
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(snapshot.deadUntil))
    : null;

  return (
    <div className="mt-2 inline-flex items-center gap-2 border border-[rgb(var(--sep-colour-754137))]/55 bg-[rgb(var(--sep-colour-2b1714))]/85 px-2.5 py-1.5 text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-d28e82))]">
      <GhostIcon className="h-3.5 w-3.5" />
      {until ? `Dead until ${until}` : "Dead"}
    </div>
  );
}
