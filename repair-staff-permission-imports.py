
from pathlib import Path
import re

ROOT = Path.cwd()

fixes = {
    Path("app/(portal)/admin/media/page.tsx"): (
        '''import {
  MediaLibraryManager,
  requireAdminSection,
} from "@/lib/auth/require-staff";''',
        '''import {
  MediaLibraryManager,
} from "@/components/admin/media-library-manager";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";''',
    ),

    Path("app/(portal)/admin/events/page.tsx"): (
        '''import {
  fromIsoDateKey,
  getAurethDate,
  requireAdminSection,
} from "@/lib/auth/require-staff";''',
        '''import {
  AURETH_MONTHS,
  AURETH_YEAR_OFFSET,
  fromIsoDateKey,
  getAurethDate,
} from "@/lib/world/calendar";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";''',
    ),

    Path("app/(portal)/admin/orders/actions.ts"): (
        '''import {
  revalidatePath,
  requireAdminSection,
} from "@/lib/auth/require-staff";''',
        '''import {
  revalidatePath,
} from "next/cache";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";''',
    ),

    Path("app/(portal)/admin/races/actions.ts"): (
        '''import {
  revalidatePath,
  requireAdminSection,
} from "@/lib/auth/require-staff";''',
        '''import {
  revalidatePath,
  updateTag,
} from "next/cache";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";''',
    ),
}

for rel, (old, new) in fixes.items():
    path = ROOT / rel

    if not path.exists():
        raise SystemExit(f"ERROR: file not found: {rel}")

    text = path.read_text(encoding="utf-8")

    if new in text:
        print(f"Already fixed: {rel}")
        continue

    if old not in text:
        raise SystemExit(
            f"ERROR: expected corrupted import not found in {rel}. "
            "Stopped so nothing is guessed."
        )

    path.write_text(
        text.replace(old, new, 1),
        encoding="utf-8",
    )
    print(f"Fixed: {rel}")

# Audit every require-staff import after repair.
VALID = {
    "StaffRole",
    "StaffSession",
    "AdminSection",
    "StaffCapability",
    "canAccessAdminSection",
    "hasStaffCapability",
    "canHandleTicketCategory",
    "defaultAdminPath",
    "getStaffSession",
    "requireStaff",
    "requireAdmin",
    "requireAdminSection",
    "requireStaffCapability",
}

bad = []

for path in ROOT.rglob("*"):
    if path.suffix not in {".ts", ".tsx"}:
        continue
    if any(part in {".next", "node_modules"} for part in path.parts):
        continue

    text = path.read_text(encoding="utf-8", errors="ignore")

    for match in re.finditer(
        r'import\s*\{(?P<body>.*?)\}\s*from\s*"@/lib/auth/require-staff";',
        text,
        re.DOTALL,
    ):
        names = []
        for raw in match.group("body").replace("\n", " ").split(","):
            name = raw.strip()
            if not name:
                continue
            if name.startswith("type "):
                name = name[5:].strip()
            if " as " in name:
                name = name.split(" as ", 1)[0].strip()
            names.append(name)

        invalid = [
            name for name in names
            if name not in VALID
        ]

        if invalid:
            bad.append(
                (
                    path.relative_to(ROOT).as_posix(),
                    invalid,
                )
            )

print("")
if bad:
    print("REPAIR APPLIED, BUT THE IMPORT AUDIT FOUND MORE CORRUPTION:")
    for filename, names in bad:
        print(f"  - {filename}: {', '.join(names)}")
    raise SystemExit(
        "\nDo NOT build yet. Send me the list above."
    )

print("Import audit passed: no invalid require-staff imports remain.")
print("Now run: npm run build")
