from pathlib import Path
import subprocess

ROOT = Path.cwd()
EXPECTED_HEAD = "d3812427dfd6475ef7ef65710c180559242d8332"

def git_head():
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        cwd=ROOT,
        encoding="utf-8",
        errors="strict",
    ).strip()

def patch_exact(rel, old, new):
    p = ROOT / rel
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{rel}: expected the exact d381242 block once, found {count}. "
            "No replacement made in this file."
        )
    p.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"Patched {rel}")

head = git_head()
if head != EXPECTED_HEAD:
    raise SystemExit(
        f"This patch is only for {EXPECTED_HEAD}; your local HEAD is {head}."
    )

print(f"Verified HEAD: {head}")

# Desktop: current d381242 access query is already correct:
# staff OR entitlement OR any active private_location_members row.
# Add automatic refresh so accepted/kicked membership changes are reflected
# without requiring a manual focus/visibility change.
desktop_old = '''  useEffect(() => {
    void refreshPrivateLocationAccess();

    function handleFocus() {
      void refreshPrivateLocationAccess();
    }

    function handleVisibility() {
      if (
        document.visibilityState === "visible"
      ) {
        void refreshPrivateLocationAccess();
      }
    }

    window.addEventListener(
      "focus",
      handleFocus,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );
    };
  }, [refreshPrivateLocationAccess]);
'''

desktop_new = '''  useEffect(() => {
    void refreshPrivateLocationAccess();

    const supabase =
      createClient();

    function refresh() {
      void refreshPrivateLocationAccess();
    }

    function handleVisibility() {
      if (
        document.visibilityState === "visible"
      ) {
        refresh();
      }
    }

    const membershipChannel = supabase
      .channel(
        "portal-private-location-access",
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "private_location_members",
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "character_feature_entitlements",
        },
        refresh,
      )
      .subscribe();

    const intervalId =
      window.setInterval(
        refresh,
        5_000,
      );

    window.addEventListener(
      "focus",
      refresh,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    return () => {
      window.clearInterval(intervalId);

      window.removeEventListener(
        "focus",
        refresh,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );

      void supabase.removeChannel(
        membershipChannel,
      );
    };
  }, [refreshPrivateLocationAccess]);
'''

patch_exact(
    "components/portal/portal-sidebar.tsx",
    desktop_old,
    desktop_new,
)

# Mobile: same access query is already correct in d381242.
# Add the same automatic refresh behaviour.
mobile_old = '''  useEffect(() => {
    void refreshAccess();

    const handleFocus = () => {
      void refreshAccess();
    };

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [refreshAccess]);
'''

mobile_new = '''  useEffect(() => {
    void refreshAccess();

    const supabase =
      createClient();

    const refresh = () => {
      void refreshAccess();
    };

    const handleVisibility = () => {
      if (
        document.visibilityState === "visible"
      ) {
        refresh();
      }
    };

    const membershipChannel = supabase
      .channel(
        "mobile-private-location-access",
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "private_location_members",
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "character_feature_entitlements",
        },
        refresh,
      )
      .subscribe();

    const intervalId =
      window.setInterval(
        refresh,
        5_000,
      );

    window.addEventListener(
      "focus",
      refresh,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    return () => {
      window.clearInterval(intervalId);

      window.removeEventListener(
        "focus",
        refresh,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );

      void supabase.removeChannel(
        membershipChannel,
      );
    };
  }, [refreshAccess]);
'''

patch_exact(
    "components/portal/mobile-portal-navigation.tsx",
    mobile_old,
    mobile_new,
)

print()
print("Private Locations behaviour enforced:")
print("- staff: visible")
print("- owner entitlement: visible")
print("- at least one ACTIVE accepted membership: visible")
print("- kicked membership does not count")
print("- if kicked from the last active membership: hidden")
print("- if another active accepted membership remains: still visible")
print("- pending invitation alone: hidden")
print("- access refreshes on realtime change, focus, visibility, and every 5 seconds")
print()
print("Run: npm run build")
