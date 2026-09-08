from pathlib import Path
import shutil
import sys

ROOT = Path.cwd()
FILE = ROOT / "app" / "(portal)" / "character" / "condition-actions.ts"
BACKUP = ROOT / ".conditions-type-fix-backup" / FILE.relative_to(ROOT)

def fail(msg: str) -> None:
    print(f"\nSTOPPED: {msg}", file=sys.stderr)
    sys.exit(1)

if not FILE.exists():
    fail(f"Missing file: {FILE.relative_to(ROOT)}")

text = FILE.read_text(encoding="utf-8")

old = '''type AdminClient =
  ReturnType<
    typeof createAdminClient
  >;'''

new = '''/*
 * Conditions introduces a brand-new table before the generated Supabase
 * Database types know about it. This service-role client is intentionally
 * untyped here so new-table queries do not collapse to `never`.
 */
type AdminClient = any;'''

if old not in text:
    if new in text:
        print("Type fix is already applied.")
        sys.exit(0)
    fail("Could not find the expected AdminClient type block.")

BACKUP.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(FILE, BACKUP)

text = text.replace(old, new, 1)
FILE.write_text(text, encoding="utf-8")

print("CONDITIONS TYPE FIX APPLIED")
print("")
print("Changed only:")
print("  app/(portal)/character/condition-actions.ts")
print("")
print("NEXT:")
print("  npm run build")
