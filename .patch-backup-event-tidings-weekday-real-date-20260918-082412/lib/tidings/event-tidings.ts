import {
  formatAurethDate,
  fromIsoDateKey,
  toIsoDateKey,
} from "@/lib/world/calendar";
import type { Tiding } from "@/lib/tidings/types";

export type EventTidingSource = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  recurrence_type:
    | "once"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly";
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  room: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

const DAY_MS =
  24 * 60 * 60 * 1000;

function startOfUtcDay(value: Date) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      12,
    ),
  );
}

function addUtcDays(
  value: Date,
  amount: number,
) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate() + amount,
      12,
    ),
  );
}

function daysBetween(
  first: Date,
  second: Date,
) {
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

function daysInUtcMonth(
  year: number,
  monthIndex: number,
) {
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
  event: EventTidingSource,
  date: Date,
) {
  if (
    event.recurrence_type ===
    "once"
  ) {
    return false;
  }

  const first =
    fromIsoDateKey(
      event.event_date,
    );

  if (date < first) {
    return false;
  }

  if (
    event.recurrence_type ===
    "daily"
  ) {
    return true;
  }

  if (
    event.recurrence_type ===
    "weekly"
  ) {
    return (
      daysBetween(
        first,
        date,
      ) %
        7 ===
      0
    );
  }

  if (
    event.recurrence_type ===
    "monthly"
  ) {
    const occurrenceDay =
      Math.min(
        first.getUTCDate(),
        daysInUtcMonth(
          date.getUTCFullYear(),
          date.getUTCMonth(),
        ),
      );

    return (
      date.getUTCDate() ===
      occurrenceDay
    );
  }

  if (
    event.recurrence_type ===
    "yearly"
  ) {
    if (
      date.getUTCMonth() !==
      first.getUTCMonth()
    ) {
      return false;
    }

    const occurrenceDay =
      Math.min(
        first.getUTCDate(),
        daysInUtcMonth(
          date.getUTCFullYear(),
          first.getUTCMonth(),
        ),
      );

    return (
      date.getUTCDate() ===
      occurrenceDay
    );
  }

  return false;
}

function parseClock(value: string) {
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

function dateWithClock(
  date: Date,
  clock: {
    hour: number;
    minute: number;
  },
) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      clock.hour,
      clock.minute,
      0,
      0,
    ),
  );
}

function formatClockRange(
  startTime: string,
  endTime: string,
) {
  return `${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`;
}

export function getActiveEventTidings(
  events: EventTidingSource[],
  gameDate: Date,
): Tiding[] {
  const now =
    gameDate.getTime();

  if (Number.isNaN(now)) {
    return [];
  }

  const today =
    startOfUtcDay(
      gameDate,
    );

  const candidateDates = [
    today,
    addUtcDays(today, 1),
  ];

  const tidings: Tiding[] = [];

  for (const event of events) {
    if (
      event.recurrence_type === "once" ||
      !event.start_time ||
      !event.end_time
    ) {
      continue;
    }

    const startClock =
      parseClock(
        event.start_time,
      );

    const endClock =
      parseClock(
        event.end_time,
      );

    if (!startClock || !endClock) {
      continue;
    }

    for (
      const occurrenceDate of
        candidateDates
    ) {
      if (
        !occursOnDate(
          event,
          occurrenceDate,
        )
      ) {
        continue;
      }

      const occurrenceStart =
        dateWithClock(
          occurrenceDate,
          startClock,
        );

      const occurrenceEnd =
        dateWithClock(
          occurrenceDate,
          endClock,
        );

      const startsShowingAt =
        occurrenceStart.getTime() -
        DAY_MS;

      const endsShowingAt =
        occurrenceEnd.getTime();

      if (
        now < startsShowingAt ||
        now >= endsShowingAt
      ) {
        continue;
      }

      const location =
        event.room?.name ??
        event.location_name ??
        "No specific location";

      const description =
        event.description?.trim() ||
        "No description provided.";

      const occurrenceKey =
        toIsoDateKey(
          occurrenceDate,
        );

      tidings.push({
        id:
          `event-tiding:${event.id}:${occurrenceKey}`,
        title:
          event.title,
        message:
          `Date: ${formatAurethDate(occurrenceDate)} · Time: ${formatClockRange(event.start_time, event.end_time)} · Location: ${location} · ${description}`,
        priority:
          "important",
        is_active:
          true,
        starts_at:
          new Date(
            startsShowingAt,
          ).toISOString(),
        expires_at:
          occurrenceEnd.toISOString(),
        created_at:
          occurrenceStart.toISOString(),
        updated_at:
          `${event.id}:${occurrenceKey}`,
      });
    }
  }

  return tidings;
}
