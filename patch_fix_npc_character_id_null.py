#!/usr/bin/env python3
from pathlib import Path

ROOT = Path.cwd()
PATH = ROOT / "app/(portal)/game/components/NpcControlPanel.tsx"

if not PATH.exists():
    raise SystemExit("ERROR: NpcControlPanel.tsx not found.")

s = PATH.read_text(encoding="utf-8")

old = 'value={selected.character_id}'
new = 'value={selected.character_id ?? ""}'

count = s.count(old)

if count == 0:
    raise SystemExit(
        "ERROR: Could not find value={selected.character_id}. "
        "Your local file differs from the expected patched version."
    )

s = s.replace(old, new)
PATH.write_text(s, encoding="utf-8")

print(f"Fixed {count} nullable NPC character_id value(s).")
print("Nothing committed or pushed.")
print("Now run: npm run build")
