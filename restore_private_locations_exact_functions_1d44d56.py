from pathlib import Path
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

def replace_between(path, start_marker, end_marker, replacement):
    p = ROOT / path
    text = p.read_text(encoding="utf-8")

    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f"{path}: start marker not found")

    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f"{path}: end marker not found")

    new_text = text[:start] + replacement + text[end:]
    p.write_text(new_text, encoding="utf-8")
    print(f"Replaced access function in {path}")

head = git_head()
if head != EXPECTED_HEAD:
    raise SystemExit(
        f"This patch is for {EXPECTED_HEAD}; your local HEAD is {head}."
    )

print(f"Verified HEAD: {head}")

desktop_function = '''  const refreshPrivateLocationAccess =
    useCallback(async () => {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setHasPrivateLocationAccess(
          false,
        );
        return;
      }

      const {
        data: character,
      } = await supabase
        .from("characters")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!character) {
        setHasPrivateLocationAccess(
          false,
        );
        return;
      }

      const [
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
    }, [isStaff]);

'''

replace_between(
    "components/portal/portal-sidebar.tsx",
    "  const refreshPrivateLocationAccess =",
    "  const refreshFriendListFeature =",
    desktop_function,
)

mobile_function = '''  const refreshAccess =
    useCallback(async () => {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setHasFriendListFeature(false);
        setHasPrivateLocationAccess(false);
        setHasOrderLeadership(false);
        return;
      }

      const { data: character } =
        await supabase
          .from("characters")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

      if (!character) {
        setHasFriendListFeature(false);
        setHasPrivateLocationAccess(false);
        setHasOrderLeadership(false);
        return;
      }

      const [
        friendResult,
        privateEntitlementResult,
        privateMembershipResult,
        orderMembershipResult,
      ] = await Promise.all([
        supabase
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
            "friend_list",
          )
          .maybeSingle(),

        supabase
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
          .maybeSingle(),

        supabase
          .from("order_memberships")
          .select(`
            id,
            level:order_levels!order_memberships_order_level_id_fkey(
              level
            )
          `)
          .eq(
            "character_id",
            character.id,
          ),
      ]);

      setHasFriendListFeature(
        friendResult.data?.enabled === true,
      );

      setHasPrivateLocationAccess(
        isStaff ||
          privateEntitlementResult.data
            ?.enabled === true ||
          Boolean(
            privateMembershipResult.data,
          ),
      );

      setHasOrderLeadership(
        (
          orderMembershipResult.data ??
          []
        ).some((membership) => {
          const relation =
            Array.isArray(
              membership.level,
            )
              ? membership.level[0]
              : membership.level;

          return relation?.level === 6;
        }),
      );
    }, [isStaff]);

'''

replace_between(
    "components/portal/mobile-portal-navigation.tsx",
    "  const refreshAccess =",
    "  useEffect(() => {\n    void refreshAccess();",
    mobile_function,
)

print()
print("Private Locations restored:")
print("- staff -> visible")
print("- owner entitlement -> visible")
print("- accepted active membership -> visible")
print("- pending invitation only -> hidden")
print("- invitation notification routing already present in commit 1d44d56 remains untouched")
print()
print("Now run: npm run build")
