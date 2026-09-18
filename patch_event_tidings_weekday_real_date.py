from pathlib import Path
import shutil
from datetime import datetime
import sys

ROOT = Path.cwd()
TARGET = ROOT / "lib/tidings/event-tidings.ts"

def fail(message: str) -> None:
    print(f"\nERROR: {message}\n")
    sys.exit(1)

if not TARGET.exists():
    fail("Could not find lib/tidings/event-tidings.ts. Apply the automatic recurring Event Tidings patch first, then run this patch from the Sepulchria repo root.")

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = ROOT / f".patch-backup-event-tidings-weekday-real-date-{stamp}" / TARGET.relative_to(ROOT)
backup.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(TARGET, backup)

text = TARGET.read_text(encoding="utf-8")

weekday_function = (
    "function formatRealDateTimeRange(\n"
    "  date: Date,\n"
    "  startTime: string,\n"
    "  endTime: string,\n"
    ") {\n"
    "  const weekday =\n"
    "    new Intl.DateTimeFormat(\n"
    "      \"en-GB\",\n"
    "      {\n"
    "        weekday: \"long\",\n"
    "        timeZone: \"UTC\",\n"
    "      },\n"
    "    ).format(date);\n"
    "\n"
    "  const day = String(date.getUTCDate()).padStart(2, \"0\");\n"
    "  const month = String(date.getUTCMonth() + 1).padStart(2, \"0\");\n"
    "  const year = String(date.getUTCFullYear()).padStart(4, \"0\");\n"
    "\n"
    "  return `[${weekday} ${day}-${month}-${year} ${startTime.slice(0, 5)} to ${endTime.slice(0, 5)}]`;\n"
    "}\n"
)

start = text.find("function formatRealDateTimeRange(")

if start != -1:
    end = text.find("\n\nexport function getActiveEventTidings(", start)
    if end == -1:
        fail("Found formatRealDateTimeRange(), but could not safely locate the next function boundary.")
    text = text[:start] + weekday_function.rstrip() + text[end:]
else:
    clock_start = text.find("function formatClockRange(")
    if clock_start == -1:
        fail("Could not find formatClockRange().")
    clock_end = text.find("\n\nexport function getActiveEventTidings(", clock_start)
    if clock_end == -1:
        fail("Could not safely locate the insertion point after formatClockRange().")
    text = text[:clock_end] + "\n\n" + weekday_function.rstrip() + text[clock_end:]

old_without_real_date = (
    "        message:\n"
    "          `Date: ${formatAurethDate(\n"
    "            occurrenceDate,\n"
    "          )} · Time: ${formatClockRange(\n"
    "            event.start_time,\n"
    "            event.end_time,\n"
    "          )} · Location: ${location} · ${description}`,\n"
)

new_with_real_date = (
    "        message:\n"
    "          `Date: ${formatAurethDate(\n"
    "            occurrenceDate,\n"
    "          )} ${formatRealDateTimeRange(\n"
    "            occurrenceDate,\n"
    "            event.start_time,\n"
    "            event.end_time,\n"
    "          )} · Time: ${formatClockRange(\n"
    "            event.start_time,\n"
    "            event.end_time,\n"
    "          )} · Location: ${location} · ${description}`,\n"
)

if old_without_real_date in text:
    text = text.replace(old_without_real_date, new_with_real_date, 1)

TARGET.write_text(text, encoding="utf-8")

print("Patch applied successfully.")
print("Changed: lib/tidings/event-tidings.ts")
print(f"Backup: {backup.parent}")
print("New format example: [Friday 18-09-2026 14:00 to 16:00]")
print("Nothing was committed or pushed.")