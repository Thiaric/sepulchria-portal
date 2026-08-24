
from pathlib import Path
import re

ROOT = Path.cwd()

if not (ROOT / "app").exists():
    raise SystemExit("ERROR: run this from the Sepulchria repository root.")

NEXT_CACHE_NAMES = (
    "revalidatePath",
    "updateTag",
    "revalidateTag",
    "unstable_cache",
)

changed = []

for path in ROOT.rglob("*"):
    if path.suffix not in {".ts", ".tsx"}:
        continue

    if any(
        part in {".next", "node_modules", ".git"}
        for part in path.parts
    ):
        continue

    text = path.read_text(
        encoding="utf-8",
        errors="ignore",
    )

    needed = [
        name
        for name in NEXT_CACHE_NAMES
        if re.search(
            rf"\b{re.escape(name)}\s*\(",
            text,
        )
    ]

    if not needed:
        continue

    import_match = re.search(
        r'import\s*\{(?P<body>[^;]*?)\}\s*from\s*"next/cache"\s*;',
        text,
        re.DOTALL,
    )

    imported = set()

    if import_match:
        imported = {
            raw.strip().split(" as ", 1)[0].strip()
            for raw in import_match.group("body").replace("\n", " ").split(",")
            if raw.strip()
        }

    missing = [
        name
        for name in needed
        if name not in imported
    ]

    if not missing:
        continue

    if import_match:
        names = [
            raw.strip()
            for raw in import_match.group("body").replace("\n", " ").split(",")
            if raw.strip()
        ]

        names.extend(
            name
            for name in missing
            if name not in names
        )

        replacement = (
            "import {\n  "
            + ",\n  ".join(names)
            + ',\n} from "next/cache";'
        )

        text = (
            text[:import_match.start()]
            + replacement
            + text[import_match.end():]
        )
    else:
        insertion = (
            "import {\n  "
            + ",\n  ".join(missing)
            + ',\n} from "next/cache";\n\n'
        )

        if text.startswith('"use server";'):
            marker = '"use server";'
            pos = len(marker)
            text = (
                text[:pos]
                + "\n\n"
                + insertion
                + text[pos:].lstrip("\n")
            )
        else:
            text = insertion + text

    path.write_text(
        text,
        encoding="utf-8",
    )

    changed.append(
        (
            path.relative_to(ROOT).as_posix(),
            missing,
        )
    )

print("")
if changed:
    print("Restored missing next/cache imports:")
    for filename, names in changed:
        print(
            f"  - {filename}: {', '.join(names)}"
        )
else:
    print("No missing next/cache imports found.")

print("")
print("Now run: npm run build")
