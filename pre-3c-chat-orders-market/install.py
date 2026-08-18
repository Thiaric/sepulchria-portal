from pathlib import Path
import json

ROOT = Path.cwd()
HERE = Path(__file__).resolve().parent

if not (ROOT / "package.json").exists():
    raise SystemExit("ERROR: Run this from the sepulchria-portal repository root.")

patches = json.loads((HERE / "patches.json").read_text(encoding="utf-8"))

targets = {
    "instant": ROOT / "components/instant-chat/instant-chat-dock.tsx",
    "market": ROOT / "app/(portal)/market/[slug]/page.tsx",
}

for group, target in targets.items():
    if not target.exists():
        raise SystemExit(f"ERROR: Missing {target.relative_to(ROOT)}")

    text = target.read_text(encoding="utf-8")

    for patch in patches[group]:
        old = patch["old"]
        new = patch["new"]

        if new in text:
            continue

        if old not in text:
            raise SystemExit(f"ERROR: Could not find current block: {patch['label']}")

        text = text.replace(old, new, 1)

    target.write_text(text, encoding="utf-8")
    print("UPDATED", target.relative_to(ROOT))

print("SUCCESS")
print("Instant Chat now loads the newest 200 messages, not the oldest 200.")
print("Shop headers now show the character's available Remnants.")
print("IMPORTANT: run 01_ORDER_LEVELS_1_TO_6.sql in Supabase.")
print("Then run: npm run build")
