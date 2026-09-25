"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { STAGE2_TOURS } from "@/components/tutorial/tutorial-stage2-definitions";

import { createClient } from "@/lib/supabase/client";

type TourStep = {
  selector: string;
  title: string;
  body: string;
  prepare?: string;
  viewport?: "mobile" | "desktop";
};

type TourDefinition = {
  key: string;
  label: string;
  steps: TourStep[];
};

type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const TOURS: Record<string, TourDefinition> = {
  "portal-home": {
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
  },
  "game-location": {
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
        prepare: "open-mobile-context",
        title: "Current Location Card",
        body:
          "At the top of the right context panel you can always see the Area and exact Location your character currently occupies, together with the Location image."
      },
      {
        selector: ".components_portal_room_info_button_button_info",
        prepare: "open-mobile-context",
        title: "Location Info",
        body:
          "Press Info whenever you want more than the Location name. It opens the Location information window with the Location image, its full description and, where available, information about the wider Area."
      },
      {
        selector: ".components_portal_game_context_panel_section_section",
        prepare: "open-mobile-context",
        title: "Present in This Location",
        body:
          "This section lists the characters currently present in the same Location. The counter shows how many are visible to you."
      },
      {
        selector: ".components_portal_game_context_panel_div_container_5",
        prepare: "open-mobile-context",
        title: "A Present Character",
        body:
          "Select a character row to open that character's sheet. Presence state and public Ancestry/Order identity are shown here; other controls can appear when messaging or staff management is available."
      },
      {
        selector: ".components_portal_game_context_panel_div_container_12",
        prepare: "open-mobile-context",
        title: "Character Quick Actions",
        body:
          "Quick controls on a present character can let you send a private message or, for staff with permission, open management tools."
      },
      {
        selector: ".components_portal_game_context_panel_section_section_2",
        prepare: "open-mobile-context",
        title: "Journey To",
        body:
          "The bottom of the context panel lists the passages that can currently be used to leave this Location. The number beside Journey to shows how many exits are available."
      },
      {
        selector: ".components_portal_game_context_panel_button_action_3",
        prepare: "open-mobile-context",
        title: "Move to Another Location",
        body:
          "Choose an exit to move your character through that passage. The Chronicle and right-side context then refresh for the new Location."
      }
    ],
  },
  "house-of-chances": {
    key: "house-of-chances",
    label: "House of Chances",
    steps: [
      {
        selector: '[data-tour-area="house-of-chances"]',
        title: "House of Chances",
        body:
          "The House of Chances is a Location-specific game of fortune. Your available chances and current purse are shown in its header.",
      },
      {
        selector: '[data-tour-area="house-of-chances"] .game_components_houseofchancespanel_summary_summary',
        title: "Your Daily Chances",
        body:
          "The Fortune markers show how many attempts you still have today. The House may also be closed, or you may be unable to play if you cannot afford the cost.",
      },
      {
        selector: '[data-tour-area="house-of-chances"] .game_components_houseofchancespanel_div_let_house_read_fortune',
        title: "The Fortune",
        body:
          "Each attempt draws three numbers. The House resolves the result automatically and awards only the highest valid outcome revealed by the draw.",
      },
      {
        selector: '[data-tour-area="house-of-chances"] .game_components_houseofchancespanel_button_play',
        title: "Tempt Fate",
        body:
          "This starts an attempt and spends the displayed Remnants. The button is disabled when the House is closed, you have no chances left, or you cannot pay.",
      },
    ],
  },

  "odd-jobs": {
    key: "odd-jobs",
    label: "Odd Jobs Bureau",
    steps: [
      {
        selector: '[data-tour-area="odd-jobs"]',
        title: "Odd Jobs Bureau",
        body:
          "The Bureau offers small daily jobs for Remnants. Availability and pay can change as other characters take the work.",
      },
      {
        selector: '[data-tour-area="odd-jobs"] .game_components_oddjobspanel_summary_summary',
        title: "Your Purse",
        body:
          "The header shows your current Remnants and opens the list of today's jobs.",
      },
      {
        selector: '[data-tour-area="odd-jobs"] .game_components_oddjobspanel_div_container_5',
        title: "Today's Work",
        body:
          "Each card shows the job, its current pay and how many claims remain. A job can become unavailable when its daily claims are exhausted.",
      },
      {
        selector: '[data-tour-area="odd-jobs"] .game_components_oddjobspanel_button_action',
        title: "Work",
        body:
          "Choose the job you want and press Work. You can only complete the allowed daily work, and the reward is added to your Ledger automatically.",
      },
    ],
  },

  gathering: {
    key: "gathering",
    label: "Gathering",
    steps: [
      {
        selector: '[data-tour-area="gathering"]',
        title: "Gathering",
        body:
          "Some Locations contain resources that can be searched for. Gathering is tied to the specific Location you are currently visiting.",
      },
      {
        selector: '[data-tour-area="gathering"] .game_components_gatheringpanel_summary_summary',
        title: "Attempts",
        body:
          "The markers in the header show how many Gathering attempts remain for the day.",
      },
      {
        selector: '[data-tour-area="gathering"] .game_components_gatheringpanel_button_gather',
        title: "Search the Location",
        body:
          "Press Gather to spend one attempt. The result is rolled by the system and any resource you find is added through the normal inventory mechanics.",
      },
      {
        selector: '[data-tour-area="gathering"] .game_components_gatheringpanel_section_section',
        title: "Your Result",
        body:
          "The result area shows what the search uncovered. Gathering results can differ by Location and by the Gathering setup configured for that place.",
      },
    ],
  },

  "breeze-lodgings": {
    key: "breeze-lodgings",
    label: "Breeze Lodgings",
    steps: [
      {
        selector: '[data-tour-area="breeze-lodgings"]',
        title: "The Breeze Lodgings",
        body:
          "The Breeze lets characters rent private rooms for a limited stay. Your purse and current lodging status are shown here.",
      },
      {
        selector: '[data-tour-area="breeze-lodgings"] .game_components_breezelodgingspanel_div_container_5',
        title: "Choose a Room",
        body:
          "Rooms are grouped by tier. Each tier has its own daily price and guest capacity, and occupied rooms cannot be rented by another character.",
      },
      {
        selector: '[data-tour-area="breeze-lodgings"] .game_components_breezelodgingspanel_button_action',
        title: "Rent or Enter",
        body:
          "For an available room, choose the length of stay and pay the displayed cost. Once it is yours, the same control lets you enter it.",
      },
    ],
  },

  "character-sheet": {
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
  },
  crafting: {
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
  },
  ...STAGE2_TOURS,
};

function currentSearchParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function findTarget(selector: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(selector),
  );
  for (const candidate of candidates) {
    const rect = candidate.getBoundingClientRect();
    if (rect.width >= 4 && rect.height >= 4) return candidate;
  }
  return candidates[0] ?? null;
}

function addIfPresent(
  tours: TourDefinition[],
  key: string,
  selector: string,
) {
  if (
    typeof document !== "undefined" &&
    document.querySelector(selector)
  ) {
    tours.push(TOURS[key]);
  }
}

function characterTabKey() {
  if (typeof document !== "undefined") {
    const sheet = document.querySelector<HTMLElement>(
      "[data-character-sheet-active-tab]",
    );
    const fromDom = sheet?.dataset.characterSheetActiveTab;
    if (fromDom) return fromDom;
  }
  return currentSearchParams().get("tab") ?? "short";
}

function candidateTours(pathname: string): TourDefinition[] {
  const result: TourDefinition[] = [];

  addIfPresent(result, "weather", ".components_world_world_indicator_div_container_13");
  addIfPresent(result, "city-people", ".components_portal_active_city_counter_div_people_sepulchria");
  addIfPresent(result, "skins", ".components_portal_portal_appearance_modal_section_dialog");
  addIfPresent(result, "notifications", ".components_notifications_notification_bell_div_container_2");
  addIfPresent(result, "instant-chat", ".components_instant_chat_instant_chat_dock_section_section, .components_instant_chat_instant_chat_dock_section_section_2");

  if (pathname === "/") {
    result.push(
      currentSearchParams().get("map") === "sepulchria"
        ? TOURS["sepulchria-map"]
        : TOURS["portal-home"],
    );
    return result;
  }

  if (/^\/areas\/[^/]+$/.test(pathname)) { result.push(TOURS.area); return result; }
  if (pathname === "/characters") { result.push(TOURS["characters-directory"]); return result; }
  if (pathname === "/store") { result.push(TOURS.store); return result; }
  if (pathname === "/messages") {
    result.push(TOURS["private-messages"]);
    return result;
  }

  if (/^\/messages\/[^/]+$/.test(pathname)) {
    result.push(TOURS["messages-conversation"]);
    return result;
  }
  if (pathname === "/ancestries") { result.push(TOURS.ancestries); return result; }
  if (/^\/ancestries\/[^/]+$/.test(pathname)) { result.push(TOURS["ancestry-detail"]); return result; }
  if (pathname === "/associations") { result.push(TOURS.associations); return result; }
  if (/^\/associations\/[^/]+$/.test(pathname)) { result.push(TOURS["association-detail"]); return result; }
  if (pathname === "/orders") { result.push(TOURS.orders); return result; }
  if (
    /^\/orders\/[^/]+$/.test(pathname) &&
    !["/orders/manage", "/orders/submit", "/orders/headquarters"].includes(pathname)
  ) { result.push(TOURS["order-detail"]); return result; }
  if (pathname === "/warping") { result.push(TOURS.warping); return result; }
  if (pathname === "/feats") { result.push(TOURS.feats); return result; }

  if (pathname === "/character") {
    const tabTours: Record<string, string> = {
      short: "character-sheet",
      profile: "character-profile",
      inventory: "character-inventory",
      ledger: "character-ledger",
      trophies: "character-trophies",
      gifts: "character-feats",
      warping: "character-warping",
      offgame: "character-offgame",
      audit: "character-log",
      edit: "character-edit",
    };
    result.push(TOURS[tabTours[characterTabKey()] ?? "character-sheet"]);
    return result;
  }

  if (pathname === "/forum") { result.push(TOURS.forum); return result; }
  const forumParts = pathname.split("/").filter(Boolean);
  if (
    forumParts[0] === "forum" &&
    !["manage", "moderation"].includes(forumParts[1] ?? "")
  ) {
    if (forumParts.length === 2) { result.push(TOURS["forum-section"]); return result; }
    if (forumParts.length === 3 && forumParts[2] !== "new") {
      result.push(TOURS["forum-topic"]);
      return result;
    }
  }

  if (pathname === "/market") { result.push(TOURS.market); return result; }
  if (/^\/market\/[^/]+$/.test(pathname)) { result.push(TOURS["market-shop"]); return result; }
  if (pathname === "/missions") { result.push(TOURS["daily-missions"]); return result; }
  if (pathname === "/polls") { result.push(TOURS.polls); return result; }
  if (pathname === "/ranking") { result.push(TOURS["hall-of-renown"]); return result; }
  if (pathname === "/rules") { result.push(TOURS["players-handbook"]); return result; }
  if (pathname === "/codex") { result.push(TOURS.codex); return result; }
  if (pathname === "/crafting") { result.push(TOURS.crafting); return result; }

  if (pathname === "/support") {
    result.push(TOURS.tickets);
    return result;
  }

  if (pathname === "/support/new") {
    result.push(TOURS["ticket-new"]);
    return result;
  }

  if (/^\/support\/[^/]+$/.test(pathname)) {
    result.push(TOURS["ticket-detail"]);
    return result;
  }

  if (pathname !== "/game") return result;

  result.push(TOURS["game-location"]);
  addIfPresent(result, "house-of-chances", '[data-tour-area="house-of-chances"]');
  addIfPresent(result, "odd-jobs", '[data-tour-area="odd-jobs"]');
  addIfPresent(result, "gathering", '[data-tour-area="gathering"]');
  addIfPresent(result, "breeze-lodgings", '[data-tour-area="breeze-lodgings"]');
  return result;
}

