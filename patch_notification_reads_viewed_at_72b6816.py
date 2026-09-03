#!/usr/bin/env python3
"""
SEPULCHRIA — notification_reads schema correction

Your actual database table is:
  notification_id uuid
  user_id uuid
  viewed_at timestamptz

The application currently writes `read_at` in notification_reads writes.
That DB write fails, so the UI marks a notification read optimistically,
then it returns as unread on the next reload.

This patch changes ONLY notification_reads writes:
    read_at -> viewed_at

It does NOT touch:
  ticket_notification_reads.last_read_at
  sanction_notification_reads
  any other notification system/table.

Safe to run on the working tree based on commit 72b6816, including if the
previous /api/notifications/read patch has already been applied locally.
"""

from pathlib import Path
import re
import sys


ROOT = Path.cwd()

if not (ROOT / "package.json").exists():
    raise SystemExit(
        "\nPATCH STOPPED: Run this from the sepulchria-portal project root.\n"
    )


def patch_known_file(path: Path, expected_min: int = 1) -> int:
    if not path.exists():
        return 0

    text = path.read_text(encoding="utf-8")
    original = text

    # Only replace `read_at` when it occurs inside a notification_reads
    # query/write block. We deliberately work block-by-block instead of
    # globally replacing `read_at`.
    #
    # Supabase chains in this project end with `);` / `);`-style sections;
    # use a bounded window after .from("notification_reads").
    positions = [
        m.start()
        for m in re.finditer(
            r'\.from\(\s*"notification_reads"\s*,?\s*\)',
            text,
            flags=re.S,
        )
    ]

    replacements = 0
    offset = 0

    for original_pos in positions:
        pos = original_pos + offset

        # Bound the operation to the next 2500 chars, which comfortably
        # contains a single Supabase chain in the current source.
        end = min(len(text), pos + 2500)
        block = text[pos:end]

        # Stop at the next notification_reads chain if one occurs.
        next_chain = re.search(
            r'\.from\(\s*"notification_reads"\s*,?\s*\)',
            block[1:],
            flags=re.S,
        )
        if next_chain:
            block_end = 1 + next_chain.start()
            block = block[:block_end]
            end = pos + block_end

        new_block, count = re.subn(
            r'(?<![A-Za-z0-9_])read_at\s*:',
            'viewed_at:',
            block,
        )

        if count:
            text = text[:pos] + new_block + text[end:]
            delta = len(new_block) - len(block)
            offset += delta
            replacements += count

    if text != original:
        path.write_text(
            text,
            encoding="utf-8",
            newline="\n",
        )

    return replacements


targets = [
    ROOT / "components/notifications/notification-bell.tsx",
    ROOT / "app/(portal)/private-location/actions.ts",
]

optional = ROOT / "app/api/notifications/read/route.ts"

total = 0

for path in targets:
    count = patch_known_file(path)
    total += count
    if count:
        print(f"✓ {path.as_posix()}: corrected {count} notification_reads write(s)")
    else:
        print(f"• {path.as_posix()}: no incorrect notification_reads read_at write found")

if optional.exists():
    count = patch_known_file(optional)
    total += count
    if count:
        print(f"✓ {optional.as_posix()}: corrected {count} notification_reads write(s)")
    else:
        print(f"• {optional.as_posix()}: already correct / no read_at write found")
else:
    print("• app/api/notifications/read/route.ts: not present locally, skipped")

# Safety check: scan relevant source files for an obviously still-wrong
# notification_reads + read_at pairing.
remaining = []

for path in [
    ROOT / "components/notifications/notification-bell.tsx",
    ROOT / "app/(portal)/private-location/actions.ts",
    optional,
]:
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8")
    for match in re.finditer(
        r'\.from\(\s*"notification_reads"\s*,?\s*\)',
        text,
        flags=re.S,
    ):
        window = text[match.start():match.start() + 2500]
        if re.search(r'(?<![A-Za-z0-9_])read_at\s*:', window):
            remaining.append(path.as_posix())
            break

if remaining:
    print("\nWARNING: A notification_reads block still appears to contain read_at:")
    for item in remaining:
        print(f"  - {item}")
    print("Send me this output before running the app.")
    sys.exit(2)

if total == 0:
    print(
        "\nNo changes were necessary in the checked files. "
        "If notifications are still broken, send me `git diff` and I will inspect the current tree."
    )
else:
    print(
        f"\nPATCH COMPLETE — corrected {total} invalid notification_reads column write(s)."
    )

print(
    "\nNext:\n"
    "  npm run build\n\n"
    "Then test ONE fresh notification:\n"
    "  1. Receive it.\n"
    "  2. Click it / Open it.\n"
    "  3. Wait at least 60–90 seconds or refresh.\n"
    "  4. It must remain read.\n\n"
    "After clicking it, you can also verify in Supabase with:\n\n"
    "  select notification_id, user_id, viewed_at\n"
    "  from public.notification_reads\n"
    "  order by viewed_at desc\n"
    "  limit 10;\n"
)

