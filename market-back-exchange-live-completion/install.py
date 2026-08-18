from pathlib import Path
import json

ROOT = Path.cwd()
HERE = Path(__file__).resolve().parent

if not (ROOT / "package.json").exists():
    raise SystemExit("ERROR: Run this from the sepulchria-portal repository root.")

patches = json.loads(
    (HERE / "patches.json").read_text(encoding="utf-8")
)

for patch in patches:
    target = ROOT / patch["path"]

    if not target.exists():
        raise SystemExit(f"ERROR: Missing {patch['path']}")

    text = target.read_text(encoding="utf-8")
    old = patch["old"]
    new = patch["new"]

    if new in text:
        continue

    if old not in text:
        raise SystemExit(
            f"ERROR: Could not find current block: {patch['label']}"
        )

    target.write_text(
        text.replace(old, new, 1),
        encoding="utf-8",
    )

print("SUCCESS")
print("Back to Market now uses the ancestry-style button.")
print("Both Item Exchange participants now receive live completion feedback.")
print("No SQL required.")
print("Run: npm run build")
