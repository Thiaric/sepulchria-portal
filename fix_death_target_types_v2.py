from pathlib import Path
import re
import sys

path = Path("app/(portal)/game/actions.ts")

if not path.exists():
    print("ERROR: Run this from the sepulchria-portal repository root.")
    sys.exit(1)

text = path.read_text(encoding="utf-8")
original = text

object_pattern = re.compile(
    r"\{(?P<body>[^{}]{0,600}?"
    r"id\s*:\s*character\.id\s*,"
    r"[^{}]{0,300}?"
    r"displayName\s*:\s*character\.display_name\s*,"
    r"[^{}]{0,300}?"
    r"isSelf\s*:\s*true\s*,?"
    r"[^{}]{0,300}?)\}",
    re.S,
)

matches = []
for m in object_pattern.finditer(text):
    body = m.group("body")
    if "lifeState" not in body or "diedAt" not in body:
        matches.append(m)

if not matches:
    print("ERROR: No incomplete self-target object was found.")
    print("No files were changed.")
    sys.exit(1)

updated = text

for m in reversed(matches):
    block = m.group(0)

    if not re.search(r"isSelf\s*:\s*true", block):
        print("ERROR: Candidate block did not contain isSelf: true.")
        print("No files were changed.")
        sys.exit(1)

    replacement = re.sub(
        r"(?P<indent>[ \t]*)isSelf\s*:\s*true\s*,?",
        lambda mm: (
            f"{mm.group('indent')}isSelf: true,\n"
            f"{mm.group('indent')}lifeState: character.life_state,\n"
            f"{mm.group('indent')}diedAt: character.died_at,"
        ),
        block,
        count=1,
    )

    updated = updated[:m.start()] + replacement + updated[m.end():]

backup = path.with_suffix(path.suffix + ".before-death-target-fix-v2")
backup.write_text(original, encoding="utf-8")
path.write_text(updated, encoding="utf-8", newline="\n")

print(f"SUCCESS: patched {len(matches)} incomplete self-target object(s).")
print(f"Backup: {backup}")
print("Now run: npm run build")
