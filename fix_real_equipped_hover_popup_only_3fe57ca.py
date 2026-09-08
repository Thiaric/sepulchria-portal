from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path.cwd()
EXPECTED_HEAD = "3fe57ca24a330bedfdaa285193f551198ae56039"

FILE = ROOT / "components" / "characters" / "character-inventory-browser.tsx"
BACKUP = ROOT / ".fix-real-equipped-hover-marker-backup"

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

# 1) Remove the marker from the EMPTY-SLOT picker if one of the prior patches
#    added it. That popup is NOT the equipped-item hover popup.
wrong = '''          {open ? (
  <div
  data-sep-equipment-popup="true"
  className={`absolute z-[200] w-[280px] border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-0e0a08))] p-2 shadow-2xl ${'''

correct_empty = '''          {open ? (
  <div
  className={`absolute z-[200] w-[280px] border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-0e0a08))] p-2 shadow-2xl ${'''

if wrong in text:
    text = text.replace(wrong, correct_empty, 1)

# 2) Mark ONLY the real equipped-item hover popup.
hover_old = '''      <div
        className={[
          "pointer-events-none absolute z-[500] hidden w-[420px] max-w-[calc(100vw-32px)]",'''

hover_new = '''      <div
        data-sep-equipment-popup="true"
        className={[
          "pointer-events-none absolute z-[500] hidden w-[420px] max-w-[calc(100vw-32px)]",'''

count = text.count(hover_old)
if count != 1:
    if text.count(hover_new) == 1:
        pass
    else:
        fail(
            "Could not uniquely find the REAL equipped-item hover popup "
            f"(found {count} unmarked matches)."
        )
else:
    text = text.replace(hover_old, hover_new, 1)

if BACKUP.exists():
    shutil.rmtree(BACKUP)

backup_file = BACKUP / FILE.relative_to(ROOT)
backup_file.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(FILE, backup_file)

FILE.write_text(text, encoding="utf-8")

validator = r'''
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

print("\nREAL EQUIPPED-HOVER POPUP MARKER FIX APPLIED")
print("")
print("Changed ONLY:")
print("  components/characters/character-inventory-browser.tsx")
print("")
print("What changed:")
print("  - removed the popup marker from the EMPTY-slot picker")
print("  - added the popup marker to the ACTUAL equipped-item hover card")
print("")
print("The existing cosmetic-runtime exception can now target the correct popup.")
print("")
print("NEXT:")
print("  npm run build")
