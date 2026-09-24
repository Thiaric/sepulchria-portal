#!/usr/bin/env python3
from pathlib import Path
import argparse
import shutil

ROOT = Path.cwd()
TARGET = ROOT / "app/(portal)/game/components/NpcControlPanel.tsx"
BACKUP = ROOT / ".patch_backups" / "fix_npc_self_target_semantics.ts"

REPLACEMENTS = [
    (
        '<input type="hidden" name="gift_target_character_id" value={mechanicsTarget}/>',
        '<input type="hidden" name="gift_target_character_id" value={mechanicsTarget===selected.character_id?"":mechanicsTarget}/>',
        "ordinary Feat self target",
    ),
    (
        '<input type="hidden" name="item_target_character_id" value={mechanicsTarget}/>',
        '<input type="hidden" name="item_target_character_id" value={mechanicsTarget===selected.character_id?"":mechanicsTarget}/>',
        "Item self target",
    ),
]

def apply():
    if not TARGET.exists():
        raise SystemExit(f"ERROR: missing {TARGET}")

    text = TARGET.read_text(encoding="utf-8")
    updated = text

    for old, new, label in REPLACEMENTS:
        count = updated.count(old)
        if count != 1:
            raise SystemExit(
                f"ERROR: {label}: expected exactly 1 match, found {count}. "
                "No files changed."
            )
        updated = updated.replace(old, new, 1)

    BACKUP.parent.mkdir(parents=True, exist_ok=True)
    if not BACKUP.exists():
        shutil.copy2(TARGET, BACKUP)
        print(f"Backup created: {BACKUP}")
    else:
        print(f"Backup already exists: {BACKUP}")

    TARGET.write_text(updated, encoding="utf-8")
    print(f"Patched: {TARGET}")
    print("Nothing committed or pushed.")
    print("No SQL changes required.")
    print("Now run: npm run build")

def revert():
    if BACKUP.exists():
        shutil.copy2(BACKUP, TARGET)
        print(f"Restored: {TARGET}")
    else:
        print("No backup found.")
    print("Nothing committed or pushed.")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--revert", action="store_true")
    args = parser.parse_args()
    revert() if args.revert else apply()

if __name__ == "__main__":
    main()
