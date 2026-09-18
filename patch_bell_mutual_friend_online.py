from pathlib import Path
from datetime import datetime
import shutil
import sys

ROOT = Path.cwd()
TARGET = ROOT / "components/notifications/notification-bell.tsx"

def fail(message: str) -> None:
    print(f"\nERROR: {message}\n")
    sys.exit(1)

if not TARGET.exists():
    fail("Could not find components/notifications/notification-bell.tsx. Run this script from the Sepulchria repo root.")

stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
backup = ROOT / f".patch-backup-mutual-friend-online-{stamp}" / TARGET.relative_to(ROOT)
backup.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(TARGET, backup)

text = TARGET.read_text(encoding="utf-8")

old = (
    '      new Set([\n'
    '        "item_trade",\n'
    '        "private_location_invite",\n'
    '        "breeze_lodging_invite",\n'
    '        "forum_reply",\n'
    '        "order_headquarters_invite",\n'
    '      ]);\n'
)

new = (
    '      new Set([\n'
    '        "item_trade",\n'
    '        "private_location_invite",\n'
    '        "breeze_lodging_invite",\n'
    '        "forum_reply",\n'
    '        "order_headquarters_invite",\n'
    '        "friend_online",\n'
    '      ]);\n'
)

if old in text:
    text = text.replace(old, new, 1)
    TARGET.write_text(text, encoding="utf-8")
elif '"friend_online"' in text:
    print("friend_online is already present in the bell realtime sources.")
else:
    fail("Could not find the automaticSources block in notification-bell.tsx.")

print("Patch applied successfully.")
print("Changed: components/notifications/notification-bell.tsx")
print(f"Backup: {backup.parent}")
print("The header bell now refreshes immediately for friend_online notifications.")
print("Nothing was committed or pushed.")