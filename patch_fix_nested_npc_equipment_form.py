#!/usr/bin/env python3
from pathlib import Path
import shutil

ROOT = Path.cwd()
TARGET = ROOT / "app/(portal)/admin/characters/[id]/page.tsx"
BACKUP = ROOT / ".patch_backups" / "fix_nested_npc_equipment_form_page.tsx"

INSIDE_BLOCK = '                {character.is_system &&\n                canManageEconomy ? (\n                  <NpcEquipmentAdmin\n                    characterId={\n                      character.id\n                    }\n                  />\n                ) : null}\n\n'
AFTER_FORM = '              </AdminCharacterEditForm>'
REPLACEMENT_AFTER = '              </AdminCharacterEditForm>\n\n              {character.is_system &&\n              canManageEconomy ? (\n                <NpcEquipmentAdmin\n                  characterId={\n                    character.id\n                  }\n                />\n              ) : null}'

if not TARGET.exists():
    raise SystemExit(f"ERROR: missing {TARGET}")

text = TARGET.read_text(encoding="utf-8-sig")

inside_count = text.count(INSIDE_BLOCK)
after_count = text.count(AFTER_FORM)

if inside_count != 1:
    raise SystemExit(
        f"ERROR: expected exactly 1 NPC Equipment block inside the admin form, "
        f"found {inside_count}. No files changed."
    )

if after_count != 1:
    raise SystemExit(
        f"ERROR: expected exactly 1 closing AdminCharacterEditForm tag, "
        f"found {after_count}. No files changed."
    )

updated = text.replace(INSIDE_BLOCK, "", 1)
updated = updated.replace(AFTER_FORM, REPLACEMENT_AFTER, 1)

BACKUP.parent.mkdir(parents=True, exist_ok=True)
if not BACKUP.exists():
    shutil.copy2(TARGET, BACKUP)
    print(f"Backup created: {BACKUP}")
else:
    print(f"Backup already exists: {BACKUP}")

TARGET.write_text(updated, encoding="utf-8")

print(f"Patched: {TARGET}")
print("Moved NPC Equipment outside AdminCharacterEditForm.")
print("Nothing committed or pushed.")
print("No SQL changes required.")
print("Now run: npm run build")