function availableSteps(tour: TourDefinition): TourStep[] {
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
}

export function PortalFirstVisitTour() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const [activeTour, setActiveTour] = useState<TourDefinition | null>(null);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const startingRef = useRef(false);

  const preparedStepRef =
    useRef<Set<string>>(
      new Set(),
    );

  const [
    contextVersion,
    setContextVersion,
  ] = useState(0);

  useEffect(() => {
    let frame = 0;

    const refreshContext = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setContextVersion((current) => current + 1);
      });
    };

    const observer = new MutationObserver(refreshContext);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "class",
        "open",
        "aria-expanded",
        "data-character-sheet-active-tab",
      ],
    });

    window.addEventListener("popstate", refreshContext);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("popstate", refreshContext);
    };
  }, []);

  const applicableTours = useMemo(
    () => candidateTours(pathname),
    [pathname, contextVersion],
  );

  useEffect(() => {
    let cancelled = false;

    setReady(false);
    setActiveTour(null);
    setSteps([]);
    setStepIndex(0);
    setRect(null);

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user) {
        if (!cancelled) {
          setUserId(null);
          setReady(true);
        }
        return;
      }

      const result = await supabase
        .from("user_tutorial_progress")
        .select("tour_key")
        .eq("user_id", user.id);

      if (cancelled) return;

      if (result.error) {
        console.error(
          "Unable to load tutorial progress:",
          result.error.message,
        );
        setUserId(user.id);
        setReady(false);
        return;
      }

      setUserId(user.id);
      setSeen(
        new Set(
          (result.data ?? []).map((row) => String(row.tour_key)),
        ),
      );
      setReady(true);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [pathname, supabase]);

  const startTour = useCallback(
    async (tour: TourDefinition) => {
      if (!userId || startingRef.current) return;

      const usableSteps = availableSteps(tour);
      if (!usableSteps.length) return;

      startingRef.current = true;

      const result = await supabase
        .from("user_tutorial_progress")
        .insert({
          user_id: userId,
          tour_key: tour.key,
        });

      if (result.error && result.error.code !== "23505") {
        console.error(
          "Unable to mark tutorial as seen:",
          result.error.message,
        );
        startingRef.current = false;
        return;
      }

      setSeen((current) => {
        const next = new Set(current);
        next.add(tour.key);
        return next;
      });

      preparedStepRef.current.clear();
      setActiveTour(tour);
      setSteps(usableSteps);
      setStepIndex(0);
      startingRef.current = false;
    },
    [supabase, userId],
  );

  useEffect(() => {
    if (!ready || !userId || activeTour || startingRef.current) return;

    const timer = window.setTimeout(() => {
      const next = applicableTours.find(
        (tour) => !seen.has(tour.key),
      );

      if (next) {
        void startTour(next);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    activeTour,
    applicableTours,
    pathname,
    ready,
    seen,
    startTour,
    userId,
  ]);

  const complete = useCallback(async () => {
    const tour = activeTour;

    preparedStepRef.current.clear();
    setActiveTour(null);
    setSteps([]);
    setStepIndex(0);
    setRect(null);

    if (!tour || !userId) return;

    const result = await supabase
      .from("user_tutorial_progress")
      .update({
        completed_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("tour_key", tour.key);

    if (result.error) {
      console.error(
        "Unable to complete tutorial:",
        result.error.message,
      );
    }
  }, [activeTour, supabase, userId]);

  useEffect(() => {
    if (!activeTour || !steps.length) {
      setRect(null);
      return;
    }

    const step = steps[stepIndex];

    if (!step) {
      void complete();
      return;
    }

    let raf = 0;

    function updateRect() {
      const prepareKey =
  `${activeTour!.key}:${stepIndex}`;

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
        );
        return;
      }

      let target =
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

      if (!target) {
        if (stepIndex < steps.length - 1) {
          setStepIndex((current) => current + 1);
        } else {
          void complete();
        }
        return;
      }

      const details = target.closest("details");
      if (details) details.open = true;

      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

      raf = window.requestAnimationFrame(() => {
        const box = target.getBoundingClientRect();

        if (box.width < 4 || box.height < 4) {
          if (stepIndex < steps.length - 1) {
            setStepIndex((current) => current + 1);
          } else {
            void complete();
          }
          return;
        }

        const pad = 7;

        setRect({
          top: Math.max(8, box.top - pad),
          left: Math.max(8, box.left - pad),
          width: Math.min(
            window.innerWidth - 16,
            box.width + pad * 2,
          ),
          height: Math.min(
            window.innerHeight - 16,
            box.height + pad * 2,
          ),
        });
      });
    }

    updateRect();

    const onViewportChange = () => updateRect();

    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [activeTour, complete, stepIndex, steps]);

  useEffect(() => {
    if (!activeTour) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        void complete();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTour, complete]);

  useEffect(() => {
    function handlePlayTutorial(
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
    }

    window.addEventListener(
      "sepulchria:play-tutorial",
      handlePlayTutorial,
    );

    return () => {
      window.removeEventListener(
        "sepulchria:play-tutorial",
        handlePlayTutorial,
      );
    };
  }, [
    activeTour,
    applicableTours,
    ready,
    startTour,
    userId,
  ]);

  if (!activeTour || !steps.length) return null;

  const step = steps[stepIndex];
  if (!step) return null;

  const last =
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

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[2147483000] cursor-default"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      />

      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[2147483001] border-2 border-[rgb(var(--sep-skin-c1,var(--sep-colour-d4a460)))] shadow-[0_0_0_9999px_rgba(0,0,0,0.74),0_0_28px_rgba(212,164,96,0.42)] transition-[top,left,width,height] duration-200"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        />
      ) : null}

      <aside
        role="dialog"
        aria-modal="true"
        data-sep-tutorial-dialog="true"
        aria-label={`${activeTour.label} tutorial`}
        style={tutorialPosition}
        className="fixed z-[2147483002] w-[calc(100vw-2rem)] max-w-[390px] border border-[rgb(var(--sep-colour-8d693e))] bg-[rgb(var(--sep-colour-100c09))] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.72)] sm:p-5"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/40 pb-2.5">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-9a7445))]">
            {activeTour.label} · Step {stepIndex + 1} of {steps.length}
          </p>

          <button
            type="button"
            onClick={() => void complete()}
            className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806e59))] transition hover:text-[rgb(var(--sep-colour-d8bb8a))]"
          >
            Skip
          </button>
        </div>

        <h2 className="mt-3 font-serif text-xl text-[rgb(var(--sep-colour-ead3a6))]">
          {step.title}
        </h2>

        <p className="mt-2 text-[11px] leading-6 text-[rgb(var(--sep-colour-b8a68c))]">
          {step.body}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() =>
              setStepIndex((current) => Math.max(0, current - 1))
            }
            className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a08c70))] transition hover:border-[rgb(var(--sep-colour-87663b))] hover:text-[rgb(var(--sep-colour-d4bb91))] disabled:cursor-not-allowed disabled:opacity-35"
          >
            Back
          </button>

          <button
            type="button"
            onClick={() => {
              if (last) {
                void complete();
                return;
              }

              setStepIndex((current) => current + 1);
            }}
            className="border border-[rgb(var(--sep-colour-a77a42))]/75 bg-[rgb(var(--sep-colour-382313))] px-4 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-ead3a6))] transition hover:border-[rgb(var(--sep-colour-d4a460))] hover:bg-[rgb(var(--sep-colour-472c17))]"
          >
            {last ? "Finish" : "Next"}
          </button>
        </div>
      </aside>
    </>
  );
}
