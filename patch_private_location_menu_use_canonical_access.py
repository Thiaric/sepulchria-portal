from pathlib import Path
import re
import shutil

ROOT = Path.cwd()

mobile = ROOT / "components" / "portal" / "mobile-portal-navigation.tsx"
desktop = ROOT / "components" / "portal" / "portal-sidebar.tsx"
server = ROOT / "app" / "(portal)" / "private-locations" / "access-actions.ts"

for path in (mobile, desktop):
    if not path.exists():
        raise SystemExit(f"STOP: missing {path.relative_to(ROOT)}. No files changed.")

mobile_text = mobile.read_text(encoding="utf-8")
desktop_text = desktop.read_text(encoding="utf-8")

IMPORT = 'import { hasCurrentCharacterPrivateLocationAccess } from "@/app/(portal)/private-locations/access-actions";\n'

if IMPORT not in mobile_text:
    anchor = 'import { createClient } from "@/lib/supabase/client";\n'
    if mobile_text.count(anchor) != 1:
        raise SystemExit("STOP: mobile import anchor mismatch. No files changed.")
    mobile_text = mobile_text.replace(anchor, anchor + IMPORT, 1)

mobile_tuple_options = [
    (
        '        privateEntitlementResult,\n        privateMembershipResult,\n        orderMembershipResult,',
        '        privateLocationAccess,\n        orderMembershipResult,',
    ),
    (
        '        privateOwnedRoomResult,\n        privateMembershipResult,\n        orderMembershipResult,',
        '        privateLocationAccess,\n        orderMembershipResult,',
    ),
]

for old, new in mobile_tuple_options:
    if old in mobile_text:
        mobile_text = mobile_text.replace(old, new, 1)
        break
else:
    raise SystemExit("STOP: mobile private result tuple not found. No files changed.")

mobile_query_options = [
'''        supabase
          .from(
            "character_feature_entitlements",
          )
          .select("enabled")
          .eq(
            "character_id",
            character.id,
          )
          .eq(
            "feature_key",
            "private_chat",
          )
          .maybeSingle(),

        supabase
          .from(
            "private_location_members",
          )
          .select("room_id")
          .eq(
            "character_id",
            character.id,
          )
          .eq("status", "active")
          .limit(1)
          .maybeSingle(),''',

'''        supabase
          .from(
            "private_location_rooms",
          )
          .select("room_id")
          .eq(
            "owner_character_id",
            character.id,
          )
          .limit(1)
          .maybeSingle(),

        supabase
          .from(
            "private_location_members",
          )
          .select("room_id")
          .eq(
            "character_id",
            character.id,
          )
          .eq("status", "active")
          .limit(1)
          .maybeSingle(),'''
]

for old in mobile_query_options:
    if old in mobile_text:
        mobile_text = mobile_text.replace(
            old,
            '        hasCurrentCharacterPrivateLocationAccess(),',
            1,
        )
        break
else:
    raise SystemExit("STOP: mobile private access queries not found. No files changed.")

mobile_access_patterns = [
    r'''setHasPrivateLocationAccess\(
\s*isStaff\s*\|\|
\s*privateEntitlementResult\.data
\s*\?\.enabled\s*===\s*true\s*\|\|
\s*Boolean\(
\s*privateMembershipResult\.data,
\s*\),
\s*\);''',
    r'''setHasPrivateLocationAccess\(
\s*isStaff\s*\|\|
\s*Boolean\(
\s*privateOwnedRoomResult\.data,
\s*\)\s*\|\|
\s*Boolean\(
\s*privateMembershipResult\.data,
\s*\),
\s*\);''',
    r'''setHasPrivateLocationAccess\(
\s*Boolean\(
\s*privateOwnedRoomResult\.data,
\s*\)\s*\|\|
\s*Boolean\(
\s*privateMembershipResult\.data,
\s*\),
\s*\);''',
]

for pattern in mobile_access_patterns:
    mobile_text, n = re.subn(
        pattern,
        'setHasPrivateLocationAccess(\n        privateLocationAccess,\n      );',
        mobile_text,
        count=1,
        flags=re.MULTILINE,
    )
    if n == 1:
        break
else:
    raise SystemExit("STOP: mobile access decision not found. No files changed.")

if IMPORT not in desktop_text:
    anchor = 'import { createClient } from "@/lib/supabase/client";\n'
    if desktop_text.count(anchor) != 1:
        raise SystemExit("STOP: desktop import anchor mismatch. No files changed.")
    desktop_text = desktop_text.replace(anchor, anchor + IMPORT, 1)

func_start = desktop_text.find("const refreshPrivateLocationAccess")
if func_start == -1:
    raise SystemExit("STOP: desktop refreshPrivateLocationAccess not found. No files changed.")

func_end = desktop_text.find("const refreshFriendListFeature", func_start)
if func_end == -1:
    raise SystemExit("STOP: desktop refresh function boundary not found. No files changed.")

block = desktop_text[func_start:func_end]
query_start = block.find("      const [")
if query_start == -1:
    raise SystemExit("STOP: desktop private Promise block not found. No files changed.")

closure = block.find("    }, [isStaff]);", query_start)
if closure == -1:
    closure = block.find("    }, []);", query_start)
if closure == -1:
    raise SystemExit("STOP: desktop callback closure not found. No files changed.")

replacement_tail = '''      const hasAccess =
        await hasCurrentCharacterPrivateLocationAccess();

      setHasPrivateLocationAccess(
        hasAccess,
      );
'''

block = block[:query_start] + replacement_tail + block[closure:]
desktop_text = desktop_text[:func_start] + block + desktop_text[func_end:]

server_text = '''"use server";

import { createClient } from "@/lib/supabase/server";
import { getVisiblePrivateLocations } from "@/lib/private-locations/access";

export async function hasCurrentCharacterPrivateLocationAccess(): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const {
    data: character,
    error,
  } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !character) {
    return false;
  }

  const visibleLocations =
    await getVisiblePrivateLocations(
      character.id,
    );

  return visibleLocations.length > 0;
}
'''

for path, text in (
    (mobile, mobile_text),
    (desktop, desktop_text),
):
    backup = path.with_suffix(
        path.suffix + ".before_canonical_private_location_access.bak"
    )
    if not backup.exists():
        shutil.copy2(path, backup)
    path.write_text(text, encoding="utf-8")

server.parent.mkdir(parents=True, exist_ok=True)
if server.exists():
    backup = server.with_suffix(".ts.before_canonical_private_location_access.bak")
    if not backup.exists():
        shutil.copy2(server, backup)
server.write_text(server_text, encoding="utf-8")

print("DONE")
print()
print("Private Location menu visibility now uses the exact same")
print("getVisiblePrivateLocations() logic as /private-locations.")
print()
print("If the page has zero accessible Private Locations,")
print("desktop Premium and mobile More will hide the item too.")
print()
print("No DB writes. No GitHub push.")
print("Now run: npm run build")
