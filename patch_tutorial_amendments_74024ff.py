from pathlib import Path
import subprocess
import sys

EXPECTED_HEAD = "74024ff"

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
    if text.find(start_marker, start + len(start_marker)) >= 0:
        raise RuntimeError(f"{label}: start marker is not unique")
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

    files = {
        "manager": Path("components/tutorial/portal-first-visit-tour.tsx"),
        "defs": Path("components/tutorial/tutorial-stage2-definitions.ts"),
        "weather": Path("components/world/world-indicator.tsx"),
        "people": Path("components/portal/active-city-counter.tsx"),
        "skins": Path("components/portal/portal-appearance-modal.tsx"),
        "notifications": Path("components/notifications/notification-bell.tsx"),
        "base_sql": Path("add_first_visit_tutorial_progress.sql"),
        "stage2_sql": Path("extend_tutorial_keys_stage2.sql"),
    }

    data = {
        key: path.read_text(encoding="utf-8")
        for key, path in files.items()
    }

    manager = data["manager"]
    defs = data["defs"]

    portal_home = r'''  "portal-home": {
    key: "portal-home",
    label: "Portal",
    steps: [
      {
        selector: "[data-portal-header]",
        title: "The Portal Header",
        body:
          "This bar stays with you throughout the portal. It contains the quickest controls for your account, character and portal-wide tools.",
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
          "The left panel is your main navigation. Use it to reach Sepulchria, characters, lore, rules, social tools, the Market, Crafting, Daily Missions and the other sections available to you.",
      },
      {
        selector: "[data-portal-centre-host]",
        title: "Main Area",
        body:
          "The centre is where the page you are using lives. On the home page this is Aureth's map; elsewhere it becomes your Location, character sheet, workbench and other interactive areas.",
      },
      {
        selector: ".portal-right-shell",
        title: "Context Panel",
        body:
          "The right panel changes with what you are doing. It provides shortcuts, character or Location information, and other context relevant to the page currently open.",
      },
      {
        selector: ".components_portal_compact_city_activity_section",
        title: "City Activity",
        body:
          "City Activity is a live, short-term feed of characters entering and leaving Sepulchria. It refreshes automatically so you can see recent movement through the active city presence system.",
      },
    ],
  },'''

    manager = replace_object(
        manager,
        '  "portal-home": {',
        '  "game-location": {',
        portal_home,
        "portal-home tutorial",
    )

    crafting = r'''  crafting: {
    key: "crafting",
    label: "Crafting",
    steps: [
      {
        selector:
          ".crafting_crafting_workbench_div_container, .crafting_crafting_workbench_section_no_recipes_known",
        title: "Crafting",
        body:
          "Crafting turns carried materials into items through recipes your character has learned. If no recipes are known yet, the workbench stays empty until one is learned.",
      },
      {
        selector: ".crafting_crafting_workbench_section_section",
        title: "1 · Choose a Recipe",
        body:
          "The Maker's Folio lists every recipe your character knows. Select a recipe first. Each entry also tells you whether the required materials are currently available.",
      },
      {
        selector: ".crafting_crafting_workbench_button_action",
        title: "Recipe Selection",
        body:
          "Click a recipe card to load it onto the workbench. The right-hand workbench then changes to that recipe, its required ingredients and its result.",
      },
      {
        selector: ".crafting_crafting_workbench_section_section_2",
        title: "2 · Ingredients at Hand",
        body:
          "This tray contains crafting materials your character is carrying. Materials relevant to the chosen recipe are highlighted. You can drag them to a matching slot or double-click them to place them.",
      },
      {
        selector: ".crafting_crafting_workbench_section_section_3",
        title: "3 · The Workbench",
        body:
          "The workbench shows the chosen recipe, its description, the item it will produce and whether you have enough materials to complete it.",
      },
      {
        selector: ".crafting_crafting_workbench_div_container_23",
        title: "4 · Fill Every Ingredient Slot",
        body:
          "Every required ingredient has its own slot. Click a slot, drag the matching material onto it, or use Set the Bench to fill all available requirements automatically. The owned/required numbers show whether you have enough.",
      },
      {
        selector: ".crafting_crafting_workbench_div_container_28",
        title: "5 · Set the Bench and Craft",
        body:
          "Set the Bench automatically places the required materials when you own enough. Once every slot is filled and the workbench says Assembly ready, press Craft. The materials are consumed and the crafted result is added through the inventory system.",
      },
      {
        selector: ".crafting_crafting_workbench_div_container_25",
        title: "Result and Feedback",
        body:
          "This area shows the workbench state, the expected result and any success or failure notice after crafting. You can then select another recipe and repeat the process.",
      },
    ],
  },'''

    manager = replace_object(
        manager,
        '  crafting: {',
        '  ...STAGE2_TOURS,',
        crafting,
        "crafting tutorial",
    )

    manager = replace_once(
        manager,
        '''  if (pathname === "/crafting") { result.push(TOURS.crafting); return result; }

  if (pathname !== "/game") return result;''',
        '''  if (pathname === "/crafting") { result.push(TOURS.crafting); return result; }

  if (pathname === "/support") {
    result.push(TOURS.tickets);
    return result;
  }

  if (pathname === "/support/new") {
    result.push(TOURS["ticket-new"]);
    return result;
  }

  if (/^\\/support\\/[^/]+$/.test(pathname)) {
    result.push(TOURS["ticket-detail"]);
    return result;
  }

  if (pathname !== "/game") return result;''',
        "ticket route tutorials",
    )

    manager = replace_once(
        manager,
        '''  for (const step of tour.steps) {
    const target = findTarget(step.selector);
    if (!target) continue;

    const details = target.closest("details");
    if (details) details.open = true;

    steps.push(step);
  }

  return steps;''',
        '''  for (const step of tour.steps) {
    const target = findTarget(step.selector);
    if (!target) continue;

    const details = target.closest("details");
    if (details) details.open = true;

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

  return steps;''',
        "generic modal context tutorial step",
    )

    manager = replace_once(
        manager,
        '''    function handlePlayTutorial() {
      if (
        !ready ||
        !userId ||
        activeTour ||
        startingRef.current
      ) {
        return;
      }

      /*
       * Transient header-widget tours are added first. The current
       * page/context tour is appended afterwards; on /game, a
       * Location-specific tour is appended after the general one.
       * Replay therefore follows the most specific current context.
       */
      const tour =
        applicableTours[
          applicableTours.length - 1
        ];

      if (!tour) {
        return;
      }

      void startTour(tour);
    }''',
        '''    function handlePlayTutorial(
      event: Event,
    ) {
      if (
        !ready ||
        !userId ||
        activeTour ||
        startingRef.current
      ) {
        return;
      }

      const requestedKey =
        (
          event as CustomEvent<{
            key?: string;
          }>
        ).detail?.key;

      const tour =
        requestedKey
          ? applicableTours.find(
              (candidate) =>
                candidate.key ===
                requestedKey,
            ) ??
            TOURS[requestedKey]
          : applicableTours[
              applicableTours.length -
                1
            ];

      if (!tour) {
        return;
      }

      void startTour(tour);
    }''',
        "specific tutorial replay event",
    )

    weather_def = r'''  "weather": {
    "key": "weather",
    "label": "Weather & Calendar",
    "steps": [
      {
        "selector": ".components_world_world_indicator_section_dialog",
        "title": "Weather & Calendar",
        "body": "This window combines Aureth's current date and time, the playable calendar, weather, lunar phase and scheduled calendar events."
      },
      {
        "selector": ".components_world_world_indicator_h2_heading",
        "title": "Aureth Date and Time",
        "body": "The heading shows the current in-world date and time. Hovering the date also exposes its real-world date equivalent."
      },
      {
        "selector": ".components_world_world_indicator_div_container_2",
        "title": "Move Through the Calendar",
        "body": "Use « and » to move by year and ‹ and › to move by month. This lets you inspect past or upcoming dates without changing the actual current world date."
      },
      {
        "selector": ".components_world_world_indicator_button_today",
        "title": "Return to the Current Month",
        "body": "After browsing another month or year, Current month takes the calendar directly back to the month Aureth is currently in."
      },
      {
        "selector": ".components_world_world_indicator_div_container_7",
        "title": "Calendar Days, Moons and Events",
        "body": "Each day shows its Aureth day number and lunar phase. Dates with scheduled events display an event counter; select one of those dates to reveal its event details below the calendar."
      },
      {
        "selector": ".components_world_world_indicator_div_container_19",
        "title": "Current Weather",
        "body": "This panel shows the live in-world weather, temperature and weather intensity. The compact weather control in the Portal header reflects the same current conditions."
      },
      {
        "selector": ".components_world_world_indicator_div_container_21",
        "title": "Current Lunar Phase",
        "body": "The lunar panel shows the current phase, illumination percentage and day of the lunar cycle. The moon symbol also appears on individual calendar dates."
      }
    ]
  },'''

    city_people_def = r'''  "city-people": {
    "key": "city-people",
    "label": "People in Sepulchria",
    "steps": [
      {
        "selector": ".components_portal_active_city_counter_div_people_sepulchria_3",
        "title": "People in Sepulchria",
        "body": "This is the live city-presence window. The number in the header is the current number of active characters visible through the presence system."
      },
      {
        "selector": ".components_portal_active_city_counter_div_people_sepulchria_7",
        "title": "Search Active Characters",
        "body": "Search by character name, Ancestry, Order, Association, visible Location or presence status. The result counter updates immediately as you type."
      },
      {
        "selector": ".components_portal_active_city_counter_div_people_sepulchria_9",
        "title": "Live Presence Count",
        "body": "This line tells you how many characters are present or how many match the current search. The list updates as city presence changes."
      },
      {
        "selector": ".components_portal_active_city_counter_div_people_sepulchria_11",
        "title": "Presence Cards",
        "body": "The cards show the active characters that match your filters. Their public identity, status and visible Location information are drawn from the live presence system."
      },
      {
        "selector": ".components_portal_active_city_counter_article_article",
        "title": "Character Presence Details",
        "body": "A character card contains the public details available to you and can link into that character's public information. Private Location information remains hidden unless you are allowed to see it."
      }
    ]
  },'''

    skins_def = r'''  "skins": {
    "key": "skins",
    "label": "Portal Skins",
    "steps": [
      {
        "selector": ".components_portal_portal_appearance_modal_section_dialog",
        "title": "Portal Appearance",
        "body": "Portal Skins change the portal's visual appearance without changing gameplay. This window shows every skin currently visible to your account."
      },
      {
        "selector": ".components_portal_portal_skin_gallery_div_container_3",
        "title": "Your Selected Skin",
        "body": "This block shows the skin currently saved to your account and its real colour swatch."
      },
      {
        "selector": ".components_portal_portal_skin_gallery_div_container_7",
        "title": "Available Skin Cards",
        "body": "Each card shows a skin's name, description, colour swatch and ownership state such as Current, Purchased, Granted or its purchase price."
      },
      {
        "selector": ".components_portal_portal_skin_gallery_article_article",
        "title": "A Skin",
        "body": "A skin card previews that appearance using its actual portal colour variables, so you can compare it with the currently selected skin."
      },
      {
        "selector": ".components_portal_portal_skin_gallery_div_container_13",
        "title": "Preview and Use Skin",
        "body": "Preview temporarily applies a skin so you can inspect it across the Portal. Use skin permanently selects an unlocked skin. While previewing, an End preview control appears above the cards so you can return to your saved skin without changing it."
      }
    ]
  },'''

    notifications_def = r'''  "notifications": {
    "key": "notifications",
    "label": "Notifications",
    "steps": [
      {
        "selector": ".components_notifications_notification_bell_div_container_4",
        "title": "Notifications",
        "body": "This panel collects active off-game notifications. The heading shows whether notifications are muted or how many active notices are currently loaded."
      },
      {
        "selector": ".components_notifications_notification_bell_button_action_2",
        "title": "Mute or Unmute Notifications",
        "body": "Mute stops notification delivery from interrupting you. While muted, new notices remain waiting and can be restored by pressing Unmute."
      },
      {
        "selector": ".components_notifications_notification_bell_button_action_3",
        "title": "Mark All Read",
        "body": "Mark all read clears the unread state from every currently unread notification at once. The button is disabled when there is nothing unread."
      },
      {
        "selector": ".components_notifications_notification_bell_input_field",
        "title": "Filter Notifications",
        "body": "Use the search field to filter the loaded notification list. The counter beneath it shows how many notices match the current filter."
      },
      {
        "selector": ".components_notifications_notification_bell_div_container_9",
        "title": "Notification Feed",
        "body": "Each notice shows its type, time, title, body and whether it is new. Opening or selecting a notification also marks that individual notice as read."
      },
      {
        "selector": "[data-sep-notification-open=\"true\"]",
        "title": "Open the Related Area",
        "body": "Notifications that point somewhere in the Portal include an Open action. It takes you to the relevant page or opens the appropriate Portal modal when that destination is modal-based."
      }
    ]
  },'''

    warping_def = r'''  "warping": {
    "key": "warping",
    "label": "Warping",
    "steps": [
      {
        "selector": ".warping_page_header_header",
        "title": "Warping and Shapes",
        "body": "Warping is the shaping of the Current through known Shapes. This catalogue contains the active Shapes available in Sepulchria."
      },
      {
        "selector": ".components_warping_shapes_catalogue_section_section",
        "title": "Find a Shape",
        "body": "Search by name, Word or description, or filter the catalogue by Level, School, Movement, target and effect nature. Reset clears every filter."
      },
      {
        "selector": ".components_warping_shapes_catalogue_article_article",
        "title": "A Shape",
        "body": "Each Shape card is a complete rules reference. It brings together the Shape's identity, activation requirements, targeting, resolution and mechanical effects."
      },
      {
        "selector": ".components_warping_shapes_catalogue_p_text_11",
        "title": "School, Word, Movement, Duration and Price",
        "body": "The metadata line identifies the Shape's School, Word of Power, Movement and duration. Where a Price applies, hover or inspect it for the named Price associated with shaping it."
      },
      {
        "selector": ".components_warping_shapes_catalogue_div_container_13",
        "title": "Level, Nature and Target",
        "body": "These badges show the Shape's Level, whether its effect is beneficial, harmful or mixed, who it can target, and whether it functions as a Dispel."
      },
      {
        "selector": ".components_warping_shapes_catalogue_div_container_14",
        "title": "Words and Components",
        "body": "Where configured, the expanded Shape information lists its component Words and whether verbal and movement components are required."
      },
      {
        "selector": ".components_warping_shapes_catalogue_div_container",
        "title": "Resolution and Effects",
        "body": "Mechanical profile boxes explain how the Shape resolves against a target. Automatic profiles need no save; Save Required profiles show the DC, allowed saves and what happens on success. Effect badges describe damage, healing, Conditions and Attribute changes."
      },
      {
        "selector": ".components_warping_shapes_catalogue_div_container_21",
        "title": "Requirements",
        "body": "The Requirements section tells you what is needed to know or use the Shape, including the required Warping Affinity level and any minimum Attributes."
      }
    ]
  },'''

    feats_def = r'''  "feats": {
    "key": "feats",
    "label": "Feats",
    "steps": [
      {
        "selector": ".feats_page_header_header",
        "title": "Feats",
        "body": "Feats are innate, learned or bestowed capabilities granted through Ancestries, Order Roles or general assignment."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_section_section",
        "title": "Find a Feat",
        "body": "Search the catalogue or filter by effect type, target, source type, Ancestry and Order. Reset clears all active filters."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_article_article",
        "title": "A Feat",
        "body": "Each Feat card is a rules reference showing what the Feat is, where it comes from, how it targets, how it resolves and what it changes mechanically."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_div_container_7",
        "title": "Target, Success and Timing",
        "body": "These boxes explain who the Feat can affect, whether activation is automatic or requires a roll, its duration and any cooldown before it can be used again."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_div_container_8",
        "title": "Mechanical Effects",
        "body": "The Effects section lists direct damage, healing, Health changes, Attribute modifiers, Warping Affinity changes and other configured mechanical effects."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_div_container_10",
        "title": "How the Feat Is Obtained",
        "body": "Available through tells you whether the Feat comes from an Ancestry, an Order, general assignment, or a combination of those sources."
      },
      {
        "selector": ".components_gifts_gifts_catalogue_article_article .border-t",
        "title": "Advanced Mechanics",
        "body": "Some Feats use Shape-backed advanced mechanics. When present, these sections describe target scope, duration, automatic or opposed resolution, and separate Self, Other or harmful-target effects."
      }
    ]
  },'''

    market_shop_def = r'''  "market-shop": {
    "key": "market-shop",
    "label": "Market Shop",
    "steps": [
      {
        "selector": ".market_slug_page_div_container_4",
        "title": "A Market Shop",
        "body": "The shop header identifies the shop and shows your currently available Remnants. Purchases and sales use the normal character economy."
      },
      {
        "selector": ".components_market_market_catalogue_section_section",
        "title": "Search and Filter the Stock",
        "body": "Search by item name or description and filter by category, subcategory, quality, item type, price, effects, stock availability and affordability. Reset clears the filters."
      },
      {
        "selector": ".components_market_market_catalogue_article_article",
        "title": "An Item Listing",
        "body": "Each listing is an actual shop item. It shows the item's image, name, quality, category, description, purchase price and the mechanics relevant to that item."
      },
      {
        "selector": ".components_market_market_catalogue_div_container_6",
        "title": "Item Properties and Effects",
        "body": "The badges and details on the item explain properties such as usable or equippable state, equipment slot, charges, cooldown, targeting, success roll, damage and passive or use-based effects."
      },
      {
        "selector": ".components_market_market_catalogue_button_action",
        "title": "Buying Items",
        "body": "Choose the quantity beside Buy. The shop calculates the total and prevents the purchase if you cannot afford it or finite stock is too low. A successful purchase adds the item through the inventory system."
      },
      {
        "selector": ".components_market_market_catalogue_button_action_2",
        "title": "Selling Items",
        "body": "When a shop buys that item and you own eligible copies, choose how many to sell and press Sell. The listing shows how many sellable copies you own and how many Remnants you will receive."
      },
      {
        "selector": ".components_market_market_catalogue_span_text",
        "title": "Prices and Stock",
        "body": "Prices are shown in Remnants. Finite-stock items can sell out, while unlimited listings remain available. Your wallet balance and the item-level totals help you check a transaction before confirming it."
      }
    ]
  },'''

    tickets_def = r'''  "tickets": {
    "key": "tickets",
    "label": "Tickets",
    "steps": [
      {
        "selector": ".support_page_div_ticket_centre",
        "title": "Ticket Centre",
        "body": "The Ticket Centre is where you contact Sepulchria staff for support and follow existing requests."
      },
      {
        "selector": "a[href=\"/support/new\"]",
        "title": "Open a New Ticket",
        "body": "Use Open New Ticket when you need help with a new issue. You will be able to choose the category, add a subject and describe the problem."
      },
      {
        "selector": ".support_page_div_container_3",
        "title": "Your Tickets",
        "body": "Existing tickets are listed here with their reference, category, subject, status and last update time. Unread staff activity is highlighted and counted."
      },
      {
        "selector": ".support_page_div_container_3 a",
        "title": "Open a Ticket",
        "body": "Select a ticket to read the full conversation and reply to staff while the ticket remains open."
      }
    ]
  },
  "ticket-new": {
    "key": "ticket-new",
    "label": "Open a Ticket",
    "steps": [
      {
        "selector": ".support_new_page_h1_open_ticket",
        "title": "Open a Ticket",
        "body": "Use this form to create a new support request for Sepulchria staff."
      },
      {
        "selector": ".support_new_page_select_category",
        "title": "Choose the Category",
        "body": "Choose the category that best matches the request: General Support, Technical Problem, Account, Bug, Rules Question or Payment / Premium."
      },
      {
        "selector": ".support_new_page_input_subject",
        "title": "Subject",
        "body": "Give the ticket a concise subject so the issue is easy to identify in the Ticket Centre."
      },
      {
        "selector": ".support_new_page_textarea_body",
        "title": "Describe the Issue",
        "body": "Explain what you need help with and include the information staff will need to understand or reproduce the issue."
      },
      {
        "selector": ".support_new_page_button_submit_ticket",
        "title": "Submit Ticket",
        "body": "Submit creates the ticket and adds it to your Ticket Centre, where you can follow replies and continue the conversation."
      }
    ]
  },
  "ticket-detail": {
    "key": "ticket-detail",
    "label": "Support Ticket",
    "steps": [
      {
        "selector": ".support_reference_page_div_container_2",
        "title": "Ticket Details",
        "body": "The ticket header shows the public reference, category, subject, opening date and current status."
      },
      {
        "selector": ".support_reference_page_div_container_3",
        "title": "Ticket Conversation",
        "body": "Messages between you and Sepulchria staff are kept here in chronological order so the full support history remains available."
      },
      {
        "selector": ".support_reference_page_form_reply_support_ticket",
        "title": "Reply to Staff",
        "body": "While the ticket is open, write your reply here and press Send Reply. Closed tickets keep their history but no longer accept replies."
      },
      {
        "selector": "a[href=\"/support\"]",
        "title": "Return to the Ticket Centre",
        "body": "Use Ticket Centre to return to the full list of your support requests."
      }
    ]
  },
'''

    defs = replace_object(defs, '  "weather": {', '  "city-people": {', weather_def, "weather definition")
    defs = replace_object(defs, '  "city-people": {', '  "skins": {', city_people_def, "city people definition")
    defs = replace_object(defs, '  "skins": {', '  "notifications": {', skins_def, "skins definition")
    defs = replace_object(defs, '  "notifications": {', '  "private-messages": {', notifications_def, "notifications definition")
    defs = replace_object(defs, '  "warping": {', '  "feats": {', warping_def, "warping definition")
    defs = replace_object(defs, '  "feats": {', '  "character-profile": {', feats_def, "feats definition")
    defs = replace_object(defs, '  "market-shop": {', '  "daily-missions": {', market_shop_def, "market shop definition")
    defs = replace_once(
        defs,
        '''  "codex": {''',
        tickets_def + '''  "codex": {''',
        "ticket tutorial definitions",
    )

    weather = data["weather"]
    weather = replace_once(
        weather,
        '''                <button
                  type="button"
                  onClick={() =>
                    setOpen(
                      false,
                    )
                  }
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-17110f))] text-[rgb(var(--sep-colour-c8a875))] components_world_world_indicator_button_action_2"
                >
                  ×
                </button>''',
        '''                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent(
                        "sepulchria:play-tutorial",
                        {
                          detail: {
                            key: "weather",
                          },
                        },
                      ),
                    )
                  }
                  className="absolute right-12 top-3 flex h-8 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-17110f))] px-3 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-c8a875))] transition hover:border-[rgb(var(--sep-colour-967342))] hover:text-[rgb(var(--sep-colour-f1d7a5))]"
                >
                  Play Tutorial
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setOpen(
                      false,
                    )
                  }
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-17110f))] text-[rgb(var(--sep-colour-c8a875))] components_world_world_indicator_button_action_2"
                >
                  ×
                </button>''',
        "weather tutorial button",
    )

    people = data["people"]
    people = replace_once(
        people,
        '''                <button
                  type="button"
                  onClick={() =>
                    setOpen(
                      false,
                    )
                  }
                  aria-label="Close People in Sepulchria"''',
        '''                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent(
                        "sepulchria:play-tutorial",
                        {
                          detail: {
                            key: "city-people",
                          },
                        },
                      ),
                    )
                  }
                  className="flex h-7 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-17110d))] px-3 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-aa9675))] transition hover:border-[rgb(var(--sep-colour-967342))] hover:text-[rgb(var(--sep-colour-f1d7a5))]"
                >
                  Play Tutorial
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setOpen(
                      false,
                    )
                  }
                  aria-label="Close People in Sepulchria"''',
        "city people tutorial button",
    )

    skins = data["skins"]
    skins = replace_once(
        skins,
        '''          <button
            type="button"
            onClick={close}
            aria-label="Close Appearance"
            className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-baa78c))] transition hover:border-[rgb(var(--sep-colour-987344))] components_portal_portal_appearance_modal_button_close_appearance"
          >
            ×
          </button>''',
        '''          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent(
                    "sepulchria:play-tutorial",
                    {
                      detail: {
                        key: "skins",
                      },
                    },
                  ),
                )
              }
              className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-baa78c))] transition hover:border-[rgb(var(--sep-colour-987344))]"
            >
              Play Tutorial
            </button>

            <button
              type="button"
              onClick={close}
              aria-label="Close Appearance"
              className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-baa78c))] transition hover:border-[rgb(var(--sep-colour-987344))] components_portal_portal_appearance_modal_button_close_appearance"
            >
              ×
            </button>
          </div>''',
        "skins tutorial button",
    )

    notifications = data["notifications"]
    notifications = replace_once(
        notifications,
        '''                        {markingAllRead
                          ? "Marking..."
                          : "Mark all read"}
                      </button>
                    ) : null}
                  </div>
                </div>

                {!muted ? (''',
        '''                        {markingAllRead
                          ? "Marking..."
                          : "Mark all read"}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent(
                          "sepulchria:play-tutorial",
                          {
                            detail: {
                              key: "notifications",
                            },
                          },
                        ),
                      )
                    }
                    className="border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-18110d))] px-2.5 py-1.5 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-bca27b))] transition hover:border-[rgb(var(--sep-colour-987344))] hover:text-[rgb(var(--sep-colour-efd6a8))]"
                  >
                    Play Tutorial
                  </button>
                </div>

                {!muted ? (''',
        "notifications tutorial button",
    )

    for key in ("base_sql", "stage2_sql"):
        sql = data[key]
        if "'tickets'" in sql or "'ticket-new'" in sql or "'ticket-detail'" in sql:
            raise RuntimeError(f"{key}: ticket keys already present")
        sql = replace_once(
            sql,
            '''        'codex'
''',
            '''        'codex',
        'tickets',
        'ticket-new',
        'ticket-detail'
''',
            f"{key} ticket keys",
        )
        data[key] = sql

    data["manager"] = manager
    data["defs"] = defs
    data["weather"] = weather
    data["people"] = people
    data["skins"] = skins
    data["notifications"] = notifications

    checks = [
        ("manager", "City Activity", True),
        ("manager", 'TOURS["ticket-detail"]', True),
        ("manager", 'currentSearchParams().get("embedded") === "1"', True),
        ("manager", "requestedKey", True),
        ("defs", '"key": "tickets"', True),
        ("defs", '"key": "ticket-new"', True),
        ("defs", '"key": "ticket-detail"', True),
        ("defs", '"title": "Requirements"', True),
        ("defs", '"title": "Buying Items"', True),
        ("weather", 'key: "weather"', True),
        ("people", 'key: "city-people"', True),
        ("skins", 'key: "skins"', True),
        ("notifications", 'key: "notifications"', True),
        ("base_sql", "'tickets'", True),
        ("stage2_sql", "'ticket-detail'", True),
    ]

    for key, token, should_exist in checks:
        exists = token in data[key]
        if exists != should_exist:
            raise RuntimeError(
                f"Verification failed for {key}: {token!r}. No files were changed."
            )

    for key, path in files.items():
        path.write_text(data[key], encoding="utf-8")

    print("Applied tutorial amendments for 74024ff.")
    print(" - Restored widget-local Play Tutorial buttons")
    print(" - Expanded Weather, People, Skins and Notifications")
    print(" - Added modal context-sidebar step automatically")
    print(" - Added City Activity to the Portal tutorial")
    print(" - Expanded Warping, Feats, Market Shop and Crafting")
    print(" - Added Ticket Centre, New Ticket and Ticket Detail tutorials")
    print()
    print("Run the supplied SQL, then npm run build.")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"PATCH FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
