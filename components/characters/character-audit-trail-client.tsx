"use client";

import { useMemo, useState } from "react";
import { CharacterAuditEntry } from "@/components/characters/character-audit-entry";
import {
  humanAuditLabel,
  type CharacterAuditDisplayBase,
} from "@/lib/audit/character-audit-display";

export type CharacterAuditDisplayRow = CharacterAuditDisplayBase;

const controlClass =
  "h-9 min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 text-[9px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-9b7446))]";

function dayValue(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function CharacterAuditTrailClient({
  rows,
  staffView,
}: {
  rows: CharacterAuditDisplayRow[];
  staffView: boolean;
}) {
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [actorType, setActorType] = useState("");
  const [source, setSource] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const eventOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.event_type))).sort(),
    [rows],
  );

  const sourceOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.source).filter(Boolean))).sort(),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (eventType && row.event_type !== eventType) return false;
      if (actorType && row.actor_type !== actorType) return false;
      if (source && row.source !== source) return false;

      const rowDay = dayValue(row.created_at);
      if (fromDate && rowDay < fromDate) return false;
      if (toDate && rowDay > toDate) return false;

      if (!needle) return true;

      return [
        row.event_type,
        row.entity_type,
        row.entity_id,
        row.item_name,
        row.actor_label,
        row.actor_staff_role,
        row.source,
        ...(row.changed_fields ?? []),
        JSON.stringify(row.old_values ?? {}),
        JSON.stringify(row.new_values ?? {}),
        staffView ? JSON.stringify(row.metadata ?? {}) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, search, eventType, actorType, source, fromDate, toDate, staffView]);

  const hasFilters = Boolean(
    search || eventType || actorType || source || fromDate || toDate,
  );

  function resetFilters() {
    setSearch("");
    setEventType("");
    setActorType("");
    setSource("");
    setFromDate("");
    setToDate("");
  }

  return (
    <>
      <div className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-3">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Character Log..."
            className={controlClass}
          />

          <select
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
            className={controlClass}
          >
            <option value="">All events</option>
            {eventOptions.map((value) => (
              <option key={value} value={value}>
                {humanAuditLabel(value)}
              </option>
            ))}
          </select>

          <select
            value={actorType}
            onChange={(event) => setActorType(event.target.value)}
            className={controlClass}
          >
            <option value="">All actors</option>
            <option value="player">Player</option>
            <option value="staff">Staff</option>
            <option value="system">System</option>
          </select>

          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className={controlClass}
          >
            <option value="">All sources</option>
            {sourceOptions.map((value) => (
              <option key={value} value={value}>
                {humanAuditLabel(value)}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              title="From date"
              className={controlClass}
            />
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              title="To date"
              className={controlClass}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-716654))]">
              {filteredRows.length} / {rows.length} entries
            </p>
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasFilters}
              className="h-9 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-18110d))] px-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-ae9a7b))] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset
            </button>
          </div>
        </div>

        <p className="mt-2 text-[8px] text-[rgb(var(--sep-colour-756958))]">
          Filters update immediately. No reload required.
        </p>
      </div>

      {filteredRows.length === 0 ? (
        <p className="py-6 text-sm text-[rgb(var(--sep-colour-8f8271))]">
          No Character Log entries match these filters.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {filteredRows.map((row) => (
            <CharacterAuditEntry key={row.id} row={row} />
          ))}
        </div>
      )}
    </>
  );
}
