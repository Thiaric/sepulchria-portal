from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path.cwd()
EXPECTED_HEAD = "3f0b2c7f9d271f468cf08bba0ae6e2f2804e0cb0"
FILE = ROOT / "app" / "(portal)" / "admin" / "missions" / "actions.ts"
BACKUP = ROOT / ".milestone-complete-all-constraint-backup" / FILE.relative_to(ROOT)

def fail(msg):
    print(f"\nSTOPPED: {msg}", file=sys.stderr)
    sys.exit(1)

if not (ROOT / "package.json").exists():
    fail("Run this from the sepulchria-portal repository root.")

head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
if head != EXPECTED_HEAD:
    fail(f"Patch is locked to {EXPECTED_HEAD[:7]}; current HEAD is {head[:7]}.")

if not FILE.exists():
    fail(f"Missing {FILE.relative_to(ROOT)}")

BACKUP.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(FILE, BACKUP)

text = FILE.read_text(encoding="utf-8")

try:
    old = '''    if (targetCount === null) {
      return failure(
        "Missions Required must be a positive whole number.",
      );
    }'''
    new = '''    if (!isAll && targetCount === null) {
      return failure(
        "Missions Required must be a positive whole number.",
      );
    }'''
    if old not in text:
        raise RuntimeError("Could not find create-milestone target validation.")
    text = text.replace(old, new, 1)

    old = '''        target_count: targetCount,
        is_all: isAll,'''
    new = '''        target_count: isAll ? null : targetCount,
        is_all: isAll,'''
    if old not in text:
        raise RuntimeError("Could not find create-milestone target insert.")
    text = text.replace(old, new, 1)

    update_marker = "export async function updateDailyMilestoneDefinition("
    if update_marker not in text:
        raise RuntimeError("Could not find updateDailyMilestoneDefinition.")

    before, update = text.split(update_marker, 1)

    old = '''    if (
      !Number.isSafeInteger(targetCount) ||
      targetCount < 1
    ) {
      return failure(
        "Missions Required must be a positive whole number.",
      );
    }'''
    new = '''    if (
      !isAll &&
      (!Number.isSafeInteger(targetCount) ||
        targetCount < 1)
    ) {
      return failure(
        "Missions Required must be a positive whole number.",
      );
    }'''
    if old not in update:
        raise RuntimeError("Could not find update-milestone target validation.")
    update = update.replace(old, new, 1)

    old = '''        target_count: targetCount,
        is_all: isAll,'''
    new = '''        target_count: isAll ? null : targetCount,
        is_all: isAll,'''
    if old not in update:
        raise RuntimeError("Could not find update-milestone target update.")
    update = update.replace(old, new, 1)

    text = before + update_marker + update
    FILE.write_text(text, encoding="utf-8")

    validator = '''
const fs=require("fs"),ts=require("typescript");
const f=process.argv[1],s=fs.readFileSync(f,"utf8");
const sf=ts.createSourceFile(f,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
if(sf.parseDiagnostics.length){console.error(sf.parseDiagnostics);process.exit(1);}
'''
    subprocess.run(["node", "-e", validator, str(FILE)], cwd=ROOT, check=True)

except Exception as e:
    shutil.copy2(BACKUP, FILE)
    fail(f"{e}\nThe file was restored automatically.")

print("MILESTONE COMPLETE-ALL CONSTRAINT FIX APPLIED")
print("Complete All milestones now save target_count = null.")
print("Normal milestones still require a positive target_count.")
print("Milestone names remain unrestricted by this fix.")
print("NEXT: npm run build")
