#!/usr/bin/env python3
from pathlib import Path
import shutil

ROOT = Path.cwd()
TARGET = ROOT / "app/(portal)/admin/characters/[id]/page.tsx"
BACKUP = ROOT / ".patch_backups" / "fix_npc_equipment_fragment_page.tsx"

OPEN_OLD = '            {canEditCharacter ? (\n              <AdminCharacterEditForm'
OPEN_NEW = '            {canEditCharacter ? (\n              <>\n              <AdminCharacterEditForm'
CLOSE_OLD = '              {character.is_system &&\n              canManageEconomy ? (\n                <NpcEquipmentAdmin\n                  characterId={\n                    character.id\n                  }\n                />\n              ) : null}\n            ) : ('
CLOSE_NEW = '              {character.is_system &&\n              canManageEconomy ? (\n                <NpcEquipmentAdmin\n                  characterId={\n                    character.id\n                  }\n                />\n              ) : null}\n              </>\n            ) : ('

if not TARGET.exists():
    raise SystemExit(f"ERROR: missing {TARGET}")

text = TARGET.read_text(encoding="utf-8-sig")

for old, label in [
    (OPEN_OLD, "editable-character conditional opening"),
    (CLOSE_OLD, "NPC Equipment conditional closing"),
]:
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"ERROR: {label}: expected exactly 1 match, found {count}. "
            "No files changed."
        )

updated = text.replace(OPEN_OLD, OPEN_NEW, 1)
updated = updated.replace(CLOSE_OLD, CLOSE_NEW, 1)

BACKUP.parent.mkdir(parents=True, exist_ok=True)
if not BACKUP.exists():
    shutil.copy2(TARGET, BACKUP)
    print(f"Backup created: {BACKUP}")
else:
    print(f"Backup already exists: {BACKUP}")

TARGET.write_text(updated, encoding="utf-8")

print(f"Patched: {TARGET}")
print("Wrapped AdminCharacterEditForm + NPC Equipment in a fragment.")
print("Nothing committed or pushed.")
print("No SQL changes required.")
print("Now run: npm run build")
