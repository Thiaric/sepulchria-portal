from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path.cwd()
EXPECTED_HEAD = "3fe57ca24a330bedfdaa285193f551198ae56039"

FILE = ROOT / "components" / "cosmetics" / "cosmetic-runtime.tsx"
BACKUP = ROOT / ".equipment-popup-cosmetic-opacity-exception-backup"

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

if not FILE.exists():
    fail(f"Missing expected file: {FILE.relative_to(ROOT)}")

text = FILE.read_text(encoding="utf-8")

old_first = '''      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-17110d))]"],
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-15100d))]"],
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-120e0b))]"] {
        background-color:
          rgb(var(--sep-colour-090705) / 40%) !important;
      }'''

new_first = '''      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
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

old_second = '''      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
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

new_second = '''      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
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

count_first = text.count(old_first)
count_second = text.count(old_second)

if count_first != 1:
    fail(f"Expected 1 first profile-background translucency rule, found {count_first}.")
if count_second != 1:
    fail(f"Expected 1 inventory/profile translucency rule, found {count_second}.")

next_text = text.replace(old_first, new_first, 1)
next_text = next_text.replace(old_second, new_second, 1)

if BACKUP.exists():
    shutil.rmtree(BACKUP)

backup_file = BACKUP / FILE.relative_to(ROOT)
backup_file.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(FILE, backup_file)

FILE.write_text(next_text, encoding="utf-8")

validator = '''
const fs = require("fs");
const ts = require("typescript");

const file = process.argv[1];
const source = fs.readFileSync(file, "utf8");

const sf = ts.createSourceFile(
  file,
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);

if (sf.parseDiagnostics.length) {
  console.error(sf.parseDiagnostics);
  process.exit(1);
}
'''

try:
    subprocess.run(
        ["node", "-e", validator, str(FILE)],
        cwd=ROOT,
        check=True,
    )
except Exception:
    shutil.copy2(backup_file, FILE)
    fail("TypeScript validation failed. Original file restored.")

print("\nPROFILE-BACKGROUND EQUIPMENT POPUP EXCEPTION APPLIED")
print("")
print("Changed:")
print("  components/cosmetics/cosmetic-runtime.tsx")
print("")
print("Profile-background transparency still applies to normal sheet panels.")
print("Equipped-item popups and all descendants are now excluded.")
print("")
print("NEXT:")
print("  npm run build")
