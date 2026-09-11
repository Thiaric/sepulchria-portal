from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path.cwd()
EXPECTED_HEAD = "b54c8044d4b0554c80fad2252a0dd76463b8ef53"

ACTIONS = ROOT / "app" / "(portal)" / "admin" / "events" / "actions.ts"
ADMIN_PAGE = ROOT / "app" / "(portal)" / "admin" / "events" / "page.tsx"
WORLD = ROOT / "components" / "world" / "world-indicator.tsx"
BADGE = ROOT / "components" / "world" / "calendar-event-notification-badge.tsx"
HELPER = ROOT / "lib" / "world" / "calendar-recurrence.ts"

TOUCH = [ACTIONS, ADMIN_PAGE, WORLD, BADGE]
BACKUP_ROOT = ROOT / ".recurring-events-backup"


def fail(message: str) -> None:
    print(f"\nSTOPPED: {message}", file=sys.stderr)
    sys.exit(1)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}.")
    return text.replace(old, new, 1)


if not (ROOT / "package.json").exists():
    fail("Run this from the sepulchria-portal repository root.")

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    cwd=ROOT,
    text=True,
).strip()

if head != EXPECTED_HEAD:
    fail(
        f"This patch is locked to {EXPECTED_HEAD[:7]}; "
        f"your current HEAD is {head[:7]}."
    )

for path in TOUCH:
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")

if BACKUP_ROOT.exists():
    shutil.rmtree(BACKUP_ROOT)

for path in TOUCH:
    dest = BACKUP_ROOT / path.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)

helper_existed = HELPER.exists()
if helper_existed:
    dest = BACKUP_ROOT / HELPER.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(HELPER, dest)


def restore() -> None:
    for path in TOUCH:
        src = BACKUP_ROOT / path.relative_to(ROOT)
        if src.exists():
            shutil.copy2(src, path)

    helper_backup = BACKUP_ROOT / HELPER.relative_to(ROOT)
    if helper_existed and helper_backup.exists():
        shutil.copy2(helper_backup, HELPER)
    elif not helper_existed and HELPER.exists():
        HELPER.unlink()


