from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path.cwd()
EXPECTED_HEAD = "b54c8044d4b0554c80fad2252a0dd76463b8ef53"

FILES = [
    ROOT / "app" / "(portal)" / "admin" / "events" / "actions.ts",
    ROOT / "app" / "(portal)" / "admin" / "events" / "page.tsx",
    ROOT / "components" / "world" / "world-indicator.tsx",
    ROOT / "components" / "world" / "calendar-event-notification-badge.tsx",
]

BACKUP = ROOT / ".recurring-calendar-events-backup-v2"


def fail(message: str) -> None:
    print(f"\nSTOPPED: {message}", file=sys.stderr)
    sys.exit(1)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: expected exactly 1 match, found {count}."
        )
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

for path in FILES:
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")

if BACKUP.exists():
    shutil.rmtree(BACKUP)

for path in FILES:
    destination = BACKUP / path.relative_to(ROOT)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, destination)


def restore() -> None:
    for path in FILES:
        source = BACKUP / path.relative_to(ROOT)
        if source.exists():
            shutil.copy2(source, path)


try:
    # ===============================================================
    # 1. ADMIN EVENT ACTIONS
    # ===============================================================
    actions_path = FILES[0]
    text = actions_path.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''function readCheckbox(
  value: FormDataEntryValue | null,
) {
  return (
    value === "on" ||
    value === "true"
  );
}

