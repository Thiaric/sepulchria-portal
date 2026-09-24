#!/usr/bin/env python3
from pathlib import Path
import shutil

ROOT = Path.cwd()
TARGET = ROOT / "components/admin/admin-character-edit-form.tsx"
BACKUP = ROOT / ".patch_backups" / "fix_npc_admin_age_null_ts.tsx"

OLD_COMPARE = '    if (\n      numericAge <\n      selectedRace.min_age\n    ) {'
NEW_COMPARE = '    if (\n      selectedRace.min_age !==\n        null &&\n      numericAge <\n        selectedRace.min_age\n    ) {'
OLD_DISABLED = '          disabled={\n            loadingAge ||\n            !selectedRace ||\n            selectedRace.min_age ===\n              null\n          }'
NEW_DISABLED = '          disabled={\n            loadingAge ||\n            !selectedRace ||\n            (\n              selectedRace.min_age ===\n                null &&\n              !allowMissingAge\n            )\n          }'

if not TARGET.exists():
    raise SystemExit(f"ERROR: missing {TARGET}")

text = TARGET.read_text(encoding="utf-8-sig")

for old, label in [
    (OLD_COMPARE, "nullable minimum-age comparison"),
    (OLD_DISABLED, "NPC age input disabled rule"),
]:
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"ERROR: {label}: expected exactly 1 match, found {count}. "
            "No files changed."
        )

updated = text.replace(OLD_COMPARE, NEW_COMPARE, 1)
updated = updated.replace(OLD_DISABLED, NEW_DISABLED, 1)

BACKUP.parent.mkdir(parents=True, exist_ok=True)
if not BACKUP.exists():
    shutil.copy2(TARGET, BACKUP)
    print(f"Backup created: {BACKUP}")
else:
    print(f"Backup already exists: {BACKUP}")

TARGET.write_text(updated, encoding="utf-8")

print(f"Patched: {TARGET}")
print("Nothing committed or pushed.")
print("No SQL change required.")
print("Now run: npm run build")
