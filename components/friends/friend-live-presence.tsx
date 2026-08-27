"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  enterRoomFromMap,
} from "@/app/(portal)/game/actions";
import {
  PRESENCE_ACTIVE_MINUTES,
} from "@/lib/game/constants";
import {
  createClient,
} from "@/lib/supabase/client";
import type {
  PresenceStatus,
} from "@/types/game";

const REFRESH_INTERVAL_MS = 5_000;

type PresenceRoom = {
  id: string;
  name: string;
  slug: string;
  area:
    | { slug: string }
    | { slug: string }[]
    | null;
};

type PresenceRow = {
  room_id: string | null;
  status: PresenceStatus;
  last_seen_at: string;
  appear_offline: boolean;
  room:
    | PresenceRoom
    | PresenceRoom[]
    | null;
};

function asOne<T>(
  value: T | T[] | null,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function statusLabel(
  status: PresenceStatus,
) {
  if (status === "busy") {
    return "Busy";
  }

  if (status === "away") {
    return "Away";
  }

  return "Online";
}

function statusDotClass(
  status: PresenceStatus,
) {
  if (status === "busy") {
    return "bg-red-500";
  }

  if (status === "away") {
    return "bg-amber-400";
  }

  return "bg-emerald-500";
}

export function FriendLivePresence({
  targetCharacterId,
  isStaff,
  visiblePrivateRoomIds,
  allOrderHeadquartersRoomIds,
  visibleOrderHeadquartersRoomIds,
}: {
  targetCharacterId: string;
  isStaff: boolean;
  visiblePrivateRoomIds: string[];
  allOrderHeadquartersRoomIds: string[];
  visibleOrderHeadquartersRoomIds: string[];
}) {
  const [
    presence,
    setPresence,
  ] = useState<PresenceRow | null>(
    null,
  );

  const [
    loaded,
    setLoaded,
  ] = useState(false);

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
        error,
      } = await supabase
        .from(
          "character_presence",
        )
        .select(`
          room_id,
          status,
          last_seen_at,
          appear_offline,
          room:rooms!character_presence_room_id_fkey(
            id,
            name,
            slug,
            area:areas!rooms_area_id_fkey(
              slug
            )
          )
        `)
        .eq(
          "character_id",
          targetCharacterId,
        )
        .gte(
          "last_seen_at",
          activeSince,
        )
        .maybeSingle();

      if (error) {
        console.error(
          "Unable to refresh friend presence:",
          error.message,
        );
        setPresence(null);
        setLoaded(true);
        return;
      }

      const row =
        data as unknown as
          | PresenceRow
          | null;

      if (
        row?.appear_offline === true &&
        !isStaff
      ) {
        setPresence(null);
      } else {
        setPresence(row);
      }

      setLoaded(true);
    }, [
      targetCharacterId,
      isStaff,
    ]);

  useEffect(() => {
    void refreshPresence();

    const supabase =
      createClient();

    const channel = supabase
      .channel(
        `friend-presence:${targetCharacterId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "character_presence",
          filter:
            `character_id=eq.${targetCharacterId}`,
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

    return () => {
      window.clearInterval(
        intervalId,
      );
      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    targetCharacterId,
    refreshPresence,
  ]);

  if (!loaded) {
    return (
      <span className="text-[9px] text-[rgb(var(--sep-colour-756958))]">
        Checking presence...
      </span>
    );
  }

  if (!presence) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full bg-[rgb(var(--sep-colour-5f574d))]" />
        <span className="text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-817567))]">
          Outside the Gates
        </span>
      </div>
    );
  }

  const room =
    asOne(presence.room);

  const area =
    room
      ? asOne(room.area)
      : null;

  const privateRoom =
    area?.slug ===
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

  const visibleRoomName =
    room && maySeePrivateRoom
      ? room.name
      : privateRoom
        ? "Around Sepulchria"
        : "Location unknown";

  const canJump =
    room !== null &&
    maySeePrivateRoom;

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex items-center gap-1.5">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(
            presence.status,
          )}`}
        />
        <span className="text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-ae9a7b))]">
          {statusLabel(
            presence.status,
          )}
        </span>
      </div>

      <span className="min-w-0 truncate text-[10px] text-[rgb(var(--sep-colour-b7a58c))]">
        {visibleRoomName}
      </span>

      {canJump ? (
        <form
          action={enterRoomFromMap}
          className="ml-auto"
        >
          <input
            type="hidden"
            name="roomId"
            value={room.id}
          />
          <button
            type="submit"
            className="inline-flex h-8 items-center justify-center border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-241a12))] px-3 text-[8px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd4a0))] transition hover:border-[rgb(var(--sep-colour-b28b55))] hover:bg-[rgb(var(--sep-colour-302217))]"
          >
            Journey There
          </button>
        </form>
      ) : null}
    </div>
  );
}
