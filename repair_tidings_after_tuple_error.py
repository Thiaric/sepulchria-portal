from pathlib import Path
from datetime import datetime
import shutil
import sys

ROOT = Path.cwd()
TARGET = ROOT / "lib/tidings/event-tidings.ts"

def fail(message: str) -> None:
    print(f"\nERROR: {message}\n")
    sys.exit(1)

if not TARGET.exists():
    fail(
        "Could not find lib/tidings/event-tidings.ts. "
        "Run this from the Sepulchria repo root."
    )

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = (
    ROOT
    / f".patch-backup-tidings-repair-{stamp}"
    / TARGET.relative_to(ROOT)
)
backup.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(TARGET, backup)

text = TARGET.read_text(encoding="utf-8")

# ---------------------------------------------------------------------------
# 1) Fix the broken Europe/London offset regex.
#
# Wrong JS regex literal:
#   /^GMT([+-])(\\d{1,2})(?::(\\d{2}))?$/
#
# Correct JS regex literal:
#   /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/
# ---------------------------------------------------------------------------

wrong_regex = r'/^GMT([+-])(\\d{1,2})(?::(\\d{2}))?$/'
correct_regex = r'/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/'

if wrong_regex in text:
    text = text.replace(
        wrong_regex,
        correct_regex,
        1,
    )
elif correct_regex not in text:
    fail(
        "Could not find the London timezone regex in event-tidings.ts."
    )

# ---------------------------------------------------------------------------
# 2) Use normal hyphen in the displayed Aureth time range.
# ---------------------------------------------------------------------------

text = text.replace(
    'return `${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`;',
    'return `${startTime.slice(0, 5)}-${endTime.slice(0, 5)}`;',
)

# ---------------------------------------------------------------------------
# 3) Replace only the generated Event Tiding message.
#
# Exact desired order:
# Date: <Aureth date> - Time: 08:00-23:59
# [Friday 18-09-2026 08:00 to 23:59] - Location: ...
# ---------------------------------------------------------------------------

message_start = text.find(
    '        message:\n'
    '          `Date: ${formatAurethDate('
)

if message_start == -1:
    fail(
        "Could not find the generated Event Tiding message block."
    )

message_end = text.find(
    "\n        priority:",
    message_start,
)

if message_end == -1:
    fail(
        "Could not find the end of the generated Event Tiding message block."
    )

new_message = """        message:
          `Date: ${formatAurethDate(
            occurrenceDate,
          )} - Time: ${formatClockRange(
            event.start_time,
            event.end_time,
          )} ${formatRealDateTimeRange(
            occurrenceStart,
            event.start_time,
            event.end_time,
          )} - Location: ${location} - ${description}`,"""

text = (
    text[:message_start]
    + new_message
    + text[message_end:]
)

# ---------------------------------------------------------------------------
# Safety checks
# ---------------------------------------------------------------------------

if wrong_regex in text:
    fail(
        "Safety check failed: broken timezone regex is still present."
    )

expected_snippets = [
    "} - Time: ${formatClockRange(",
    "${formatRealDateTimeRange(",
    "} - Location: ${location}",
]

for snippet in expected_snippets:
    if snippet not in text:
        fail(
            f"Safety check failed: expected text missing: {snippet}"
        )

TARGET.write_text(
    text,
    encoding="utf-8",
)

print("Tidings repair applied successfully.")
print("Changed: lib/tidings/event-tidings.ts")
print(f"Backup: {backup.parent}")
print()
print("Fixed:")
print("  - Europe/London BST/GMT offset parsing")
print("  - 24-hour pre-event Tiding timing")
print("  - requested Date / Time / real-date field order")
print("  - normal hyphen in the Aureth time range")
print()
print("Expected format:")
print(
    "Date: Namartes, 18 Vintorn, 4226 ADN - "
    "Time: 08:00-23:59 "
    "[Friday 18-09-2026 08:00 to 23:59] - "
    "Location: The Coin - ..."
)
print()
print("Nothing was committed or pushed.")
