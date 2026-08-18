from pathlib import Path
import json

ROOT = Path.cwd()
HERE = Path(__file__).resolve().parent
TARGET = ROOT / "lib/items/admin-inventory-actions.ts"

if not (ROOT / "package.json").exists():
    raise SystemExit("ERROR: Run from the sepulchria-portal repository root.")

if not TARGET.exists():
    raise SystemExit("ERROR: lib/items/admin-inventory-actions.ts not found.")

text = TARGET.read_text(encoding="utf-8")
patches = json.loads((HERE / "patches.json").read_text(encoding="utf-8"))

for patch in patches:
    old = patch["old"]
    new = patch["new"]

    if new in text:
        continue

    if old not in text:
        raise SystemExit(
            f"ERROR: Could not find current block: {patch['label']}"
        )

    text = text.replace(old, new, 1)

TARGET.write_text(text, encoding="utf-8")

print("SUCCESS")
print("Admin Grant Item and Remove Item now use the canonical stack normaliser.")
print("Run 01_ADMIN_STACK_NORMALIZE.sql first, then npm run build.")
