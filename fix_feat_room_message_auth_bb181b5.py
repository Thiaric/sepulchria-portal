from pathlib import Path
import subprocess

EXPECTED_HEAD = "bb181b59ea6c00f1a78f59907ffe09f1948812ea"
PATH = Path("app/(portal)/game/feat-mechanics-actions.ts")

OLD = '''    const messageInsert = await admin
      .from("room_messages")
      .insert({'''

NEW = '''    const messageInsert = await supabase
      .from("room_messages")
      .insert({'''

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    text=True,
).strip()

if head != EXPECTED_HEAD:
    raise SystemExit(
        f"STOP: patch targets {EXPECTED_HEAD}, current HEAD is {head}. No files were written."
    )

if not PATH.exists():
    raise SystemExit(
        f"STOP: missing {PATH}. No files were written."
    )

text = PATH.read_text(encoding="utf-8")
count = text.count(OLD)

if count != 1:
    raise SystemExit(
        f"STOP: expected exactly 1 Feat room-message insert using admin client, found {count}. No files were written."
    )

PATH.write_text(
    text.replace(OLD, NEW, 1),
    encoding="utf-8",
)

print("Fixed Shape-style Feat room-message authentication.")
print(f"Changed: {PATH}")
print()
print("Run:")
print("  npm run build")
print("  git diff --check")
print('  git diff -- "app/(portal)/game/feat-mechanics-actions.ts"')
