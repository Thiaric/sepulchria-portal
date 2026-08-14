"use client";

import Link from "next/link";
import { CharacterOrderIdentity } from "@/components/characters/character-order-identity";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { moveCharacter } from "@/app/(portal)/game/actions";
import { createClient } from "@/lib/supabase/client";
import type { PresenceStatus } from "@/types/game";
import { startConversation } from "@/app/(portal)/messages/actions";

const PRESENCE_ACTIVE_MINUTES = 3;

type GameContextPanelProps = {
  roomId: string | null;
  currentCharacterId: string | null;
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

  character:
    | CharacterSummary
    | CharacterSummary[]
    | null;
};

type Destination = {
  id: string;
  name: string;
};

type RoomExit = {
  id: string;
  connection_name: string | null;
  sort_order: number | null;

  destination:
    | Destination
    | Destination[]
    | null;
};

export function GameContextPanel({
  roomId,
  currentCharacterId,
}: GameContextPanelProps) {
  const [
    presentCharacters,
    setPresentCharacters,
  ] = useState<PresentCharacter[]>([]);

  const [exits, setExits] =
    useState<RoomExit[]>([]);

  const [loading, setLoading] =
    useState(Boolean(roomId));

  const [error, setError] =
    useState<string | null>(null);

  const loadRoomContext =
    useCallback(async () => {
      if (!roomId) {
        setPresentCharacters([]);
        setExits([]);
        setLoading(false);
        return;
      }

      setError(null);

      const supabase = createClient();

      const activeSince = new Date(
        Date.now() -
          PRESENCE_ACTIVE_MINUTES *
            60_000,
      ).toISOString();

      const [
        presenceResult,
        outgoingResult,
        incomingResult,
      ] = await Promise.all([
        supabase
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
          .eq("room_id", roomId)
          .gte(
            "last_seen_at",
            activeSince,
          )
          .order("last_seen_at", {
            ascending: false,
          }),

        supabase
          .from("room_connections")
          .select(
            `
              id,
              connection_name,
              sort_order,

              destination:rooms!room_connections_to_room_id_fkey(
                id,
                name
              )
            `,
          )
          .eq("from_room_id", roomId)
          .order("sort_order"),

        supabase
          .from("room_connections")
          .select(
            `
              id,
              connection_name,
              sort_order,

              destination:rooms!room_connections_from_room_id_fkey(
                id,
                name
              )
            `,
          )
          .eq("to_room_id", roomId)
          .eq("is_two_way", true)
          .order("sort_order"),
      ]);

      const firstError =
        presenceResult.error ??
        outgoingResult.error ??
        incomingResult.error;

      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      setPresentCharacters(
        (presenceResult.data ??
          []) as unknown as PresentCharacter[],
      );

      setExits([
        ...((outgoingResult.data ??
          []) as unknown as RoomExit[]),

        ...((incomingResult.data ??
          []) as unknown as RoomExit[]),
      ]);

      setLoading(false);
    }, [roomId]);

  useEffect(() => {
    setLoading(Boolean(roomId));
    void loadRoomContext();
  }, [loadRoomContext, roomId]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const supabase = createClient();

    const channel = supabase
      .channel(
        `portal-room-context:${roomId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "character_presence",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void loadRoomContext();
        },
      )
      .subscribe();

    const refreshInterval =
      window.setInterval(() => {
        void loadRoomContext();
      }, 60_000);

    return () => {
      window.clearInterval(
        refreshInterval,
      );

      void supabase.removeChannel(
        channel,
      );
    };
  }, [loadRoomContext, roomId]);

  if (!roomId) {
    return (
      <div className="h-full overflow-y-auto">
        <p className="text-[9px] uppercase tracking-[0.3em] text-[#876a46]">
          Play
        </p>

        <h2 className="mt-2 font-serif text-2xl text-[#d6bd91]">
          Outside the city
        </h2>

        <p className="mt-4 text-xs leading-6 text-[#938673]">
          Your character has not yet
          been assigned to a room.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      

      {error ? (
        <p className="mt-3 shrink-0 border border-[#743d35] bg-[#2a1512] p-2.5 text-[11px] leading-5 text-[#d8a49a]">
          The room information could
          not be loaded.
        </p>
      ) : null}

      <section className="mt-1 flex min-h-0 flex-1 flex-col border-[#59432c]/40 pt-0">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[8px] uppercase tracking-[0.24em] text-[#876a46]">
              Present characters
            </p>

            <h3 className="mt-0.5 font-serif text-lg text-[#d6bd91]">
              In this room
            </h3>
          </div>

          <span className="flex h-6 min-w-6 shrink-0 items-center justify-center border border-[#59432c]/50 bg-[#15100d] px-1.5 text-[10px] text-[#a68b67]">
            {presentCharacters.length}
          </span>
        </div>

        <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
          {loading ? (
            <SidebarLoadingRows />
          ) : (
            presentCharacters.map(
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

                

                const displayName =
                  person.display_name?.trim() ||
                  "Unnamed character";

                const raceName =
  race?.name ?? null;

                return (
  <div
    key={presence.character_id}
    className="group relative overflow-hidden border border-[#59432c]/40 bg-[#100c09] transition hover:border-[#9b7446] hover:bg-[#1a120c]"
  >
    <Link
      href={`/characters/${person.public_slug}?from=game`}
      title={`Open ${displayName}'s profile`}
      className="block"
    >
      <div className="absolute inset-y-0 left-0 w-px bg-[#b88a52]/0 transition group-hover:bg-[#b88a52]/70" />

      <div className="flex min-h-[78px] items-center gap-3 px-3 py-2.5 pr-10">
        <div className="relative shrink-0">
          <Portrait
            src={person.portrait_url}
            name={displayName}
          />

          <PresenceDot
            status={presence.status}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-serif text-[13px] leading-4 text-[#dbc397] transition group-hover:text-[#ecd5a8]">
              {displayName}
            </p>

            <PresenceLabel
              status={presence.status}
            />
          </div>

          {person.title ? (
            <p className="mt-0.5 truncate font-serif text-[10px] italic leading-3 text-[#9d8769]">
              {person.title}
            </p>
          ) : null}

          <div className="mt-2 min-w-0 space-y-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
  <MiniCodexIcon entry={race} />

  <CharacterOrderIdentity
    characterId={person.id}
    variant="mini"
  />
</div>
          </div>

        </div>
      </div>
    </Link>

    {person.id !== currentCharacterId ? (
  <form
    action={startConversation}
    className="absolute bottom-2 right-2 z-10"
  >
    <input
      type="hidden"
      name="recipientId"
      value={person.id}
    />

    <button
      type="submit"
      title={`Message ${displayName}`}
      aria-label={`Message ${displayName}`}
      className="flex h-6 w-6 items-center justify-center border border-[#60482e]/60 bg-[#17110d] text-[12px] text-[#a98b61] transition hover:border-[#9a7445] hover:bg-[#2a1d12] hover:text-[#e0c392]"
    >
      ✉
    </button>
  </form>
) : null}
  </div>
);
              },
            )
          )}

          {!loading &&
          presentCharacters.length ===
            0 ? (
            <p className="border border-[#59432c]/30 bg-[#100c09]/60 p-3 text-[11px] leading-5 text-[#8f8271]">
              No active characters are
              currently visible here.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-4 max-h-48 shrink-0 border-t border-[#59432c]/40 pt-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[8px] uppercase tracking-[0.24em] text-[#876a46]">
              Available connections
            </p>

            
          </div>

          <span className="text-[10px] text-[#806c52]">
            {exits.length}
          </span>
        </div>

        <div className="mt-3 max-h-28 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
          {loading ? (
            <CompactLoadingRows />
          ) : (
            exits.map((exit) => {
              const destination =
                normaliseRelation(
                  exit.destination,
                );

              if (!destination) {
                return null;
              }

              return (
                <form
                  key={`${exit.id}-${destination.id}`}
                  action={moveCharacter}
                >
                  <input
                    type="hidden"
                    name="roomId"
                    value={
                      destination.id
                    }
                  />

                  <button
                    type="submit"
                    className="group w-full border border-[#765937]/60 bg-[#271c12] px-2.5 py-2 text-left transition hover:border-[#a17a49] hover:bg-[#3b2919]"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate font-serif text-[13px] leading-4 text-[#d8bf91] transition group-hover:text-[#ead2a4]">
                          {destination.name}
                        </span>

                        
                      </span>

                      <span
                        aria-hidden="true"
                        className="shrink-0 text-[10px] text-[#836746] transition group-hover:translate-x-0.5"
                      >
                        →
                      </span>
                    </span>
                  </button>
                </form>
              );
            })
          )}

          {!loading &&
          exits.length === 0 ? (
            <p className="text-[11px] leading-5 text-[#8f8271]">
              No accessible passages
              have been recorded.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function MiniCodexIcon({
  entry,
}: {
  entry: CodexSummary | null;
}) {
  if (!entry) {
    return null;
  }

  const colour =
    entry.colour ?? "#8d6d3e";

  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden border bg-[#0d0907] font-serif text-[8px]"
      style={{
        borderColor: `${colour}88`,
        color: colour,
      }}
      title={entry.name}
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
      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 ${classes[status]}`}
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
    <div className="h-9 w-9 overflow-hidden border border-[#705538] bg-[#0d0a08] shadow-inner">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Portrait of ${name}`}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        <span className="flex h-full items-center justify-center font-serif text-[11px] text-[#a0845e]">
          {initials || "?"}
        </span>
      )}
    </div>
  );
}

function SidebarLoadingRows() {
  return (
    <>
      <div className="h-[60px] animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
      <div className="h-[60px] animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
      <div className="h-[60px] animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
    </>
  );
}

function CompactLoadingRows() {
  return (
    <>
      <div className="h-[43px] animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
      <div className="h-[43px] animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
    </>
  );
}