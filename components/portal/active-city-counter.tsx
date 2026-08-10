"use client";

import Link from "next/link";

import { startConversation } from "@/app/(portal)/messages/actions";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  PRESENCE_ACTIVE_MINUTES,
} from "@/lib/game/constants";
import { createClient } from "@/lib/supabase/client";
import type { PresenceStatus } from "@/types/game";

const REFRESH_INTERVAL_MS = 5_000;

type ActiveCityCounterProps = {
  initialCount: number;
};

type CodexSummary = {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  colour: string | null;
};

type CharacterSummary = {
  id: string;
  display_name: string | null;
  portrait_url: string | null;
  public_slug: string;
  title: string | null;
  occupation: string | null;

  race:
    | CodexSummary
    | CodexSummary[]
    | null;

  association:
    | CodexSummary
    | CodexSummary[]
    | null;
};

type PresentCharacter = {
  character_id: string;
  status: PresenceStatus;
  last_seen_at: string;

  character:
    | CharacterSummary
    | CharacterSummary[]
    | null;
};

export function ActiveCityCounter({
  initialCount,
}: ActiveCityCounterProps) {
  const [count, setCount] =
    useState(initialCount);

  const [
    presentCharacters,
    setPresentCharacters,
  ] = useState<PresentCharacter[]>([]);

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [
    currentCharacterId,
    setCurrentCharacterId,
  ] = useState<string | null>(null);

  const wrapperRef =
    useRef<HTMLDivElement | null>(null);

  const refreshPresence =
    useCallback(async () => {
      const supabase = createClient();

      const activeSince = new Date(
        Date.now() -
          PRESENCE_ACTIVE_MINUTES *
            60_000,
      ).toISOString();

      const { data, error } =
        await supabase
          .from("character_presence")
          .select(
            `
              character_id,
              status,
              last_seen_at,

              character:characters!character_presence_character_id_fkey(
                id,
                display_name,
                portrait_url,
                public_slug,
                title,
                occupation,

                race:races!characters_race_id_fkey(
                  id,
                  name,
                  slug,
                  icon_url,
                  colour
                ),

                association:associations!characters_association_id_fkey(
                  id,
                  name,
                  slug,
                  icon_url,
                  colour
                )
              )
            `,
          )
          .gte(
            "last_seen_at",
            activeSince,
          )
          .order("last_seen_at", {
            ascending: false,
          });

      if (error) {
        console.error(
          "Unable to refresh active characters:",
          error.message,
        );

        setError(
          "The city presence list could not be loaded.",
        );
        setLoading(false);
        return;
      }

      const rows =
        (data ??
          []) as unknown as PresentCharacter[];

      setPresentCharacters(rows);
      setCount(rows.length);
      setError(null);
      setLoading(false);
    }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentCharacter() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        return;
      }

      const {
        data: character,
        error,
      } = await supabase
        .from("characters")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        console.error(
          "Unable to identify current character:",
          error.message,
        );
        return;
      }

      setCurrentCharacterId(
        character?.id ?? null,
      );
    }

    void loadCurrentCharacter();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void refreshPresence();

    const supabase = createClient();

    const channel = supabase
      .channel(
        "active-city-presence-list",
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "character_presence",
        },
        () => {
          void refreshPresence();
        },
      )
      .subscribe();

    const intervalId =
      window.setInterval(() => {
        void refreshPresence();
      }, REFRESH_INTERVAL_MS);

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void refreshPresence();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.clearInterval(intervalId);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      void supabase.removeChannel(
        channel,
      );
    };
  }, [refreshPresence]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(
      event: MouseEvent,
    ) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open]);

  function toggleOpen() {
    const nextOpen = !open;

    setOpen(nextOpen);

    if (nextOpen) {
      setSearchQuery("");
      setLoading(true);
      void refreshPresence();
    }
  }

  const filteredCharacters =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLocaleLowerCase();

      if (!query) {
        return presentCharacters;
      }

      return presentCharacters.filter(
        (presence) => {
          const person =
            normaliseRelation(
              presence.character,
            );

          if (!person) {
            return false;
          }

          const race =
            normaliseRelation(
              person.race,
            );

          const association =
            normaliseRelation(
              person.association,
            );

          const searchableText = [
            person.display_name,
            person.title,
            person.occupation,
            race?.name,
            association?.name,
            presence.status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase();

          return searchableText.includes(
            query,
          );
        },
      );
    }, [
      presentCharacters,
      searchQuery,
    ]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
    >
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={`${count} active character${
          count === 1 ? "" : "s"
        } — click to view`}
        className={`flex h-10 items-center gap-2 border px-2 transition sm:gap-3 sm:px-3 ${
          open
            ? "border-[#9a7445] bg-[#251a11]"
            : "border-[#614b31] bg-[#17120f] hover:border-[#84643e] hover:bg-[#21170f]"
        }`}
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#788d5e] shadow-[0_0_10px_rgba(120,141,94,0.55)]" />

        <div className="flex items-baseline gap-2">
          <span className="font-serif text-base text-[#d8bf91] sm:text-lg">
            {count}
          </span>

          <span className="hidden text-[8px] uppercase tracking-[0.18em] text-[#81725f] lg:inline">
            People in Sepulchria
          </span>
        </div>

        <span
          aria-hidden="true"
          className={`hidden text-[8px] text-[#7e674b] transition-transform lg:inline ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Active characters in Sepulchria"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[120] w-[min(92vw,25rem)] overflow-hidden border border-[#6d5132] bg-[#0f0b08]/[0.98] shadow-[0_22px_60px_rgba(0,0,0,0.75)] backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-4 border-b border-[#59432c]/55 bg-[#17110d] px-4 py-3">
            <div>
              <p className="text-[8px] uppercase tracking-[0.26em] text-[#8d6b43]">
                City Presence
              </p>

              
            </div>

            <div className="flex items-center gap-2">
              <span className="flex h-7 min-w-7 items-center justify-center border border-[#59432c]/55 bg-[#100c09] px-2 font-serif text-sm text-[#c9ab7c]">
                {count}
              </span>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                aria-label="Close active character list"
                title="Close"
                className="flex h-7 w-7 items-center justify-center border border-[#59432c]/55 bg-[#100c09] text-sm text-[#9d8564] transition hover:border-[#8d6d43] hover:text-[#e0c99d]"
              >
                ×
              </button>
            </div>
          </div>

          <div className="border-b border-[#59432c]/45 bg-[#100c09] p-2.5">
            <label className="relative block">
              <span className="sr-only">
                Search active characters
              </span>

              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#806c52]"
              >
                ⌕
              </span>

              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value,
                  )
                }
                placeholder="Search name, ancestry, association…"
                autoComplete="off"
                className="w-full border border-[#59432c]/55 bg-[#0d0907] py-2.5 pl-8 pr-9 text-xs text-[#d8c4a4] outline-none placeholder:text-[#62584b] focus:border-[#9a7445] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
              />

              {searchQuery ? (
                <button
                  type="button"
                  onClick={() =>
                    setSearchQuery("")
                  }
                  aria-label="Clear search"
                  title="Clear search"
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-xs text-[#7e6b52] transition hover:text-[#d7bb8d]"
                >
                  ×
                </button>
              ) : null}
            </label>

            <div className="mt-2 flex items-center justify-between gap-3 px-0.5">
              <p className="text-[7px] uppercase tracking-[0.17em] text-[#66594a]">
                {searchQuery
                  ? `${filteredCharacters.length} matching`
                  : `${count} present`}
              </p>

              <p className="text-[7px] uppercase tracking-[0.14em] text-[#5f5549]">
                Scroll to see more
              </p>
            </div>
          </div>

          <div className="max-h-[min(58vh,30rem)] overflow-y-auto overscroll-contain p-2">
            {loading &&
            presentCharacters.length ===
              0 ? (
              <LoadingRows />
            ) : null}

            {error ? (
              <p className="border border-[#743d35] bg-[#2a1512] p-3 text-[11px] leading-5 text-[#d8a49a]">
                {error}
              </p>
            ) : null}

            {!error &&
            !loading &&
            presentCharacters.length ===
              0 ? (
              <p className="border border-[#59432c]/35 bg-[#100c09] p-4 text-center text-[11px] leading-5 text-[#8f8271]">
                No characters are
                currently active in the
                city.
              </p>
            ) : null}

            {!error &&
            !loading &&
            presentCharacters.length >
              0 &&
            filteredCharacters.length ===
              0 ? (
              <p className="border border-[#59432c]/35 bg-[#100c09] p-4 text-center text-[11px] leading-5 text-[#8f8271]">
                No active characters
                match your search.
              </p>
            ) : null}

            <div className="space-y-1.5">
              {filteredCharacters.map(
                (presence) => {
                  const person =
                    normaliseRelation(
                      presence.character,
                    );

                  if (!person) {
                    return null;
                  }

                  const race =
                    normaliseRelation(
                      person.race,
                    );

                  const association =
                    normaliseRelation(
                      person.association,
                    );

                  const displayName =
                    person.display_name?.trim() ||
                    "Unnamed character";

                  const isCurrentCharacter =
                    currentCharacterId ===
                    person.id;

                  return (
                    <div
                      key={
                        presence.character_id
                      }
                      className="group relative overflow-hidden border border-[#59432c]/40 bg-[#120e0b] transition hover:border-[#9b7446] hover:bg-[#1c140e]"
                    >
                      <div className="absolute inset-y-0 left-0 w-px bg-[#b88a52]/0 transition group-hover:bg-[#b88a52]/75" />

                      <div className="flex min-h-[72px] items-center gap-2 px-3 py-2.5">
                        <Link
                          href={`/characters/${person.public_slug}`}
                          onClick={() =>
                            setOpen(false)
                          }
                          title={`Open ${displayName}'s character sheet`}
                          className="flex min-w-0 flex-1 items-center gap-3"
                        >
                          <div className="relative shrink-0">
                            <Portrait
                              src={
                                person.portrait_url
                              }
                              name={
                                displayName
                              }
                            />

                            <PresenceDot
                              status={
                                presence.status
                              }
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-serif text-sm text-[#dbc397] transition group-hover:text-[#ecd5a8]">
                                  {
                                    displayName
                                  }
                                </p>

                                {(person.title ||
                                  person.occupation) ? (
                                  <p className="mt-0.5 truncate text-[9px] text-[#8f7b61]">
                                    {person.title ||
                                      person.occupation}
                                  </p>
                                ) : null}
                              </div>

                              <PresenceLabel
                                status={
                                  presence.status
                                }
                              />
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                              <HeritageEntry
                                entry={race}
                                fallback="No ancestry"
                              />

                              <HeritageEntry
                                entry={
                                  association
                                }
                                fallback="No association"
                              />
                            </div>
                          </div>
                        </Link>

                        <div className="flex shrink-0 items-center gap-1">
                          {!isCurrentCharacter ? (
                            <form
                              action={
                                startConversation
                              }
                              onSubmit={() =>
                                setOpen(false)
                              }
                            >
                              <input
                                type="hidden"
                                name="recipientId"
                                value={person.id}
                              />

                              <button
                                type="submit"
                                aria-label={`Send a private message to ${displayName}`}
                                title={`Message ${displayName}`}
                                className="flex h-8 w-8 items-center justify-center border border-[#6d5132]/70 bg-[#1b130d] text-sm text-[#b89059] transition hover:border-[#a47b43] hover:bg-[#332318] hover:text-[#f0d09a]"
                              >
                                ✉
                              </button>
                            </form>
                          ) : (
                            <span
                              title="This is your character"
                              className="flex h-8 w-8 items-center justify-center text-[8px] uppercase text-[#66594a]"
                            >
                              You
                            </span>
                          )}

                          <Link
                            href={`/characters/${person.public_slug}`}
                            onClick={() =>
                              setOpen(false)
                            }
                            aria-label={`Open ${displayName}'s character sheet`}
                            title={`Open ${displayName}'s character sheet`}
                            className="flex h-8 w-6 items-center justify-center text-xs text-[#725a3d] transition hover:translate-x-0.5 hover:text-[#c59b64]"
                          >
                            →
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>

          
        </div>
      ) : null}
    </div>
  );
}

