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

head = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
if head != BASELINE:
    die(f"HEAD is {head}; expected {BASELINE}")

path = root / TARGET
text = path.read_text(encoding="utf-8")

old = '        evidence_type: "character_profile_field",'
new = '        evidence_type: "content_snapshot",'

count = text.count(old)
if count != 1:
    die(f"expected generated evidence_type line once, found {count}")

path.write_text(text.replace(old, new, 1), encoding="utf-8")

print("Updated additional character-profile evidence to use the existing content_snapshot evidence type.")
print("Now run: npm run build")
