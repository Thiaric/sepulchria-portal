from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED_HEAD = "263acc312e8749642199a3d4e84271dcf3a9bb2d"

def run(*args):
    return subprocess.check_output(
        list(args),
        cwd=ROOT,
        text=True,
    )

def current_head():
    return run("git", "rev-parse", "HEAD").strip()

def pristine(rel):
    return run("git", "show", f"HEAD:{rel}")

def load(rel):
    p = ROOT / rel
    if not p.exists():
        raise SystemExit(f"Missing expected file: {rel}")
    return p, p.read_text(encoding="utf-8")

def save(p, text):
    p.write_text(text, encoding="utf-8")
    print(f"Patched {p.relative_to(ROOT)}")

head = current_head()
if head != EXPECTED_HEAD:
    raise SystemExit(
        f"Expected HEAD {EXPECTED_HEAD}, found {head}. "
        "This patch will not run against another commit."
    )

print(f"Verified HEAD: {head}")

# 1) Invitation notifications must navigate, not open in a generic modal.
rel = "components/notifications/notification-bell.tsx"
p, s = load(rel)

if 'searchParams.has(\n          "privateInvite",' not in s:
    old = '''  const normalisedHref =
    normaliseNotificationHref(href);

  const path =
'''
    new = '''  const normalisedHref =
    normaliseNotificationHref(href);

  try {
    const invitationUrl = new URL(
      normalisedHref,
      "https://sepulchria.local",
    );

    if (
      invitationUrl.pathname === "/game" &&
      (
        invitationUrl.searchParams.has(
          "privateInvite",
        ) ||
        invitationUrl.searchParams.has(
          "breezeInvite",
        )
      )
    ) {
      return null;
    }
  } catch {
    // Fall through to normal notification routing.
  }

  const path =
'''
    if old not in s:
        raise SystemExit(f"{rel}: could not find modal routing anchor.")
    s = s.replace(old, new, 1)
    save(p, s)
else:
    print(f"Already correct: {rel}")

# 2) Desktop sidebar:
# exact HEAD logic already supports staff OR owner OR accepted active member.
# Restore that exact function from HEAD if a previous patch touched it.
rel = "components/portal/portal-sidebar.tsx"
p, s = load(rel)
head_text = pristine(rel)

required = [
    'membershipResult',
    '.from("private_location_members")',
    '.eq("status", "active")',
    '.eq("role", "member")',
    'Boolean(membershipResult.data)',
]
for token in required:
    if token not in head_text:
        raise SystemExit(
            f"{rel}: repository HEAD missing expected accepted-membership logic: {token}"
        )

start_marker = "  const refreshPrivateLocationAccess =\n"
end_marker = "  const refreshFriendListFeature =\n"

hs = head_text.find(start_marker)
he = head_text.find(end_marker, hs)
cs = s.find(start_marker)
ce = s.find(end_marker, cs)

if min(hs, he, cs, ce) < 0:
    raise SystemExit(f"{rel}: could not locate Private Location access function boundaries.")

head_function = head_text[hs:he]
current_function = s[cs:ce]

if current_function != head_function:
    s = s[:cs] + head_function + s[ce:]
    print(f"Restored Private Location access function from HEAD in {rel}")

refresh_marker = "sepulchria-private-location-access-refresh"
if refresh_marker not in s:
    insert_at = s.find(end_marker)
    if insert_at < 0:
        raise SystemExit(f"{rel}: refresh insertion point not found.")

    effect = '''  useEffect(() => {
    const supabase =
      createClient();

    const channel = supabase
      .channel(
        "sepulchria-private-location-access-refresh",
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "private_location_members",
        },
        () => {
          void refreshPrivateLocationAccess();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "character_feature_entitlements",
        },
        () => {
          void refreshPrivateLocationAccess();
        },
      )
      .subscribe();

    const timer =
      window.setInterval(
        () => {
          void refreshPrivateLocationAccess();
        },
        5000,
      );

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(
        channel,
      );
    };
  }, [refreshPrivateLocationAccess]);

'''
    s = s[:insert_at] + effect + s[insert_at:]

save(p, s)

# 3) Mobile navigation:
# retain accepted membership, remove pending invitation as a visibility reason,
# and refresh automatically when membership changes.
rel = "components/portal/mobile-portal-navigation.tsx"
p, s = load(rel)
head_text = pristine(rel)

start_marker = "  const refreshAccess =\n"
end_marker = "  useEffect(() => {\n    void refreshAccess();"

hs = head_text.find(start_marker)
he = head_text.find(end_marker, hs)
cs = s.find(start_marker)
ce = s.find(end_marker, cs)

if min(hs, he, cs, ce) < 0:
    raise SystemExit(f"{rel}: could not locate refreshAccess function boundaries.")

head_function = head_text[hs:he]
s = s[:cs] + head_function + s[ce:]

old = '''        privateMembershipResult,
        privateInvitationResult,
        orderMembershipResult,
'''
new = '''        privateMembershipResult,
        orderMembershipResult,
'''
if old not in s:
    raise SystemExit(f"{rel}: pending invitation result declaration not found.")
s = s.replace(old, new, 1)

old = '''        supabase
          .from(
            "private_location_invitations",
          )
          .select("id")
          .eq(
            "recipient_character_id",
            character.id,
          )
          .eq("status", "pending")
          .limit(1)
          .maybeSingle(),

'''
if old not in s:
    raise SystemExit(f"{rel}: pending invitation access query not found.")
s = s.replace(old, "", 1)

old = '''        Boolean(
          privateMembershipResult.data,
        ) ||
        Boolean(
          privateInvitationResult.data,
        ),
'''
new = '''        Boolean(
          privateMembershipResult.data,
        ),
'''
if old not in s:
    raise SystemExit(f"{rel}: pending invitation visibility condition not found.")
s = s.replace(old, new, 1)

refresh_marker = "sepulchria-mobile-private-location-access-refresh"
if refresh_marker not in s:
    needle = '''  }, [refreshAccess]);

'''
    search_from = s.find("void refreshAccess();")
    pos = s.find(needle, search_from)
    if pos < 0:
        raise SystemExit(f"{rel}: existing refreshAccess effect end not found.")
    pos += len(needle)

    effect = '''  useEffect(() => {
    const supabase =
      createClient();

    const channel = supabase
      .channel(
        "sepulchria-mobile-private-location-access-refresh",
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "private_location_members",
        },
        () => {
          void refreshAccess();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "character_feature_entitlements",
        },
        () => {
          void refreshAccess();
        },
      )
      .subscribe();

    const timer =
      window.setInterval(
        () => {
          void refreshAccess();
        },
        5000,
      );

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(
        channel,
      );
    };
  }, [refreshAccess]);

'''
    s = s[:pos] + effect + s[pos:]

save(p, s)

print()
print("Correct rule enforced:")
print("  staff -> SHOW Private Locations")
print("  owns private_chat entitlement -> SHOW")
print("  accepted active private-location member -> SHOW")
print("  pending invitation only -> HIDE")
print()
print("Desktop/mobile access now refreshes automatically after membership changes.")
print("Next: npm run build")