function HeritageEntry({
  entry,
  fallback,
}: {
  entry: CodexSummary | null;
  fallback: string;
}) {
  if (!entry) {
    return (
      <span className="text-[8px] text-[#675e52]">
        {fallback}
      </span>
    );
  }

  const colour =
    entry.colour ?? "#8d6d3e";

  return (
    <span
      className="flex min-w-0 items-center gap-1.5"
      title={entry.name}
    >
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden border bg-[#0d0907] font-serif text-[8px]"
        style={{
          borderColor: `${colour}88`,
          color: colour,
        }}
      >
        {entry.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.icon_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          entry.name
            .charAt(0)
            .toUpperCase()
        )}
      </span>

      <span className="max-w-24 truncate text-[8px] text-[#9a866b]">
        {entry.name}
      </span>
    </span>
  );
}

function PresenceDot({
  status,
}: {
  status: PresenceStatus;
}) {
  const classes: Record<
    PresenceStatus,
    string
  > = {
    online:
      "border-[#102519] bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.75)]",
    away:
      "border-[#2f2511] bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.65)]",
    busy:
      "border-[#321313] bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.65)]",
  };

  return (
    <span
      title={status}
      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 ${classes[status]}`}
    />
  );
}

function PresenceLabel({
  status,
}: {
  status: PresenceStatus;
}) {
  const classes: Record<
    PresenceStatus,
    string
  > = {
    online: "text-emerald-500",
    away: "text-amber-500",
    busy: "text-red-500",
  };

  return (
    <span
      className={`shrink-0 text-[7px] uppercase tracking-[0.14em] ${classes[status]}`}
    >
      {status}
    </span>
  );
}

function Portrait({
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
    <div className="h-12 w-12 overflow-hidden border border-[#705538] bg-[#0d0a08] shadow-inner">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Portrait of ${name}`}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        <span className="flex h-full items-center justify-center font-serif text-sm text-[#a0845e]">
          {initials || "?"}
        </span>
      )}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-1.5">
      <div className="h-[72px] animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
      <div className="h-[72px] animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
      <div className="h-[72px] animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
    </div>
  );
}

function normaliseRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}
