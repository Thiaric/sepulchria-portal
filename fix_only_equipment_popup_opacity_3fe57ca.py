from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path.cwd()
EXPECTED_HEAD = "3fe57ca24a330bedfdaa285193f551198ae56039"

RUNTIME = ROOT / "components" / "cosmetics" / "cosmetic-runtime.tsx"
INVENTORY = ROOT / "components" / "characters" / "character-inventory-browser.tsx"
BACKUP = ROOT / ".equipment-only-opacity-exception-backup"

START = "/* EQUIPMENT-ONLY PROFILE-BACKGROUND EXCEPTION START */"
END = "/* EQUIPMENT-ONLY PROFILE-BACKGROUND EXCEPTION END */"

def fail(message: str) -> None:
    print(f"\nSTOPPED: {message}", file=sys.stderr)
    sys.exit(1)

if not (ROOT / "package.json").exists():
    fail("Run this from the sepulchria-portal repository root.")

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    cwd=ROOT,
    text=True,
).strip()

if head != EXPECTED_HEAD:
    fail(
        f"This patch is locked to {EXPECTED_HEAD[:7]}; "
        f"your current HEAD is {head[:7]}."
    )

for path in (RUNTIME, INVENTORY):
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")

if BACKUP.exists():
    shutil.rmtree(BACKUP)

for path in (RUNTIME, INVENTORY):
    dst = BACKUP / path.relative_to(ROOT)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dst)

runtime = RUNTIME.read_text(encoding="utf-8")
inventory = INVENTORY.read_text(encoding="utf-8")

# -------------------------------------------------------------------
# 1) RESTORE THE ORIGINAL PROFILE-BACKGROUND TRANSPARENCY RULES.
#    This restores In Short/Profile/Inventory/etc. exactly as before.
# -------------------------------------------------------------------

modified_first = '''      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-17110d))]"]
        :not([data-sep-equipment-popup="true"])
        :not([data-sep-equipment-popup="true"] *),
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-15100d))]"]
        :not([data-sep-equipment-popup="true"])
        :not([data-sep-equipment-popup="true"] *),
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-120e0b))]"]
        :not([data-sep-equipment-popup="true"])
        :not([data-sep-equipment-popup="true"] *) {
        background-color:
          rgb(var(--sep-colour-090705) / 40%) !important;
      }'''

original_first = '''      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-17110d))]"],
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-15100d))]"],
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-120e0b))]"] {
        background-color:
          rgb(var(--sep-colour-090705) / 40%) !important;
      }'''

modified_second = '''      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(
          [data-character-sheet-panel="short"],
          [data-character-sheet-panel="profile"],
          [data-character-sheet-panel="inventory"],
          [data-character-sheet-panel="ledger"],
          [data-character-sheet-panel="trophies"],
          [data-character-sheet-panel="offgame"],
          [data-character-sheet-panel="audit"]
        )
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-"]
        :not([data-sep-equipment-popup="true"])
        :not([data-sep-equipment-popup="true"] *) {
        background-color:
          rgb(var(--sep-colour-090705) / 40%) !important;
      }'''

original_second = '''      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(
          [data-character-sheet-panel="short"],
          [data-character-sheet-panel="profile"],
          [data-character-sheet-panel="inventory"],
          [data-character-sheet-panel="ledger"],
          [data-character-sheet-panel="trophies"],
          [data-character-sheet-panel="offgame"],
          [data-character-sheet-panel="audit"]
        )
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-"] {
        background-color:
          rgb(var(--sep-colour-090705) / 40%) !important;
      }'''

if modified_first in runtime:
    runtime = runtime.replace(modified_first, original_first, 1)
elif original_first not in runtime:
    fail("Could not find the first profile-background transparency rule.")

if modified_second in runtime:
    runtime = runtime.replace(modified_second, original_second, 1)
elif original_second not in runtime:
    fail("Could not find the character-sheet transparency rule.")

# -------------------------------------------------------------------
# 2) REMOVE any older copy of this precise equipment-only exception.
# -------------------------------------------------------------------

