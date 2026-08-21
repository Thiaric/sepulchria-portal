"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { enterRoomFromMap } from "@/app/(portal)/game/actions";
import { startConversation } from "@/app/(portal)/messages/actions";
import { CharacterOrderIdentity } from "@/components/characters/character-order-identity";
import {
  PRESENCE_ACTIVE_MINUTES,
} from "@/lib/game/constants";
import { createClient } from "@/lib/supabase/client";
import type { PresenceStatus } from "@/types/game";

const REFRESH_INTERVAL_MS = 5_000;

type ActiveCityCounterProps = {
  initialCount: number;
  isStaff: boolean;
  visiblePrivateRoomIds: string[];
  allOrderHeadquartersRoomIds: string[];
  visibleOrderHeadquartersRoomIds: string[];
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

type PresenceRoom = {
  id: string;
  name: string;
  slug: string;
  area:
    | {
        slug: string;
      }
    | {
        slug: string;
      }[]
    | null;
};

type PresentCharacter = {
  character_id: string;
  room_id: string | null;
  status: PresenceStatus;
  last_seen_at: string;
  appear_offline: boolean;
  appeared_offline_at: string | null;

  character:
    | CharacterSummary
    | CharacterSummary[]
    | null;

  room:
    | PresenceRoom
    | PresenceRoom[]
    | null;
};

export function ActiveCityCounter({
  initialCount,
  isStaff,
  visiblePrivateRoomIds,
  allOrderHeadquartersRoomIds,
  visibleOrderHeadquartersRoomIds,
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

  const visiblePrivateRoomIdSet =
    useMemo(
      () =>
        new Set(
          visiblePrivateRoomIds,
        ),
      [visiblePrivateRoomIds],
    );

  const allOrderHeadquartersRoomIdSet =
    useMemo(
      () =>
        new Set(
          allOrderHeadquartersRoomIds,
        ),
      [allOrderHeadquartersRoomIds],
    );

  const visibleOrderHeadquartersRoomIdSet =
    useMemo(
      () =>
        new Set(
          visibleOrderHeadquartersRoomIds,
        ),
      [visibleOrderHeadquartersRoomIds],
    );

  const refreshPresence =
    useCallback(async () => {
      const supabase =
        createClient();

      const activeSince =
        new Date(
          Date.now() -
            PRESENCE_ACTIVE_MINUTES *
              60_000,
        ).toISOString();

      const {
        data,
        error: presenceError,
      } = await supabase
        .from(
          "character_presence",
        )
        .select(
          `
            character_id,
            room_id,
            status,
            last_seen_at,
            appear_offline,
            appeared_offline_at,

            room:rooms!character_presence_room_id_fkey(
              id,
              name,
              slug,
              area:areas!rooms_area_id_fkey(
                slug
              )
            ),

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
        .order(
          "last_seen_at",
          {
            ascending: false,
          },
        );

      if (presenceError) {
        console.error(
          "Unable to refresh active characters:",
          presenceError.message,
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

      const visibleRows =
        isStaff
          ? rows
          : rows.filter(
              (row) =>
                row.appear_offline !==
                true,
            );

      setPresentCharacters(
        visibleRows,
      );
      setCount(
        visibleRows.length,
      );
      setError(null);
      setLoading(false);
    }, [isStaff]);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentCharacter() {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (
        !user ||
        cancelled
      ) {
        return;
      }

      const {
        data: character,
        error: characterError,
      } = await supabase
        .from("characters")
        .select("id")
        .eq(
          "user_id",
          user.id,
        )
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (characterError) {
        console.error(
          "Unable to identify current character:",
          characterError.message,
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

    const supabase =
      createClient();

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
      window.setInterval(
        () => {
          void refreshPresence();
        },
        REFRESH_INTERVAL_MS,
      );

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
      window.clearInterval(
        intervalId,
      );

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

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setOpen(false);
      }
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open]);

  function toggleOpen() {
    const nextOpen =
      !open;

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

          const room =
            normaliseRelation(
              presence.room,
            );

          const roomArea =
            room
              ? normaliseRelation(
                  room.area,
                )
              : null;

          const privateRoom =
            roomArea?.slug ===
              "private-locations" ||
            (
              room !== null &&
              allOrderHeadquartersRoomIdSet.has(
                room.id,
              )
            );

          const maySeePrivateRoom =
            !privateRoom ||
            isStaff ||
            (
              room !== null &&
              (
                visiblePrivateRoomIdSet.has(
                  room.id,
                ) ||
                visibleOrderHeadquartersRoomIdSet.has(
                  room.id,
                )
              )
            );

          const searchableText = [
            person.display_name,
            person.title,
            person.occupation,
            race?.name,
            association?.name,
            maySeePrivateRoom
              ? room?.name
              : null,
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
      isStaff,
      visiblePrivateRoomIdSet,
      allOrderHeadquartersRoomIdSet,
      visibleOrderHeadquartersRoomIdSet,
    ]);

  return (
    <>
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={`${count} active character${
          count === 1
            ? ""
            : "s"
        } — click to view`}
        className={`flex h-10 items-center gap-2 border px-2 transition sm:gap-3 sm:px-3 ${
          open
            ? "border-[rgb(var(--sep-colour-9a7445))] bg-[rgb(var(--sep-colour-251a11))]"
            : "border-[rgb(var(--sep-colour-614b31))] bg-[rgb(var(--sep-colour-17120f))] hover:border-[rgb(var(--sep-colour-84643e))] hover:bg-[rgb(var(--sep-colour-21170f))]"
        }`}
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[rgb(var(--sep-colour-788d5e))] shadow-[0_0_10px_rgba(var(--sep-rgb-120-141-94),0.55)]" />

        <div className="flex items-baseline gap-2">
          <span className="font-serif text-base text-[rgb(var(--sep-colour-d8bf91))] sm:text-lg">
            {count}
          </span>

          <span className="hidden text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-81725f))] lg:inline">
            People in Sepulchria
          </span>
        </div>

        <span
          aria-hidden="true"
          className={`hidden text-[8px] text-[rgb(var(--sep-colour-7e674b))] transition-transform lg:inline ${
            open
              ? "rotate-180"
              : ""
          }`}
        >
          ▾
        </span>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="People in Sepulchria"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-2 sm:p-4"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setOpen(false);
            }
          }}
        >
          <div className="flex h-[85vh] w-[90vw] max-w-[1700px] flex-col overflow-hidden border border-[rgb(var(--sep-colour-6e5535))]/65 bg-[rgb(var(--sep-colour-090705))] shadow-[0_20px_80px_rgba(var(--sep-rgb-0-0-0),0.65)]">
            <div className="flex min-h-12 shrink-0 items-center justify-between gap-4 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[rgb(var(--sep-colour-788d5e))] shadow-[0_0_10px_rgba(var(--sep-rgb-120-141-94),0.55)]" />

                <div className="min-w-0">
                  <p className="text-[7px] uppercase tracking-[0.25em] text-[rgb(var(--sep-colour-806b50))]">
                    City Presence
                  </p>

                  <h2 className="truncate font-serif text-base text-[rgb(var(--sep-colour-d8c096))] sm:text-lg">
                    People in Sepulchria
                  </h2>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="flex h-7 min-w-7 items-center justify-center border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-17110d))] px-2 font-serif text-sm text-[rgb(var(--sep-colour-c9ab7c))]">
                  {count}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setOpen(
                      false,
                    )
                  }
                  aria-label="Close People in Sepulchria"
                  title="Close"
                  className="flex h-7 w-7 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-17110d))] text-base leading-none text-[rgb(var(--sep-colour-aa9675))] transition hover:border-[rgb(var(--sep-colour-967342))] hover:text-[rgb(var(--sep-colour-f1d7a5))]"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="shrink-0 border-b border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-3 sm:px-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">
                    Search active characters
                  </span>

                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[rgb(var(--sep-colour-806c52))]"
                  >
                    ⌕
                  </span>

                  <input
                    type="search"
                    value={
                      searchQuery
                    }
                    onChange={(
                      event,
                    ) =>
                      setSearchQuery(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="Search name, ancestry, Order, location…"
                    autoComplete="off"
                    className="w-full border border-[rgb(var(--sep-colour-59432c))]/55 bg-[rgb(var(--sep-colour-100c09))] py-2.5 pl-8 pr-9 text-xs text-[rgb(var(--sep-colour-d8c4a4))] outline-none placeholder:text-[rgb(var(--sep-colour-62584b))] focus:border-[rgb(var(--sep-colour-9a7445))] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                  />

                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSearchQuery(
                          "",
                        )
                      }
                      aria-label="Clear search"
                      title="Clear search"
                      className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-xs text-[rgb(var(--sep-colour-7e6b52))] transition hover:text-[rgb(var(--sep-colour-d7bb8d))]"
                    >
                      ×
                    </button>
                  ) : null}
                </label>

                <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                  <p className="text-[7px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-746450))]">
                    {searchQuery
                      ? `${filteredCharacters.length} matching`
                      : `${count} present`}
                  </p>

                  <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-5f5549))]">
                    Live city presence
                  </p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 lg:p-5">
              {loading &&
              presentCharacters.length ===
                0 ? (
                <LoadingRows />
              ) : null}

              {error ? (
                <p className="border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-4 text-[11px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]">
                  {error}
                </p>
              ) : null}

              {!error &&
              !loading &&
              presentCharacters.length ===
                0 ? (
                <p className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-6 text-center text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                  No characters are
                  currently active in
                  the city.
                </p>
              ) : null}

              {!error &&
              !loading &&
              presentCharacters.length >
                0 &&
              filteredCharacters.length ===
                0 ? (
                <p className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-6 text-center text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                  No active characters
                  match your search.
                </p>
              ) : null}

              <div className="grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
                {filteredCharacters.map(
                  (
                    presence,
                  ) => {
                    const person =
                      normaliseRelation(
                        presence.character,
                      );

                    if (
                      !person
                    ) {
                      return null;
                    }

                    const race =
                      normaliseRelation(
                        person.race,
                      );

                    const room =
                      normaliseRelation(
                        presence.room,
                      );

                    const roomArea =
                      room
                        ? normaliseRelation(
                            room.area,
                          )
                        : null;

                    const privateRoom =
                      roomArea?.slug ===
                        "private-locations" ||
                      (
                        room !== null &&
                        allOrderHeadquartersRoomIdSet.has(
                          room.id,
                        )
                      );

                    const maySeePrivateRoom =
                      !privateRoom ||
                      isStaff ||
                      (
                        room !== null &&
                        (
                          visiblePrivateRoomIdSet.has(
                            room.id,
                          ) ||
                          visibleOrderHeadquartersRoomIdSet.has(
                            room.id,
                          )
                        )
                      );

                    const displayName =
                      person.display_name?.trim() ||
                      "Unnamed character";

                    const isCurrentCharacter =
                      currentCharacterId ===
                      person.id;

                    return (
                      <article
                        key={
                          presence.character_id
                        }
                        className="group relative min-w-0 overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-120e0b))] transition hover:border-[rgb(var(--sep-colour-8f6c43))] hover:bg-[rgb(var(--sep-colour-18110d))]"
                      >
                        <div className="absolute inset-y-0 left-0 w-px bg-[rgb(var(--sep-colour-b88a52))]/0 transition group-hover:bg-[rgb(var(--sep-colour-b88a52))]/70" />

                        <div className="flex min-w-0 items-center gap-2.5 px-3 py-2.5">
                          <Link
                            href={`/characters/${person.public_slug}`}
                            onClick={() =>
                              setOpen(
                                false,
                              )
                            }
                            title={`Open ${displayName}'s character sheet`}
                            className="relative shrink-0"
                          >
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
                              cloaked={
                                isStaff &&
                                presence.appear_offline ===
                                  true
                              }
                            />
                          </Link>

                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <Link
                                href={`/characters/${person.public_slug}`}
                                onClick={() =>
                                  setOpen(
                                    false,
                                  )
                                }
                                title={`Open ${displayName}'s character sheet`}
                                className="min-w-0 flex-1"
                              >
                                <p className="truncate font-serif text-sm text-[rgb(var(--sep-colour-dbc397))] transition hover:text-[rgb(var(--sep-colour-ecd5a8))]">
                                  {
                                    displayName
                                  }
                                </p>
                              </Link>

                              <PresenceLabel
                                status={
                                  presence.status
                                }
                                cloaked={
                                  isStaff &&
                                  presence.appear_offline ===
                                    true
                                }
                              />
                            </div>

                            {(person.title ||
                              person.occupation) ? (
                              <p className="mt-0.5 truncate text-[8px] text-[rgb(var(--sep-colour-83725d))]">
                                {person.title ||
                                  person.occupation}
                              </p>
                            ) : null}

                            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                              <HeritageEntry
                                entry={
                                  race
                                }
                                fallback="No ancestry"
                              />

                              <CharacterOrderIdentity
                                characterId={
                                  person.id
                                }
                                variant="inline"
                              />
                            </div>

                            <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-1.5">
                              {room &&
                              presence.room_id &&
                              maySeePrivateRoom ? (
                                <form
                                  action={
                                    enterRoomFromMap
                                  }
                                  onSubmit={() =>
                                    setOpen(
                                      false,
                                    )
                                  }
                                  className="min-w-0 flex-1"
                                >
                                  <input
                                    type="hidden"
                                    name="roomId"
                                    value={
                                      presence.room_id
                                    }
                                  />

                                  <button
                                    type="submit"
                                    title={`Go directly to ${room.name}`}
                                    className="group/location flex max-w-full items-center gap-1.5 text-left"
                                  >
                                    <span
                                      aria-hidden="true"
                                      className="shrink-0 text-[9px] text-[rgb(var(--sep-colour-8f6d42))]"
                                    >
                                      ⌖
                                    </span>

                                    <span className="truncate text-[8px] text-[rgb(var(--sep-colour-95836c))] transition group-hover/location:text-[rgb(var(--sep-colour-ddc294))]">
                                      {
                                        room.name
                                      }
                                    </span>

                                    <span className="shrink-0 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-725a3d))] transition group-hover/location:text-[rgb(var(--sep-colour-c59b64))]">
                                      Go →
                                    </span>
                                  </button>
                                </form>
                              ) : (
                                <span className="min-w-0 flex-1 truncate text-[8px] text-[rgb(var(--sep-colour-62594d))]">
                                  Around Sepulchria
                                </span>
                              )}

                              <div className="flex shrink-0 items-center gap-1">
                                {!isCurrentCharacter ? (
                                  <form
                                    action={
                                      startConversation
                                    }
                                    onSubmit={() =>
                                      setOpen(
                                        false,
                                      )
                                    }
                                  >
                                    <input
                                      type="hidden"
                                      name="recipientId"
                                      value={
                                        person.id
                                      }
                                    />

                                    <button
                                      type="submit"
                                      aria-label={`Send a private message to ${displayName}`}
                                      title={`Message ${displayName}`}
                                      className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-6d5132))]/60 bg-[rgb(var(--sep-colour-1b130d))] text-[10px] text-[rgb(var(--sep-colour-b89059))] transition hover:border-[rgb(var(--sep-colour-a47b43))] hover:bg-[rgb(var(--sep-colour-332318))] hover:text-[rgb(var(--sep-colour-f0d09a))]"
                                    >
                                      ✉
                                    </button>
                                  </form>
                                ) : (
                                  <span
                                    title="This is your character"
                                    className="flex h-6 min-w-6 items-center justify-center px-1 text-[7px] uppercase text-[rgb(var(--sep-colour-66594a))]"
                                  >
                                    You
                                  </span>
                                )}

                                <Link
                                  href={`/characters/${person.public_slug}`}
                                  onClick={() =>
                                    setOpen(
                                      false,
                                    )
                                  }
                                  aria-label={`Open ${displayName}'s character sheet`}
                                  title={`Open ${displayName}'s character sheet`}
                                  className="flex h-6 w-6 items-center justify-center border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-15100d))] text-[10px] text-[rgb(var(--sep-colour-725a3d))] transition hover:border-[rgb(var(--sep-colour-8f6d43))] hover:text-[rgb(var(--sep-colour-c59b64))]"
                                >
                                  →
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
        : null}
    </>
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
      <span className="text-[8px] text-[rgb(var(--sep-colour-675e52))]">
        {fallback}
      </span>
    );
  }

  const colour =
    entry.colour ??
    "#8d6d3e";

  return (
    <span
      className="flex min-w-0 items-center gap-1.5"
      title={entry.name}
    >
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden border bg-[rgb(var(--sep-colour-0d0907))] font-serif text-[7px]"
        style={{
          borderColor:
            `${colour}88`,
          color: colour,
        }}
      >
        {entry.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={
              entry.icon_url
            }
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          entry.name
            .charAt(0)
            .toUpperCase()
        )}
      </span>

      <span className="max-w-24 truncate text-[8px] text-[rgb(var(--sep-colour-9a866b))]">
        {entry.name}
      </span>
    </span>
  );
}

