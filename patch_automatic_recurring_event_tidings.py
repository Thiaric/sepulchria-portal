from __future__ import annotations

from datetime import datetime
from pathlib import Path
import shutil
import sys

ROOT = Path.cwd()
TICKER = ROOT / "components/tidings/tidings-ticker.tsx"
HELPER = ROOT / "lib/tidings/event-tidings.ts"


def fail(message: str) -> None:
    print(f"\nERROR: {message}\n")
    sys.exit(1)


if not TICKER.exists():
    fail("Could not find components/tidings/tidings-ticker.tsx. Run this script from the Sepulchria repo root.")

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup_root = ROOT / f".patch-backup-event-tidings-{stamp}"
backup = backup_root / TICKER.relative_to(ROOT)
backup.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(TICKER, backup)

if HELPER.exists():
    helper_backup = backup_root / HELPER.relative_to(ROOT)
    helper_backup.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(HELPER, helper_backup)

print(f"Backup created in: {backup_root}")

helper_text = r'''import {
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
'''

HELPER.parent.mkdir(parents=True, exist_ok=True)
HELPER.write_text(helper_text, encoding="utf-8")

text = TICKER.read_text(encoding="utf-8")

old = '''import { createClient } from "@/lib/supabase/client";
import type { Tiding } from "@/lib/tidings/types";
'''
new = '''import { createClient } from "@/lib/supabase/client";
import { useWorldState } from "@/components/world/world-state-provider";
import {
  getActiveEventTidings,
  type EventTidingSource,
} from "@/lib/tidings/event-tidings";
import type { Tiding } from "@/lib/tidings/types";
'''
if old not in text:
    fail("Ticker import block did not match the current repository.")
text = text.replace(old, new, 1)

old = '''export function TidingsTicker({
  initialTidings,
}: {
  initialTidings: Tiding[];
}) {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [tidings, setTidings] = useState(() =>
    sortTidings(initialTidings),
  );
'''
new = '''export function TidingsTicker({
  initialTidings,
}: {
  initialTidings: Tiding[];
}) {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const {
    gameDate,
  } = useWorldState();

  const [tidings, setTidings] = useState(() =>
    sortTidings(initialTidings),
  );

  const [
    calendarEvents,
    setCalendarEvents,
  ] = useState<
    EventTidingSource[]
  >([]);
'''
if old not in text:
    fail("Ticker component opening block did not match.")
text = text.replace(old, new, 1)

anchor = '''  useEffect(() => {
    const channel = supabase
      .channel("portal-tidings-live-v2")
'''
event_effect = '''  useEffect(() => {
    let cancelled =
      false;

    async function loadCalendarEvents() {
      const {
        data,
        error,
      } = await supabase
        .from(
          "calendar_events",
        )
        .select(`
          id,
          title,
          description,
          event_date,
          recurrence_type,
          start_time,
          end_time,
          location_name,
          room:rooms!calendar_events_room_id_fkey(
            id,
            name,
            slug
          )
        `)
        .eq(
          "is_active",
          true,
        )
        .neq(
          "recurrence_type",
          "once",
        )
        .order(
          "event_date",
          {
            ascending: true,
          },
        );

      if (cancelled) {
        return;
      }

      if (error) {
        console.error(
          "Unable to load recurring Event Tidings:",
          error.message,
        );
        setCalendarEvents([]);
        return;
      }

      setCalendarEvents(
        (data ?? []).map(
          (event) => {
            const room =
              Array.isArray(
                event.room,
              )
                ? event.room[0] ??
                  null
                : event.room;

            return {
              id: String(event.id),
              title: String(event.title),
              description:
                event.description ??
                null,
              event_date:
                String(event.event_date),
              recurrence_type:
                (
                  event.recurrence_type ??
                  "once"
                ) as EventTidingSource["recurrence_type"],
              start_time:
                event.start_time ??
                null,
              end_time:
                event.end_time ??
                null,
              location_name:
                event.location_name ??
                null,
              room:
                room
                  ? {
                      id:
                        String(room.id),
                      name:
                        String(room.name),
                      slug:
                        String(room.slug),
                    }
                  : null,
            };
          },
        ),
      );
    }

    void loadCalendarEvents();

    const channel =
      supabase
        .channel(
          "portal-event-tidings-live-v1",
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
            void loadCalendarEvents();
          },
        )
        .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(
        channel,
      );
    };
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("portal-tidings-live-v2")
'''
if anchor not in text:
    fail("Could not find the Tidings realtime effect anchor.")
text = text.replace(anchor, event_effect, 1)

old = '''  const visible = useMemo(() => {
    const now = Date.now();

    return sortTidings(
      tidings.filter((entry) =>
        stillVisible(entry, now),
      ),
    );
  }, [tidings]);
'''
new = '''  const visible = useMemo(() => {
    const now = Date.now();

    const manualTidings =
      tidings.filter((entry) =>
        stillVisible(
          entry,
          now,
        ),
      );

    const eventTidings =
      getActiveEventTidings(
        calendarEvents,
        gameDate,
      );

    return sortTidings([
      ...eventTidings,
      ...manualTidings,
    ]).slice(
      0,
      12,
    );
  }, [
    tidings,
    calendarEvents,
    gameDate,
  ]);
'''
if old not in text:
    fail("Visible Tidings memo block did not match.")
text = text.replace(old, new, 1)

TICKER.write_text(text, encoding="utf-8")

print("\nPatch applied successfully.")
print("\nChanged:")
print("  - components/tidings/tidings-ticker.tsx")
print("  - lib/tidings/event-tidings.ts (new)")
print("\nBehaviour:")
print("  - Active recurring events only")
print("  - Requires both Start time and End time")
print("  - Appears 24 Aureth hours before each occurrence")
print("  - Remains visible until that occurrence's end time")
print("  - Uses Aureth game time, including pauses and time-scale changes")
print("  - Shows title, Aureth date, time, location and description")
print("  - No database Tiding row is created, so there is nothing stale to delete")
print("  - Event edits/deletions update through Realtime")
print("\nNothing was committed or pushed.")
print("\nNext:")
print("  npm run build")
print('  git diff -- components/tidings/tidings-ticker.tsx lib/tidings/event-tidings.ts')
