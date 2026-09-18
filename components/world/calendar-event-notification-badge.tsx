"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import {
  fromIsoDateKey,
} from "@/lib/world/calendar";

type CalendarEventNotificationBadgeProps = {
  characterId: string | null;
  gameDate: Date;
  calendarOpen: boolean;
};

type CalendarEventRow = {
  id: string;
  event_date: string;
  recurrence_type:
    | "once"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly";
  start_time: string | null;
  end_time: string | null;
  notify_24h: boolean;
  notify_1h: boolean;
};

type ActiveReminder = {
  eventId: string;
  windowStart: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function utcDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      12,
    ),
  );
}

function addUtcDays(date: Date, amount: number) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + amount,
      12,
    ),
  );
}

function daysBetween(first: Date, second: Date) {
  return Math.floor(
    (
      Date.UTC(
        second.getUTCFullYear(),
        second.getUTCMonth(),
        second.getUTCDate(),
      ) -
      Date.UTC(
        first.getUTCFullYear(),
        first.getUTCMonth(),
        first.getUTCDate(),
      )
    ) /
      DAY_MS,
  );
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(
    Date.UTC(
      year,
      monthIndex + 1,
      0,
      12,
    ),
  ).getUTCDate();
}

function occursOnDate(
  event: CalendarEventRow,
  date: Date,
) {
  const first =
    fromIsoDateKey(
      event.event_date,
    );

  if (date < first) {
    return false;
  }

  if (event.recurrence_type === "once") {
    return (
      date.getUTCFullYear() === first.getUTCFullYear() &&
      date.getUTCMonth() === first.getUTCMonth() &&
      date.getUTCDate() === first.getUTCDate()
    );
  }

  if (event.recurrence_type === "daily") {
    return true;
  }

  if (event.recurrence_type === "weekly") {
    return daysBetween(first, date) % 7 === 0;
  }

  if (event.recurrence_type === "monthly") {
    const expectedDay =
      Math.min(
        first.getUTCDate(),
        daysInMonth(
          date.getUTCFullYear(),
          date.getUTCMonth(),
        ),
      );

    return date.getUTCDate() === expectedDay;
  }

  if (event.recurrence_type === "yearly") {
    if (date.getUTCMonth() !== first.getUTCMonth()) {
      return false;
    }

    const expectedDay =
      Math.min(
        first.getUTCDate(),
        daysInMonth(
          date.getUTCFullYear(),
          first.getUTCMonth(),
        ),
      );

    return date.getUTCDate() === expectedDay;
  }

  return false;
}

function parseTime(value: string | null) {
  if (!value) {
    return null;
  }

  const match =
    value.match(
      /^([01]\d|2[0-3]):([0-5]\d)/,
    );

  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

function withTime(
  date: Date,
  time: {
    hour: number;
    minute: number;
  },
) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      time.hour,
      time.minute,
      0,
      0,
    ),
  );
}

function getActiveReminder(
  event: CalendarEventRow,
  gameDate: Date,
): ActiveReminder | null {
  const startClock =
    parseTime(
      event.start_time,
    );

  if (!startClock) {
    return null;
  }

  if (
    !event.notify_24h &&
    !event.notify_1h
  ) {
    return null;
  }

  const today =
    utcDay(
      gameDate,
    );

  const candidates = [
    today,
    addUtcDays(today, 1),
  ];

  const now =
    gameDate.getTime();

  for (const date of candidates) {
    if (!occursOnDate(event, date)) {
      continue;
    }

    const occurrenceStart =
      withTime(
        date,
        startClock,
      ).getTime();

    const endClock =
      parseTime(
        event.end_time,
      );

    const occurrenceEnd =
      endClock
        ? withTime(
            date,
            endClock,
          ).getTime()
        : occurrenceStart + HOUR_MS;

    const reminderLead =
      event.notify_24h
        ? DAY_MS
        : HOUR_MS;

    const windowStart =
      occurrenceStart -
      reminderLead;

    if (
      now >= windowStart &&
      now < occurrenceEnd
    ) {
      return {
        eventId: event.id,
        windowStart,
      };
    }
  }

  return null;
}