try:
    # ------------------------------------------------------------
    # Shared recurrence helper
    # ------------------------------------------------------------
    HELPER.parent.mkdir(parents=True, exist_ok=True)
    HELPER.write_text(
        '''import {
  fromIsoDateKey,
  toIsoDateKey,
} from "@/lib/world/calendar";

export const CALENDAR_RECURRENCE_TYPES = [
  "none",
  "daily",
  "weekly",
  "monthly",
  "yearly",
] as const;

export type CalendarRecurrenceType =
  (typeof CALENDAR_RECURRENCE_TYPES)[number];

export function normalizeCalendarRecurrence(
  value: string | null | undefined,
): CalendarRecurrenceType {
  return CALENDAR_RECURRENCE_TYPES.includes(
    value as CalendarRecurrenceType,
  )
    ? (value as CalendarRecurrenceType)
    : "none";
}

export function calendarRecurrenceLabel(
  value: string | null | undefined,
) {
  switch (normalizeCalendarRecurrence(value)) {
    case "daily":
      return "Every day";
    case "weekly":
      return "Every week";
    case "monthly":
      return "Every month";
    case "yearly":
      return "Every year";
    default:
      return "One-time";
  }
}

function utcDayNumber(date: Date) {
  return Math.floor(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ) / 86_400_000,
  );
}

export function calendarEventOccursOn(
  baseDateKey: string,
  recurrenceValue: string | null | undefined,
  targetDateKey: string,
) {
  const recurrence =
    normalizeCalendarRecurrence(recurrenceValue);

  const base = fromIsoDateKey(baseDateKey);
  const target = fromIsoDateKey(targetDateKey);

  if (target.getTime() < base.getTime()) {
    return false;
  }

  if (recurrence === "none") {
    return targetDateKey === baseDateKey;
  }

  if (recurrence === "daily") {
    return true;
  }

  if (recurrence === "weekly") {
    return (
      (utcDayNumber(target) - utcDayNumber(base)) % 7 === 0
    );
  }

  if (recurrence === "monthly") {
    return target.getUTCDate() === base.getUTCDate();
  }

  return (
    target.getUTCMonth() === base.getUTCMonth() &&
    target.getUTCDate() === base.getUTCDate()
  );
}

export function expandCalendarEventOccurrences<
  T extends {
    id: string;
    event_date: string;
    recurrence_type: string | null;
  },
>(
  events: T[],
  startDateKey: string,
  endDateKey: string,
): T[] {
  const start = fromIsoDateKey(startDateKey);
  const end = fromIsoDateKey(endDateKey);

  const output: T[] = [];

  for (
    let cursor = new Date(start);
    cursor.getTime() <= end.getTime();
    cursor = new Date(
      Date.UTC(
        cursor.getUTCFullYear(),
        cursor.getUTCMonth(),
        cursor.getUTCDate() + 1,
        12,
      ),
    )
  ) {
    const targetDateKey = toIsoDateKey(cursor);

    for (const event of events) {
      if (
        calendarEventOccursOn(
          event.event_date,
          event.recurrence_type,
          targetDateKey,
        )
      ) {
        output.push({
          ...event,
          id: `${event.id}::${targetDateKey}`,
          event_date: targetDateKey,
        });
      }
    }
  }

  return output.sort((a, b) => {
    const byDate = a.event_date.localeCompare(b.event_date);
    if (byDate !== 0) return byDate;

    const aTime =
      "start_time" in a
        ? String(
            (a as T & { start_time?: string | null }).start_time ?? "",
          )
        : "";

    const bTime =
      "start_time" in b
        ? String(
            (b as T & { start_time?: string | null }).start_time ?? "",
          )
        : "";

    return aTime.localeCompare(bTime);
  });
}

export function calendarSeriesHasFutureOccurrence(
  eventDateKey: string,
  recurrenceValue: string | null | undefined,
  todayDateKey: string,
) {
  const recurrence =
    normalizeCalendarRecurrence(recurrenceValue);

  return recurrence !== "none" || eventDateKey >= todayDateKey;
}
''',
        encoding="utf-8",
    )

    # ------------------------------------------------------------
    # Admin actions
    # ------------------------------------------------------------
    text = ACTIONS.read_text(encoding="utf-8")

    anchor = '''function readCheckbox(
  value: FormDataEntryValue | null,
) {
  return (
    value === "on" ||
    value === "true"
  );
}
'''

    text = replace_once(
        text,
        anchor,
        anchor + '''
function readRecurrence(
  value: FormDataEntryValue | null,
) {
  const recurrence =
    typeof value === "string"
      ? value.trim()
      : "none";

  if (
    ![
      "none",
      "daily",
      "weekly",
      "monthly",
      "yearly",
    ].includes(recurrence)
  ) {
    throw new Error(
      "Event recurrence is invalid.",
    );
  }

  return recurrence;
}
''',
        "actions recurrence reader",
    )

    text = replace_once(
        text,
        '''  const isActive = readCheckbox(
    formData.get("isActive"),
  );

  const notifyOnPublish = readCheckbox(''',
        '''  const recurrenceType =
    readRecurrence(
      formData.get("recurrenceType"),
    );

  const isActive = readCheckbox(
    formData.get("isActive"),
  );

  const notifyOnPublish = readCheckbox(''',
        "create recurrence value",
    )

    text = replace_once(
        text,
        '''      event_date: eventDate,
      start_time: startTime,''',
        '''      event_date: eventDate,
      recurrence_type: recurrenceType,
      start_time: startTime,''',
        "create recurrence insert",
    )

    marker = "export async function updateCalendarEvent("
    before, update = text.split(marker, 1)

    update = replace_once(
        update,
        '''  const isActive = readCheckbox(
    formData.get("isActive"),
  );

  const notifyOnPublish = readCheckbox(''',
        '''  const recurrenceType =
    readRecurrence(
      formData.get("recurrenceType"),
    );

  const isActive = readCheckbox(
    formData.get("isActive"),
  );

  const notifyOnPublish = readCheckbox(''',
        "update recurrence value",
    )

    update = replace_once(
        update,
        '''      event_date: eventDate,
      start_time: startTime,''',
        '''      event_date: eventDate,
      recurrence_type: recurrenceType,
      start_time: startTime,''',
        "update recurrence update",
    )

    ACTIONS.write_text(before + marker + update, encoding="utf-8")

    # ------------------------------------------------------------
    # Admin page
    # ------------------------------------------------------------
    text = ADMIN_PAGE.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''import {
  requireAdminSection,
} from "@/lib/auth/require-staff";''',
        '''import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import {
  calendarRecurrenceLabel,
} from "@/lib/world/calendar-recurrence";''',
        "admin recurrence import",
    )

    text = replace_once(
        text,
        '''  event_date: string;
  start_time: string | null;''',
        '''  event_date: string;
  recurrence_type:
    | "none"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly";
  start_time: string | null;''',
        "EventRow recurrence type",
    )

    text = replace_once(
        text,
        '''      <EventDateFields
        date={eventDate}
      />

      <div className="grid gap-3 sm:grid-cols-2 admin_events_page_div_visible_calendar_2">''',
        '''      <EventDateFields
        date={eventDate}
      />

      <label className="block admin_events_page_label_recurrence">
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Repeats
        </span>

        <select
          name="recurrenceType"
          defaultValue={
            event?.recurrence_type ?? "none"
          }
          className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-9b7446))]"
        >
          <option value="none">Does not repeat</option>
          <option value="daily">Every day</option>
          <option value="weekly">Every week</option>
          <option value="monthly">Every month</option>
          <option value="yearly">Every year</option>
        </select>

        <span className="mt-1.5 block text-[9px] leading-4 text-[rgb(var(--sep-colour-756958))]">
          Recurrence starts on the Aureth date above and continues until the event is hidden, changed or deleted.
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2 admin_events_page_div_visible_calendar_2">''',
        "admin recurrence select",
    )

    text = replace_once(
        text,
        '''        "id, title, description, event_date, start_time, end_time, location_name, room_id, is_active, notify_on_publish, notify_24h, notify_1h, created_at, updated_at",''',
        '''        "id, title, description, event_date, recurrence_type, start_time, end_time, location_name, room_id, is_active, notify_on_publish, notify_24h, notify_1h, created_at, updated_at",''',
        "admin events select recurrence",
    )

    summary_old = '''                        {event.start_time
                          ? ` · ${timeValue(
                              event.start_time,
                            )}`
                          : ""}
                      </p>'''

    summary_new = '''                        {event.start_time
                          ? ` · ${timeValue(
                              event.start_time,
                            )}`
                          : ""}
                        {" · "}
                        {calendarRecurrenceLabel(
                          event.recurrence_type,
                        )}
                      </p>'''

    text = replace_once(
        text,
        summary_old,
        summary_new,
        "admin event recurrence summary",
    )

    ADMIN_PAGE.write_text(text, encoding="utf-8")

    # ------------------------------------------------------------
    # World calendar
    # ------------------------------------------------------------
    text = WORLD.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''import { getLunarPhase } from "@/lib/world/lunar";''',
        '''import { getLunarPhase } from "@/lib/world/lunar";
