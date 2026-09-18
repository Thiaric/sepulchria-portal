from pathlib import Path
from datetime import datetime
import shutil
import sys

ROOT = Path.cwd()
TARGET = ROOT / "app/(portal)/game/actions.ts"

def fail(message: str) -> None:
    print(f"\nERROR: {message}\n")
    sys.exit(1)

if not TARGET.exists():
    fail("Could not find app/(portal)/game/actions.ts. Run this script from the Sepulchria repo root.")

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = ROOT / f".patch-backup-friend-login-build-fix-{stamp}" / TARGET.relative_to(ROOT)
backup.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(TARGET, backup)

text = TARGET.read_text(encoding="utf-8")

notify_block = (
    "    if (announceLogin) {\n"
    "      const {\n"
    "        error: friendOnlineError,\n"
    "      } = await supabase.rpc(\n"
    "        \"notify_my_mutual_friends_online\",\n"
    "      );\n"
    "\n"
    "      if (friendOnlineError) {\n"
    "        console.error(\n"
    "          \"Unable to notify mutual friends of login:\",\n"
    "          friendOnlineError.message,\n"
    "        );\n"
    "      }\n"
    "    }\n"
    "\n"
)

removed = text.count(notify_block)
text = text.replace(notify_block, "")

signature_old = "export async function heartbeatPresence(): Promise<PresenceActionResult> {"
signature_new = "export async function heartbeatPresence(announceLogin = false): Promise<PresenceActionResult> {"

if signature_old in text:
    text = text.replace(signature_old, signature_new, 1)
elif signature_new not in text:
    fail("Could not find heartbeatPresence() signature.")

heartbeat_start = text.find(signature_new)
if heartbeat_start == -1:
    fail("Could not locate heartbeatPresence().")

next_export = text.find("\nexport async function ", heartbeat_start + len(signature_new))
if next_export == -1:
    fail("Could not locate the end boundary of heartbeatPresence().")

heartbeat = text[heartbeat_start:next_export]

touch_block = (
    "    await touchPresence(\n"
    "      supabase,\n"
    "      character.id,\n"
    "      character.current_room_id,\n"
    "    );\n"
    "\n"
)

if touch_block not in heartbeat:
    fail("Could not find touchPresence() inside heartbeatPresence().")

if "notify_my_mutual_friends_online" not in heartbeat:
    heartbeat = heartbeat.replace(touch_block, touch_block + notify_block, 1)

text = text[:heartbeat_start] + heartbeat + text[next_export:]

if text.count("if (announceLogin)") != 1:
    fail("Safety check failed: expected exactly one announceLogin block in the file.")

updated_heartbeat_start = text.find(signature_new)
updated_next_export = text.find("\nexport async function ", updated_heartbeat_start + len(signature_new))
outside = text[:updated_heartbeat_start] + text[updated_next_export:]
if "announceLogin" in outside:
    fail("Safety check failed: announceLogin still appears outside heartbeatPresence().")

TARGET.write_text(text, encoding="utf-8")

print("Repair applied successfully.")
print("Changed: app/(portal)/game/actions.ts")
print(f"Backup: {backup.parent}")
print(f"Removed misplaced login-notification blocks: {removed}")
print("The announceLogin logic now exists ONLY inside heartbeatPresence().")
print("Nothing was committed or pushed.")