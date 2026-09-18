from pathlib import Path


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding="utf-8")

    if old not in text:
        raise RuntimeError(
            f"\nPATCH FAILED: {label}\n"
            f"Could not find the expected code in:\n{path}\n"
            f"No changes were written to this file."
        )

    text = text.replace(old, new, 1)
    path.write_text(text, encoding="utf-8")

    print(f"✓ {label}")


# ============================================================
# 1. CITY ACTIVITY
#    - 60s -> 20s
#    - refresh on presence changes
#    - refresh on focus / online / visibility
# ============================================================

activity_path = Path(
    "components/portal/compact-city-activity.tsx"
)

replace_once(
    activity_path,
    """const REFRESH_INTERVAL_MS =
  60_000;""",
    """const REFRESH_INTERVAL_MS =
  20_000;""",
    "City Activity refresh changed from 60s to 20s",
)


old_activity_effect = """  useEffect(() => {
    void refresh();

    const timer =
      window.setInterval(
        () => {
          void refresh();
        },
        REFRESH_INTERVAL_MS,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    refresh,
  ]);"""


new_activity_effect = """  useEffect(() => {
    void refresh();

    const supabase =
      createClient();

    /*
     * General City Activity is stored in portal_presence_events.
     *
     * character_presence changes provide an immediate signal that
     * somebody has entered or left the active portal presence system,
     * so refresh the City Activity feed immediately.
     *
     * The 20-second timer remains as a fallback/resync.
     */
    const channel =
      supabase
        .channel(
          "portal-compact-city-activity",
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "character_presence",
          },
          () => {
            void refresh();
          },
        )
        .subscribe();

    const timer =
      window.setInterval(
        () => {
          void refresh();
        },
        REFRESH_INTERVAL_MS,
      );

    const resync = () => {
      void refresh();
    };

    const handleVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          resync();
        }
      };

    window.addEventListener(
      "focus",
      resync,
    );

    window.addEventListener(
      "online",
      resync,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.clearInterval(
        timer,
      );

      window.removeEventListener(
        "focus",
        resync,
      );

      window.removeEventListener(
        "online",
        resync,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    refresh,
  ]);"""


replace_once(
    activity_path,
    old_activity_effect,
    new_activity_effect,
    "City Activity live refresh added",
)


# ============================================================
# 2. RESPONSIVE RIGHT SIDEBAR
#    - City Activity visible on EVERY portal page
#    - Tidings height respected on mobile
#    - Instant Chat no longer sits underneath Tidings
# ============================================================

sidebar_path = Path(
    "components/portal/portal-responsive-right-sidebar.tsx"
)


# ------------------------------------------------------------
# Add CSSProperties import
# ------------------------------------------------------------

replace_once(
    sidebar_path,
    """import {
  useEffect,
  useRef,
  useState,
} from "react";""",
    """import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";""",
    "CSSProperties import added",
)


# ------------------------------------------------------------
# Add Tidings height state
# ------------------------------------------------------------

replace_once(
    sidebar_path,
    """  const [mobileButtonTop, setMobileButtonTop] =
  useState<number | null>(null);

const mobileButtonRef =""",
    """  const [mobileButtonTop, setMobileButtonTop] =
  useState<number | null>(null);

  const [
    mobileTidingsHeight,
    setMobileTidingsHeight,
  ] = useState(0);

const mobileButtonRef =""",
    "Mobile Tidings height state added",
)


# ------------------------------------------------------------
# Add live Tidings measurement before existing localStorage
# mobile button positioning effect
# ------------------------------------------------------------

old_effect_start = """    useEffect(() => {
  const saved =
    window.localStorage.getItem(
      "sepulchria-mobile-context-button-top",
    );"""


new_effect_start = """  useEffect(() => {
    const measureTidings = () => {
      const ticker =
        document.querySelector<HTMLElement>(
          'footer[data-tidings-ticker="true"]',
        );

      setMobileTidingsHeight(
        ticker
          ? Math.ceil(
              ticker
                .getBoundingClientRect()
                .height,
            )
          : 0,
      );
    };

    measureTidings();

    const mobileStack =
      document.querySelector(
        "[data-portal-mobile-stack]",
      );

    const observer =
      new MutationObserver(
        measureTidings,
      );

    if (mobileStack) {
      observer.observe(
        mobileStack,
        {
          childList: true,
          subtree: true,
        },
      );
    }

    window.addEventListener(
      "resize",
      measureTidings,
    );

    return () => {
      observer.disconnect();

      window.removeEventListener(
        "resize",
        measureTidings,
      );
    };
  }, []);

    useEffect(() => {
  const saved =
    window.localStorage.getItem(
      "sepulchria-mobile-context-button-top",
    );"""


replace_once(
    sidebar_path,
    old_effect_start,
    new_effect_start,
    "Mobile Tidings height measurement added",
)


# ------------------------------------------------------------
# Set the CSS variable on the mobile/right sidebar
# ------------------------------------------------------------

old_aside = """      <aside
  data-mobile-right-cosmetic-surface
  aria-label="Context sidebar"
        data-portal-column
        data-portal-scroll
        data-portal-right-sidebar
        className="""


new_aside = """      <aside
  data-mobile-right-cosmetic-surface
  aria-label="Context sidebar"
        data-portal-column
        data-portal-scroll
        data-portal-right-sidebar
        style={{
          "--sep-mobile-tidings-height":
            `${mobileTidingsHeight}px`,
        } as CSSProperties}
        className="""


replace_once(
    sidebar_path,
    old_aside,
    new_aside,
    "Mobile sidebar now reserves Tidings height",
)


# ------------------------------------------------------------
# Make City Activity appear on every portal page
# ------------------------------------------------------------

replace_once(
    sidebar_path,
    """            {pathname === "/" ? (
              <CompactCityActivity />
            ) : null}""",
    """            <CompactCityActivity />""",
    "City Activity made visible portal-wide",
)


print()
print("========================================")
print("PATCH COMPLETE")
print("========================================")
print()
print("Changed:")
print("  • City Activity refresh: 60s -> 20s")
print("  • City Activity refreshes on presence changes")
print("  • City Activity refreshes on focus/tab return")
print("  • City Activity visible on every portal page")
print("  • Mobile Tidings height is measured dynamically")
print("  • Instant Chat/right sidebar stays above Tidings")
print()
print("No GitHub or Vercel actions were performed.")
print()
print("Now review with:")
print("  git diff")