import {
  expandCalendarEventOccurrences,
} from "@/lib/world/calendar-recurrence";''',
        "world recurrence import",
    )

    text = replace_once(
        text,
        '''  event_date: string;
  start_time: string | null;''',
        '''  event_date: string;
  recurrence_type: string | null;
  start_time: string | null;''',
        "world event recurrence type",
    )

    start_marker = '''      const {
        data,
        error,
      } = await supabase
        .from(
          "calendar_events",
        )'''
    start = text.index(start_marker)
    end = text.index('''      setEventsLoading(false);''', start)

    new_block = '''      const eventSelect =
        "id, title, description, event_date, recurrence_type, start_time, end_time, location_name, room:rooms!calendar_events_room_id_fkey(id, name, slug)";

      const [
        oneTimeResult,
        recurringResult,
      ] = await Promise.all([
        supabase
          .from("calendar_events")
          .select(eventSelect)
          .eq("is_active", true)
          .eq("recurrence_type", "none")
          .gte("event_date", bounds.start)
          .lte("event_date", bounds.end),
        supabase
          .from("calendar_events")
          .select(eventSelect)
          .eq("is_active", true)
          .neq("recurrence_type", "none")
          .lte("event_date", bounds.end),
      ]);

      if (cancelled) {
        return;
      }

      const error =
        oneTimeResult.error ??
        recurringResult.error;

      if (error) {
        console.error(
          "Unable to load calendar events:",
          error.message,
        );
        setEvents([]);
      } else {
        const sourceEvents = [
          ...(oneTimeResult.data ?? []),
          ...(recurringResult.data ?? []),
        ].map((event) => {
          const room =
            Array.isArray(event.room)
              ? event.room[0] ?? null
              : event.room;

          return {
            id: String(event.id),
            title: String(event.title),
            description:
              event.description ?? null,
            event_date: String(
              event.event_date,
            ),
            recurrence_type:
              event.recurrence_type ?? "none",
            start_time:
              event.start_time ?? null,
            end_time:
              event.end_time ?? null,
            location_name:
              event.location_name ?? null,
            room: room
              ? {
                  id: String(room.id),
                  name: String(room.name),
                  slug: String(room.slug),
                }
              : null,
          };
        });

        setEvents(
          expandCalendarEventOccurrences(
            sourceEvents,
            bounds.start,
            bounds.end,
          ),
        );
      }

