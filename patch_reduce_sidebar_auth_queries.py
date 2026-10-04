from pathlib import Path
import sys

ROOT = Path.cwd()

def load(rel):
    p = ROOT / rel
    if not p.exists():
        raise FileNotFoundError(f"Missing {rel}. Run from the sepulchria-portal repository root.")
    return p, p.read_text(encoding="utf-8")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}.")
    return text.replace(old, new, 1)

def main():
    # Desktop sidebar: the portal layout already knows the current character ID.
    # Stop rediscovering user -> character for four separate access checks.
    p, text = load("components/portal/portal-sidebar.tsx")

    text = replace_once(
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
        "desktop sidebar props",
    )

    text = replace_once(
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
        "desktop sidebar characterId",
    )

    text = replace_once(
        text,
        '''  const refreshCosmeticsAccess =
    useCallback(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setHasCosmetics(false);
        return;
      }

      const { data: character } = await supabase
        .from("characters")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!character) {
        setHasCosmetics(false);
        return;
      }

      const { data, error } = await supabase
        .from("character_cosmetic_entitlements")
        .select("cosmetic_item_id")
        .eq("character_id", character.id)''',
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
        .eq("character_id", characterId)''',
        "desktop cosmetics access",
    )
    text = replace_once(
        text,
        '''    }, []);

  const refreshPrivateLocationAccess =''',
        '''    }, [characterId]);

  const refreshPrivateLocationAccess =''',
        "desktop cosmetics dependency",
    )

    text = replace_once(
        text,
        '''  const refreshPrivateLocationAccess =
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

      const hasAccess =''',
        '''  const refreshPrivateLocationAccess =
    useCallback(async () => {
      if (!characterId) {
        setHasPrivateLocationAccess(
          false,
        );
        return;
      }

      const hasAccess =''',
        "desktop private-location prechecks",
    )
    text = replace_once(
        text,
        '''    }, [isStaff]);

  const refreshFriendListFeature =''',
        '''    }, [characterId, isStaff]);

  const refreshFriendListFeature =''',
        "desktop private-location dependency",
    )

    text = replace_once(
        text,
        '''  const refreshFriendListFeature =
    useCallback(async () => {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setHasFriendListFeature(
          false,
        );
        return;
      }

      const {
        data: character,
        error: characterError,
      } = await supabase
        .from("characters")
        .select("id")
        .eq(
          "user_id",
          user.id,
        )
        .maybeSingle();

      if (
        characterError ||
        !character
      ) {
        if (characterError) {
          console.error(
            "Unable to identify character for Friend List access:",
            characterError,
          );
        }

        setHasFriendListFeature(
          false,
        );
        return;
      }

      const {
        data: entitlement,''',
        '''  const refreshFriendListFeature =
    useCallback(async () => {
      if (!characterId) {
        setHasFriendListFeature(
          false,
        );
        return;
      }

      const supabase =
        createClient();

      const {
        data: entitlement,''',
        "desktop friend access prechecks",
    )
    text = replace_once(
        text,
        '''          character.id,
        )''',
        '''          characterId,
        )''',
        "desktop friend character id",
    )
    # This is the first remaining empty dependency immediately after friend callback.
    marker = '''      setHasFriendListFeature(
        entitlement?.enabled ===
          true,
      );
    }, []);'''
    text = replace_once(
        text,
        marker,
        '''      setHasFriendListFeature(
        entitlement?.enabled ===
          true,
      );
    }, [characterId]);''',
        "desktop friend dependency",
    )

    text = replace_once(
        text,
        '''  const refreshOrderLeadership =
    useCallback(async () => {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setHasOrderLeadership(false);
        return;
      }

      const {
        data: character,
        error: characterError,
      } = await supabase
        .from("characters")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (
        characterError ||
        !character
      ) {
        setHasOrderLeadership(false);
        return;
      }

      const {
        data: memberships,''',
        '''  const refreshOrderLeadership =
    useCallback(async () => {
      if (!characterId) {
        setHasOrderLeadership(false);
        return;
      }

      const supabase =
        createClient();

      const {
        data: memberships,''',
        "desktop leadership prechecks",
    )
    text = replace_once(
        text,
        '''          character.id,
        );

      if (membershipError) {''',
        '''          characterId,
        );

      if (membershipError) {''',
        "desktop leadership character id",
    )
    text = replace_once(
        text,
        '''      );
    }, []);

  useEffect(() => {
    void refreshCosmeticsAccess();''',
        '''      );
    }, [characterId]);

  useEffect(() => {
    void refreshCosmeticsAccess();''',
        "desktop leadership dependency",
    )

    p.write_text(text, encoding="utf-8")
    print("OK: components/portal/portal-sidebar.tsx")

    # Mobile navigation: same idea for its combined access refresh.
    p, text = load("components/portal/mobile-portal-navigation.tsx")
    text = replace_once(
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
        "mobile navigation props",
    )
    text = replace_once(
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
        "mobile navigation characterId",
    )

    text = replace_once(
        text,
        '''  const refreshAccess =
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

      const [''',
        '''  const refreshAccess =
    useCallback(async () => {
      if (!characterId) {
        setHasFriendListFeature(false);
        setHasPrivateLocationAccess(false);
        setHasOrderLeadership(false);
        return;
      }

      const supabase =
        createClient();

      const [''',
        "mobile access prechecks",
    )
    text = text.replace(
        '''            character.id,
          )''',
        '''            characterId,
          )''',
        1,
    )
    text = replace_once(
        text,
        '''            "character_id",
            character.id,
          ),
      ]);''',
        '''            "character_id",
            characterId,
          ),
      ]);''',
        "mobile leadership character id",
    )
    text = replace_once(
        text,
        '''    }, [isStaff]);

  useEffect(() => {
    void refreshAccess();''',
        '''    }, [characterId, isStaff]);

  useEffect(() => {
    void refreshAccess();''',
        "mobile access dependency",
    )
    p.write_text(text, encoding="utf-8")
    print("OK: components/portal/mobile-portal-navigation.tsx")

    # Supply the already-loaded character ID from the server layout.
    p, text = load("app/(portal)/layout.tsx")
    text = replace_once(
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
        "layout desktop characterId prop",
    )
    text = replace_once(
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
        "layout mobile characterId prop",
    )
    p.write_text(text, encoding="utf-8")
    print("OK: app/(portal)/layout.tsx")

    print()
    print("Patch complete.")
    print("This removes repeated client-side user->character discovery from the")
    print("persistent desktop/mobile navigation access checks.")
    print("Next: npm run build")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
