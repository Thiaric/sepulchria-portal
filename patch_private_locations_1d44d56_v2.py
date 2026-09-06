from pathlib import Path
import re
import subprocess

ROOT = Path.cwd()
EXPECTED_HEAD = "1d44d56f7f3dd3cc229e9babe923870e8c88fb18"

def git_head():
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
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

def replace_slice(text, start_marker, end_marker, transform, rel):
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f"{rel}: start marker not found: {start_marker!r}")
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f"{rel}: end marker not found: {end_marker!r}")
    original = text[start:end]
    updated = transform(original)
    if updated == original:
        print(f"No change needed in scoped block: {rel}")
    return text[:start] + updated + text[end:]

head = git_head()
if head != EXPECTED_HEAD:
    raise SystemExit(
        f"This patch is for commit {EXPECTED_HEAD}; your local HEAD is {head}."
    )

print(f"Verified HEAD: {head}")

# ------------------------------------------------------------------
# DESKTOP
# staff OR owner entitlement OR accepted active membership
# ------------------------------------------------------------------
rel = "components/portal/portal-sidebar.tsx"
p, text = load(rel)

def patch_desktop(block):
    if "membershipResult" not in block:
        block, n = re.subn(
            r'(\bentitlementResult\s*,)',
            r'\1\n  membershipResult,',
            block,
            count=1,
        )
        if n != 1:
            raise SystemExit(
                f"{rel}: could not add membershipResult inside refreshPrivateLocationAccess."
            )

    if '.from("private_location_members")' not in block:
        entitlement_query = re.search(
            r'''(?P<q>
\s*supabase
\s*\.from\("character_feature_entitlements"\)
\s*\.select\("enabled"\)
\s*\.eq\(
\s*"character_id",
\s*character\.id,
\s*\)
\s*\.eq\(
\s*"feature_key",
\s*"private_chat",
\s*\)
\s*\.maybeSingle\(\),
)''',
            block,
            flags=re.X,
        )
        if not entitlement_query:
            raise SystemExit(
                f"{rel}: could not locate the private_chat entitlement query."
            )

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
        insert_at = entitlement_query.end()
        block = block[:insert_at] + membership_query + block[insert_at:]

    call = re.search(
        r'''setHasPrivateLocationAccess\(
.*?
\s*\);''',
        block,
        flags=re.S,
    )
    if not call:
        raise SystemExit(
            f"{rel}: could not locate setHasPrivateLocationAccess() in scoped function."
        )

    replacement = '''setHasPrivateLocationAccess(
        isStaff ||
          entitlementResult.data?.enabled === true ||
          Boolean(membershipResult.data),
      );'''

    block = block[:call.start()] + replacement + block[call.end():]
    return block

text = replace_slice(
    text,
    "  const refreshPrivateLocationAccess =",
    "  const refreshFriendListFeature =",
    patch_desktop,
    rel,
)
save(p, text)

# ------------------------------------------------------------------
# MOBILE
# staff OR owner entitlement OR accepted active membership
# pending invitation alone is NOT sufficient
# ------------------------------------------------------------------
rel = "components/portal/mobile-portal-navigation.tsx"
p, text = load(rel)

def patch_mobile(block):
    # Remove any pending-invitation access result if it somehow exists.
    block = re.sub(
        r'\s*privateInvitationResult\s*,',
        '',
        block,
        count=1,
    )

    if "privateMembershipResult" not in block:
        block, n = re.subn(
            r'(\bprivateEntitlementResult\s*,)',
            r'\1\n        privateMembershipResult,',
            block,
            count=1,
        )
        if n != 1:
            raise SystemExit(
                f"{rel}: could not add privateMembershipResult in refreshAccess."
            )

    # Remove pending invitation query if present.
    block = re.sub(
        r'''
\s*supabase
\s*\.from\(
\s*"private_location_invitations",
\s*\)
\s*\.select\("id"\)
\s*\.eq\(
\s*"recipient_character_id",
\s*character\.id,
\s*\)
\s*\.eq\("status",\s*"pending"\)
\s*\.limit\(1\)
\s*\.maybeSingle\(\),
''',
        '',
        block,
        count=1,
        flags=re.X,
    )

    if '"private_location_members"' not in block:
        anchor = re.search(
            r'''
\s*supabase
\s*\.from\("order_memberships"\)
''',
            block,
            flags=re.X,
        )
        if not anchor:
            raise SystemExit(
                f"{rel}: could not locate order_memberships query anchor."
            )

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
        block = block[:anchor.start()] + membership_query + block[anchor.start():]

    call = re.search(
        r'''setHasPrivateLocationAccess\(
.*?
\s*\);''',
        block,
        flags=re.S,
    )
    if not call:
        raise SystemExit(
            f"{rel}: could not locate setHasPrivateLocationAccess() in refreshAccess."
        )

    replacement = '''setHasPrivateLocationAccess(
        isStaff ||
          privateEntitlementResult.data
            ?.enabled === true ||
          Boolean(
            privateMembershipResult.data,
          ),
      );'''

    block = block[:call.start()] + replacement + block[call.end():]
    return block

text = replace_slice(
    text,
    "  const refreshAccess =",
    "  useEffect(() => {\n    void refreshAccess();",
    patch_mobile,
    rel,
)
save(p, text)

print()
print("Done.")
print("Rule now:")
print("- staff -> Private Locations visible")
print("- owner entitlement -> visible")
print("- accepted active membership -> visible")
print("- pending invitation only -> hidden")
print()
print("Run: npm run build")