'''

    text = text[:start] + new_block + text[end:]
    WORLD.write_text(text, encoding="utf-8")

    # ------------------------------------------------------------
    # Calendar unread badge
    # ------------------------------------------------------------
    text = BADGE.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''import { toIsoDateKey } from "@/lib/world/calendar";''',
        '''import { toIsoDateKey } from "@/lib/world/calendar";
import {
  calendarSeriesHasFutureOccurrence,
} from "@/lib/world/calendar-recurrence";''',
        "badge recurrence import",
    )

    text = replace_once(
        text,
        '''      const {
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
        );''',
        '''      const {
        data: activeEvents,
        error: eventsError,
      } = await supabase
        .from("calendar_events")
        .select(
          "id, event_date, recurrence_type",
        )
        .eq(
          "is_active",
          true,
        );

      const futureEvents =
        (activeEvents ?? []).filter(
          (event) =>
            calendarSeriesHasFutureOccurrence(
              String(event.event_date),
              event.recurrence_type,
              today,
            ),
        );''',
        "badge unread future query",
    )

    text = replace_once(
        text,
        '''      const {
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
        );''',
        '''      const {
        data: activeEvents,
        error,
      } = await supabase
        .from("calendar_events")
        .select(
          "id, event_date, recurrence_type",
        )
        .eq(
          "is_active",
          true,
        );

      const futureEvents =
        (activeEvents ?? []).filter(
          (event) =>
            calendarSeriesHasFutureOccurrence(
              String(event.event_date),
              event.recurrence_type,
              today,
            ),
        );''',
        "badge mark-read future query",
    )

    BADGE.write_text(text, encoding="utf-8")

    # ------------------------------------------------------------
    # Parse validation
    # ------------------------------------------------------------
    validator = r'''
const fs = require("fs");
const ts = require("typescript");
for (const file of process.argv.slice(1)) {
  const source = fs.readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  if (sf.parseDiagnostics.length) {
    console.error("Parse diagnostics for", file);
    console.error(sf.parseDiagnostics);
    process.exit(1);
  }
}
'''

    subprocess.run(
        [
            "node",
            "-e",
            validator,
            str(ACTIONS),
            str(ADMIN_PAGE),
            str(WORLD),
            str(BADGE),
            str(HELPER),
        ],
        cwd=ROOT,
        check=True,
    )

except Exception as error:
    restore()
    fail(
        f"{error}\n"
        "All touched files were restored automatically."
    )

print("\nRECURRING CALENDAR EVENTS PATCH APPLIED")
print("")
print("Choices: one-time, daily, weekly, monthly, yearly.")
print("Recurrence starts on the selected Aureth date and continues indefinitely.")
print("Monthly recurrence skips months that do not contain the selected day.")
print("Yearly recurrence skips years where the selected date does not exist.")
print("")
print("NEXT:")
print("  1. Run the supplied SQL migration in Supabase")
print("  2. npm run build")
