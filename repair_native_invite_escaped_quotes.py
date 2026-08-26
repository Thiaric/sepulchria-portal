#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.cwd()

FILES = [
    ROOT / "app/(portal)/admin/registrations/actions.ts",
    ROOT / "app/auth/sign-up/page.tsx",
    ROOT / "app/auth/complete-invitation/page.tsx",
    ROOT / "components/complete-invitation-form.tsx",
    ROOT / "app/api/registration-invitations/complete/route.ts",
]

def main():
    missing = [str(p.relative_to(ROOT)) for p in FILES if not p.exists()]
    if missing:
        raise RuntimeError(
            "Run this from the sepulchria-portal repository root. Missing: "
            + ", ".join(missing)
        )

    changed = []

    for path in FILES:
        text = path.read_text(encoding="utf-8")

        # The previous generated patch incorrectly wrote escaped quote
        # sequences such as \" directly into TS/TSX source files.
        if '\\"' not in text:
            continue

        backup = path.with_name(path.name + ".bak-before-quote-repair")
        if not backup.exists():
            shutil.copy2(path, backup)

        repaired = text.replace('\\"', '"')

        path.write_text(repaired, encoding="utf-8", newline="\n")
        changed.append(str(path.relative_to(ROOT)))

    print("Quote-escape repair complete.")
    if changed:
        print("Repaired:")
        for item in changed:
            print(f"- {item}")
    else:
        print("No escaped quotes were found in the targeted files.")

    remaining = []
    for path in FILES:
        text = path.read_text(encoding="utf-8")
        if '\\"' in text:
            remaining.append(str(path.relative_to(ROOT)))

    if remaining:
        raise RuntimeError(
            "Escaped quotes still remain in: " + ", ".join(remaining)
        )

    print()
    print("Now run: npm run build")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"REPAIR FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
