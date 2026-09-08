from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path.cwd()
EXPECTED_HEAD = "3fe57ca24a330bedfdaa285193f551198ae56039"

RUNTIME = ROOT / "components" / "cosmetics" / "cosmetic-runtime.tsx"
INVENTORY = ROOT / "components" / "characters" / "character-inventory-browser.tsx"

BACKUP = ROOT / ".equipment-popup-like-feats-warping-backup"

START = "/* EQUIPMENT POPUP — SAME SOLID EXCEPTION AS FEATS/WARPING START */"
END = "/* EQUIPMENT POPUP — SAME SOLID EXCEPTION AS FEATS/WARPING END */"

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

original_first = '''      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-17110d))]"],
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-15100d))]"],
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-120e0b))]"] {
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

broad_first = '''      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
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

broad_second = '''      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
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

runtime = re.sub(
    r'\s*/\* EQUIPMENT-ONLY PROFILE-BACKGROUND EXCEPTION START \*/.*?/\* EQUIPMENT-ONLY PROFILE-BACKGROUND EXCEPTION END \*/',
    '',
    runtime,
    flags=re.DOTALL,
)

runtime = runtime.replace(broad_first, original_first)
runtime = runtime.replace(broad_second, original_second)

if original_first not in runtime:
    fail("Could not confirm the original first profile-background transparency rule.")
if original_second not in runtime:
    fail("Could not confirm the original character-sheet transparency rule.")

desktop_without = '''          {open ? (
  <div
  className={`absolute z-[200] w-[280px] border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-0e0a08))] p-2 shadow-2xl ${'''

desktop_with = '''          {open ? (
  <div
  data-sep-equipment-popup="true"
  className={`absolute z-[200] w-[280px] border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-0e0a08))] p-2 shadow-2xl ${'''

if desktop_without in inventory:
    inventory = inventory.replace(desktop_without, desktop_with, 1)
elif desktop_with not in inventory:
    fail("Could not find the desktop equipped-item hover popup.")

runtime = re.sub(
    re.escape(START) + r".*?" + re.escape(END),
    "",
    runtime,
    flags=re.DOTALL,
)

exception = '''
      /* EQUIPMENT POPUP — SAME SOLID EXCEPTION AS FEATS/WARPING START */

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

      /* EQUIPMENT POPUP — SAME SOLID EXCEPTION AS FEATS/WARPING END */
'''

runtime = runtime.replace(
    original_second,
    original_second + "\n\n" + exception.rstrip(),
    1,
)

RUNTIME.write_text(runtime, encoding="utf-8")
INVENTORY.write_text(inventory, encoding="utf-8")

validator = r'''
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

print("\nEQUIPMENT HOVER POPUP SOLID EXCEPTION APPLIED")
print("")
print("UNCHANGED:")
print("  In Short / Profile / Inventory / Ledger / Trophies / Offgame / Log")
print("")
print("ALREADY SOLID, LEFT ALONE:")
print("  Feats/Gifts")
print("  Warping")
print("")
print("NOW ALSO SOLID:")
print("  ONLY the equipped-item hover/detail popup")
print("")
print("NEXT:")
print("  npm run build")