export function CalendarEventNotificationBadge({
  characterId,
  gameDate,
  calendarOpen,
}: CalendarEventNotificationBadgeProps) {
  const supabase =
    useMemo(
      () => createClient(),
      [],
    );

  const [count, setCount] =
    useState(0);

  const [
    activeReminders,
    setActiveReminders,
  ] = useState<ActiveReminder[]>([]);

  const loadUnread =
    useCallback(async () => {
      if (!characterId) {
        setCount(0);
        setActiveReminders([]);
        return;
      }

      const {
        data: events,
        error: eventsError,
      } = await supabase
        .from("calendar_events")
        .select(
          "id,event_date,recurrence_type,start_time,end_time,notify_24h,notify_1h",
        )
        .eq("is_active", true)
        .or(
          "notify_24h.eq.true,notify_1h.eq.true",
        );

      if (eventsError) {
        console.error(
          "Unable to load calendar Event reminders:",
          eventsError.message,
        );
        return;
      }

      const reminders =
        (events ?? [])
          .map(
            (event) =>
              getActiveReminder(
                {
                  id: String(event.id),
                  event_date:
                    String(event.event_date),
                  recurrence_type:
                    (
                      event.recurrence_type ??
                      "once"
                    ) as CalendarEventRow["recurrence_type"],
                  start_time:
                    event.start_time ??
                    null,
                  end_time:
                    event.end_time ??
                    null,
                  notify_24h:
                    event.notify_24h ===
                    true,
                  notify_1h:
                    event.notify_1h ===
                    true,
                },
                gameDate,
              ),
          )
          .filter(
            (
              reminder,
            ): reminder is ActiveReminder =>
              Boolean(reminder),
          );

      setActiveReminders(reminders);

      if (reminders.length === 0) {
        setCount(0);
        return;
      }

      const eventIds =
        reminders.map(
          (reminder) =>
            reminder.eventId,
        );

      const {
        data: reads,
        error: readsError,
      } = await supabase
        .from(
          "calendar_event_reads",
        )
        .select(
          "event_id,checked_at",
        )
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
          "Unable to load calendar Event reads:",
          readsError.message,
        );
        return;
      }

      const checkedByEvent =
        new Map(
          (reads ?? []).map(
            (read) => [
              String(read.event_id),
              Date.parse(
                String(
                  read.checked_at ??
                  "",
                ),
              ),
            ],
          ),
        );

      const unread =
        reminders.filter(
          (reminder) => {
            const checkedAt =
              checkedByEvent.get(
                reminder.eventId,
              );

            return (
              checkedAt === undefined ||
              Number.isNaN(checkedAt) ||
              checkedAt <
                reminder.windowStart
            );
          },
        );

      setCount(unread.length);
    }, [
      characterId,
      gameDate,
      supabase,
    ]);

  const markActiveRemindersRead =
    useCallback(async () => {
      if (
        !characterId ||
        activeReminders.length === 0
      ) {
        return;
      }

      const now =
        new Date().toISOString();

      const {
        error,
      } = await supabase
        .from(
          "calendar_event_reads",
        )
        .upsert(
          activeReminders.map(
            (reminder) => ({
              character_id:
                characterId,
              event_id:
                reminder.eventId,
              checked_at:
                now,
            }),
          ),
          {
            onConflict:
              "character_id,event_id",
          },
        );

      if (error) {
        console.error(
          "Unable to save calendar Event reads:",
          error.message,
        );
        return;
      }

      setCount(0);
    }, [
      activeReminders,
      characterId,
      supabase,
    ]);

  useEffect(() => {
    void loadUnread();

    if (!characterId) {
      return;
    }

    const channel =
      supabase
        .channel(
          `calendar-notifications-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "calendar_events",
          },
          () => {
            void loadUnread();
          },
        )
        .subscribe();

    const timer =
      window.setInterval(
        () => {
          void loadUnread();
        },
        30_000,
      );

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [
    characterId,
    loadUnread,
    supabase,
  ]);

  useEffect(() => {
    if (!calendarOpen) {
      return;
    }

    void markActiveRemindersRead();
  }, [
    calendarOpen,
    markActiveRemindersRead,
  ]);

  if (count <= 0) {
    return null;
  }

  return (
    <span
      aria-label={`${count} unread calendar Event reminder${
        count === 1
          ? ""
          : "s"
      }`}
      className="absolute -right-1.5 -top-1.5 z-20 flex h-4 min-w-4 items-center justify-center rounded-full border border-[rgb(var(--sep-colour-d6ad6b))] bg-[rgb(var(--sep-colour-8f321f))] px-1 text-[8px] font-bold leading-none text-[rgb(var(--sep-colour-fff1d5))] shadow-[0_2px_8px_rgba(var(--sep-rgb-0-0-0),0.65)] components_world_calendar_event_notification_badge_span_text"
    >
      {count > 99
        ? "99+"
        : count}
    </span>
  );
}
