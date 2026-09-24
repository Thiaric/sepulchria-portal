from pathlib import Path
import sys

ROOT = Path.cwd()

def fail(message: str) -> None:
    print(f"\nERROR: {message}")
    sys.exit(1)

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        fail(f"{label}: expected 1 match, found {count}. No files were changed.")
    return text.replace(old, new, 1)

targets = {
    "app/(portal)/game/components/RoomChatForm.tsx": (
'''          .filter(
            (
              entry,
            ): entry is PresentRoomCharacter =>
              entry !== null &&
              entry.id !==
                viewerCharacterId,
          );''',
'''          .filter(
            (
              entry,
            ): entry is NonNullable<typeof entry> =>
              entry !== null &&
              entry.id !==
                viewerCharacterId,
          );''',
    ),
    "app/(portal)/game/page.tsx": (
'''      .filter(
        (
          entry,
        ): entry is PresentRoomCharacter =>
          entry !== null,
      )''',
'''      .filter(
        (
          entry,
        ): entry is NonNullable<typeof entry> =>
          entry !== null,
      )''',
    ),
}

prepared = {}

for rel, (old, new) in targets.items():
    path = ROOT / rel
    if not path.exists():
        fail(f"Missing expected file: {rel}")
    text = path.read_text(encoding="utf-8")
    prepared[rel] = replace_once(
        text,
        old,
        new,
        rel,
    )

for rel, text in prepared.items():
    (ROOT / rel).write_text(
        text,
        encoding="utf-8",
        newline="\n",
    )

print("Type-guard fix applied.")
print("Changed:")
for rel in prepared:
    print(f"  - {rel}")
print("\nNow run:")
print("npm run build")