function readTime(''',
        '''function readCheckbox(
  value: FormDataEntryValue | null,
) {
  return (
    value === "on" ||
    value === "true"
  );
}

type EventRecurrence =
  | "once"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";

function readRecurrence(
  value: FormDataEntryValue | null,
): EventRecurrence {
  const next =
    typeof value === "string"
      ? value.trim()
      : "once";

  if (
    next !== "once" &&
    next !== "daily" &&
    next !== "weekly" &&
    next !== "monthly" &&
    next !== "yearly"
  ) {
    throw new Error(
      "Event recurrence is invalid.",
    );
  }

  return next;
}

function readTime(''',
        "recurrence parser",
    )

    create_marker = "export async function createCalendarEvent("
    update_marker = "export async function updateCalendarEvent("

    if create_marker not in text or update_marker not in text:
        raise RuntimeError("Could not locate create/update event actions.")

    before_create, rest = text.split(create_marker, 1)
    create_body, update_body = rest.split(update_marker, 1)

    create_body = replace_once(
        create_body,
        '''  const eventDate =
    readEventDate(formData);

  const startTime = readTime(''',
        '''  const eventDate =
    readEventDate(formData);

  const recurrenceType =
    readRecurrence(
      formData.get("recurrenceType"),
    );

  const startTime = readTime(''',
        "create recurrence value",
    )

    create_body = replace_once(
        create_body,
        '''      event_date: eventDate,
      start_time: startTime,''',
        '''      event_date: eventDate,
      recurrence_type: recurrenceType,
      start_time: startTime,''',
        "create recurrence insert",
    )

    update_body = replace_once(
        update_body,
        '''  const eventDate =
    readEventDate(formData);

  const startTime = readTime(''',
        '''  const eventDate =
    readEventDate(formData);

  const recurrenceType =
    readRecurrence(
      formData.get("recurrenceType"),
    );

  const startTime = readTime(''',
        "update recurrence value",
    )

    update_body = replace_once(
        update_body,
        '''      event_date: eventDate,
      start_time: startTime,''',
        '''      event_date: eventDate,
      recurrence_type: recurrenceType,
      start_time: startTime,''',
        "update recurrence update",
    )

    text = (
        before_create
        + create_marker
        + create_body
        + update_marker
        + update_body
    )

    actions_path.write_text(text, encoding="utf-8")

    # ===============================================================
    # 2. ADMIN EVENTS PAGE
    # ===============================================================
    page_path = FILES[1]
    text = page_path.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''  event_date: string;
  start_time: string | null;''',
        '''  event_date: string;
  recurrence_type:
    | "once"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly";
  start_time: string | null;''',
        "EventRow recurrence field",
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
          Repeat
        </span>

        <select
          name="recurrenceType"
          defaultValue={
            event?.recurrence_type ??
            "once"
          }
          className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-9b7446))]"
        >
          <option value="once">
            Does not repeat
          </option>
          <option value="daily">
            Every day
          </option>
          <option value="weekly">
            Every week
          </option>
          <option value="monthly">
            Every month
          </option>
          <option value="yearly">
            Every year
          </option>
        </select>

        <span className="mt-1.5 block text-[9px] leading-4 text-[rgb(var(--sep-colour-756958))]">
          The selected date is the first occurrence.
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

    text = replace_once(
        text,
        '''                        {aureth.year} ADN
                        {event.start_time
                          ? ` · ${timeValue(
                              event.start_time,
                            )}`
                          : ""}''',
        '''                        {aureth.year} ADN
                        {event.recurrence_type !== "once"
                          ? ` · Repeats ${event.recurrence_type}`
                          : ""}
                        {event.start_time
                          ? ` · ${timeValue(
                              event.start_time,
                            )}`
                          : ""}''',
        "admin recurrence summary",
    )

    page_path.write_text(text, encoding="utf-8")

    # ===============================================================
    # 3. WORLD CALENDAR — EXPAND RECURRING OCCURRENCES
    # ===============================================================
    world_path = FILES[2]
    text = world_path.read_text(encoding="utf-8")

    text = replace_once(
        text,
        '''  event_date: string;
  start_time: string | null;''',
        '''  event_date: string;
  recurrence_type:
    | "once"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly";
  start_time: string | null;''',
        "world CalendarEvent recurrence field",
    )

    helper_anchor = '''function weatherLabel(value: string) {'''
    recurrence_helpers = '''function daysBetween(
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
      86_400_000,
  );
}

function clampedUtcDate(
  year: number,
  monthIndex: number,
  preferredDay: number,
) {
  const daysInMonth =
    new Date(
      Date.UTC(
        year,
        monthIndex + 1,
        0,
        12,
      ),
    ).getUTCDate();

  return new Date(
    Date.UTC(
      year,
      monthIndex,
      Math.min(
        preferredDay,
        daysInMonth,
      ),
      12,
    ),
  );
}

function expandEventForMonth(
  event: CalendarEvent,
  bounds: {
    start: string;
    end: string;
  },
) {
  const firstDate =
    fromIsoDateKey(
      event.event_date,
    );

  const monthStart =
    fromIsoDateKey(
      bounds.start,
    );

  const monthEnd =
    fromIsoDateKey(
      bounds.end,
    );

  if (firstDate > monthEnd) {
    return [];
  }

  const occurrenceDates: Date[] = [];

  if (
    event.recurrence_type ===
    "once"
  ) {
    if (
      firstDate >= monthStart &&
      firstDate <= monthEnd
    ) {
      occurrenceDates.push(
        firstDate,
      );
    }
  } else if (
    event.recurrence_type ===
    "daily"
  ) {
    const first =
      firstDate > monthStart
        ? firstDate
        : monthStart;

    for (
      let date = new Date(
        first.getTime(),
      );
      date <= monthEnd;
      date = new Date(
        Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate() + 1,
          12,
        ),
      )
    ) {
      occurrenceDates.push(
        date,
      );
    }
  } else if (
    event.recurrence_type ===
    "weekly"
  ) {
    const distance =
      daysBetween(
        firstDate,
        monthStart,
      );

    const weeksToAdvance =
      distance <= 0
        ? 0
        : Math.ceil(
            distance / 7,
          );

    let date = new Date(
      Date.UTC(
        firstDate.getUTCFullYear(),
        firstDate.getUTCMonth(),
        firstDate.getUTCDate() +
          weeksToAdvance * 7,
        12,
      ),
    );

    while (date < monthStart) {
      date = new Date(
        Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate() + 7,
          12,
        ),
      );
    }

    while (date <= monthEnd) {
      occurrenceDates.push(
        date,
      );

      date = new Date(
        Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate() + 7,
          12,
        ),
      );
    }
  } else if (
    event.recurrence_type ===
    "monthly"
  ) {
    const candidate =
      clampedUtcDate(
        monthStart.getUTCFullYear(),
        monthStart.getUTCMonth(),
        firstDate.getUTCDate(),
      );

    if (
      candidate >= firstDate &&
      candidate >= monthStart &&
      candidate <= monthEnd
    ) {
      occurrenceDates.push(
        candidate,
      );
    }
  } else if (
    event.recurrence_type ===
    "yearly"
  ) {
    if (
      monthStart.getUTCMonth() ===
      firstDate.getUTCMonth()
    ) {
      const candidate =
        clampedUtcDate(
          monthStart.getUTCFullYear(),
          firstDate.getUTCMonth(),
          firstDate.getUTCDate(),
        );

      if (
        candidate >= firstDate &&
        candidate >= monthStart &&
        candidate <= monthEnd
      ) {
        occurrenceDates.push(
          candidate,
        );
      }
    }
  }

  return occurrenceDates.map(
    (date) => ({
      ...event,
      event_date:
        toIsoDateKey(date),
    }),
  );
}

'''
    if helper_anchor not in text:
        raise RuntimeError("Could not locate world calendar helper anchor.")
    text = text.replace(
        helper_anchor,
        recurrence_helpers + helper_anchor,
        1,
    )

    text = replace_once(
        text,
        '''          "id, title, description, event_date, start_time, end_time, location_name, room:rooms!calendar_events_room_id_fkey(id, name, slug)",''',
        '''          "id, title, description, event_date, recurrence_type, start_time, end_time, location_name, room:rooms!calendar_events_room_id_fkey(id, name, slug)",''',
        "world events select recurrence",
    )

    text = replace_once(
        text,
        '''        .gte(
          "event_date",
          bounds.start,
        )
        .lte(
          "event_date",
          bounds.end,
        )''',
        '''        .lte(
          "event_date",
          bounds.end,
        )''',
        "world recurring query range",
    )

    old_mapping = '''        setEvents(
  (data ?? []).map((event) => {
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
  }),
);'''

    new_mapping = '''        const baseEvents =
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
                id: String(
                  event.id,
                ),
                title: String(
                  event.title,
                ),
                description:
                  event.description ??
                  null,
                event_date:
                  String(
                    event.event_date,
                  ),
                recurrence_type:
                  (
                    event.recurrence_type ??
                    "once"
                  ) as CalendarEvent["recurrence_type"],
                start_time:
                  event.start_time ??
                  null,
                end_time:
                  event.end_time ??
                  null,
                location_name:
                  event.location_name ??
                  null,
                room: room
                  ? {
                      id: String(
                        room.id,
                      ),
                      name: String(
                        room.name,
                      ),
                      slug: String(
                        room.slug,
                      ),
                    }
                  : null,
              };
            },
          );

        setEvents(
          baseEvents.flatMap(
            (event) =>
              expandEventForMonth(
                event,
                bounds,
              ),
          ),
        );'''

    text = replace_once(
        text,
        old_mapping,
        new_mapping,
        "world event occurrence expansion",
    )

    world_path.write_text(text, encoding="utf-8")

    # ===============================================================
    # 4. CALENDAR BADGE — INCLUDE RECURRING SERIES EVEN WHEN THEIR
    #    FIRST OCCURRENCE IS ALREADY IN THE PAST.
    # ===============================================================
    badge_path = FILES[3]
    text = badge_path.read_text(encoding="utf-8")

    old_query = '''        .from("calendar_events")
        .select("id")
        .eq(
          "is_active",
          true,
        )
        .gte(
          "event_date",
          today,
        );'''

    new_query = '''        .from("calendar_events")
        .select("id, recurrence_type")
        .eq(
          "is_active",
          true,
        )
        .or(
          `event_date.gte.${today},recurrence_type.neq.once`,
        );'''

    count = text.count(old_query)
    if count != 2:
        raise RuntimeError(
            f"badge recurring query: expected exactly 2 matches, found {count}."
        )
    text = text.replace(old_query, new_query, 2)

    badge_path.write_text(text, encoding="utf-8")

    # ===============================================================
    # PARSE VALIDATION
    # ===============================================================
    validator = r'''
const fs = require("fs");
const ts = require("typescript");

for (const file of process.argv.slice(1)) {
  const source = fs.readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;

  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    kind,
  );

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
            *[str(path) for path in FILES],
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

print("\nRECURRING CALENDAR EVENTS PATCH V2 APPLIED")
print("")
print("Supported recurrence:")
print("  - Does not repeat")
print("  - Every day")
print("  - Every week")
print("  - Every month")
print("  - Every year")
print("")
print("Behaviour:")
print("  - event_date remains the first occurrence")
print("  - recurring events are expanded dynamically in the visible calendar month")
print("  - monthly dates clamp to the last day when needed")
print("  - yearly Feb 29 clamps safely in non-leap years")
print("  - existing events remain one-off events")
print("")
print("Changed:")
for path in FILES:
    print(f"  {path.relative_to(ROOT)}")
print("")
print("NEXT:")
print("  npm run build")
