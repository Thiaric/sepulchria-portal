"use client";

import { useEffect, useMemo, useState } from "react";

type Entry = {
  id: string;
  name: string;
  room: string;
  description: string;
  active: boolean;
};

function readEntries(): Entry[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-admin-gathering-card]"),
  ).map((node) => ({
    id: node.dataset.adminGatheringId ?? "",
    name: node.dataset.adminGatheringName ?? "Gathering",
    room: node.dataset.adminGatheringRoom ?? "",
    description: node.dataset.adminGatheringDescription ?? "",
    active: node.dataset.adminGatheringActive === "true",
  }));
}

export function GatheringContextPanel() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setEntries(readEntries());
    refresh();

    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.querySelectorAll<HTMLElement>("[data-admin-gathering-card]").forEach((node) => {
        node.hidden = false;
      });
    };
  }, []);

  const visibleEntries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return entries.filter((entry) => {
      if (selectedId && entry.id !== selectedId) return false;
      if (!query) return true;
      return [entry.name, entry.room, entry.description]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query);
    });
  }, [entries, search, selectedId]);

  useEffect(() => {
    const visibleIds = new Set(visibleEntries.map((entry) => entry.id));
    document.querySelectorAll<HTMLElement>("[data-admin-gathering-card]").forEach((node) => {
      const id = node.dataset.adminGatheringId ?? "";
      node.hidden = !visibleIds.has(id);
    });
  }, [visibleEntries]);

  function showAll() {
    setSearch("");
    setSelectedId(null);
  }

  function choose(id: string) {
    setSearch("");
    setSelectedId(id);

    window.requestAnimationFrame(() => {
      const target = document.getElementById(`admin-gathering-${id}`);
      if (target instanceof HTMLDetailsElement) target.open = true;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        Gathering administration
      </p>
      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        Filter Gatherings
      </h2>
      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Search by Gathering, Location or description. Select one to show only that Gathering.
      </p>

      <input
        type="search"
        value={search}
        onChange={(event) => {
          setSelectedId(null);
          setSearch(event.target.value);
        }}
        placeholder="Search Gatherings..."
        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]"
      />

      <button
        type="button"
        onClick={showAll}
        className="mt-3 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-bca27b))] transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"
      >
        Show all Gatherings
      </button>

      <p className="mb-2 mt-4 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))]">
        Gatherings · {visibleEntries.length}
        {visibleEntries.length !== entries.length ? ` / ${entries.length}` : ""}
      </p>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {visibleEntries.length ? (
          visibleEntries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => choose(entry.id)}
              className="group flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"
            >
              <span className="min-w-0">
                <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                  {entry.name}
                </span>
                <span className="mt-0.5 block truncate text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6252))]">
                  {entry.room} · {entry.active ? "Active" : "Inactive"}
                </span>
              </span>
              <span className="shrink-0 text-[rgb(var(--sep-colour-725a3d))]">→</span>
            </button>
          ))
        ) : (
          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">No matching Gatherings.</p>
        )}
      </div>
    </div>
  );
}
