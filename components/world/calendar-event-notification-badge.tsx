"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { toIsoDateKey } from "@/lib/world/calendar";

type CalendarEventNotificationBadgeProps = {
  characterId: string | null;
  gameDate: Date;
  calendarOpen: boolean;
};

export function CalendarEventNotificationBadge({
  characterId,
  gameDate,
  calendarOpen,
}: CalendarEventNotificationBadgeProps) {
  const [count, setCount] =
    useState(0);

  const loadUnread =
    useCallback(async () => {
      if (!characterId) {
        setCount(0);
        return;
      }

      const supabase =
        createClient();

      const today =
        toIsoDateKey(
          gameDate,
        );

      const {
        data: futureEvents,
        error: eventsError,
      } = await supabase
        .from("calendar_events")
        .select("id")
        .eq(
          "is_active",
          true,
        )
        .gte(
          "event_date",
          today,
        );

      if (eventsError) {
        console.error(
          "Unable to load future calendar events:",
          eventsError.message,
        );

        return;
      }

      const eventIds =
        (futureEvents ?? []).map(
          (event) =>
            String(event.id),
        );

      if (
        eventIds.length === 0
      ) {
        setCount(0);
        return;
      }

      const {
        data: reads,
        error: readsError,
      } = await supabase
        .from(
          "calendar_event_reads",
        )
        .select("event_id")
        .eq(
          "character_id",
          characterId,
        )
        .in(
          "event_id",
          eventIds,
        );

      if (readsError) {
        console.error(
          "Unable to load calendar event reads:",
          readsError.message,
        );

        return;
      }

      const readIds =
        new Set(
          (reads ?? []).map(
            (read) =>
              String(
                read.event_id,
              ),
          ),
        );

      setCount(
        eventIds.filter(
          (eventId) =>
            !readIds.has(
              eventId,
            ),
        ).length,
      );
    }, [
      characterId,
      gameDate,
    ]);

  const markFutureEventsRead =
    useCallback(async () => {
      if (!characterId) {
        return;
      }

      const supabase =
        createClient();

      const today =
        toIsoDateKey(
          gameDate,
        );

      const {
        data: futureEvents,
        error,
      } = await supabase
        .from("calendar_events")
        .select("id")
        .eq(
          "is_active",
          true,
        )
        .gte(
          "event_date",
          today,
        );

      if (
        error ||
        !futureEvents?.length
      ) {
        if (error) {
          console.error(
            "Unable to mark calendar events as read:",
            error.message,
          );
        }

        return;
      }

      const now =
        new Date().toISOString();

      const {
        error: upsertError,
      } = await supabase
        .from(
          "calendar_event_reads",
        )
        .upsert(
          futureEvents.map(
            (event) => ({
              character_id:
                characterId,

              event_id:
                event.id,

              checked_at:
                now,
            }),
          ),
          {
            onConflict:
              "character_id,event_id",
          },
        );

      if (upsertError) {
        console.error(
          "Unable to save calendar event reads:",
          upsertError.message,
        );

        return;
      }

      setCount(0);
    }, [
      characterId,
      gameDate,
    ]);

  useEffect(() => {
    void loadUnread();

    if (!characterId) {
      return;
    }

    const supabase =
      createClient();

    const channel =
      supabase
        .channel(
          `calendar-notifications-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema:
              "public",
            table:
              "calendar_events",
          },
          () => {
            void loadUnread();
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
    loadUnread,
  ]);

  useEffect(() => {
    if (!calendarOpen) {
      return;
    }

    void markFutureEventsRead();
  }, [
    calendarOpen,
    markFutureEventsRead,
  ]);

  if (count <= 0) {
    return null;
  }

  return (
    <span
      aria-label={`${count} unchecked future calendar event${
        count === 1
          ? ""
          : "s"
      }`}
      className="absolute -right-1.5 -top-1.5 z-20 flex h-4 min-w-4 items-center justify-center rounded-full border border-[#d6ad6b] bg-[#8f321f] px-1 text-[8px] font-bold leading-none text-[#fff1d5] shadow-[0_2px_8px_rgba(0,0,0,0.65)]"
    >
      {count > 99
        ? "99+"
        : count}
    </span>
  );
}