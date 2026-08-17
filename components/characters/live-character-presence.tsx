"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import type {
  PublicCharacterRoom,
  PublicCharacterPresence,
  PublicPresenceStatus,
} from "@/types/public-character";

const ACTIVE_PRESENCE_MINUTES = 3;

type PresencePayload = {
  character_id: string;
  status: PublicPresenceStatus;
  last_seen_at: string;
  room_id: string | null;
};

type RoomRelation = {
  id: string;
  name: string;
  slug: string;
  area:
    | {
        id: string;
        name: string;
        slug: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
      }[]
    | null;
};

function normaliseRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getEffectiveStatus(
  presence: PublicCharacterPresence | null,
  now: number,
): PublicPresenceStatus | "offline" {
  if (!presence) {
    return "offline";
  }

  const lastSeen = Date.parse(
    presence.last_seen_at,
  );

  if (
    Number.isNaN(lastSeen) ||
    lastSeen <
      now -
        ACTIVE_PRESENCE_MINUTES *
          60_000
  ) {
    return "offline";
  }

  return presence.status;
}

function formatRelativeActivity(
  value: string | undefined,
  now: number,
): string {
  if (!value) {
    return "No recent activity";
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return "No recent activity";
  }

  const elapsed = Math.max(
    0,
    now - timestamp,
  );

  const minutes = Math.floor(
    elapsed / 60_000,
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} minute${
      minutes === 1 ? "" : "s"
    } ago`;
  }

  const hours = Math.floor(
    minutes / 60,
  );

  if (hours < 24) {
    return `${hours} hour${
      hours === 1 ? "" : "s"
    } ago`;
  }

  const days = Math.floor(
    hours / 24,
  );

  return `${days} day${
    days === 1 ? "" : "s"
  } ago`;
}

function statusAppearance(
  status:
    | PublicPresenceStatus
    | "offline",
) {
  const styles = {
    online: {
      label: "Online",
      dot:
        "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
      text: "text-emerald-400",
    },
    away: {
      label: "Away",
      dot:
        "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]",
      text: "text-amber-400",
    },
    busy: {
      label: "Busy",
      dot:
        "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]",
      text: "text-red-400",
    },
    offline: {
      label: "Offline",
      dot: "bg-stone-600",
      text: "text-[#837668]",
    },
  };

  return styles[status];
}

export function LiveCharacterPresence({
  characterId,
  initialPresence,
  initialRoom,
  compact = false,
}: {
  characterId: string;
  initialPresence: PublicCharacterPresence | null;
  initialRoom: PublicCharacterRoom | null;
  compact?: boolean;
}) {
  const [presence, setPresence] =
    useState<PublicCharacterPresence | null>(
      initialPresence,
    );

  const [room, setRoom] =
    useState<PublicCharacterRoom | null>(
      initialPresence?.room_id
        ? initialRoom
        : null,
    );

  const [now, setNow] =
    useState(() => Date.now());

  const [loadingRoom, setLoadingRoom] =
    useState(false);

  const loadRoom = useCallback(
    async (
      roomId: string | null,
    ) => {
      if (!roomId) {
        setRoom(null);
        setLoadingRoom(false);
        return;
      }

      setLoadingRoom(true);

      const supabase =
        createClient();

      const {
        data,
        error,
      } = await supabase
        .from("rooms")
        .select(`
          id,
          name,
          slug,
          area:areas!rooms_area_id_fkey(
            id,
            name,
            slug
          )
        `)
        .eq("id", roomId)
        .maybeSingle();

      if (error || !data) {
        setRoom(null);
        setLoadingRoom(false);
        return;
      }

      const row =
        data as unknown as RoomRelation;

      setRoom({
        id: row.id,
        name: row.name,
        slug: row.slug,
        area:
          normaliseRelation(row.area),
      });

      setLoadingRoom(false);
    },
    [],
  );

  useEffect(() => {
    const timer =
      window.setInterval(
        () => setNow(Date.now()),
        30_000,
      );

    return () =>
      window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const supabase =
      createClient();

    const channel = supabase
      .channel(
        `public-character-presence:${characterId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "character_presence",
          filter:
            `character_id=eq.${characterId}`,
        },
        (payload) => {
          if (
            payload.eventType ===
            "DELETE"
          ) {
            setPresence(null);
            setRoom(null);
            setNow(Date.now());
            return;
          }

          const next =
            payload.new as PresencePayload;

          const nextPresence:
            PublicCharacterPresence = {
              status: next.status,
              last_seen_at:
                next.last_seen_at,
              room_id:
                next.room_id,
            };

          setPresence(nextPresence);
          setNow(Date.now());

          if (
            next.room_id !==
            room?.id
          ) {
            void loadRoom(
              next.room_id,
            );
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    characterId,
    loadRoom,
    room?.id,
  ]);

  const effectiveStatus =
    useMemo(
      () =>
        getEffectiveStatus(
          presence,
          now,
        ),
      [presence, now],
    );

  const appearance =
    statusAppearance(
      effectiveStatus,
    );

  const location =
    effectiveStatus === "offline"
      ? "No current location"
      : loadingRoom
        ? "Updating location..."
        : room
          ? room.area
            ? `${room.name}, ${room.area.name}`
            : room.name
          : "No current location";

  if (compact) {
    return (
      <>
        <div className="min-w-0 bg-[#17110d] px-3 py-2">
          <p className="text-[7px] uppercase tracking-[0.19em] text-[#796448]">
            Live record
          </p>

          <p
            className={`mt-1 flex items-center gap-1.5 text-[11px] leading-5 ${appearance.text}`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${appearance.dot}`}
            />
            {appearance.label}
          </p>
        </div>

        <div className="min-w-0 bg-[#17110d] px-3 py-2">
          <p className="text-[7px] uppercase tracking-[0.19em] text-[#796448]">
            Last activity
          </p>

          <p className="mt-1 break-words text-[11px] leading-5 text-[#cab89b]">
            {formatRelativeActivity(
              presence?.last_seen_at,
              now,
            )}
          </p>
        </div>

        <div className="min-w-0 bg-[#17110d] px-3 py-2 sm:col-span-2 lg:col-span-3">
          <p className="text-[7px] uppercase tracking-[0.19em] text-[#796448]">
            Current location
          </p>

          <p className="mt-1 break-words text-[11px] leading-5 text-[#cab89b]">
            {location}
          </p>
        </div>
      </>
    );
  }

  return (
    <section className="flex h-full flex-col border border-[#60482e]/45 bg-black/15 p-5">
      <div>
        <p className="text-[8px] uppercase tracking-[0.24em] text-[#806b50]">
          Live record
        </p>
      </div>

      <div className="mt-5">
        <span
          className={`inline-flex items-center gap-2 border border-[#60482e]/50 bg-[#0d0907]/70 px-3 py-2 text-[9px] uppercase tracking-[0.18em] ${appearance.text}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${appearance.dot}`}
          />

          {appearance.label}
        </span>
      </div>

      <dl className="mt-6 space-y-5">
        <div>
          <dt className="text-[8px] uppercase tracking-[0.2em] text-[#806b50]">
            Last activity
          </dt>

          <dd className="mt-2 text-sm text-[#d4c4ad]">
            {formatRelativeActivity(
              presence?.last_seen_at,
              now,
            )}
          </dd>
        </div>

        <div>
          <dt className="text-[8px] uppercase tracking-[0.2em] text-[#806b50]">
            Current location
          </dt>

          <dd className="mt-2 text-sm leading-6 text-[#d4c4ad]">
            {location}
          </dd>
        </div>
      </dl>
    </section>
  );
}