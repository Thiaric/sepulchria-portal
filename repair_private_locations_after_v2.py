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

def replace_function_calls(text, start_marker, end_marker, desired_calls, rel):
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f"{rel}: start marker not found.")
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f"{rel}: end marker not found.")

    block = text[start:end]

    pattern = re.compile(
        r'''setHasPrivateLocationAccess\(
.*?
\s*\);''',
        re.S,
    )
    matches = list(pattern.finditer(block))

    if len(matches) != len(desired_calls):
        raise SystemExit(
            f"{rel}: expected {len(desired_calls)} "
            f"setHasPrivateLocationAccess() calls in scoped function, found {len(matches)}."
        )

    pieces = []
    cursor = 0
    for match, replacement in zip(matches, desired_calls):
        pieces.append(block[cursor:match.start()])
        pieces.append(replacement)
        cursor = match.end()
    pieces.append(block[cursor:])

    return text[:start] + "".join(pieces) + text[end:]

head = git_head()
if head != EXPECTED_HEAD:
    raise SystemExit(
        f"This repair patch is for HEAD {EXPECTED_HEAD}; your local HEAD is {head}."
    )

print(f"Verified HEAD: {head}")

# ------------------------------------------------------------
# DESKTOP
# The previous patch accidentally replaced the FIRST access-state
# setter (the !user fallback) instead of the final computed setter.
# There must be exactly 3 setters in this function:
#   1) no user -> false
#   2) no character -> false
#   3) computed access -> staff/owner/accepted member
# ------------------------------------------------------------
rel = "components/portal/portal-sidebar.tsx"
p, text = load(rel)

desktop_calls = [
'''setHasPrivateLocationAccess(
          false,
        );''',
'''setHasPrivateLocationAccess(
          false,
        );''',
'''setHasPrivateLocationAccess(
        isStaff ||
          entitlementResult.data?.enabled === true ||
          Boolean(membershipResult.data),
      );''',
]

text = replace_function_calls(
    text,
    "  const refreshPrivateLocationAccess =",
    "  const refreshFriendListFeature =",
    desktop_calls,
    rel,
)

# Make sure membership data exists in the same scoped function.
start = text.find("  const refreshPrivateLocationAccess =")
end = text.find("  const refreshFriendListFeature =", start)
block = text[start:end]

required = [
    "membershipResult",
    'from("private_location_members")',
    '.eq("status", "active")',
]
for token in required:
    if token not in block:
        raise SystemExit(
            f"{rel}: repaired function is missing required membership token: {token}"
        )

save(p, text)

# ------------------------------------------------------------
# MOBILE
# Same accidental first-call replacement happened here.
# refreshAccess must also have exactly 3 Private Location setters:
#   1) no user -> false
#   2) no character -> false
#   3) computed access -> staff/owner/accepted member
# ------------------------------------------------------------
rel = "components/portal/mobile-portal-navigation.tsx"
p, text = load(rel)

mobile_calls = [
'''setHasPrivateLocationAccess(false);''',
'''setHasPrivateLocationAccess(false);''',
'''setHasPrivateLocationAccess(
        isStaff ||
          privateEntitlementResult.data
            ?.enabled === true ||
          Boolean(
            privateMembershipResult.data,
          ),
      );''',
]

text = replace_function_calls(
    text,
    "  const refreshAccess =",
    "  useEffect(() => {\n    void refreshAccess();",
    mobile_calls,
    rel,
)

start = text.find("  const refreshAccess =")
end = text.find("  useEffect(() => {\n    void refreshAccess();", start)
block = text[start:end]

required = [
    "privateMembershipResult",
    '"private_location_members"',
    '.eq("status", "active")',
]
for token in required:
    if token not in block:
        raise SystemExit(
            f"{rel}: repaired function is missing required membership token: {token}"
        )

if "privateInvitationResult" in block:
    raise SystemExit(
        f"{rel}: pending invitation is still being used in access logic."
    )

save(p, text)

print()
print("Repair complete.")
print("The previous patch's wrong early setter replacements have been corrected.")
print("Run: npm run build")
