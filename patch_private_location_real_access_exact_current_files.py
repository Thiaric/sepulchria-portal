from pathlib import Path
import shutil

ROOT = Path.cwd()

mobile = ROOT / "components" / "portal" / "mobile-portal-navigation.tsx"
desktop = ROOT / "components" / "portal" / "portal-sidebar.tsx"

for path in (mobile, desktop):
    if not path.exists():
        raise SystemExit(f"STOP: missing {path.relative_to(ROOT)}. No files changed.")

texts = {
    mobile: mobile.read_text(encoding="utf-8"),
    desktop: desktop.read_text(encoding="utf-8"),
}

# -------- MOBILE --------
m = texts[mobile]

old = '''        privateEntitlementResult,
        privateMembershipResult,
        orderMembershipResult,'''
new = '''        privateOwnedRoomResult,
        privateMembershipResult,
        orderMembershipResult,'''
if m.count(old) != 1:
    raise SystemExit("STOP: mobile result tuple mismatch. No files changed.")
m = m.replace(old, new, 1)

old = '''        supabase
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
          .maybeSingle(),'''
new = '''        supabase
          .from(
            "private_location_rooms",
          )
          .select("room_id")
          .eq(
            "owner_character_id",
            character.id,
          )
          .limit(1)
          .maybeSingle(),'''
if m.count(old) != 1:
    raise SystemExit("STOP: mobile private_chat query mismatch. No files changed.")
m = m.replace(old, new, 1)

old = '''      setHasPrivateLocationAccess(
        isStaff ||
          privateEntitlementResult.data
            ?.enabled === true ||
          Boolean(
            privateMembershipResult.data,
          ),
      );'''
new = '''      setHasPrivateLocationAccess(
        isStaff ||
          Boolean(
            privateOwnedRoomResult.data,
          ) ||
          Boolean(
            privateMembershipResult.data,
          ),
      );'''
if m.count(old) != 1:
    raise SystemExit("STOP: mobile access decision mismatch. No files changed.")
m = m.replace(old, new, 1)

old = '''          table: "character_feature_entitlements",'''
new = '''          table: "private_location_rooms",'''
# In mobile file there may be other entitlement subscriptions elsewhere, so target only inside this channel block.
channel_start = m.find('"mobile-private-location-access"')
if channel_start == -1:
    raise SystemExit("STOP: mobile private-location channel not found. No files changed.")
channel_end = m.find(".subscribe();", channel_start)
block = m[channel_start:channel_end]
if block.count(old) != 1:
    raise SystemExit("STOP: mobile channel entitlement watcher mismatch. No files changed.")
block = block.replace(old, new, 1)
m = m[:channel_start] + block + m[channel_end:]

texts[mobile] = m

# -------- DESKTOP --------
d = texts[desktop]

old = '''        entitlementResult,
        membershipResult,'''
new = '''        ownedRoomResult,
        membershipResult,'''
if d.count(old) != 1:
    raise SystemExit("STOP: desktop result tuple mismatch. No files changed.")
d = d.replace(old, new, 1)

old = '''        supabase
          .from("character_feature_entitlements")
          .select("enabled")
          .eq(
            "character_id",
            character.id,
          )
          .eq(
            "feature_key",
            "private_chat",
          )
          .maybeSingle(),'''
new = '''        supabase
          .from("private_location_rooms")
          .select("room_id")
          .eq(
            "owner_character_id",
            character.id,
          )
          .limit(1)
          .maybeSingle(),'''
if d.count(old) != 1:
    raise SystemExit("STOP: desktop private_chat query mismatch. No files changed.")
d = d.replace(old, new, 1)

old = '''      setHasPrivateLocationAccess(
        isStaff ||
          entitlementResult.data?.enabled === true ||
          Boolean(membershipResult.data),
      );'''
new = '''      setHasPrivateLocationAccess(
        isStaff ||
          Boolean(ownedRoomResult.data) ||
          Boolean(membershipResult.data),
      );'''
if d.count(old) != 1:
    raise SystemExit("STOP: desktop access decision mismatch. No files changed.")
d = d.replace(old, new, 1)

channel_start = d.find('"portal-private-location-access"')
if channel_start == -1:
    raise SystemExit("STOP: desktop private-location channel not found. No files changed.")
channel_end = d.find(".subscribe();", channel_start)
block = d[channel_start:channel_end]
old = '''          table: "character_feature_entitlements",'''
new = '''          table: "private_location_rooms",'''
if block.count(old) != 1:
    raise SystemExit("STOP: desktop channel entitlement watcher mismatch. No files changed.")
block = block.replace(old, new, 1)
d = d[:channel_start] + block + d[channel_end:]

texts[desktop] = d

# Write only after all exact checks passed.
for path, text in texts.items():
    backup = path.with_suffix(path.suffix + ".before_private_location_real_access.bak")
    if not backup.exists():
        shutil.copy2(path, backup)
    path.write_text(text, encoding="utf-8")

print("DONE")
print()
print("Private Location menu visibility now uses:")
print("  - staff")
print("  - OR actual ownership in private_location_rooms")
print("  - OR active membership in private_location_members")
print()
print("It no longer uses private_chat entitlement for menu visibility.")
print("Realtime refresh now watches private_location_rooms + private_location_members.")
print()
print("No DB writes. No GitHub push.")
print("Now run: npm run build")
