from pathlib import Path
import re
import subprocess

ROOT = Path.cwd()
EXPECTED_HEAD = "1d44d56f7f3dd3cc229e9babe923870e8c88fb18"

def git_text(*args):
    return subprocess.check_output(
        ["git", *args],
        cwd=ROOT,
        encoding="utf-8",
        errors="strict",
    )

def current_head():
    return git_text("rev-parse", "HEAD").strip()

def pristine_file(rel):
    return git_text("show", f"HEAD:{rel}")

def load_file(rel):
    p = ROOT / rel
    if not p.exists():
        raise SystemExit(f"Missing expected file: {rel}")
    return p, p.read_text(encoding="utf-8")

def save_file(p, text):
    p.write_text(text, encoding="utf-8")
    print(f"Rebuilt {p.relative_to(ROOT)} function successfully")

def get_block(text, start_marker, end_marker, rel):
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f"{rel}: start marker not found")
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f"{rel}: end marker not found")
    return start, end, text[start:end]

def replace_last_access_call(block, replacement, rel):
    pattern = re.compile(
        r'setHasPrivateLocationAccess\(\s*.*?\s*\);',
        re.S,
    )
    matches = list(pattern.finditer(block))
    if not matches:
        raise SystemExit(f"{rel}: no setHasPrivateLocationAccess() calls found")
    m = matches[-1]
    return block[:m.start()] + replacement + block[m.end():]

head = current_head()
if head != EXPECTED_HEAD:
    raise SystemExit(
        f"This repair is for {EXPECTED_HEAD}; your local HEAD is {head}."
    )

print(f"Verified HEAD: {head}")

# ============================================================
# DESKTOP
# Rebuild refreshPrivateLocationAccess from pristine HEAD,
# then apply ONLY the intended accepted-membership change.
# ============================================================
rel = "components/portal/portal-sidebar.tsx"
pristine = pristine_file(rel)
p, current = load_file(rel)

start_marker = "  const refreshPrivateLocationAccess ="
end_marker = "  const refreshFriendListFeature ="

_, _, block = get_block(pristine, start_marker, end_marker, rel)

# Add membershipResult to Promise.all result list.
block, n = re.subn(
    r'(\bentitlementResult\s*,)',
    r'\1\n  membershipResult,',
    block,
    count=1,
)
if n != 1:
    raise SystemExit(f"{rel}: could not add membershipResult to pristine function")

# Insert active membership query after the private_chat entitlement query.
entitlement_pattern = re.compile(
    r'''(
        supabase
          \.from\("character_feature_entitlements"\)
          \.select\("enabled"\)
          \.eq\(
            "character_id",
            character\.id,
          \)
          \.eq\(
            "feature_key",
            "private_chat",
          \)
          \.maybeSingle\(\),
)''',
    re.X,
)
m = entitlement_pattern.search(block)
if not m:
    raise SystemExit(f"{rel}: pristine private_chat entitlement query not found")

membership_query = '''
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
'''

block = block[:m.end()] + membership_query + block[m.end():]

desktop_access = '''setHasPrivateLocationAccess(
        isStaff ||
          entitlementResult.data?.enabled === true ||
          Boolean(membershipResult.data),
      );'''

block = replace_last_access_call(block, desktop_access, rel)

# Sanity checks before replacing local function.
checks = [
    "membershipResult",
    '.from("private_location_members")',
    '.eq("status", "active")',
    "Boolean(membershipResult.data)",
]
for token in checks:
    if token not in block:
        raise SystemExit(f"{rel}: rebuilt function missing {token}")

cs, ce, _ = get_block(current, start_marker, end_marker, rel)
current = current[:cs] + block + current[ce:]
save_file(p, current)

# ============================================================
# MOBILE
# Rebuild refreshAccess from pristine HEAD,
# then apply ONLY accepted-membership visibility.
# Pending invitation remains excluded because 1d44d56 already removed it.
# ============================================================
rel = "components/portal/mobile-portal-navigation.tsx"
pristine = pristine_file(rel)
p, current = load_file(rel)

start_marker = "  const refreshAccess ="
end_marker = "  useEffect(() => {\n    void refreshAccess();"

_, _, block = get_block(pristine, start_marker, end_marker, rel)

# Add privateMembershipResult after privateEntitlementResult.
block, n = re.subn(
    r'(\bprivateEntitlementResult\s*,)',
    r'\1\n        privateMembershipResult,',
    block,
    count=1,
)
if n != 1:
    raise SystemExit(f"{rel}: could not add privateMembershipResult to pristine function")

# Insert active membership query immediately before order_memberships query.
order_anchor = '''
        supabase
          .from("order_memberships")
'''
pos = block.find(order_anchor)
if pos < 0:
    raise SystemExit(f"{rel}: pristine order_memberships anchor not found")

membership_query = '''
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
          .maybeSingle(),

'''

block = block[:pos] + membership_query + block[pos:]

mobile_access = '''setHasPrivateLocationAccess(
        isStaff ||
          privateEntitlementResult.data
            ?.enabled === true ||
          Boolean(
            privateMembershipResult.data,
          ),
      );'''

block = replace_last_access_call(block, mobile_access, rel)

checks = [
    "privateMembershipResult",
    '"private_location_members"',
    '.eq("status", "active")',
]
for token in checks:
    if token not in block:
        raise SystemExit(f"{rel}: rebuilt function missing {token}")

if "privateInvitationResult" in block:
    raise SystemExit(
        f"{rel}: pristine rebuilt function unexpectedly contains pending invitation visibility logic"
    )

cs, ce, _ = get_block(current, start_marker, end_marker, rel)
current = current[:cs] + block + current[ce:]
save_file(p, current)

print()
print("Repair completed by rebuilding both access functions from pristine HEAD.")
print("Final rule:")
print("- staff -> visible")
print("- owns Private Location entitlement -> visible")
print("- accepted active member -> visible")
print("- pending invitation only -> hidden")
print()
print("Now run: npm run build")
