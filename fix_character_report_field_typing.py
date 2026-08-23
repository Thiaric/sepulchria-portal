#!/usr/bin/env python3
from pathlib import Path
import subprocess

BASELINE = "2dc9c00632bfa78c295fb77de1f4569f430fdc46"
TARGET = Path("app/(portal)/api/reports/route.ts")

def die(message):
    raise SystemExit(f"ERROR: {message}. Nothing written.")

root = Path.cwd()

if not (root / "package.json").exists():
    die("run this from the sepulchria-portal root")

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    text=True,
).strip()

if head != BASELINE:
    die(f"HEAD is {head}; expected {BASELINE}")

path = root / TARGET
if not path.exists():
    die(f"{TARGET} does not exist")

text = path.read_text(encoding="utf-8")

old = '''    const requestedFields = Array.from(
      new Set(
        (Array.isArray(body?.fields) ? body.fields : [])
          .filter(isCharacterProfileField),
      ),
    );
'''

new = '''    const requestedFields: CharacterProfileField[] = [];

    for (const value of Array.isArray(body?.fields) ? body.fields : []) {
      if (
        isCharacterProfileField(value) &&
        !requestedFields.includes(value)
      ) {
        requestedFields.push(value);
      }
    }
'''

count = text.count(old)
if count != 1:
    die(
        "expected the generated requestedFields block exactly once, "
        f"found {count}"
    )

updated = text.replace(old, new, 1)
path.write_text(updated, encoding="utf-8")

print("Fixed TypeScript narrowing in:")
print(f"  {TARGET}")
print()
print("Now run:")
print("  npm run build")
