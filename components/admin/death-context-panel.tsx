"use client";

import { useEffect, useMemo, useState } from "react";

type EntryKind = "character" | "malus" | "assignment";
type Entry = { id: string; kind: EntryKind; label: string; secondary: string };

export function DeathContextPanel() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const read = () => {
      setEntries(
        Array.from(document.querySelectorAll<HTMLElement>("[data-admin-death-context-kind]"))
          .map((node) => ({
            id: node.id,
            kind: (node.dataset.adminDeathContextKind ?? "malus") as EntryKind,
            label: node.dataset.adminDeathContextLabel ?? "Unnamed",
            secondary: node.dataset.adminDeathContextSecondary ?? "",
          }))
          .filter((entry) => Boolean(entry.id)),
      );
    };

    read();
    const frame = window.requestAnimationFrame(read);
    const changed = () => window.requestAnimationFrame(read);
    window.addEventListener("sepulchria:admin-data-changed", changed);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("sepulchria:admin-data-changed", changed);
    };
  }, []);

  const query = search.trim().toLocaleLowerCase();
  const visible = useMemo(
    () => entries
      .filter((entry) => !query || `${entry.label} ${entry.secondary}`.toLocaleLowerCase().includes(query))
      .sort((a, b) => a.label.localeCompare(b.label, "en-GB", { sensitivity: "base" })),
    [entries, query],
  );

  function jumpTo(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    const details = target.closest("details");
    if (details instanceof HTMLDetailsElement) details.open = true;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    const oldOutline = target.style.outline;
    const oldOffset = target.style.outlineOffset;
    target.style.outline = "1px solid rgb(var(--sep-colour-8d6d3e))";
    target.style.outlineOffset = "3px";
    window.setTimeout(() => {
      target.style.outline = oldOutline;
      target.style.outlineOffset = oldOffset;
    }, 1200);
  }

  const groups: Array<[EntryKind, string]> = [
    ["character", "Dead Characters"],
    ["malus", "Resurrection Maluses"],
    ["assignment", "Active Character Maluses"],
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">Death administration</p>
      
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search Character or Malus..."
        className="mt-[4px] w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]"
      />
      <div className="mt-[4px] min-h-0 flex-1 overflow-y-auto pr-1">
        {groups.map(([kind, title]) => {
          const items = visible.filter((entry) => entry.kind === kind);
          return (
            <section key={kind} className="mt-4 first:mt-2">
              <p className="mb-[4px] text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">{title} · {items.length}</p>
              <div className="space-y-1.5">
                {items.length ? items.map((entry) => (
                  <button key={`${entry.kind}-${entry.id}`} type="button" onClick={() => jumpTo(entry.id)} className="group flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]">
                    <span className="min-w-0">
                      <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))]">{entry.label}</span>
                      {entry.secondary ? <span className="mt-0.5 block truncate text-[8px] text-[rgb(var(--sep-colour-6f6252))]">{entry.secondary}</span> : null}
                    </span>
                    <span className="shrink-0 text-[rgb(var(--sep-colour-725a3d))]">→</span>
                  </button>
                )) : <p className="text-[10px] italic text-[rgb(var(--sep-colour-7f7261))]">No matching entries.</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
