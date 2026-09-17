from pathlib import Path
import re
import sys

root = Path.cwd()
chat_form = root / "app/(portal)/game/components/RoomChatForm.tsx"
message_list = root / "app/(portal)/game/components/RoomMessageList.tsx"

for path in (chat_form, message_list):
    if not path.exists():
        print(f"ERROR: Missing {path}")
        print("Run this from the sepulchria-portal repository root.")
        sys.exit(1)

chat = chat_form.read_text(encoding="utf-8")
messages = message_list.read_text(encoding="utf-8")
chat_original = chat
messages_original = messages

# 1) Move the inserted death UI state/effects after utilityMode is declared.
pattern = re.compile(
    r'  const \[viewerDead, setViewerDead\] = useState\(false\);\n'
    r'  const \[ghostChatAllowed, setGhostChatAllowed\] = useState\(false\);\n\n'
    r'  useEffect\(\(\) => \{\n'
    r'[\s\S]*?'
    r'  \}, \[viewerDead, utilityMode\]\);\n\n'
)

match = pattern.search(chat)
if not match:
    print("ERROR: Could not find the inserted death-UI block.")
    print("No files were changed.")
    sys.exit(1)

death_ui_block = match.group(0)
chat = chat[:match.start()] + chat[match.end():]

utility_decl = '''  const [utilityMode, setUtilityMode] =
    useState<
      | "whisper"
      | "dice"
      | "attributes"
      | "feat"
      | "items"
      | "exchange"
      | "warping"
      | "conditions"
      | "npc"
      | null
    >(null);

'''

if utility_decl not in chat:
    print("ERROR: Could not find the utilityMode declaration.")
    print("No files were changed.")
    sys.exit(1)

chat = chat.replace(
    utility_decl,
    utility_decl + death_ui_block,
    1,
)

# 2) Guard nullable character_id before indexing chatFrames.
old_chat_frame = '''                const chatFrameUrl =
                  !isMechanicalOutput &&
                  !isNpcMessage
                    ? chatFrames[
                        item.character_id
                      ] ?? null
                    : null;'''

new_chat_frame = '''                const chatFrameUrl =
                  !isMechanicalOutput &&
                  !isNpcMessage &&
                  item.character_id
                    ? chatFrames[
                        item.character_id
                      ] ?? null
                    : null;'''

if old_chat_frame in messages:
    messages = messages.replace(
        old_chat_frame,
        new_chat_frame,
        1,
    )
elif new_chat_frame not in messages:
    print("ERROR: Could not find the chatFrameUrl lookup.")
    print("No files were changed.")
    sys.exit(1)

if chat == chat_original and messages == messages_original:
    print("Nothing to do: both fixes are already applied.")
    sys.exit(0)

chat_backup = chat_form.with_suffix(chat_form.suffix + ".before-death-build-fix")
message_backup = message_list.with_suffix(message_list.suffix + ".before-death-build-fix")

chat_backup.write_text(chat_original, encoding="utf-8")
message_backup.write_text(messages_original, encoding="utf-8")

chat_form.write_text(chat, encoding="utf-8", newline="\n")
message_list.write_text(messages, encoding="utf-8", newline="\n")

print("SUCCESS: fixed both TypeScript errors.")
print(" - moved death UI effect after utilityMode declaration")
print(" - guarded nullable system message character_id before chatFrames lookup")
print("Now run: npm run build")
