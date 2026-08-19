"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { enterRoomFromMap } from "@/app/(portal)/game/actions";
import { createClient } from "@/lib/supabase/client";
import type {
  PortalContext,
} from "@/types/portal";

const PRESENCE_ACTIVE_MINUTES = 3;
const REFRESH_INTERVAL_MS = 30_000;

type PresenceCharacterRow = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string;
  public_slug: string | null;
};

type PresenceRoomRow = {
  id: string;
  name: string;
  slug: string;
  area:
    | {
        name: string;
        slug: string;
      }
    | {
        name: string;
        slug: string;
      }[]
    | null;
};

type PresenceRow = {
  character_id: string;
  room_id: string | null;
  status:
    | "online"
    | "away"
    | "busy";
  last_seen_at: string;
  appear_offline: boolean;
  appeared_offline_at: string | null;
  character:
    | PresenceCharacterRow
    | PresenceCharacterRow[]
    | null;
  room:
    | PresenceRoomRow
    | PresenceRoomRow[]
    | null;
};

type ActiveCharacter = {
  id: string;
  displayName: string;
  publicSlug: string | null;
  status:
    | "online"
    | "away"
    | "busy";
};

type ActiveRoom = {
  id: string;
  name: string;
  slug: string;
  areaName: string | null;
  characters: ActiveCharacter[];
};

function normaliseRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getDisplayName(
  character: PresenceCharacterRow,
): string {
  return (
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim() ||
    "Unnamed character"
  );
}

export function LiveDashboardChronicle({
  context,
}: {
  context: PortalContext;
}) {
  const [rooms, setRooms] =
    useState<ActiveRoom[]>([]);

  const [
    activeCharacterCount,
    setActiveCharacterCount,
  ] = useState(
    context.onlineCharacterCount,
  );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const refreshChronicle =
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
        error: queryError,
      } = await supabase
        .from("character_presence")
        .select(`
          character_id,
          room_id,
          status,
          last_seen_at,
          appear_offline,
          appeared_offline_at,

          character:characters!character_presence_character_id_fkey(
            id,
            display_name,
            first_name,
            surname,
            public_slug
          ),

          room:rooms!character_presence_room_id_fkey(
            id,
            name,
            slug,
            area:areas!rooms_area_id_fkey(
              name,
              slug
            )
          )
        `)
        .gte(
          "last_seen_at",
          activeSince,
        )
        .order("last_seen_at", {
          ascending: false,
        });

      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      const activeRows =
        (data ??
          []) as unknown as PresenceRow[];

      const visibleRows =
        context.isStaff
          ? activeRows
          : activeRows.filter(
              (entry) =>
                entry.appear_offline !==
                true,
            );

      setActiveCharacterCount(
        new Set(
          visibleRows.map(
            (entry) =>
              entry.character_id,
          ),
        ).size,
      );

      const roomMap =
        new Map<string, ActiveRoom>();

      for (const rawEntry of
        visibleRows) {
        const character =
          normaliseRelation(
            rawEntry.character,
          );

        const room =
          normaliseRelation(
            rawEntry.room,
          );

        if (
          !character ||
          !room ||
          !rawEntry.room_id
        ) {
          continue;
        }

        const area =
          normaliseRelation(
            room.area,
          );

        if (
          area?.slug ===
            "private-locations" &&
          !context.privateLocations.some(
            (location) =>
              location.roomId ===
              room.id,
          )
        ) {
          continue;
        }

        if (
          context.allOrderHeadquartersRoomIds.includes(
            room.id,
          ) &&
          !context.visibleOrderHeadquartersRoomIds.includes(
            room.id,
          )
        ) {
          continue;
        }

        const activeCharacter:
          ActiveCharacter = {
            id: character.id,
            displayName:
              getDisplayName(
                character,
              ),
            publicSlug:
              character.public_slug,
            status:
              rawEntry.status,
          };

        const existingRoom =
          roomMap.get(room.id);

        if (existingRoom) {
          if (
            !existingRoom.characters.some(
              (entry) =>
                entry.id ===
                activeCharacter.id,
            )
          ) {
            existingRoom.characters.push(
              activeCharacter,
            );
          }

          continue;
        }

        roomMap.set(room.id, {
          id: room.id,
          name: room.name,
          slug: room.slug,
          areaName:
            area?.name ?? null,
          characters: [
            activeCharacter,
          ],
        });
      }

      const nextRooms =
        Array.from(
          roomMap.values(),
        )
          .map((room) => ({
            ...room,
            characters:
              [...room.characters].sort(
                (first, second) =>
                  first.displayName.localeCompare(
                    second.displayName,
                  ),
              ),
          }))
          .sort(
            (first, second) => {
              const countDifference =
                second.characters.length -
                first.characters.length;

              if (
                countDifference !== 0
              ) {
                return countDifference;
              }

              return first.name.localeCompare(
                second.name,
              );
            },
          );

      setRooms(nextRooms);
      setError(null);
      setLoading(false);
    }, [
      context.privateLocations,
      context.allOrderHeadquartersRoomIds,
      context.visibleOrderHeadquartersRoomIds,
      context.isStaff,
    ]);

  useEffect(() => {
    void refreshChronicle();

    const supabase =
      createClient();

    const channel =
      supabase
        .channel(
          "dashboard-live-chronicle",
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
            void refreshChronicle();
          },
        )
        .subscribe();

    const intervalId =
      window.setInterval(
        () => {
          void refreshChronicle();
        },
        REFRESH_INTERVAL_MS,
      );

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void refreshChronicle();
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
  }, [refreshChronicle]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mt-1 flex shrink-0 items-center justify-between gap-4">
        <div>
          <p className="text-[8px] uppercase tracking-[0.22em] text-[#876a46]">
            People in Sepulchria
          </p>

          
        </div>

        <span
  title={`${activeCharacterCount} active character${
    activeCharacterCount === 1
      ? ""
      : "s"
  }`}
  className="flex h-8 min-w-8 items-center justify-center rounded-full border border-[#6a5637] bg-[#20170f] px-2 font-serif text-sm leading-none text-[#d9bd8d]"
