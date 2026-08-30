"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type CharacterOption = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
};

const controlClass =
  "h-9 min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 text-[9px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-9b7446))]";

function name(character: CharacterOption) {
  return (
    character.display_name?.trim() ||
    [character.first_name, character.surname]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Unnamed character"
  );
}

function nodes() {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      "[data-character-audit-id]",
    ),
  );
}

export function CharacterAuditLiveFilter({
  characters,
}: {
  characters: CharacterOption[];
}) {
  const [search, setSearch] = useState("");
  const [character, setCharacter] = useState("");
  const [event, setEvent] = useState("");
  const [actor, setActor] = useState("");
  const [source, setSource] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const records = nodes();

    setTotal(records.length);
    setVisible(records.length);

    setEvents(
      Array.from(
        new Set(
          records
            .map(
              (node) =>
                node.dataset.characterAuditEvent ?? "",
            )
            .filter(Boolean),
        ),
      ).sort(),
    );

    setSources(
      Array.from(
        new Set(
          records
            .map(
              (node) =>
                node.dataset.characterAuditSource ?? "",
            )
            .filter(Boolean),
        ),
      ).sort(),
    );
  }, []);

  useEffect(() => {
    const needle =
      search.trim().toLowerCase();

    let count = 0;

    for (const node of nodes()) {
      const characterMatches =
        !character ||
        node.dataset.characterAuditCharacterId ===
          character;

      const eventMatches =
        !event ||
        node.dataset.characterAuditEvent ===
          event;

      const actorMatches =
        !actor ||
        node.dataset.characterAuditActorType ===
          actor;

      const sourceMatches =
        !source ||
        node.dataset.characterAuditSource ===
          source;

      const rawDate =
        node.dataset.characterAuditDateIso ?? "";

      const day = rawDate
        ? rawDate.slice(0, 10)
        : "";

      const dateMatches =
        (!from || day >= from) &&
        (!to || day <= to);

      const searchMatches =
        !needle ||
        (node.textContent ?? "")
          .toLowerCase()
          .includes(needle);

      const show =
        characterMatches &&
        eventMatches &&
        actorMatches &&
        sourceMatches &&
        dateMatches &&
        searchMatches;

      node.hidden = !show;

      if (show) count += 1;
    }

    setVisible(count);
  }, [
    search,
    character,
    event,
    actor,
    source,
    from,
    to,
  ]);

  const sortedCharacters =
    useMemo(
      () =>
        [...characters].sort((a, b) =>
          name(a).localeCompare(name(b)),
        ),
      [characters],
    );

  const hasFilters =
    Boolean(
      search ||
        character ||
        event ||
        actor ||
        source ||
        from ||
        to,
    );

  function reset() {
    setSearch("");
    setCharacter("");
    setEvent("");
    setActor("");
    setSource("");
    setFrom("");
    setTo("");
  }

  return (
    <div
      data-sep-interaction-fixed="true"
      className="mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
    >
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search values, Item, actor, event..."
          className={controlClass}
        />

        <select
          value={character}
          onChange={(e) => setCharacter(e.target.value)}
          className={controlClass}
        >
          <option value="">All Characters</option>
          {sortedCharacters.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {name(entry)}
            </option>
          ))}
        </select>

        <select
          value={event}
          onChange={(e) => setEvent(e.target.value)}
          className={controlClass}
        >
          <option value="">All events</option>
          {events.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <select
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          className={controlClass}
        >
          <option value="">All actors</option>
          <option value="player">Player</option>
          <option value="staff">Staff</option>
          <option value="system">System</option>
        </select>

        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className={controlClass}
        >
          <option value="">All sources</option>
          {sources.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          title="From date"
          className={controlClass}
        />

        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          title="To date"
          className={controlClass}
        />

        <div className="flex items-center justify-between gap-2">
          <p className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-716654))]">
            {visible} / {total} records
          </p>

          <button
            type="button"
            onClick={reset}
            disabled={!hasFilters}
            className="h-9 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-18110d))] px-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-ae9a7b))] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset
          </button>
        </div>
      </div>

      <p className="mt-3 text-right text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-716654))]">
        Live filters · newest first · maximum 500 database results
      </p>
    </div>
  );
}
