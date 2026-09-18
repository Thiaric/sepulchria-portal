from pathlib import Path
from datetime import datetime
import shutil
import sys

ROOT = Path.cwd()
FILES = {
    "login": ROOT / "components/login-form.tsx",
    "logout": ROOT / "app/(portal)/logout-presence-actions.ts",
    "heartbeat": ROOT / "components/portal/portal-presence-heartbeat.tsx",
    "actions": ROOT / "app/(portal)/game/actions.ts",
    "bell": ROOT / "components/notifications/notification-bell.tsx",
    "tidings": ROOT / "lib/tidings/event-tidings.ts",
}

def fail(message: str) -> None:
    print(f"\nERROR: {message}\n")
    sys.exit(1)

for path in FILES.values():
    if not path.exists():
        fail(f"Missing {path.relative_to(ROOT)}")

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup_root = ROOT / f".patch-backup-enter-leave-and-tidings-{stamp}"
for path in FILES.values():
    backup = backup_root / path.relative_to(ROOT)
    backup.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, backup)

# 1) LOGIN: fire exact ENTER notification immediately after successful auth.
path = FILES["login"]
text = path.read_text(encoding="utf-8")
anchor = (
    "      if (error) {\n"
    "        throw error;\n"
    "      }\n"
)
insert = (
    "      if (error) {\n"
    "        throw error;\n"
    "      }\n"
    "\n"
    "      const { error: friendEnterError } =\n"
    "        await supabase.rpc(\n"
    "          \"notify_my_mutual_friends_entered\",\n"
    "        );\n"
    "\n"
    "      if (friendEnterError) {\n"
    "        console.error(\n"
    "          \"Unable to notify mutual friends of login:\",\n"
    "          friendEnterError.message,\n"
    "        );\n"
    "      }\n"
)
if "notify_my_mutual_friends_entered" not in text:
    if anchor not in text:
        fail("Could not find successful login block.")
    text = text.replace(anchor, insert, 1)
path.write_text(text, encoding="utf-8")

# 2) LOGOUT: fire exact LEAVE notification before presence row is deleted.
path = FILES["logout"]
text = path.read_text(encoding="utf-8")
anchor = (
    "  const admin = createAdminClient();\n"
)
insert = (
    "  const { error: friendLeaveError } =\n"
    "    await supabase.rpc(\n"
    "      \"notify_my_mutual_friends_left\",\n"
    "    );\n"
    "\n"
    "  if (friendLeaveError) {\n"
    "    console.error(\n"
    "      \"Unable to notify mutual friends of logout:\",\n"
    "      friendLeaveError.message,\n"
    "    );\n"
    "  }\n"
    "\n"
    "  const admin = createAdminClient();\n"
)
if "notify_my_mutual_friends_left" not in text:
    if anchor not in text:
        fail("Could not find logout admin-client anchor.")
    text = text.replace(anchor, insert, 1)
path.write_text(text, encoding="utf-8")

# 3) Remove heartbeat-based login notification plumbing.
path = FILES["actions"]
text = path.read_text(encoding="utf-8")
text = text.replace(
    "export async function heartbeatPresence(announceLogin = false): Promise<PresenceActionResult> {",
    "export async function heartbeatPresence(): Promise<PresenceActionResult> {",
)
notify_start = text.find("    if (announceLogin) {")
if notify_start != -1:
    notify_end = text.find("\n    return {", notify_start)
    if notify_end == -1:
        fail("Could not safely remove heartbeat login block.")
    text = text[:notify_start] + text[notify_end:]
path.write_text(text, encoding="utf-8")

path = FILES["heartbeat"]
text = path.read_text(encoding="utf-8")
text = text.replace(
    "  const loginAnnouncedRef =\n    useRef(false);\n\n",
    "",
)
old = (
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
if old in text:
    text = text.replace(old, "        await heartbeatPresence();\n", 1)
path.write_text(text, encoding="utf-8")

# 4) Bell realtime source.
path = FILES["bell"]
text = path.read_text(encoding="utf-8")
if '"friend_presence"' not in text:
    marker = '        "friend_online",\n'
    if marker in text:
        text = text.replace(marker, marker + '        "friend_presence",\n', 1)
    else:
        marker = '        "order_headquarters_invite",\n'
        if marker not in text:
            fail("Could not find NotificationBell automaticSources block.")
        text = text.replace(marker, marker + '        "friend_presence",\n', 1)
path.write_text(text, encoding="utf-8")

# 5) Tidings: fix BST regex, exact field order/separators, and real date placement.
path = FILES["tidings"]
text = path.read_text(encoding="utf-8")
text = text.replace(
    r"/^GMT([+-])(\\\\d{1,2})(?::(\\\\d{2}))?$/",
    r"/^GMT([+-])(\\d{1,2})(?::(\\d{2}))?$/",
)
old_range = '  return `${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`;'
new_range = '  return `${startTime.slice(0, 5)}-${endTime.slice(0, 5)}`;'
text = text.replace(old_range, new_range)

message_start = text.find("        message:\n          `Date: ${formatAurethDate(")
if message_start == -1:
    fail("Could not find Event Tiding message block.")
message_end = text.find("\n        priority:", message_start)
if message_end == -1:
    fail("Could not find end of Event Tiding message block.")
new_message = (
    "        message:\n"
    "          `Date: ${formatAurethDate(\n"
    "            occurrenceDate,\n"
    "          )} - Time: ${formatClockRange(\n"
    "            event.start_time,\n"
    "            event.end_time,\n"
    "          )} ${formatRealDateTimeRange(\n"
    "            occurrenceStart,\n"
    "            event.start_time,\n"
    "            event.end_time,\n"
    "          )} - Location: ${location} - ${description}`,",
)
text = text[:message_start] + new_message + text[message_end:]
path.write_text(text, encoding="utf-8")

print("Patch applied successfully.")
print("Changed:")
for key in ("login","logout","actions","heartbeat","bell","tidings"):
    print(f"  - {FILES[key].relative_to(ROOT)}")
print(f"Backup: {backup_root}")
print()
print("Presence behaviour is now explicit login/logout, not heartbeat inferred.")
print("Tidings now use the requested format and correct BST/GMT offset parsing.")
print("Nothing was committed or pushed.")