>
  <span className="relative -top-[2px] leading-none">
  {activeCharacterCount}
</span>
</span>
      </div>

      {error ? (
        <p className="mt-4 shrink-0 border border-[#743d35] bg-[#2a1512] p-3 text-[10px] leading-5 text-[#d8a49a]">
          Live city activity could not be loaded:{" "}
          {error}
        </p>
      ) : null}

      <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <ChronicleLoading />
        ) : (
          rooms.map((room) => (
            <ActiveRoomCard
              key={room.id}
              room={room}
              currentCharacterId={
                context.character?.id ??
                null
              }
              currentRoomId={
                context.character?.current_room_id ??
                null
              }
            />
          ))
        )}

        {!loading &&
        !error &&
        rooms.length === 0 ? (
          <p className="border border-[#59432c]/30 bg-[#100c09]/60 p-4 text-[11px] leading-5 text-[#8f8271]">
            No locations are populated at the moment.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ActiveRoomCard({
  room,
  currentRoomId,
}: {
  room: ActiveRoom;
  currentCharacterId: string | null;
  currentRoomId: string | null;
}) {
  const alreadyHere =
    currentRoomId === room.id;

  return (
    <article className="border border-[#59432c]/40 bg-[#100c09] px-3 py-2.5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-serif text-sm text-[#d6bd91]">
            {room.name}
          </h3>

          {room.areaName ? (
            <p className="mt-0.5 truncate text-[7px] uppercase tracking-[0.13em] text-[#74654f]">
              {room.areaName}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <span
            title={`${room.characters.length} active character${
              room.characters.length === 1
                ? ""
                : "s"
            }`}
            className="flex h-6 min-w-6 items-center justify-center rounded-full border border-[#59432c]/60 bg-[#19120d] px-1.5 text-[9px] text-[#c3a67d]"
          >
            {room.characters.length}
          </span>

          <form action={enterRoomFromMap}>
            <input
              type="hidden"
              name="roomId"
              value={room.id}
            />

            <button
              type="submit"
              aria-label={
                alreadyHere
                  ? "Current room"
                  : `Join ${room.name}`
              }
              title={
                alreadyHere
                  ? "Current room"
                  : `Join ${room.name}`
              }
              className="flex h-6 w-6 items-center justify-center border border-[#765937] bg-[#271c12] text-[11px] text-[#dfc79c] transition hover:border-[#997042] hover:bg-[#3b2919] disabled:cursor-default disabled:border-[#4d4336] disabled:bg-[#17130f] disabled:text-[#706658]"
            >
              <span aria-hidden="true">
                {alreadyHere ? "⊙" : "➔"}
              </span>
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

function ContextSummaryRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 py-2.5 text-xs ${
        last
          ? ""
          : "border-b border-[#59432c]/25"
      }`}
    >
      <span className="text-[#786b5b]">
        {label}
      </span>

      <span className="max-w-[150px] break-words text-right capitalize text-[#bba98d]">
        {value}
      </span>
    </div>
  );
}

function ChronicleLoading() {
  return (
    <>
      <div className="h-16 animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
      <div className="h-16 animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
      <div className="h-16 animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
    </>
  );
}
