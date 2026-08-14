"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  enterRoomFromMap,
} from "@/app/(portal)/game/actions";
import {
  startConversation,
} from "@/app/(portal)/messages/actions";
import type { PublicCharacterListItem } from "@/lib/characters/get-public-character";
import type {
  PublicCodexReference,
  PublicPresenceStatus,
} from "@/types/public-character";

type CharacterDirectoryProps = {
  characters: PublicCharacterListItem[];
  viewerCharacterId: string | null;
};

type PresenceFilter =
  | "all"
  | "online"
  | "away"
  | "busy"
  | "offline";

export function CharacterDirectory({
  characters,
  viewerCharacterId,
}: CharacterDirectoryProps) {
  const [search, setSearch] = useState("");
  const [race, setRace] = useState("all");
  const [association, setAssociation] =
    useState("all");
  const [location, setLocation] =
    useState("all");
  const [presence, setPresence] =
    useState<PresenceFilter>("all");

  const races = useMemo(() => {
    const entries = new Map<string, string>();

    for (const character of characters) {
      if (character.race?.id) {
        entries.set(
          character.race.id,
          character.race.name,
        );
      }
    }

    return Array.from(entries.entries()).sort(
      ([, firstName], [, secondName]) =>
        firstName.localeCompare(secondName),
    );
  }, [characters]);

  const associations = useMemo(() => {
    const entries = new Map<string, string>();

    for (const character of characters) {
      if (character.association?.id) {
        entries.set(
          character.association.id,
          character.association.name,
        );
      }
    }

    return Array.from(entries.entries()).sort(
      ([, firstName], [, secondName]) =>
        firstName.localeCompare(secondName),
    );
  }, [characters]);

  const locations = useMemo(() => {
    const entries =
      new Map<string, string>();

    for (const character of characters) {
      if (character.currentRoom?.id) {
        entries.set(
          character.currentRoom.id,
          character.currentRoom.name,
        );
      }
    }

    return Array.from(
      entries.entries(),
    ).sort(
      ([, firstName], [, secondName]) =>
        firstName.localeCompare(
          secondName,
        ),
    );
  }, [characters]);

  const filteredCharacters = useMemo(() => {
    const normalisedSearch = search
      .trim()
      .toLowerCase();

    return characters.filter(
      (character) => {
        const searchableText = [
          character.display_name,
          character.first_name,
          character.surname,
          character.title,
          character.currentRoom?.name,
          character.currentRoom?.area?.name,
          character.race?.name,
          character.association?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const characterPresence =
          character.presence?.status ??
          "offline";

        const matchesSearch =
          !normalisedSearch ||
          searchableText.includes(
            normalisedSearch,
          );

        const matchesRace =
          race === "all" ||
          character.race?.id === race;

        const matchesAssociation =
          association === "all" ||
          character.association?.id ===
            association;

        const matchesLocation =
          location === "all" ||
          character.currentRoom?.id ===
            location;

        const matchesPresence =
          presence === "all" ||
          characterPresence === presence;

        return (
          matchesSearch &&
          matchesRace &&
          matchesAssociation &&
          matchesLocation &&
          matchesPresence
        );
      },
    );
  }, [
    association,
    characters,
    location,
    presence,
    race,
    search,
  ]);

  const hasActiveFilters =
    search.trim() !== "" ||
    race !== "all" ||
    association !== "all" ||
    location !== "all" ||
    presence !== "all";

  function resetFilters() {
    setSearch("");
    setRace("all");
    setAssociation("all");
    setLocation("all");
    setPresence("all");
  }

  return (
    <div className="space-y-6 px-3">
      <section className="border border-[#60482e]/45 bg-[#15100d]/95 p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(220px,1fr)_170px_190px_180px_150px_auto] xl:items-end">
          <label className="block">
            <span className="text-[9px] uppercase tracking-[0.22em] text-[#876a46]">
              Search
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Name, title, Ancestry, Association..."
              className="mt-2 w-full border border-[#60482e]/60 bg-[#0f0b09] px-3 py-3 text-sm text-[#d5c2a4] outline-none transition placeholder:text-[#665a4c] focus:border-[#a17a49]"
            />
          </label>

          <DirectorySelect
            label="Ancestry"
            value={race}
            onChange={setRace}
          >
            <option value="all">
              All ancestries
            </option>

            {races.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </DirectorySelect>

          <DirectorySelect
            label="Association"
            value={association}
            onChange={setAssociation}
          >
            <option value="all">
              All Associations
            </option>

            {associations.map(
              ([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ),
            )}
          </DirectorySelect>

          <DirectorySelect
            label="Current location"
            value={location}
            onChange={setLocation}
          >
            <option value="all">
              All locations
            </option>

            {locations.map(
              ([id, name]) => (
                <option
                  key={id}
                  value={id}
                >
                  {name}
                </option>
              ),
            )}
          </DirectorySelect>

          <DirectorySelect
            label="Presence"
            value={presence}
            onChange={(value) =>
              setPresence(
                value as PresenceFilter,
              )
            }
          >
            <option value="all">
              All statuses
            </option>
            <option value="online">
              Online
            </option>
            <option value="away">
              Away
            </option>
            <option value="busy">
              Busy
            </option>
            <option value="offline">
              Offline
            </option>
          </DirectorySelect>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="border border-[#765937]/70 bg-[#271c12] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[#cfb487] transition hover:border-[#a17a49] hover:bg-[#3b2919] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#59432c]/35 pt-4">
          <p className="text-xs text-[#887965]">
            Showing{" "}
            <span className="text-[#c7ad82]">
              {filteredCharacters.length}
            </span>{" "}
            of{" "}
            <span className="text-[#c7ad82]">
              {characters.length}
            </span>{" "}
            approved characters
          </p>

          {hasActiveFilters ? (
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#75634c]">
              Filters active
            </p>
          ) : null}
        </div>
      </section>

      {filteredCharacters.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {filteredCharacters.map(
  (character) => (
    <div
      key={character.id}
      id={`character-${character.public_slug}`}
      className="scroll-mt-6"
    >
      <CharacterDirectoryCard
        character={character}
        viewerCharacterId={
          viewerCharacterId
        }
      />
    </div>
  ),
)}  
        </section>
      ) : (
        <section className="border border-[#60482e]/45 bg-[#15100d]/95 p-10 text-center">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#806746]">
            Character archive
          </p>

          <h2 className="mt-4 font-serif text-2xl text-[#dbc59e]">
            No characters found
          </h2>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#958979]">
            No approved character matches the
            current search and filters.
          </p>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 border border-[#765937]/70 bg-[#271c12] px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-[#cfb487] transition hover:border-[#a17a49] hover:bg-[#3b2919]"
            >
              Clear filters
            </button>
          ) : null}
        </section>
      )}
    </div>
  );
}

function CharacterDirectoryCard({
  character,
  viewerCharacterId,
}: {
  character: PublicCharacterListItem;
  viewerCharacterId: string | null;
}) {
  const status =
    character.presence?.status ??
    "offline";

  const canMessage =
    viewerCharacterId !== null &&
    viewerCharacterId !== character.id;

  return (
    <article className="group relative overflow-hidden border border-[#60482e]/45 bg-[#15100d]/95 transition duration-200 hover:-translate-y-0.5 hover:border-[#a17a49] hover:bg-[#1a130e]">
      <Link
        href={`/characters/${character.public_slug}?from=characters`}
        aria-label={`Open ${character.display_name}'s profile`}
        className="absolute inset-0 z-10"
      />

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#b78a50]/0 to-transparent transition group-hover:via-[#b78a50]/70" />

      <div className="pointer-events-none grid min-h-[215px] grid-cols-[125px_minmax(0,1fr)]">
        <CharacterPortrait
          src={character.portrait_url}
          name={character.display_name}
        />

        <div className="flex min-w-0 flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <PresenceBadge
              status={status}
            />

            <span className="translate-x-1 text-sm text-[#785e3f] opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100">
              →
            </span>
          </div>

          <h2 className="mt-4 truncate font-serif text-xl text-[#dfc79c] transition group-hover:text-[#efd8ad]">
            {character.display_name}
          </h2>

          {character.title ? (
            <p className="mt-1 line-clamp-2 font-serif text-sm italic text-[#9d8769]">
              {character.title}
            </p>
          ) : null}

          <div className="mt-5 space-y-2">
            <CodexBadge
              label="Ancestry"
              entry={character.race}
            />

            <CodexBadge
              label="Association"
              entry={character.association}
            />
          </div>

          <div className="mt-auto pt-5">
            <div className="flex items-end justify-between gap-3">
              <CharacterDetail
                label="Current location"
                value={
                  character.currentRoom?.name ??
                  "No location"
                }
                muted={
                  !character.currentRoom
                }
              />

              <div className="pointer-events-auto relative z-20 flex shrink-0 items-center gap-1.5">
                {canMessage ? (
                  <form
                    action={
                      startConversation
                    }
                  >
                    <input
                      type="hidden"
                      name="recipientId"
                      value={character.id}
                    />

                    <button
                      type="submit"
                      aria-label={`Send a private message to ${character.display_name}`}
                      title={`Message ${character.display_name}`}
                      className="flex h-8 w-8 items-center justify-center border border-[#765937] bg-[#271c12] text-[13px] text-[#dfc79c] transition hover:border-[#997042] hover:bg-[#3b2919] hover:text-[#f0d5a5]"
                    >
                      <span aria-hidden="true">
                        ✉
                      </span>
                    </button>
                  </form>
                ) : null}

                {character.currentRoom ? (
                  <form
                    action={enterRoomFromMap}
                  >
                    <input
                      type="hidden"
                      name="roomId"
                      value={
                        character.currentRoom
                          .id
                      }
                    />

                    <button
                      type="submit"
                      aria-label={`Go to ${character.currentRoom.name}`}
                      title={`Go to ${character.currentRoom.name}`}
                      className="flex h-8 w-8 items-center justify-center border border-[#765937] bg-[#271c12] text-sm text-[#dfc79c] transition hover:border-[#997042] hover:bg-[#3b2919]"
                    >
                      <span aria-hidden="true">
                        →
                      </span>
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function CodexBadge({
  label,
  entry,
}: {
  label: string;
  entry: PublicCodexReference | null;
}) {
  const colour =
    entry?.colour ?? "#8d6d3e";

  return (
    <div
      className="flex min-w-0 items-center gap-2.5 border border-[#59432c]/45 bg-black/15 px-2.5 py-2"
      style={{
        backgroundImage: `linear-gradient(90deg, ${colour}18, transparent 55%)`,
      }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden border bg-[#0d0907] font-serif text-[11px]"
        style={{
          borderColor: `${colour}88`,
          color: colour,
        }}
      >
        {entry?.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.icon_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          entry?.name
            .charAt(0)
            .toUpperCase() ?? "?"
        )}
      </div>

      <div className="min-w-0">
        <p className="text-[7px] uppercase tracking-[0.17em] text-[#735f47]">
          {label}
        </p>

        <p className="mt-0.5 truncate text-[11px] text-[#bca98e]">
          {entry?.name ?? "Not assigned"}
        </p>
      </div>
    </div>
  );
}

function CharacterPortrait({
  src,
  name,
}: {
  src: string | null;
  name: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase(),
    )
    .join("");

  return (
    <div className="relative min-h-full overflow-hidden border-r border-[#60482e]/45 bg-[#0d0907]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Portrait of ${name}`}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full min-h-[215px] items-center justify-center bg-[radial-gradient(circle_at_top,#332316_0%,#120d09_70%)]">
          <span className="font-serif text-3xl text-[#8d6d47]">
            {initials || "?"}
          </span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
    </div>
  );
}

function CharacterDetail({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[8px] uppercase tracking-[0.18em] text-[#735f47]">
        {label}
      </p>

      <p
        className={`mt-0.5 truncate text-xs ${
          muted
            ? "italic text-[#766b5d]"
            : "text-[#b6a58d]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PresenceBadge({
  status,
}: {
  status:
    | PublicPresenceStatus
    | "offline";
}) {
  const styles = {
    online: {
      label: "Online",
      dot: "bg-emerald-500 shadow-[0_0_7px_rgba(16,185,129,0.8)]",
      text: "text-emerald-500",
    },
    away: {
      label: "Away",
      dot: "bg-amber-500 shadow-[0_0_7px_rgba(245,158,11,0.7)]",
      text: "text-amber-500",
    },
    busy: {
      label: "Busy",
      dot: "bg-red-500 shadow-[0_0_7px_rgba(239,68,68,0.7)]",
      text: "text-red-500",
    },
    offline: {
      label: "Offline",
      dot: "bg-stone-600",
      text: "text-[#756b60]",
    },
  };

  const style = styles[status];

  return (
    <span
      className={`inline-flex items-center gap-2 text-[8px] uppercase tracking-[0.18em] ${style.text}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${style.dot}`}
      />

      {style.label}
    </span>
  );
}

function DirectorySelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[9px] uppercase tracking-[0.22em] text-[#876a46]">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full border border-[#60482e]/60 bg-[#0f0b09] px-3 py-3 text-sm text-[#d5c2a4] outline-none transition focus:border-[#a17a49]"
      >
        {children}
      </select>
    </label>
  );
}
