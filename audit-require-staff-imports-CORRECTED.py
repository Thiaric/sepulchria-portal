
from pathlib import Path
import re

ROOT = Path.cwd()

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

# IMPORTANT:
# This regex is deliberately bounded by the semicolon of ONE import statement.
# The previous audit incorrectly started at an earlier `import {` and crossed
# multiple separate imports until it eventually reached require-staff.
IMPORT_RE = re.compile(
    r'import\s*\{(?P<body>[^;]*?)\}\s*from\s*"@/lib/auth/require-staff"\s*;',
    re.DOTALL,
)

bad = []
checked = 0

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

    for match in IMPORT_RE.finditer(text):
        checked += 1

        names = []

        for raw in (
            match.group("body")
            .replace("\n", " ")
            .split(",")
        ):
            name = raw.strip()

            if not name:
                continue

            if name.startswith("type "):
                name = name[5:].strip()

            if " as " in name:
                name = (
                    name.split(
                        " as ",
                        1,
                    )[0].strip()
                )

            names.append(name)

        invalid = [
            name
            for name in names
            if name not in VALID
        ]

        if invalid:
            bad.append(
                (
                    path.relative_to(
                        ROOT
                    ).as_posix(),
                    invalid,
                    match.group(0),
                )
            )

print("")
print(
    f"Checked {checked} actual require-staff import statements."
)

if bad:
    print("")
    print(
        "REAL INVALID IMPORTS FOUND:"
    )

    for filename, names, statement in bad:
        print("")
        print(
            f"FILE: {filename}"
        )
        print(
            "INVALID NAMES: "
            + ", ".join(names)
        )
        print(
            "CURRENT IMPORT:"
        )
        print(statement)

    raise SystemExit(
        "\nDo NOT build yet. Send me the output above."
    )

print("")
print(
    "Corrected audit passed: no invalid require-staff imports remain."
)
print(
    "Now run: npm run build"
)
