from pathlib import Path
import json

ROOT = Path.cwd()
HERE = Path(__file__).resolve().parent
TARGET = ROOT / "app/(portal)/market/[slug]/page.tsx"

if not (ROOT / "package.json").exists():
    raise SystemExit("ERROR: Run from repository root.")

if not TARGET.exists():
    raise SystemExit("ERROR: Market shop page not found.")

text = TARGET.read_text(encoding="utf-8")
patches = json.loads((HERE / "patches.json").read_text(encoding="utf-8"))

for patch in patches:
    old = patch["old"]
    new = patch["new"]

    if new in text and old not in text:
        continue

    if old not in text:
        raise SystemExit(f"ERROR: Could not find current block: {patch['label']}")

    text = text.replace(old, new, 1)

TARGET.write_text(text, encoding="utf-8")

print("SUCCESS")
print("Owned sellable quantity detection fixed.")
print("Run 01_FIX_MARKET_SELL.sql, then npm run build.")
