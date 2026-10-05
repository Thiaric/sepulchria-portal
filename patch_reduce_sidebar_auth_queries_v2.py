from pathlib import Path
import sys

ROOT = Path.cwd()

def load(rel):
    p = ROOT / rel
    if not p.exists():
        raise FileNotFoundError(f"Missing {rel}. Run from the sepulchria-portal repository root.")
    return p, p.read_text(encoding="utf-8")

def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}.")
    return text.replace(old, new, 1)

def replace_block(text, start_marker, end_marker, new_block, label):
    start = text.find(start_marker)
    if start < 0:
        raise RuntimeError(f"{label}: start marker not found.")
    end = text.find(end_marker, start)
    if end < 0:
        raise RuntimeError(f"{label}: end marker not found.")
    return text[:start] + new_block + text[end:]

def main():
    p, text = load("components/portal/portal-sidebar.tsx")

    text = one(
        text,
        '''type PortalSidebarProps = {
  unreadMessageCount: number;
  unreadForumCount: number;
  isStaff: boolean;
};''',
        '''type PortalSidebarProps = {
  unreadMessageCount: number;
  unreadForumCount: number;
  isStaff: boolean;
  characterId: string | null;
};''',
        "desktop props",
    )

    text = one(
        text,
        '''export function PortalSidebar({
  unreadMessageCount,
  unreadForumCount,
  isStaff,
}: PortalSidebarProps) {''',
        '''export function PortalSidebar({
  unreadMessageCount,
  unreadForumCount,
  isStaff,
  characterId,
}: PortalSidebarProps) {''',
        "desktop destructure",
    )

    text = replace_block(
        text,
        "  const refreshCosmeticsAccess =",
        "  const refreshPrivateLocationAccess =",
        '''  const refreshCosmeticsAccess =
    useCallback(async () => {
      if (!characterId) {
        setHasCosmetics(false);
        return;
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from("character_cosmetic_entitlements")
        .select("cosmetic_item_id")
        .eq("character_id", characterId)
        .eq("enabled", true)
        .limit(1);

      if (error) {
        console.error("Unable to check Cosmetic access:", error);
        setHasCosmetics(false);
        return;
      }

      setHasCosmetics((data ?? []).length > 0);
    }, [characterId]);

''',
        "desktop cosmetics block",
    )

    text = replace_block(
        text,
        "  const refreshPrivateLocationAccess =",
        "  const refreshFriendListFeature =",
        '''  const refreshPrivateLocationAccess =
    useCallback(async () => {
      if (!characterId) {
        setHasPrivateLocationAccess(false);
        return;
      }

      const hasAccess =
        await hasCurrentCharacterPrivateLocationAccess();

      setHasPrivateLocationAccess(
        hasAccess,
      );
    }, [characterId, isStaff]);

''',
        "desktop private-location block",
    )

    text = replace_block(
        text,
        "  const refreshFriendListFeature =",
        "  const refreshOrderLeadership =",
        '''  const refreshFriendListFeature =
    useCallback(async () => {
      if (!characterId) {
        setHasFriendListFeature(false);
        return;
      }

      const supabase = createClient();

      const {
        data: entitlement,
        error: entitlementError,
      } = await supabase
        .from("character_feature_entitlements")
        .select("enabled")
        .eq("character_id", characterId)
        .eq("feature_key", "friend_list")
        .maybeSingle();

      if (entitlementError) {
        console.error(
          "Unable to check Friend List access:",
          entitlementError,
        );
        setHasFriendListFeature(false);
        return;
      }

      setHasFriendListFeature(
        entitlement?.enabled === true,
      );
    }, [characterId]);

''',
        "desktop friend block",
    )

    text = replace_block(
        text,
        "  const refreshOrderLeadership =",
        "  useEffect(() => {\n    void refreshCosmeticsAccess();",
        '''  const refreshOrderLeadership =
    useCallback(async () => {
      if (!characterId) {
        setHasOrderLeadership(false);
        return;
      }

      const supabase = createClient();

      const {
        data: memberships,
        error: membershipError,
      } = await supabase
        .from("order_memberships")
        .select(`
          id,
          level:order_levels!order_memberships_order_level_id_fkey(
            level
          )
        `)
        .eq("character_id", characterId);

      if (membershipError) {
        console.error(
          "Unable to check Order leadership:",
          membershipError,
        );
        setHasOrderLeadership(false);
        return;
      }

      setHasOrderLeadership(
        (memberships ?? []).some(
          (membership) => {
            const relation =
              Array.isArray(
                membership.level,
              )
                ? membership.level[0]
                : membership.level;

            return relation?.level === 6;
          },
        ),
      );
    }, [characterId]);

''',
        "desktop order leadership block",
    )

    p.write_text(text, encoding="utf-8")
    print("OK: desktop sidebar")

    p, text = load("components/portal/mobile-portal-navigation.tsx")

    text = one(
        text,
        '''type MobilePortalNavigationProps = {
  unreadMessageCount: number;
  unreadForumCount: number;
  isStaff: boolean;
};''',
        '''type MobilePortalNavigationProps = {
  unreadMessageCount: number;
  unreadForumCount: number;
  isStaff: boolean;
  characterId: string | null;
};''',
        "mobile props",
    )

    text = one(
        text,
        '''export function MobilePortalNavigation({
  unreadMessageCount,
  unreadForumCount,
  isStaff,
}: MobilePortalNavigationProps) {''',
        '''export function MobilePortalNavigation({
  unreadMessageCount,
  unreadForumCount,
  isStaff,
  characterId,
}: MobilePortalNavigationProps) {''',
        "mobile destructure",
    )

    text = replace_block(
        text,
        "  const refreshAccess =",
        "  useEffect(() => {\n    void refreshAccess();",
        '''  const refreshAccess =
    useCallback(async () => {
      if (!characterId) {
        setHasFriendListFeature(false);
        setHasPrivateLocationAccess(false);
        setHasOrderLeadership(false);
        return;
      }

      const supabase = createClient();

      const [
        friendResult,
        privateLocationAccess,
        orderMembershipResult,
      ] = await Promise.all([
        supabase
          .from("character_feature_entitlements")
          .select("enabled")
          .eq("character_id", characterId)
          .eq("feature_key", "friend_list")
          .maybeSingle(),

        hasCurrentCharacterPrivateLocationAccess(),

        supabase
          .from("order_memberships")
          .select(`
            id,
            level:order_levels!order_memberships_order_level_id_fkey(
              level
            )
          `)
          .eq("character_id", characterId),
      ]);

      setHasFriendListFeature(
        friendResult.data?.enabled === true,
      );

      setHasPrivateLocationAccess(
        privateLocationAccess,
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
    }, [characterId, isStaff]);

''',
        "mobile access block",
    )

    p.write_text(text, encoding="utf-8")
    print("OK: mobile navigation")

    p, text = load("app/(portal)/layout.tsx")

    text = one(
        text,
        '''                  isStaff={
                    context.isStaff
                  }
                />''',
        '''                  isStaff={
                    context.isStaff
                  }
                  characterId={
                    context.character?.id ??
                    null
                  }
                />''',
        "desktop layout prop",
    )

    text = one(
        text,
        '''              isStaff={
                context.isStaff
              }
            />''',
        '''              isStaff={
                context.isStaff
              }
              characterId={
                context.character?.id ??
                null
              }
            />''',
        "mobile layout prop",
    )

    p.write_text(text, encoding="utf-8")
    print("OK: layout props")

    print()
    print("Patch complete.")
    print("Run: npm run build")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
