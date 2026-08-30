"use client";

import { useEffect, useMemo, useState } from "react";

type Entry = {
  id: string;
  character: string;
  event: string;
  actor: string;
  source: string;
  date: string;
  summary: string;
};

function jumpToRecord(id: string) {
  const target = document.getElementById(`character-audit-${id}`);
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "start" });

  const oldOutline = target.style.outline;
  const oldOffset = target.style.outlineOffset;

  target.style.outline = "1px solid rgb(var(--sep-colour-987344))";
  target.style.outlineOffset = "3px";

  window.setTimeout(() => {
    target.style.outline = oldOutline;
    target.style.outlineOffset = oldOffset;
  }, 1200);
}

function readEntries(): Entry[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-character-audit-id]"),
  ).filter((node) => !node.hidden).map((node) => ({
    id: node.dataset.characterAuditId ?? "",
    character: node.dataset.characterAuditCharacter ?? "",
    event: node.dataset.characterAuditEvent ?? "",
    actor: node.dataset.characterAuditActor ?? "",
    source: node.dataset.characterAuditSource ?? "",
    date: node.dataset.characterAuditDate ?? "",
    summary: node.dataset.characterAuditSummary ?? "",
  }));
}

export function CharacterAuditContextPanel() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let frame = 0;

    const read = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setEntries(readEntries()));
    };

    read();

    const observer = new MutationObserver(read);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const query = search.trim().toLocaleLowerCase();

  const visible = useMemo(
    () =>
      entries.filter((entry) => {
        if (!query) return true;

        return [
          entry.character,
          entry.event,
          entry.actor,
          entry.source,
          entry.date,
          entry.summary,
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query);
      }),
    [entries, query],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
          Character audit
        </p>

        <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
          Find a Record
        </h2>

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Character, event, actor, source..."
          className="mt-3 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]"
        />

        <p className="mb-2 mt-3 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Records · {visible.length}
          {query ? ` / ${entries.length}` : ""}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {visible.length ? (
          visible.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => jumpToRecord(entry.id)}
              className="group w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="min-w-0 truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))]">
                  {entry.character}
                </span>
                <span className="shrink-0 text-[7px] text-[rgb(var(--sep-colour-665b4d))]">
                  {entry.date}
                </span>
              </span>

              <span className="mt-1 block text-[8px] uppercase tracking-[0.11em] text-[rgb(var(--sep-colour-8d724e))]">
                {entry.event}
              </span>

              <span className="mt-1 block text-[9px] leading-4 text-[rgb(var(--sep-colour-a99578))]">
                {entry.summary}
              </span>
            </button>
          ))
        ) : (
          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">
            No matching audit records.
          </p>
        )}
      </div>
    </div>
  );
}
