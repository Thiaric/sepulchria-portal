"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { moveCharacter } from "@/app/(portal)/game/actions";
import { createClient } from "@/lib/supabase/client";

const PRESENCE_ACTIVE_MINUTES = 3;

type GameContextPanelProps = {
  roomId: string | null;
  roomName: string | null;
  areaName: string | null;
  presenceStatus: string | null;
};

type PresentCharacter = {
  character_id: string;
  status: string;
  character:
    | {
        id: string;
        display_name: string;
        portrait_url: string | null;
      }
    | {
        id: string;
        display_name: string;
        portrait_url: string | null;
      }[]
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
  destination: Destination | Destination[] | null;
};

export function GameContextPanel({
  roomId,
  roomName,
  areaName,
  presenceStatus,
}: GameContextPanelProps) {
  const [presentCharacters, setPresentCharacters] = useState<
    PresentCharacter[]
  >([]);

  const [exits, setExits] = useState<RoomExit[]>([]);
  const [loading, setLoading] = useState(Boolean(roomId));
  const [error, setError] = useState<string | null>(null);

  const loadRoomContext = useCallback(async () => {
    if (!roomId) {
      setPresentCharacters([]);
      setExits([]);
      setLoading(false);
      return;
    }

    setError(null);

    const supabase = createClient();

    const activeSince = new Date(
  Date.now() - PRESENCE_ACTIVE_MINUTES * 60_000,
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
              portrait_url
            )
          `,
        )
        .eq("room_id", roomId)
        .gte("last_seen_at", activeSince)
        .order("last_seen_at", { ascending: false }),

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
      (presenceResult.data ?? []) as PresentCharacter[],
    );

    setExits([
      ...((outgoingResult.data ?? []) as RoomExit[]),
      ...((incomingResult.data ?? []) as RoomExit[]),
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
      .channel(`portal-room-context:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "character_presence",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void loadRoomContext();
        },
      )
      .subscribe();

    const refreshInterval = window.setInterval(() => {
      void loadRoomContext();
    }, 60_000);

    return () => {
      window.clearInterval(refreshInterval);
      void supabase.removeChannel(channel);
    };
  }, [loadRoomContext, roomId]);

  if (!roomId) {
    return (
      <>
        <ContextHeading
          eyebrow="Play"
          title="Outside the city"
        />

        <p className="text-xs leading-6 text-[#938673]">
          Your character has not yet been assigned to a room.
        </p>
      </>
    );
  }

  return (
    <>
      <ContextHeading
        eyebrow={areaName ?? "Unknown area"}
        title={roomName ?? "Unknown location"}
      />

      <ContextRow
        label="Presence"
        value={presenceStatus ?? "Offline"}
      />

      {error ? (
        <p className="mt-4 border border-[#743d35] bg-[#2a1512] p-3 text-xs leading-5 text-[#d8a49a]">
          The room information could not be loaded.
        </p>
      ) : null}

      <section className="mt-6 border-t border-[#59432c]/40 pt-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-[0.26em] text-[#876a46]">
              Present characters
            </p>

            <h3 className="mt-1 font-serif text-xl text-[#d6bd91]">
              In this room
            </h3>
          </div>

          <span className="text-xs text-[#88745a]">
            {presentCharacters.length}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {loading ? (
            <SidebarLoadingRows />
          ) : (
            presentCharacters.map((presence) => {
              const person = Array.isArray(
                presence.character,
              )
                ? presence.character[0]
                : presence.character;

              if (!person) {
                return null;
              }

              return (
                <Link
                  key={presence.character_id}
                  href={`/character/${person.id}`}
                  className="flex items-center gap-3 border border-[#59432c]/45 bg-[#100c09] p-3 transition hover:border-[#927047]"
                >
                  <Portrait
                    src={person.portrait_url}
                    name={person.display_name}
                  />

                  <div className="min-w-0">
                    <p className="truncate font-serif text-sm text-[#d8bf91]">
                      {person.display_name}
                    </p>

                    <p className="mt-1 text-[8px] uppercase tracking-[0.2em] text-[#77664e]">
                      {presence.status}
                    </p>
                  </div>
                </Link>
              );
            })
          )}

          {!loading && presentCharacters.length === 0 ? (
            <p className="text-xs leading-6 text-[#8f8271]">
              No active characters are currently visible here.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 border-t border-[#59432c]/40 pt-5">
        <p className="text-[9px] uppercase tracking-[0.26em] text-[#876a46]">
          Available exits
        </p>

        <h3 className="mt-1 font-serif text-xl text-[#d6bd91]">
          Leave this room
        </h3>

        <div className="mt-4 space-y-2">
          {loading ? (
            <SidebarLoadingRows />
          ) : (
            exits.map((exit) => {
              const destination = Array.isArray(
                exit.destination,
              )
                ? exit.destination[0]
                : exit.destination;

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
                    value={destination.id}
                  />

                  <button
                    type="submit"
                    className="w-full border border-[#765937]/70 bg-[#271c12] px-3 py-3 text-left transition hover:border-[#967342] hover:bg-[#3b2919]"
                  >
                    <span className="block font-serif text-sm text-[#d8bf91]">
                      {destination.name}
                    </span>

                    <span className="mt-1 block text-[8px] uppercase tracking-[0.18em] text-[#846a49]">
                      {exit.connection_name ?? "Passage"}
                    </span>
                  </button>
                </form>
              );
            })
          )}

          {!loading && exits.length === 0 ? (
            <p className="text-xs leading-6 text-[#8f8271]">
              No accessible passages have been recorded.
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}

function ContextHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="mb-5">
      <p className="text-[9px] uppercase tracking-[0.3em] text-[#876a46]">
        {eyebrow}
      </p>

      <h2 className="mt-2 break-words font-serif text-2xl text-[#d6bd91]">
        {title}
      </h2>
    </header>
  );
}

function ContextRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4 py-3 text-xs">
      <span className="text-[#786b5b]">{label}</span>

      <span className="max-w-[150px] break-words text-right capitalize text-[#bba98d]">
        {value}
      </span>
    </div>
  );
}

function Portrait({
  src,
  name,
}: {
  src: string | null;
  name: string;
}) {
  return (
    <div className="h-9 w-9 shrink-0 overflow-hidden border border-[#60482e] bg-[#0d0a08]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Portrait of ${name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full items-center justify-center text-[#806b4e]">
          ?
        </span>
      )}
    </div>
  );
}

function SidebarLoadingRows() {
  return (
    <>
      <div className="h-14 animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
      <div className="h-14 animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
    </>
  );
}