runtime = re.sub(
    re.escape(START) + r".*?" + re.escape(END),
    "",
    runtime,
    flags=re.DOTALL,
)

# -------------------------------------------------------------------
# 3) ADD A LATER, MORE-SPECIFIC EXCEPTION ONLY INSIDE EQUIPMENT POPUPS.
#
#    The profile background remains translucent everywhere else.
#    Only:
#      - popup shell (0e0a08)
#      - equipped ItemCard (18110c)
#      - mechanics boxes inside ItemCard (100c09)
#    are restored to their original opaque colours.
# -------------------------------------------------------------------

exception = '''
      /* EQUIPMENT-ONLY PROFILE-BACKGROUND EXCEPTION START */
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        [data-sep-equipment-popup="true"] {
        background-color:
          rgb(var(--sep-colour-0e0a08)) !important;
      }

      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        [data-sep-equipment-popup="true"]
        article[class*="bg-[rgb(var(--sep-colour-18110c))]"] {
        background-color:
          rgb(var(--sep-colour-18110c)) !important;
      }

      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        [data-sep-equipment-popup="true"]
        div[class*="bg-[rgb(var(--sep-colour-100c09))]"] {
        background-color:
          rgb(var(--sep-colour-100c09)) !important;
      }
      /* EQUIPMENT-ONLY PROFILE-BACKGROUND EXCEPTION END */
'''

anchor = original_second
if runtime.count(anchor) != 1:
    fail(
        f"Expected exactly one restored character-sheet transparency rule, "
        f"found {runtime.count(anchor)}."
    )

runtime = runtime.replace(
    anchor,
    anchor + "\n\n" + exception.rstrip(),
    1,
)

# -------------------------------------------------------------------
# 4) ENSURE THE DESKTOP EQUIPMENT POPUP ITSELF HAS THE MARKER.
#    Do NOT tag any other Character Sheet panel.
# -------------------------------------------------------------------

desktop_without_marker = '''          {open ? (
  <div
  className={`absolute z-[200] w-[280px] border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-0e0a08))] p-2 shadow-2xl ${'''

desktop_with_marker = '''          {open ? (
  <div
  data-sep-equipment-popup="true"
  className={`absolute z-[200] w-[280px] border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-0e0a08))] p-2 shadow-2xl ${'''

if desktop_without_marker in inventory:
    inventory = inventory.replace(
        desktop_without_marker,
        desktop_with_marker,
        1,
    )
elif desktop_with_marker not in inventory:
    fail("Could not find the desktop equipped-item popup wrapper.")

RUNTIME.write_text(runtime, encoding="utf-8")
INVENTORY.write_text(inventory, encoding="utf-8")

validator = '''
const fs = require("fs");
const ts = require("typescript");

for (const file of process.argv.slice(1)) {
  const source = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  if (sf.parseDiagnostics.length) {
    console.error("Parse diagnostics:", file);
    console.error(sf.parseDiagnostics);
    process.exit(1);
  }
}
'''

try:
    subprocess.run(
        ["node", "-e", validator, str(RUNTIME), str(INVENTORY)],
        cwd=ROOT,
        check=True,
    )
except Exception:
    for path in (RUNTIME, INVENTORY):
        shutil.copy2(BACKUP / path.relative_to(ROOT), path)
    fail("Validation failed. Original files restored.")

print("\nEQUIPMENT-ONLY OPACITY EXCEPTION APPLIED")
print("")
print("Restored:")
print("  In Short / Profile / Inventory / Ledger / Trophies / Offgame / Log")
print("  profile-background translucency exactly as before.")
print("")
print("Excluded from that translucency ONLY:")
print("  equipped-item detail popup shell")
print("  equipped ItemCard inside that popup")
print("  Target / Success / Damage boxes inside that popup")
print("")
print("Changed:")
print("  components/cosmetics/cosmetic-runtime.tsx")
print("  components/characters/character-inventory-browser.tsx")
print("")
print("NEXT:")
print("  npm run build")
