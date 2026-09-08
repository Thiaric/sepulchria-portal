from pathlib import Path
import sys

path = Path("app/(portal)/game/components/RoomChatForm.tsx")

if not path.exists():
    print("STOPPED: run this from the sepulchria-portal repository root.", file=sys.stderr)
    sys.exit(1)

text = path.read_text(encoding="utf-8")

old = """    let refreshTimer:
      | ReturnType<typeof window.setTimeout>
      | null = null;"""

new = """    let refreshTimer:
      | number
      | null = null;"""

count = text.count(old)

if count != 1:
    print(
        f"STOPPED: expected exactly 1 refreshTimer declaration, found {count}.",
        file=sys.stderr,
    )
    sys.exit(1)

path.write_text(text.replace(old, new, 1), encoding="utf-8")

print("Fixed RoomChatForm refreshTimer type.")
print("NEXT: npm run build")
