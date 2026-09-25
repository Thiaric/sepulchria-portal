from pathlib import Path
import subprocess
import sys

EXPECTED_HEAD = "cebbf3a"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)


def replace_object(text: str, start_marker: str, end_marker: str, replacement: str, label: str) -> str:
    start = text.find(start_marker)
    if start < 0:
        raise RuntimeError(f"{label}: start marker not found")
    end = text.find(end_marker, start + len(start_marker))
    if end < 0:
        raise RuntimeError(f"{label}: end marker not found")
    return text[:start] + replacement + "\n" + text[end:]


def main():
    head = subprocess.check_output(
        ["git", "rev-parse", "--short=7", "HEAD"],
        text=True,
    ).strip()

    if head != EXPECTED_HEAD:
        raise RuntimeError(
            f"This patch was built for {EXPECTED_HEAD}, but current HEAD is {head}. No files were changed."
        )

    manager_path = Path("components/tutorial/portal-first-visit-tour.tsx")
    manager = manager_path.read_text(encoding="utf-8")

    manager = replace_once(
        manager,
        '''type TourStep = {
  selector: string;
  title: string;
  body: string;
  prepare?: string;
};''',
        '''type TourStep = {
  selector: string;
  title: string;
  body: string;
  prepare?: string;
  viewport?: "mobile" | "desktop";
};''',
        "responsive TourStep type",
    )

    portal_home = r'''  "portal-home": {
    key: "portal-home",
    label: "Portal",
    steps: [
      {
        selector: "[data-portal-header]",
        title: "The Portal Header",
        body:
          "This bar stays with you throughout the Portal. It contains quick access to your account, character and Portal-wide tools.",
      },
      {
        selector: "[data-cosmetic-header-controls]",
        title: "Header Controls",
        body:
          "From here you can open the Store, Weather and Calendar, People in Sepulchria, sound, Skins, Notifications, messaging, character controls and account tools. Staff may also see administration controls.",
      },
      {
        selector: ".portal-left-shell",
        title: "Main Navigation",
        body:
          "On larger screens, the left sidebar is the main Portal navigation. Use it to reach Sepulchria, characters, lore, rules, social tools, Market, Crafting, Daily Missions and the other sections available to you.",
        viewport: "desktop",
      },
      {
        selector:
          ".components_portal_mobile_portal_navigation_nav_mobile_portal_navigation",
        title: "Mobile Navigation",
        body:
          "On mobile, the permanent navigation sits along the bottom. Aureth returns home, Enter opens Sepulchria, People opens the character directory, Messages opens private messages, and More contains the rest of the Portal.",
        viewport: "mobile",
      },
      {
        selector:
          ".components_portal_mobile_portal_navigation_section_more_sepulchria_navigation",
        title: "More",
        body:
          "More is the mobile equivalent of the desktop navigation sidebar. It contains Lore, the Player's Handbook, Warping, Feats, Market, Crafting, Daily Missions, Polls, Hall of Renown, Support, Legal & Safety and the other sections available to your account.",
        prepare: "open-mobile-more",
        viewport: "mobile",
      },
      {
        selector: "[data-portal-centre-host]",
        title: "Main Area",
        body:
          "The centre is where the page you are using lives. On the home page this is Aureth's map; elsewhere it becomes your Location, Character Sheet, workbench and other interactive areas.",
        prepare: "close-mobile-more",
      },
      {
        selector: ".portal-right-shell",
        title: "Context Panel",
        body:
          "On larger screens, the right panel changes with what you are doing and provides shortcuts, character or Location information, and other context relevant to the current page.",
        viewport: "desktop",
      },
      {
        selector: "[data-portal-right-sidebar]",
        title: "Context Panel",
        body:
          "On mobile, the diamond button opens the Context panel. Its contents change according to the page or Location you are using. The tutorial will open it automatically whenever a step needs something inside it.",
        prepare: "open-mobile-context",
        viewport: "mobile",
      },
      {
        selector: ".components_portal_compact_city_activity_section",
        title: "City Activity",
        body:
          "City Activity is a live, short-term feed of characters entering and leaving Sepulchria. It refreshes automatically so you can see recent movement through the active city presence system.",
        prepare: "close-mobile-context",
      },
    ],
  },'''

    manager = replace_object(
        manager,
        '  "portal-home": {',
        '  "game-location": {',
        portal_home,
        "responsive Portal home tutorial",
    )

    manager = replace_once(
        manager,
        '''function availableSteps(tour: TourDefinition): TourStep[] {
  const steps: TourStep[] = [];

  for (const step of tour.steps) {
    const target = findTarget(step.selector);

    if (!target && !step.prepare) {
      continue;
    }

    if (target) {
      const details =
        target.closest("details");

      if (details) {
        details.open = true;
      }
    }

    steps.push(step);
  }

  if (
    currentSearchParams().get("embedded") === "1" &&
    findTarget(".portal-right-shell")
  ) {
    steps.push({
      selector: ".portal-right-shell",
      title: "Context Panel",
      body:
        "This right-side panel belongs to the page open in this modal. It changes with the current section and provides the contextual information and shortcuts available here.",
    });
  }

  return steps;
}''',
        '''function availableSteps(tour: TourDefinition): TourStep[] {
  const steps: TourStep[] = [];

  const mobile =
    typeof window !== "undefined" &&
    window.innerWidth < 1280;

  for (const step of tour.steps) {
    if (
      step.viewport === "mobile" &&
      !mobile
    ) {
      continue;
    }

    if (
      step.viewport === "desktop" &&
      mobile
    ) {
      continue;
    }

    const target =
      findTarget(step.selector);

    if (!target && !step.prepare) {
      continue;
    }

    if (target) {
      const details =
        target.closest("details");

      if (details) {
        details.open = true;
      }
    }

    steps.push(step);
  }

  if (
    currentSearchParams().get("embedded") === "1"
  ) {
    if (
      mobile &&
      document.querySelector(
        "[data-portal-right-sidebar]",
      )
    ) {
      steps.push({
        selector:
          "[data-portal-right-sidebar]",
        title: "Context Panel",
        body:
          "This Context panel belongs to the page open in this modal. On mobile, the diamond control opens it; during tutorials it opens automatically whenever its contents are being explained.",
        prepare:
          "open-mobile-context",
        viewport: "mobile",
      });
    } else if (
      !mobile &&
      findTarget(".portal-right-shell")
    ) {
      steps.push({
        selector: ".portal-right-shell",
        title: "Context Panel",
        body:
          "This right-side panel belongs to the page open in this modal. It changes with the current section and provides the contextual information and shortcuts available here.",
        viewport: "desktop",
      });
    }
  }

  return steps;
}''',
        "responsive availableSteps",
    )

    manager = replace_once(
        manager,
        '''        if (
          step.prepare ===
          "open-first-inventory-category"
        ) {
          const categoryToggle =
            findTarget(
              ".components_characters_character_inventory_browser_button_action_4",
            ) as HTMLButtonElement | null;

          categoryToggle?.click();
        }

        window.setTimeout(
          updateRect,
          120,
        );''',
        '''        if (
          step.prepare ===
          "open-first-inventory-category"
        ) {
          const categoryToggle =
            findTarget(
              ".components_characters_character_inventory_browser_button_action_4",
            ) as HTMLButtonElement | null;

          categoryToggle?.click();
        }

        if (
          step.prepare ===
            "open-mobile-more" &&
          window.innerWidth < 1024
        ) {
          const moreButton =
            document.querySelector<HTMLButtonElement>(
              ".components_portal_mobile_portal_navigation_button_mobile_portal_navigation_3",
            );

          if (
            moreButton?.getAttribute(
              "aria-expanded",
            ) !== "true"
          ) {
            moreButton?.click();
          }
        }

        if (
          step.prepare ===
            "close-mobile-more" &&
          window.innerWidth < 1024
        ) {
          const moreButton =
            document.querySelector<HTMLButtonElement>(
              ".components_portal_mobile_portal_navigation_button_mobile_portal_navigation_3",
            );

          if (
            moreButton?.getAttribute(
              "aria-expanded",
            ) === "true"
          ) {
            document
              .querySelector<HTMLButtonElement>(
                ".components_portal_mobile_portal_navigation_button_close",
              )
              ?.click();
          }
        }

        if (
          step.prepare ===
            "open-mobile-context" &&
          window.innerWidth < 1280
        ) {
          const contextButton =
            document.querySelector<HTMLButtonElement>(
              ".components_portal_portal_responsive_right_sidebar_button_open_context_panel",
            );

          if (
            contextButton?.getAttribute(
              "aria-expanded",
            ) !== "true"
          ) {
            contextButton?.click();
          }
        }

        if (
          step.prepare ===
            "close-mobile-context" &&
          window.innerWidth < 1280
        ) {
          const contextButton =
            document.querySelector<HTMLButtonElement>(
              ".components_portal_portal_responsive_right_sidebar_button_open_context_panel",
            );

          if (
            contextButton?.getAttribute(
              "aria-expanded",
            ) === "true"
          ) {
            document
              .querySelector<HTMLButtonElement>(
                ".components_portal_portal_responsive_right_sidebar_button_close_context_panel_2",
              )
              ?.click();
          }
        }

        window.setTimeout(
          updateRect,
          240,
        );''',
        "mobile tutorial panel preparations",
    )

    manager = replace_once(
        manager,
        '''      const target =
        findTarget(
          step.selector,
        );

      if (!target) {''',
        '''      let target =
        findTarget(
          step.selector,
        );

      if (
        window.innerWidth < 1280 &&
        target &&
        (
          target.matches(
            "[data-portal-right-sidebar]",
          ) ||
          target.closest(
            "[data-portal-right-sidebar]",
          )
        )
      ) {
        const contextButton =
          document.querySelector<HTMLButtonElement>(
            ".components_portal_portal_responsive_right_sidebar_button_open_context_panel",
          );

        if (
          contextButton?.getAttribute(
            "aria-expanded",
          ) !== "true"
        ) {
          contextButton?.click();

          window.setTimeout(
            updateRect,
            240,
          );
          return;
        }

        target =
          findTarget(
            step.selector,
          );
      }

      if (!target) {''',
        "generic mobile context auto-open",
    )

    game_selectors = [
        '[data-skin-widget=\\"current-location\\"]',
        '.components_portal_room_info_button_button_info',
        '.components_portal_game_context_panel_section_section',
        '.components_portal_game_context_panel_div_container_5',
        '.components_portal_game_context_panel_div_container_12',
        '.components_portal_game_context_panel_section_section_2',
        '.components_portal_game_context_panel_button_action_3',
    ]

    for selector in game_selectors:
        needle = f'''        selector: "{selector}",'''
        replacement = f'''        selector: "{selector}",\n        prepare: "open-mobile-context",'''
        manager = replace_once(
            manager,
            needle,
            replacement,
            f"game mobile context prepare for {selector}",
        )

    checks = [
        'viewport?: "mobile" | "desktop";',
        'prepare: "open-mobile-more"',
        'prepare: "close-mobile-more"',
        'prepare: "open-mobile-context"',
        'prepare: "close-mobile-context"',
        'title: "Mobile Navigation"',
        'title: "More"',
        'data-portal-right-sidebar',
    ]

    for token in checks:
        if token not in manager:
            raise RuntimeError(
                f"Verification failed for {token!r}. No files were changed."
            )

    manager_path.write_text(manager, encoding="utf-8")

    print("Applied mobile tutorial/context patch for cebbF3a.".replace("F", "f"))
    print(" - Portal tutorial now has separate desktop/mobile navigation steps")
    print(" - Mobile More opens automatically for its tutorial step")
    print(" - More closes before the tutorial returns to page content")
    print(" - Mobile Context opens automatically for any sidebar-targeted tutorial step")
    print(" - /game context steps explicitly open the diamond panel")
    print(" - City Activity closes the Context drawer before being highlighted")
    print()
    print("Next: npm run build")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"PATCH FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
