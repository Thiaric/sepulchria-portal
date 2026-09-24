#!/usr/bin/env python3
from pathlib import Path
import shutil
import subprocess

ROOT = Path.cwd()
TARGET = ROOT / "app/(portal)/admin/characters/[id]/page.tsx"
BACKUP = ROOT / ".patch_backups" / "fix_npc_ancestry_feat_selection_5132a9f.tsx"

OLD = 'const selectedAncestryGiftIds =\n  ancestryGiftOptions\n    .filter(\n      (gift) =>\n        character.race_id !== null &&\n        gift.raceIds.includes(\n          character.race_id,\n        ) &&\n        ownedGiftIds.has(gift.id),\n    )\n    .map((gift) => gift.id);\n'
NEW = 'const ancestryOwnedGiftIds =\n  new Set(\n    (selectedAncestryGiftResult.data ?? [])\n      .filter(\n        (entry) =>\n          entry.acquisition_source ===\n          "ancestry",\n      )\n      .map(\n        (entry) =>\n          entry.gift_id,\n      ),\n  );\n\nconst selectedAncestryGiftIds =\n  ancestryGiftOptions\n    .filter(\n      (gift) =>\n        character.race_id !== null &&\n        gift.raceIds.includes(\n          character.race_id,\n        ) &&\n        ancestryOwnedGiftIds.has(\n          gift.id,\n        ),\n    )\n    .map((gift) => gift.id);\n'

def fail(message):
    raise SystemExit(f"ERROR: {message}")

if not TARGET.exists():
    fail(f"missing {TARGET}")

try:
    head = subprocess.check_output(
        ["git", "rev-parse", "--short", "HEAD"],
        cwd=ROOT,
        text=True,
        stderr=subprocess.DEVNULL,
    ).strip()
except Exception:
    head = "unknown"

print(f"Current HEAD: {head}")

text = TARGET.read_text(encoding="utf-8-sig")

if NEW in text:
    print("Patch already applied.")
    print("Nothing changed.")
    raise SystemExit(0)

count = text.count(OLD)
if count != 1:
    fail(
        f"expected exactly 1 ancestry-selection block, found {count}. "
        "No files changed."
    )

updated = text.replace(OLD, NEW, 1)

BACKUP.parent.mkdir(parents=True, exist_ok=True)
if not BACKUP.exists():
    shutil.copy2(TARGET, BACKUP)
    print(f"Backup created: {BACKUP}")

TARGET.write_text(updated, encoding="utf-8")

print(f"Patched: {TARGET}")
print("")
print("Fix:")
print("- Ancestry selector now loads ONLY acquisition_source='ancestry' Feats.")
print("- Staff-assigned NPC Feats no longer count toward the 2 Ancestry Feat limit.")
print("- Direct NPC Feats remain owned and untouched.")
print("")
print("No SQL changes required.")
print("Nothing committed or pushed.")
print("Now run: npm run build")
