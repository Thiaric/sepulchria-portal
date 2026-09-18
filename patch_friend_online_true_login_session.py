from pathlib import Path
from datetime import datetime
import shutil
import sys

ROOT = Path.cwd()
ACTIONS = ROOT / "app/(portal)/game/actions.ts"
HEARTBEAT = ROOT / "components/portal/portal-presence-heartbeat.tsx"

for target in (ACTIONS, HEARTBEAT):
    if not target.exists():
        print(f"ERROR: Missing {target.relative_to(ROOT)}")
        sys.exit(1)

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup_root = ROOT / f".patch-backup-friend-login-session-{stamp}"

for target in (ACTIONS, HEARTBEAT):
    backup = backup_root / target.relative_to(ROOT)
    backup.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(target, backup)

text = ACTIONS.read_text(encoding="utf-8")

old_sig = "export async function heartbeatPresence(): Promise<PresenceActionResult> {"
new_sig = "export async function heartbeatPresence(announceLogin = false): Promise<PresenceActionResult> {"

if old_sig in text:
    text = text.replace(old_sig, new_sig, 1)
elif new_sig not in text:
    print("ERROR: Could not find heartbeatPresence() signature.")
    sys.exit(1)

old_block = (
    "    await touchPresence(\n"
    "      supabase,\n"
    "      character.id,\n"
    "      character.current_room_id,\n"
    "    );\n"
    "\n"
    "    return {\n"
)

new_block = (
    "    await touchPresence(\n"
    "      supabase,\n"
    "      character.id,\n"
    "      character.current_room_id,\n"
    "    );\n"
    "\n"
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
    "    return {\n"
)

if old_block in text:
    text = text.replace(old_block, new_block, 1)
elif "notify_my_mutual_friends_online" not in text:
    print("ERROR: Could not patch heartbeatPresence() body.")
    sys.exit(1)

ACTIONS.write_text(text, encoding="utf-8")

text = HEARTBEAT.read_text(encoding="utf-8")

anchor = (
    "  const logoutStartedRef =\n"
    "    useRef(false);\n"
)

replacement = (
    "  const logoutStartedRef =\n"
    "    useRef(false);\n"
    "\n"
    "  const loginAnnouncedRef =\n"
    "    useRef(false);\n"
)

if "loginAnnouncedRef" not in text:
    if anchor not in text:
        print("ERROR: Could not find logoutStartedRef block.")
        sys.exit(1)
    text = text.replace(anchor, replacement, 1)

old_call = "        await heartbeatPresence();\n"
new_call = (
    "        const result =\n"
    "          await heartbeatPresence(\n"
    "            !loginAnnouncedRef.current,\n"
    "          );\n"
    "\n"
    "        if (\n"
    "          result.ok &&\n"
    "          !loginAnnouncedRef.current\n"
    "        ) {\n"
    "          loginAnnouncedRef.current =\n"
    "            true;\n"
    "        }\n"
)

if old_call in text:
    text = text.replace(old_call, new_call, 1)
elif "loginAnnouncedRef.current" not in text:
    print("ERROR: Could not patch heartbeatPresence() call.")
    sys.exit(1)

HEARTBEAT.write_text(text, encoding="utf-8")

print("Patch applied successfully.")
print("Changed:")
print("  - app/(portal)/game/actions.ts")
print("  - components/portal/portal-presence-heartbeat.tsx")
print(f"Backup: {backup_root}")
print("Nothing was committed or pushed.")