function PresenceDot({
  status,
  cloaked = false,
}: {
  status: PresenceStatus;
  cloaked?: boolean;
}) {
  const classes: Record<
    PresenceStatus,
    string
  > = {
    online:
      "border-[rgb(var(--sep-colour-102519))] bg-emerald-500 shadow-[0_0_6px_rgba(var(--sep-rgb-16-185-129),0.75)]",
    away:
      "border-[rgb(var(--sep-colour-2f2511))] bg-amber-500 shadow-[0_0_6px_rgba(var(--sep-rgb-245-158-11),0.65)]",
    busy:
      "border-[rgb(var(--sep-colour-321313))] bg-red-500 shadow-[0_0_6px_rgba(var(--sep-rgb-239-68-68),0.65)]",
  };

  return (
    <span
      title={status}
      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 ${classes[status]} ${
        cloaked
          ? "opacity-50"
          : ""
      }`}
    />
  );
}

function PresenceLabel({
  status,
  cloaked = false,
}: {
  status: PresenceStatus;
  cloaked?: boolean;
}) {
  const classes: Record<
    PresenceStatus,
    string
  > = {
    online:
      "text-emerald-500",
    away:
      "text-amber-500",
    busy:
      "text-red-500",
  };

  return (
    <span
      className={`shrink-0 text-[7px] uppercase tracking-[0.14em] ${classes[status]} ${
        cloaked
          ? "opacity-50"
          : ""
      }`}
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
      part
        .charAt(0)
        .toUpperCase(),
    )
    .join("");

  return (
    <div className="h-10 w-10 overflow-hidden border border-[rgb(var(--sep-colour-705538))] bg-[rgb(var(--sep-colour-0d0a08))] shadow-inner">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Portrait of ${name}`}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        <span className="flex h-full items-center justify-center font-serif text-xs text-[rgb(var(--sep-colour-a0845e))]">
          {initials ||
            "?"}
        </span>
      )}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({
        length: 6,
      }).map((_, index) => (
        <div
          key={index}
          className="h-[88px] animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]"
        />
      ))}
    </div>
  );
}

function normaliseRelation<T>(
  value: T | T[] | null,
): T | null {
  if (
    Array.isArray(value)
  ) {
    return (
      value[0] ??
      null
    );
  }

  return value;
}