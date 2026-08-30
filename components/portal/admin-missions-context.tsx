"use client";

import Link from "next/link";

const links = [
  ["mission-catalogue", "Catalogue", "Normal Daily Missions"],
  ["mission-milestones", "Rewards", "Daily Milestones"],
] as const;

export function AdminMissionsContext() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div>
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-a88658))]">
          Mission management
        </p>
        <h2 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-d6bd91))]">
          Daily Missions
        </h2>
      </div>

      <div className="my-4 h-px bg-[rgb(var(--sep-colour-59432c))]/35" />

      <div className="space-y-1">
        {links.map(([anchor, eyebrow, label]) => (
          <Link
            key={anchor}
            href={`/admin/missions#${anchor}`}
            className="block border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[rgb(var(--sep-colour-a7977f))] transition-colors hover:border-[rgb(var(--sep-colour-80613b))]/50 hover:bg-[rgb(var(--sep-colour-17110d))] hover:text-[rgb(var(--sep-colour-d8c19a))]"
          >
            <span className="block text-[7px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-735f45))]">
              {eyebrow}
            </span>
            <span className="mt-0.5 block font-serif text-[13px]">
              {label}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-5 border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-4">
        <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Daily rules
        </p>
        <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-948672))]">
          Reset: midnight UTC. Unclaimed rewards expire. Mission rewards never
          create Daily Mission progress.
        </p>
      </div>
    </div>
  );
}
