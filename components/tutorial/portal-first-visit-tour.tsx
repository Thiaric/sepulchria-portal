"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type TourStep = {
  selector: string;
  title: string;
  body: string;
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
          "This bar stays with you throughout the portal. It contains the quickest controls for your account, character and portal-wide tools.",
      },
      {
        selector: "[data-cosmetic-header-controls]",
        title: "Header Controls",
        body:
          "From here you can open the Store, check the world and who is online, control sound and skins, read notifications and messages, open your character controls, and log out. Staff may also see administration controls.",
      },
      {
        selector: ".portal-left-shell",
        title: "Main Navigation",
        body:
          "The left panel is your main navigation. Use it to reach the city, characters, Codex and rules, social tools, the Market, Crafting, missions, private spaces and other portal sections available to you.",
      },
      {
        selector: "[data-portal-centre-host]",
        title: "Main Area",
        body:
          "The centre is where the page you are using lives. On the home page this is Aureth's map; elsewhere it becomes your Location, character sheet, Crafting workbench and other interactive areas.",
      },
      {
        selector: ".portal-right-shell",
        title: "Context Panel",
        body:
          "The right panel changes with what you are doing. In play it shows Location context and people nearby; elsewhere it can show information and shortcuts relevant to the current page.",
      },
    ],
  },

  "game-location": {
    key: "game-location",
    label: "Location",
    steps: [
      {
        selector: ".game_page_article_article",
        title: "A Location",
        body:
          "This is the live play area for your current Location. Special Location features appear above the chronicle when the place supports them.",
      },
      {
        selector: ".game_page_div_container_10",
        title: "The Chronicle",
        body:
          "The central chronicle records what characters say and do. Mechanical actions, rolls, whispers and other system output also appear here when relevant.",
      },
      {
        selector: "[data-room-chat-composer]",
        title: "Write and Act",
        body:
          "Use the composer to speak and describe actions. The Location controls also let you whisper, roll dice, use Attributes, attack, use Feats and Items, Warp, manage Conditions and access other actions available to your character.",
      },
      {
        selector: ".portal-right-shell",
        title: "Who Is Here",
        body:
          "The right panel shows who is present and useful Location context. Character names can open their sheets, and available exits or Location information appear here when relevant.",
      },
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
    label: "Character Sheet",
    steps: [
      {
        selector: '[data-cosmetic-surface="sheet"]',
        title: "Your Character Sheet",
        body:
          "This is the central record for your character: identity, status, mechanics, possessions, history and everything that belongs specifically to them.",
      },
      {
        selector: '.character-sheet-tabs nav[aria-label="Character sheet sections"]',
        title: "Sheet Sections",
        body:
          "Use these tabs to move between the short profile, full profile, Inventory, Ledger, Trophies, Feats, Warping, off-game information, your Log and editing tools available to you.",
      },
      {
        selector: '[data-character-sheet-panel="short"]',
        title: "In Short",
        body:
          "The opening tab gives you the quick version of your character: portrait, identity, Conditions, life state, core profile details and mechanical information.",
      },
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
          "Crafting turns ingredients into items using recipes your character has learned. If you know no recipes yet, this page will remain empty until one is learned.",
      },
      {
        selector: ".crafting_crafting_workbench_section_section",
        title: "Known Recipes",
        body:
          "Choose a recipe from the Maker's Folio. The list tells you whether the materials required for that recipe are currently available.",
      },
      {
        selector: ".crafting_crafting_workbench_section_section_2",
        title: "Ingredients at Hand",
        body:
          "This tray contains carried crafting materials. You can drag them, double-click them, or use the workbench's automatic filling controls where available.",
      },
      {
        selector: ".crafting_crafting_workbench_section_section_3",
        title: "The Workbench",
        body:
          "The workbench shows the selected recipe, its ingredient slots and the item that will be produced. Fill the required slots before crafting.",
      },
    ],
  },
};

function candidateTours(pathname: string): TourDefinition[] {
  if (pathname === "/") return [TOURS["portal-home"]];
  if (pathname === "/character") return [TOURS["character-sheet"]];
  if (pathname === "/crafting") return [TOURS.crafting];

  if (pathname !== "/game") return [];

  const result: TourDefinition[] = [TOURS["game-location"]];

  if (document.querySelector('[data-tour-area="house-of-chances"]')) {
    result.push(TOURS["house-of-chances"]);
  }

  if (document.querySelector('[data-tour-area="odd-jobs"]')) {
    result.push(TOURS["odd-jobs"]);
  }

  if (document.querySelector('[data-tour-area="gathering"]')) {
    result.push(TOURS.gathering);
  }

  if (document.querySelector('[data-tour-area="breeze-lodgings"]')) {
    result.push(TOURS["breeze-lodgings"]);
  }

  return result;
}

function availableSteps(tour: TourDefinition): TourStep[] {
  const steps: TourStep[] = [];

  for (const step of tour.steps) {
    const target = document.querySelector<HTMLElement>(step.selector);
    if (!target) continue;

    const details = target.closest("details");
    if (details) details.open = true;

    steps.push(step);
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
      const next = candidateTours(pathname).find(
        (tour) => !seen.has(tour.key),
      );

      if (next) {
        void startTour(next);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [
    activeTour,
    pathname,
    ready,
    seen,
    startTour,
    userId,
  ]);

  const complete = useCallback(async () => {
    const tour = activeTour;

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
      const target = document.querySelector<HTMLElement>(step.selector);

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

  if (!activeTour || !steps.length) return null;

  const step = steps[stepIndex];
  if (!step) return null;

  const last = stepIndex === steps.length - 1;

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
        aria-label={`${activeTour.label} tutorial`}
        className="fixed bottom-4 right-4 z-[2147483002] w-[calc(100vw-2rem)] max-w-[390px] border border-[rgb(var(--sep-colour-8d693e))] bg-[rgb(var(--sep-colour-100c09))] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.72)] sm:bottom-6 sm:right-6 sm:p-5"
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
