from pathlib import Path
import subprocess
import sys

EXPECTED_HEAD = "5659351"

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
            f"This patch was built for {EXPECTED_HEAD}, but current HEAD is {head}. "
            "No files were changed."
        )

    manager_path = Path("components/tutorial/portal-first-visit-tour.tsx")
    defs_path = Path("components/tutorial/tutorial-stage2-definitions.ts")
    notifications_path = Path("components/notifications/notification-bell.tsx")

    manager = manager_path.read_text(encoding="utf-8")
    defs = defs_path.read_text(encoding="utf-8")
    notifications = notifications_path.read_text(encoding="utf-8")

    manager = replace_once(
        manager,
        """type TourStep = {
  selector: string;
  title: string;
  body: string;
};""",
        """type TourStep = {
  selector: string;
  title: string;
  body: string;
  prepare?:
    | "open-calendar-event"
    | "open-first-inventory-category";
};""",
        "TourStep prepare support",
    )

    manager = replace_once(
        manager,
        """  for (const step of tour.steps) {
    const target = findTarget(step.selector);
    if (!target) continue;

    const details = target.closest("details");
    if (details) details.open = true;

    steps.push(step);
  }""",
        """  for (const step of tour.steps) {
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
  }""",
        "available prepared steps",
    )

    manager = replace_once(
        manager,
        """  const startingRef = useRef(false);""",
        """  const startingRef = useRef(false);

  const preparedStepRef =
    useRef<Set<string>>(
      new Set(),
    );""",
        "prepared step ref",
    )

    manager = replace_once(
        manager,
        """      setActiveTour(tour);
      setSteps(usableSteps);
      setStepIndex(0);
      startingRef.current = false;""",
        """      preparedStepRef.current.clear();
      setActiveTour(tour);
      setSteps(usableSteps);
      setStepIndex(0);
      startingRef.current = false;""",
        "clear prepared steps on start",
    )

    manager = replace_once(
        manager,
        """  const complete = useCallback(async () => {
    const tour = activeTour;

    setActiveTour(null);
    setSteps([]);
    setStepIndex(0);
    setRect(null);""",
        """  const complete = useCallback(async () => {
    const tour = activeTour;

    preparedStepRef.current.clear();
    setActiveTour(null);
    setSteps([]);
    setStepIndex(0);
    setRect(null);""",
        "clear prepared steps on complete",
    )

    manager = replace_once(
        manager,
        """    function updateRect() {
      const target = findTarget(step.selector);

      if (!target) {""",
        """    function updateRect() {
      const prepareKey =
        `${activeTour.key}:${stepIndex}`;

      if (
        step.prepare &&
        !preparedStepRef.current.has(
          prepareKey,
        )
      ) {
        preparedStepRef.current.add(
          prepareKey,
        );

        if (
          step.prepare ===
          "open-calendar-event"
        ) {
          const eventDay =
            findTarget(
              ".sep-calendar-event-day",
            ) as HTMLButtonElement | null;

          eventDay?.click();
        }

        if (
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
        );
        return;
      }

      const target =
        findTarget(
          step.selector,
        );

      if (!target) {""",
        "prepare current tutorial step",
    )

    manager = replace_once(
        manager,
        """  const last = stepIndex === steps.length - 1;

  return (""",
        """  const last =
    stepIndex ===
    steps.length - 1;

  const tutorialPosition =
    (() => {
      if (
        typeof window ===
          "undefined" ||
        !rect
      ) {
        return {
          right: "1.5rem",
          bottom: "1.5rem",
        };
      }

      const targetCentreX =
        rect.left +
        rect.width / 2;

      const targetCentreY =
        rect.top +
        rect.height / 2;

      const targetOnRight =
        targetCentreX >
        window.innerWidth / 2;

      const targetOnBottom =
        targetCentreY >
        window.innerHeight / 2;

      return {
        left: targetOnRight
          ? "1rem"
          : undefined,
        right: targetOnRight
          ? undefined
          : "1rem",
        top: targetOnBottom
          ? "1rem"
          : undefined,
        bottom: targetOnBottom
          ? undefined
          : "1rem",
      };
    })();

  return (""",
        "dynamic tutorial box position",
    )

    manager = replace_once(
        manager,
        """      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${activeTour.label} tutorial`}
        className="fixed bottom-4 right-4 z-[2147483002] w-[calc(100vw-2rem)] max-w-[390px] border border-[rgb(var(--sep-colour-8d693e))] bg-[rgb(var(--sep-colour-100c09))] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.72)] sm:bottom-6 sm:right-6 sm:p-5"
      >""",
        """      <aside
        role="dialog"
        aria-modal="true"
        data-sep-tutorial-dialog="true"
        aria-label={`${activeTour.label} tutorial`}
        style={tutorialPosition}
        className="fixed z-[2147483002] w-[calc(100vw-2rem)] max-w-[390px] border border-[rgb(var(--sep-colour-8d693e))] bg-[rgb(var(--sep-colour-100c09))] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.72)] sm:p-5"
      >""",
        "moving tutorial dialog",
    )

    notifications = replace_once(
        notifications,
        """      if (
        rootRef.current?.contains(
          target,
        ) ||
        panelRef.current?.contains(
          target,
        )
      ) {
        return;
      }

      setOpen(false);""",
        """      if (
        rootRef.current?.contains(
          target,
        ) ||
        panelRef.current?.contains(
          target,
        ) ||
        (
          target instanceof Element &&
          target.closest(
            '[data-sep-tutorial-dialog="true"]',
          )
        )
      ) {
        return;
      }

      setOpen(false);""",
        "keep notifications open during tutorial",
    )

    weather_def = r"""  "weather": {
    "key": "weather",
    "label": "Weather & Calendar",
    "steps": [
      {
        "selector": ".components_world_world_indicator_section_dialog",
        "title": "Weather & Calendar",
        "body": "This window combines Aureth's current date and time, the playable calendar, current weather, lunar phase and scheduled calendar events."
      },
      {
        "selector": ".components_world_world_indicator_h2_heading",
        "title": "Aureth Date and Time",
        "body": "The heading shows the current in-world date and time. Hover the date to see its real-world date equivalent."
      },
      {
        "selector": ".components_world_world_indicator_div_container_2",
        "title": "Move Through the Calendar",
        "body": "Use « and » to move by year and ‹ and › to move by month. Browsing the calendar never changes the actual current world date."
      },
      {
        "selector": ".components_world_world_indicator_button_today",
        "title": "Return to the Current Month",
        "body": "Current month takes you straight back to Aureth's current month after you have browsed elsewhere."
      },
      {
        "selector": ".components_world_world_indicator_div_container_7",
        "title": "Calendar Days",
        "body": "Every date shows its Aureth day number and lunar phase. The outlined current date is today in Aureth."
      },
      {
        "selector": ".sep-calendar-event-day",
        "title": "Days With Events",
        "body": "A date with scheduled activity shows an event counter and becomes clickable. Select one of these dates to open the events scheduled for that day."
      },
      {
        "selector": ".components_world_world_indicator_div_container_10",
        "title": "Events on This Day",
        "body": "The tutorial opens the first event-day visible in the current month. This panel then shows the selected date and the events scheduled for it. Selecting another marked day replaces this list with that day's events.",
        "prepare": "open-calendar-event"
      },
      {
        "selector": ".components_world_world_indicator_div_container_19",
        "title": "Current Weather",
        "body": "This panel shows the live in-world weather, temperature and weather intensity. The compact header control reflects the same current conditions."
      },
      {
        "selector": ".components_world_world_indicator_div_container_21",
        "title": "Current Lunar Phase",
        "body": "The lunar panel shows the current phase, illumination percentage and day of the lunar cycle. The same moon cycle is represented on the calendar."
      }
    ]
  },"""

    defs = replace_object(
        defs,
        '  "weather": {',
        '  "city-people": {',
        weather_def,
        "weather tutorial",
    )

    character_defs = r"""  "character-profile": {
    "key": "character-profile",
    "label": "Character Sheet · Profile",
    "steps": [
      {
        "selector": ".character-sheet-tabs nav[aria-label=\"Character sheet sections\"]",
        "title": "Profile Tab",
        "body": "The tabs move between every part of your Character Sheet without leaving the sheet. Profile contains the fuller public-facing description of the character."
      },
      {
        "selector": "[data-character-sheet-panel=\"profile\"]",
        "title": "Full Profile",
        "body": "This tab expands beyond In Short and gathers the character's descriptive roleplay information in one place."
      },
      {
        "selector": "[data-character-sheet-panel=\"profile\"] .character_page_h2_heading",
        "title": "Profile Sections",
        "body": "The profile is divided into readable sections such as Physical Description, Personality, Biography, Public Notes and Relationships when those fields contain information."
      },
      {
        "selector": "[data-character-sheet-panel=\"profile\"] .character_page_p_text_8",
        "title": "Public Character Information",
        "body": "These longer text blocks are the information other players use to understand and roleplay with your character. Edit them from the Edit tab when your character is allowed to change them."
      }
    ]
  },
  "character-inventory": {
    "key": "character-inventory",
    "label": "Character Sheet · Inventory",
    "steps": [
      {
        "selector": "[data-character-sheet-panel=\"inventory\"]",
        "title": "Inventory",
        "body": "Inventory is the complete possession system for your character. It includes carried Items, equipped Items, containers, item mechanics and the actions available to you."
      },
      {
        "selector": ".components_characters_character_inventory_browser_div_inventory_2",
        "title": "Possessions",
        "body": "This is the full carried Inventory, not just what is equipped. The record count includes the Items currently carried by the character."
      },
      {
        "selector": ".components_characters_character_inventory_browser_div_container_42",
        "title": "Search and Filter Your Items",
        "body": "Search by name and filter by category, subcategory, quality, body slot, status and whether you meet the Item's requirements. Filters update immediately and Reset filters clears them."
      },
      {
        "selector": ".components_characters_character_inventory_browser_section_section",
        "title": "Equipment",
        "body": "Equipment is the wearable/equippable view. Expand or collapse it to see the body slots and what is currently equipped. Empty slots can offer compatible carried Items to equip."
      },
      {
        "selector": ".components_characters_character_inventory_browser_section_section_4",
        "title": "Carried Item Categories",
        "body": "Possessed Items are grouped by category below Equipment. Each category can be expanded or collapsed and shows how many matching Items it contains."
      },
      {
        "selector": ".components_characters_character_inventory_browser_article_article",
        "title": "A Possessed Item",
        "body": "The tutorial opens the first carried category. An Item card shows name, quantity, category, quality, description, equipment state, use mechanics, effects and requirements.",
        "prepare": "open-first-inventory-category"
      },
      {
        "selector": ".components_characters_character_inventory_browser_div_container_19",
        "title": "Item Actions",
        "body": "Owned Items expose the actions that apply to them. Depending on the Item, you can Use it, target another character, move it into or out of containers, equip or unequip it, and discard it."
      },
      {
        "selector": ".components_characters_character_inventory_browser_div_container_13",
        "title": "Requirements",
        "body": "Requirements show whether your character meets the conditions for an Item, including Attributes, Ancestry, Order, Role or Order level where configured."
      },
      {
        "selector": ".components_characters_character_inventory_browser_div_container_8",
        "title": "Item State",
        "body": "An Item can also report active cooldowns, temporary effects, charge information or reasons why an action is currently unavailable."
      }
    ]
  },
  "character-ledger": {
    "key": "character-ledger",
    "label": "Character Sheet · Ledger",
    "steps": [
      {
        "selector": "[data-character-sheet-panel=\"ledger\"]",
        "title": "Ledger",
        "body": "The Ledger is your character's permanent economy history."
      },
      {
        "selector": ".components_characters_character_remnants_wallet_section_section",
        "title": "Current Remnants",
        "body": "Your current Remnant balance is shown with the Ledger so you can compare the present purse with the transactions that produced it."
      },
      {
        "selector": ".components_characters_character_ledger_div_immutable_ledger",
        "title": "Immutable Ledger",
        "body": "Ledger history is intentionally immutable. Entries record where Remnants were gained or spent rather than being manually editable."
      },
      {
        "selector": ".components_characters_character_ledger_section_section",
        "title": "Transaction History",
        "body": "Every available transaction is listed here with its economy information. Use this history to trace purchases, rewards, jobs and other Remnant changes."
      }
    ]
  },
  "character-trophies": {
    "key": "character-trophies",
    "label": "Character Sheet · Trophies",
    "steps": [
      {
        "selector": "[data-character-sheet-panel=\"trophies\"]",
        "title": "Trophies",
        "body": "Trophies record achievements, distinctions and progress your character has earned."
      },
      {
        "selector": ".components_characters_character_trophies_display_header_header",
        "title": "Trophy Overview",
        "body": "The header explains the collection and shows the total number of Trophies available to display here."
      },
      {
        "selector": ".components_characters_character_trophies_display_section_section_2",
        "title": "Trophy Groups",
        "body": "Trophies are organised into groups. Each group shows how many achievements it contains."
      },
      {
        "selector": ".components_characters_character_trophies_display_div_container_7",
        "title": "A Trophy",
        "body": "Each Trophy entry shows its identity, description and progress or completion information where the achievement has stages."
      },
      {
        "selector": ".components_characters_character_trophies_display_div_container_11",
        "title": "Progress",
        "body": "Progress-based Trophies show your current progress toward their threshold and whether the next stage has been reached."
      }
    ]
  },
  "character-feats": {
    "key": "character-feats",
    "label": "Character Sheet · Feats",
    "steps": [
      {
        "selector": "[data-character-sheet-panel=\"gifts\"]",
        "title": "Your Feats",
        "body": "This tab contains only the Feats actually owned by your character."
      },
      {
        "selector": ".components_characters_character_gifts_display_header_header",
        "title": "Owned Feats",
        "body": "The header tells you how many Feats belong to the character."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_section_section",
        "title": "Filter Your Feats",
        "body": "Search your owned Feats and filter them by effect and target so you can quickly find the capability you need."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_article_article",
        "title": "Feat Details",
        "body": "A Feat card explains its source, activation type, target, success resolution, duration, cooldown and direct mechanical effects."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_div_container_7",
        "title": "Target, Success and Timing",
        "body": "These boxes tell you who the Feat affects, whether it is automatic or rolled, and how long it lasts before any cooldown."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_div_container_8",
        "title": "Effects",
        "body": "Effects show damage, healing, Health or Attribute changes, Warping modifiers and other mechanics applied by the Feat."
      }
    ]
  },
  "character-warping": {
    "key": "character-warping",
    "label": "Character Sheet · Warping",
    "steps": [
      {
        "selector": "[data-character-sheet-panel=\"warping\"]",
        "title": "Your Warping",
        "body": "This tab contains the Shapes actually known by your character."
      },
      {
        "selector": ".components_characters_character_shapes_display_header_header",
        "title": "Known Shapes",
        "body": "The header shows how many Shapes the character currently knows."
      },
      {
        "selector": ".components_warping_shapes_catalogue_section_section",
        "title": "Find a Known Shape",
        "body": "Search and filter known Shapes by Level, School, Movement, target and nature."
      },
      {
        "selector": ".components_warping_shapes_catalogue_article_article",
        "title": "A Known Shape",
        "body": "Each Shape card gives the complete play reference: School, Word, Movement, duration, Price, target, nature, components, resolution and effects."
      },
      {
        "selector": ".components_warping_shapes_catalogue_div_container_21",
        "title": "Shape Requirements",
        "body": "Requirements show the Warping Affinity and minimum Attributes needed for that Shape."
      }
    ]
  },
  "character-offgame": {
    "key": "character-offgame",
    "label": "Character Sheet · Offgame",
    "steps": [
      {
        "selector": "[data-character-sheet-panel=\"offgame\"]",
        "title": "Offgame",
        "body": "Offgame contains player-facing information about the character that is not part of the in-character fiction."
      },
      {
        "selector": "[data-character-sheet-panel=\"offgame\"] .character_page_h2_heading",
        "title": "Offgame Notes",
        "body": "Use these notes for information another player should know without treating it as something their character automatically knows."
      },
      {
        "selector": "[data-character-sheet-panel=\"offgame\"] .character_page_p_text_8",
        "title": "Player-facing Information",
        "body": "This text can clarify OOC context or other player information attached to the character. It can be changed from the Edit tab when editing is available."
      }
    ]
  },
  "character-log": {
    "key": "character-log",
    "label": "Character Sheet · Log",
    "steps": [
      {
        "selector": "[data-character-sheet-panel=\"audit\"]",
        "title": "Character Log",
        "body": "The Log records significant system and character changes over time."
      },
      {
        "selector": ".components_characters_character_audit_trail_div_character_log",
        "title": "Audit History",
        "body": "The header explains the character audit trail. This history is for tracing recorded changes rather than editing them."
      },
      {
        "selector": ".components_characters_character_audit_trail_section_section",
        "title": "Recorded Changes",
        "body": "Entries appear in the audit area as the system records changes. If loading fails, the Retry control lets you request the history again."
      },
      {
        "selector": ".components_characters_character_audit_trail_button_retry",
        "title": "Retry",
        "body": "If the audit history cannot be loaded, Retry requests it again without leaving the Character Sheet."
      }
    ]
  },
  "character-edit": {
    "key": "character-edit",
    "label": "Character Sheet · Edit",
    "steps": [
      {
        "selector": "[data-character-sheet-panel=\"edit\"]",
        "title": "Edit",
        "body": "Edit contains every self-service control currently available for your character."
      },
      {
        "selector": ".components_characters_character_conditions_editor_div_container",
        "title": "Conditions",
        "body": "The Conditions editor lets you review the character's current Conditions and, where permitted, add or remove the self-managed Conditions exposed here."
      },
      {
        "selector": ".components_characters_character_conditions_editor_select_select",
        "title": "Choose a Condition",
        "body": "Select an available Condition and use the adjacent controls to add it. Existing removable Conditions expose their own remove control."
      },
      {
        "selector": ".character_page_section_edit_character",
        "title": "Full Character Editor",
        "body": "When the character is still editable through the full creation/editor flow, Open character editor takes you there."
      },
      {
        "selector": ".character_page_section_section_5",
        "title": "Edit Profile",
        "body": "Approved characters can update their portrait and public profile information here without reopening the full character-creation flow."
      },
      {
        "selector": ".character_page_input_show_last_activity",
        "title": "Last Activity Privacy",
        "body": "Choose whether other players may see this character's Last Activity. Staff can still see it for administration."
      },
      {
        "selector": ".character_page_input_show_inventory",
        "title": "Inventory Privacy",
        "body": "Choose whether other players can see carried Inventory. Equipped Items remain public even when the rest of the Inventory is hidden."
      },
      {
        "selector": ".character_page_div_container_40",
        "title": "Save Profile Changes",
        "body": "Save profile changes applies the editable approved-profile fields and privacy choices."
      },
      {
        "selector": ".components_characters_display_trophy_selector_section_section",
        "title": "Displayed Trophies",
        "body": "Choose which earned Trophies appear in the character's display slots, then save the display selection."
      }
    ]
  },"""

    defs = replace_object(
        defs,
        '  "character-profile": {',
        '  "forum": {',
        character_defs,
        "all Character Sheet tab tutorials",
    )

    character_short = r"""  "character-sheet": {
    key: "character-sheet",
    label: "Character Sheet · In Short",
    steps: [
      {
        selector: '[data-cosmetic-surface="sheet"]',
        title: "Your Character Sheet",
        body:
          "The Character Sheet is the complete record of your character. Every tab covers a different part of their identity, possessions, mechanics or history.",
      },
      {
        selector: '.character-sheet-tabs nav[aria-label="Character sheet sections"]',
        title: "Character Sheet Tabs",
        body:
          "Use these tabs to move between In Short, Profile, Inventory, Ledger, Trophies, Feats, Warping, Offgame, Log and Edit. Each tab has its own tutorial the first time you visit it.",
      },
      {
        selector: '[data-character-sheet-panel="short"] .character_page_div_container_9',
        title: "Portrait and Status",
        body:
          "The portrait identifies your character visually. Your own sheet also shows the current approval/status state beneath it.",
      },
      {
        selector: '[data-character-sheet-panel="short"] .character_page_div_container_13',
        title: "Identity",
        body:
          "This part of In Short contains the core public identity information used throughout the portal.",
      },
      {
        selector: ".components_characters_character_remnants_wallet_section_section",
        title: "Remnants",
        body:
          "Your current Remnant balance is visible on the sheet. The Ledger tab contains the transaction history behind that balance.",
      },
      {
        selector: ".components_characters_character_music_player",
        title: "Character Music",
        body:
          "If the character has music configured, the player lets you play, pause, seek and control its volume while respecting the Portal sound controls.",
      },
      {
        selector: ".components_characters_character_mechanics_display",
        title: "Core Mechanics",
        body:
          "The mechanics panel summarises the Attributes and other mechanical values used during play.",
      }
    ],
  },"""

    manager = replace_object(
        manager,
        '  "character-sheet": {',
        '  crafting: {',
        character_short,
        "In Short Character Sheet tutorial",
    )

    game_def = r"""  "game-location": {
    key: "game-location",
    label: "Location",
    steps: [
      {
        selector: ".game_page_article_article",
        title: "Your Current Location",
        body:
          "This is the live play area for the Location your character currently occupies. Location-specific systems appear above the Chronicle when this place supports them.",
      },
      {
        selector: ".game_page_div_container_10",
        title: "The Chronicle",
        body:
          "The Chronicle records what characters say and do. Rolls, mechanical actions, whispers and system output also appear here when relevant.",
      },
      {
        selector: "[data-room-chat-composer]",
        title: "Write and Act",
        body:
          "Use the composer to speak and describe actions. Its gameplay controls give access to whispers, dice, Attributes, attacks, Feats, Items, Warping, Conditions and the other actions available to your character.",
      },
      {
        selector: "[data-skin-widget=\"current-location\"]",
        title: "Current Location Card",
        body:
          "At the top of the right context panel you can always see the Area and exact Location your character currently occupies, together with the Location image."
      },
      {
        selector: ".components_portal_room_info_button_button_info",
        title: "Location Info",
        body:
          "Press Info whenever you want more than the Location name. It opens the Location information window with the Location image, its full description and, where available, information about the wider Area."
      },
      {
        selector: ".components_portal_game_context_panel_section_section",
        title: "Present in This Location",
        body:
          "This section lists the characters currently present in the same Location. The counter shows how many are visible to you."
      },
      {
        selector: ".components_portal_game_context_panel_div_container_5",
        title: "A Present Character",
        body:
          "Select a character row to open that character's sheet. Presence state and public Ancestry/Order identity are shown here; other controls can appear when messaging or staff management is available."
      },
      {
        selector: ".components_portal_game_context_panel_div_container_12",
        title: "Character Quick Actions",
        body:
          "Quick controls on a present character can let you send a private message or, for staff with permission, open management tools."
      },
      {
        selector: ".components_portal_game_context_panel_section_section_2",
        title: "Journey To",
        body:
          "The bottom of the context panel lists the passages that can currently be used to leave this Location. The number beside Journey to shows how many exits are available."
      },
      {
        selector: ".components_portal_game_context_panel_button_action_3",
        title: "Move to Another Location",
        body:
          "Choose an exit to move your character through that passage. The Chronicle and right-side context then refresh for the new Location."
      }
    ],
  },"""

    manager = replace_object(
        manager,
        '  "game-location": {',
        '  "house-of-chances": {',
        game_def,
        "expanded game tutorial",
    )

    checks = [
        (manager, 'prepare?:', True, "prepare support"),
        (manager, 'data-sep-tutorial-dialog="true"', True, "tutorial dialog marker"),
        (manager, 'tutorialPosition', True, "dynamic position"),
        (manager, '"open-first-inventory-category"', True, "inventory preparation"),
        (manager, 'title: "Location Info"', True, "game location info"),
        (manager, 'Character Sheet · In Short', True, "short tutorial"),
        (defs, '"prepare": "open-calendar-event"', True, "calendar event open"),
        (defs, '"title": "A Possessed Item"', True, "inventory possessed item"),
        (defs, '"title": "Inventory Privacy"', True, "edit privacy"),
        (notifications, 'data-sep-tutorial-dialog="true"', True, "notification tutorial exception"),
    ]

    for text, token, expected, label in checks:
        if (token in text) != expected:
            raise RuntimeError(
                f"Verification failed: {label}. No files were changed."
            )

    manager_path.write_text(manager, encoding="utf-8")
    defs_path.write_text(defs, encoding="utf-8")
    notifications_path.write_text(notifications, encoding="utf-8")

    print("Applied final tutorial amendments for 5659351.")
    print(" - Weather opens and explains an event day")
    print(" - Notifications stay open while tutorial buttons are clicked")
    print(" - Tutorial dialog moves opposite the highlighted target")
    print(" - Rebuilt every Character Sheet tab tutorial")
    print(" - Inventory now opens and teaches possessed Items")
    print(" - /game now covers the full right-side Location context")
    print()
    print("Next: npm run build")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"PATCH FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
