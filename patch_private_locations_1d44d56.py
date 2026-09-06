from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED_HEAD = "1d44d56f7f3dd3cc229e9babe923870e8c88fb18"

def git(*args):
    return subprocess.check_output(
        ["git", *args],
        cwd=ROOT,
        encoding="utf-8",
        errors="strict",
    ).strip()

def load(rel):
    p = ROOT / rel
    if not p.exists():
        raise SystemExit(f"Missing expected file: {rel}")
    return p, p.read_text(encoding="utf-8")

def save(p, text):
    p.write_text(text, encoding="utf-8")
    print(f"Patched {p.relative_to(ROOT)}")

head = git("rev-parse", "HEAD")
if head != EXPECTED_HEAD:
    raise SystemExit(
        f"This patch is for {EXPECTED_HEAD}, but your local HEAD is {head}."
    )

print(f"Verified HEAD: {head}")

rel = "components/portal/portal-sidebar.tsx"
p, s = load(rel)

old = '''      const [
  entitlementResult,
] = await Promise.all([
        supabase
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
          .maybeSingle(),


      ]);

      setHasPrivateLocationAccess(
        isStaff ||
          entitlementResult.data?.enabled === true,
      );
'''

new = '''      const [
  entitlementResult,
  membershipResult,
] = await Promise.all([
        supabase
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
          .maybeSingle(),

        supabase
          .from("private_location_members")
          .select("room_id")
          .eq(
            "character_id",
            character.id,
          )
          .eq("status", "active")
          .limit(1)
          .maybeSingle(),


      ]);

      setHasPrivateLocationAccess(
        isStaff ||
          entitlementResult.data?.enabled === true ||
          Boolean(membershipResult.data),
      );
'''

if old not in s:
    raise SystemExit(
        f"{rel}: exact 1d44d56 access block not found. No changes made to this file."
    )

s = s.replace(old, new, 1)
save(p, s)

rel = "components/portal/mobile-portal-navigation.tsx"
p, s = load(rel)

old = '''      const [
        friendResult,
        privateEntitlementResult,
        orderMembershipResult,
      ] = await Promise.all([
'''

new = '''      const [
        friendResult,
        privateEntitlementResult,
        privateMembershipResult,
        orderMembershipResult,
      ] = await Promise.all([
'''

if old not in s:
    raise SystemExit(
        f"{rel}: exact 1d44d56 Promise.all result list not found."
    )
s = s.replace(old, new, 1)

anchor = '''        supabase
          .from("order_memberships")
'''

membership_query = '''        supabase
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
          .maybeSingle(),

'''

if anchor not in s:
    raise SystemExit(
        f"{rel}: exact 1d44d56 order membership query anchor not found."
    )
s = s.replace(anchor, membership_query + anchor, 1)

old = '''      setHasPrivateLocationAccess(
        isStaff ||
          privateEntitlementResult.data
            ?.enabled === true,
      );
'''

new = '''      setHasPrivateLocationAccess(
        isStaff ||
          privateEntitlementResult.data
            ?.enabled === true ||
          Boolean(
            privateMembershipResult.data,
          ),
      );
'''

if old not in s:
    raise SystemExit(
        f"{rel}: exact 1d44d56 Private Location visibility condition not found."
    )
s = s.replace(old, new, 1)

save(p, s)

print()
print("Private Locations visibility fixed:")
print("- staff: visible")
print("- owner entitlement: visible")
print("- accepted active membership: visible")
print("- pending invitation only: hidden")
print()
print("The existing invitation notification routing fix in 1d44d56 is untouched.")
print("Next: npm run build")
