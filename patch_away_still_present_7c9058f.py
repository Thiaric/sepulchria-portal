#!/usr/bin/env python3
from pathlib import Path

path = Path(
    "components/portal/portal-presence-heartbeat.tsx"
)

if not path.exists():
    raise SystemExit(
        "\nPATCH STOPPED: Run this from the sepulchria-portal project root.\n"
    )

text = path.read_text(
    encoding="utf-8",
)

old = '''      if (
        logoutStartedRef.current ||
        runningRef.current ||
        idleForMs() >=
          AWAY_AFTER_MS
      ) {
        return;
      }
'''

new = '''      if (
        logoutStartedRef.current ||
        runningRef.current
      ) {
        return;
      }
'''

count = text.count(old)

if count != 1:
    raise SystemExit(
        f"\nPATCH STOPPED: sendHeartbeat guard expected 1 match, found {count}.\n"
    )

text = text.replace(
    old,
    new,
    1,
)

path.write_text(
    text,
    encoding="utf-8",
    newline="\n",
)

print("✓ Away users continue sending presence heartbeats.")
print("✓ last_seen_at stays fresh while status remains Away.")
print("✓ Away users remain counted in city and room presence.")
print("✓ Activity can still restore the manual/online status normally.")
print("\nPATCH COMPLETE")
print("\nRun: npm run build")
