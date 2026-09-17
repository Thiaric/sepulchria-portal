from pathlib import Path
import sys

path = Path("app/(portal)/game/components/RoomMessageList.tsx")

if not path.exists():
    print("ERROR: Run this from the sepulchria-portal repository root.")
    sys.exit(1)

text = path.read_text(encoding="utf-8")
original = text

old = '''          if (!row.id || !row.message || !row.created_at) {
            return;
          }

          setLiveMessages((currentMessages) =>
            mergeMessages(
              currentMessages,
              [
                systemEventToMessage({
                  id: row.id,
                  message: row.message,
                  created_at: row.created_at,
                }),
              ],
            ),
          );'''

new = '''          const eventId = row.id;
          const eventMessage = row.message;
          const eventCreatedAt = row.created_at;

          if (!eventId || !eventMessage || !eventCreatedAt) {
            return;
          }

          setLiveMessages((currentMessages) =>
            mergeMessages(
              currentMessages,
              [
                systemEventToMessage({
                  id: eventId,
                  message: eventMessage,
                  created_at: eventCreatedAt,
                }),
              ],
            ),
          );'''

if old not in text:
    if new in text:
        print("Nothing to do: Realtime system-event narrowing fix is already applied.")
        sys.exit(0)

    print("ERROR: Could not find the Realtime system-event block.")
    print("No files were changed.")
    sys.exit(1)

text = text.replace(old, new, 1)

backup = path.with_suffix(path.suffix + ".before-phase5-build-fix")
backup.write_text(original, encoding="utf-8")
path.write_text(text, encoding="utf-8", newline="\n")

print("SUCCESS: fixed Realtime system-event TypeScript narrowing.")
print("Backup:", backup)
print("Now run: npm run build")
