from pathlib import Path
from datetime import datetime
import shutil
import sys

ROOT = Path.cwd()
TARGET = ROOT / "components/tidings/tidings-ticker.tsx"

def fail(message: str) -> None:
    print(f"\nERROR: {message}\n")
    sys.exit(1)

if not TARGET.exists():
    fail("Could not find components/tidings/tidings-ticker.tsx. Run this script from the Sepulchria repo root.")

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = ROOT / f".patch-backup-live-event-tidings-{stamp}" / TARGET.relative_to(ROOT)
backup.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(TARGET, backup)

text = TARGET.read_text(encoding="utf-8")

if "const EVENT_RESYNC_INTERVAL_MS" not in text:
    anchor = "const RESYNC_INTERVAL_MS = 3_000;\n"
    if anchor not in text:
        fail("Could not find RESYNC_INTERVAL_MS.")
    text = text.replace(
        anchor,
        anchor + "\nconst EVENT_RESYNC_INTERVAL_MS =\n  5_000;\n",
        1,
    )

start = text.find("  useEffect(() => {\n    let cancelled =\n      false;\n\n    async function loadCalendarEvents() {")
if start == -1:
    fail("Could not find the current calendar-events effect.")

end_marker = "  useEffect(() => {\n    const channel = supabase\n      .channel(\"portal-tidings-live-v2\")"
end = text.find(end_marker, start)
if end == -1:
    fail("Could not find the effect following the calendar-events effect.")

new_block = r'''  const loadCalendarEvents =
    useCallback(async () => {
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

      if (error) {
        console.error(
          "Unable to load recurring Event Tidings:",
          error.message,
        );
        return;
      }

      setCalendarEvents(
        (data ?? []).map(
          (event) => {
            const room =
              Array.isArray(
                event.room,
              )
                ? event.room[0] ?? null
                : event.room;

            return {
              id: String(event.id),
              title: String(event.title),
              description: event.description ?? null,
              event_date: String(event.event_date),
              recurrence_type:
                (event.recurrence_type ?? "once") as EventTidingSource["recurrence_type"],
              start_time: event.start_time ?? null,
              end_time: event.end_time ?? null,
              location_name: event.location_name ?? null,
              room:
                room
                  ? {
                      id: String(room.id),
                      name: String(room.name),
                      slug: String(room.slug),
                    }
                  : null,
            };
          },
        ),
      );
    }, [supabase]);

  useEffect(() => {
    void loadCalendarEvents();

    const channel =
      supabase
        .channel(
          "portal-event-tidings-live-v2",
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "calendar_events",
          },
          () => {
            void loadCalendarEvents();
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            void loadCalendarEvents();
          }
        });

    const timer =
      window.setInterval(
        () => {
          void loadCalendarEvents();
        },
        EVENT_RESYNC_INTERVAL_MS,
      );

    const resyncEvents = () => {
      void loadCalendarEvents();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resyncEvents();
      }
    };

    window.addEventListener("focus", resyncEvents);
    window.addEventListener("online", resyncEvents);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", resyncEvents);
      window.removeEventListener("online", resyncEvents);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [loadCalendarEvents, supabase]);

'''

text = text[:start] + new_block + text[end:]

for check in [
    "EVENT_RESYNC_INTERVAL_MS",
    "const loadCalendarEvents =",
    'table: "calendar_events"',
    "window.setInterval(",
    '"visibilitychange"',
]:
    if check not in text:
        fail(f"Safety check failed: missing {check}")

TARGET.write_text(text, encoding="utf-8")

print("Live Event Tidings patch applied successfully.")
print("Changed: components/tidings/tidings-ticker.tsx")
print(f"Backup: {backup.parent}")
print("Time thresholds update from the 1-second gameDate clock.")
print("Event create/edit/delete updates through Realtime plus a 5-second fallback resync.")
print("Focus, reconnect and tab visibility restore also resync events.")
print("Nothing was committed or pushed.")