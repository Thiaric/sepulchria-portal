from pathlib import Path

ROOT = Path.cwd()

game_page = ROOT / "app/(portal)/game/page.tsx"
actions_file = ROOT / "app/(portal)/game/gathering-actions.ts"
panel_file = ROOT / "app/(portal)/game/components/GatheringPanel.tsx"

if not game_page.exists():
    raise SystemExit(
        "Could not find app/(portal)/game/page.tsx. "
        "Run this script from the sepulchria-portal repository root."
    )

page = game_page.read_text(encoding="utf-8")

# 1. Import GatheringPanel
old_import = '''import {
  BreezeLodgingsPanel,
  type BreezeLodgingStateRow,
} from "./components/BreezeLodgingsPanel";
'''
new_import = '''import {
  BreezeLodgingsPanel,
  type BreezeLodgingStateRow,
} from "./components/BreezeLodgingsPanel";
import {
  GatheringPanel,
  type GatheringStateRow,
} from "./components/GatheringPanel";
'''
if new_import not in page:
    if old_import not in page:
        raise SystemExit("Could not find BreezeLodgingsPanel import anchor.")
    page = page.replace(old_import, new_import, 1)

# 2. Load Gathering state for the current room via RPC.
old_promise_anchor = '''  const headquartersManageDataPromise =
    getOrderHeadquartersManageData(
      room.id,
      character.id,
    );

  const oddJobsPromise =
'''
new_promise_anchor = '''  const headquartersManageDataPromise =
    getOrderHeadquartersManageData(
      room.id,
      character.id,
    );

  const gatheringPromise =
    supabase.rpc(
      "get_my_gathering_state",
    );

  const oddJobsPromise =
'''
if new_promise_anchor not in page:
    if old_promise_anchor not in page:
        raise SystemExit("Could not find headquarters promise anchor.")
    page = page.replace(old_promise_anchor, new_promise_anchor, 1)

# 3. Promise.all result/value insertion.
old_destructure = '''    staffSession,
    headquartersManageData,
    oddJobsResult,
    houseOfChancesResult,
'''
new_destructure = '''    staffSession,
    headquartersManageData,
    gatheringResult,
    oddJobsResult,
    houseOfChancesResult,
'''
if new_destructure not in page:
    if old_destructure not in page:
        raise SystemExit("Could not find Promise.all destructuring anchor.")
    page = page.replace(old_destructure, new_destructure, 1)

old_array = '''    staffSessionPromise,
    headquartersManageDataPromise,
    oddJobsPromise,
    houseOfChancesPromise,
'''
new_array = '''    staffSessionPromise,
    headquartersManageDataPromise,
    gatheringPromise,
    oddJobsPromise,
    houseOfChancesPromise,
'''
if new_array not in page:
    if old_array not in page:
        raise SystemExit("Could not find Promise.all values anchor.")
    page = page.replace(old_array, new_array, 1)

# 4. Parse Gathering state.
old_state_anchor = '''  const canViewAllWhispers =
    staffSession !== null;

  const {
    data: oddJobsData,
    error: oddJobsError,
  } = oddJobsResult;
'''
new_state_anchor = '''  const canViewAllWhispers =
    staffSession !== null;

  const {
    data: gatheringData,
    error: gatheringError,
  } = gatheringResult;

  if (gatheringError) {
    throw new Error(
      `Unable to load Gathering: ${gatheringError.message}`,
    );
  }

  const gatheringState =
    ((gatheringData ?? [])[0] ?? null) as
      | GatheringStateRow
      | null;

  const {
    data: oddJobsData,
    error: oddJobsError,
  } = oddJobsResult;
'''
if new_state_anchor not in page:
    if old_state_anchor not in page:
        raise SystemExit("Could not find Gathering state insertion anchor.")
    page = page.replace(old_state_anchor, new_state_anchor, 1)

# 5. Render Gathering at the top of the special-panel stack.
old_render_anchor = '''  >

    {room.slug === "house-of-chances" && houseOfChancesState ? (
'''
new_render_anchor = '''  >

    {gatheringState ? (
      <div data-sep-interaction-ignore="true">
        <GatheringPanel state={gatheringState} />
      </div>
    ) : null}

    {room.slug === "house-of-chances" && houseOfChancesState ? (
'''
if new_render_anchor not in page:
    if old_render_anchor not in page:
        raise SystemExit("Could not find special panel render anchor.")
    page = page.replace(old_render_anchor, new_render_anchor, 1)

game_page.write_text(page, encoding="utf-8")

# 6. Server action.
actions_file.write_text(r'''"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type GatheringResult = {
  ok: boolean;
  attempt_id: string;
  outcome_type: "item" | "remnants" | "nothing";
  item_id: string | null;
  item_name: string | null;
  item_image_url: string | null;
  quantity: number | null;
  remnants: number | null;
  ledger_id?: string | null;
  wallet_balance?: number | null;
  attempts_used: number;
  attempts_remaining: number;
  daily_limit: number;
  location_name: string;
  message: string;
};

export async function gatherAtCurrentLocation() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "gather_at_current_location",
  );

  if (error) {
    return {
      ok: false as const,
      message: error.message,
      result: null,
    };
  }

  const raw = Array.isArray(data)
    ? data[0] ?? null
    : data;

  if (!raw || typeof raw !== "object") {
    return {
      ok: false as const,
      message: "The Gathering attempt could not be confirmed.",
      result: null,
    };
  }

  const result = raw as GatheringResult;

  revalidatePath("/game");
  revalidatePath("/character");
  revalidatePath("/crafting");

  return {
    ok: true as const,
    message: result.message,
    result,
  };
}
''', encoding="utf-8")

# 7. Client panel.
panel_file.write_text(r'''"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  gatherAtCurrentLocation,
  type GatheringResult,
} from "../gathering-actions";
import { formatRemnants } from "@/lib/economy/currency";

export type GatheringStateRow = {
  gathering_location_id: string;
  room_id: string;
  location_name: string;
  location_description: string | null;
  nothing_chance: number;
  daily_limit: number;
  attempts_used: number;
  attempts_remaining: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function resultTitle(result: GatheringResult) {
  if (result.outcome_type === "item") {
    return result.item_name ?? "Item found";
  }

  if (result.outcome_type === "remnants") {
    return `${formatRemnants(Number(result.remnants ?? 0))} found`;
  }

  return "Nothing this time";
}

export function GatheringPanel({
  state,
}: {
  state: GatheringStateRow;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<GatheringResult | null>(null);

  const hasAttempts = Number(state.attempts_remaining) > 0;
  const canGather = hasAttempts && !pending && !searching;

  function gather() {
    if (!canGather) return;

    setMessage(null);
    setResult(null);
    setSearching(true);

    startTransition(async () => {
      const started = Date.now();
      const response = await gatherAtCurrentLocation();
      const elapsed = Date.now() - started;

      if (elapsed < 800) {
        await sleep(800 - elapsed);
      }

      if (!response.ok || !response.result) {
        setSearching(false);
        setMessage(response.message);
        router.refresh();
        return;
      }

      setResult(response.result);
      setMessage(response.message);
      setSearching(false);
      router.refresh();
    });
  }

  return (
    <details className="group shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0907))]">
      <summary className="sticky top-0 z-30 flex cursor-pointer list-none items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-59432c))]/30 bg-[linear-gradient(90deg,rgb(var(--sep-colour-100c09)),rgb(var(--sep-colour-17110d)),rgb(var(--sep-colour-100c09)))] px-3 py-2 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="text-[7px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
            Gathering
          </p>
          <p className="mt-0.5 truncate font-serif text-sm text-[rgb(var(--sep-colour-dec89f))]">
            {state.location_name}
          </p>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-right">
            <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
              Attempts
            </p>
            <div className="mt-1 flex max-w-[220px] flex-wrap justify-end gap-1">
              {Array.from({ length: state.daily_limit }).map((_, index) => {
                const remaining = index < state.attempts_remaining;

                return (
                  <span
                    key={index}
                    aria-label={
                      remaining
                        ? "Gathering attempt available"
                        : "Gathering attempt spent"
                    }
                    className={[
                      "h-2.5 w-2.5 shrink-0 rounded-full border",
                      remaining
                        ? "border-[rgb(var(--sep-colour-c19a62))] bg-[rgb(var(--sep-colour-c19a62))]"
                        : "border-[rgb(var(--sep-colour-655744))] bg-transparent",
                    ].join(" ")}
                  />
                );
              })}
            </div>
          </div>

          <span className="text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d65))]">
            <span className="group-open:hidden">Search ▾</span>
            <span className="hidden group-open:inline">Close ▴</span>
          </span>
        </div>
      </summary>

      <div className="relative overflow-hidden border-t border-[rgb(var(--sep-colour-59432c))]/20 px-3 py-4 sm:px-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(var(--sep-rgb-145-105-60),0.12),transparent_34%),radial-gradient(circle_at_82%_80%,rgba(var(--sep-rgb-145-105-60),0.07),transparent_32%)]"
        />

        <div className="relative z-10 mx-auto grid max-w-4xl gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-stretch">
          <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/92 p-4 sm:p-5">
            <p className="text-[7px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
              Search the surroundings
            </p>

            <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-e6cfaa))]">
              What will you uncover?
            </h3>

            {state.location_description ? (
              <p className="mt-2 max-w-2xl text-[10px] leading-5 text-[rgb(var(--sep-colour-948675))]">
                {state.location_description}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={gather}
                disabled={!canGather}
                className="border border-[rgb(var(--sep-colour-8c6a3f))] bg-[rgb(var(--sep-colour-342617))] px-5 py-2.5 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-4a351f))] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {searching
                  ? "Searching..."
                  : hasAttempts
                    ? "Gather"
                    : "No attempts left"}
              </button>

              <p className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
                {state.attempts_remaining} / {state.daily_limit} remaining
              </p>
            </div>
          </section>

          <section className="relative flex min-h-[150px] items-center justify-center overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4 text-center">
            {searching ? (
              <div className="w-full">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border border-[rgb(var(--sep-colour-655744))] border-t-[rgb(var(--sep-colour-d1aa71))]" />
                <p className="mt-3 text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-8f8271))]">
                  Searching...
                </p>
              </div>
            ) : result ? (
              <div className="w-full">
                {result.outcome_type === "item" && result.item_image_url ? (
                  <img
                    src={result.item_image_url}
                    alt=""
                    className="mx-auto mb-3 h-14 w-14 object-contain"
                  />
                ) : null}

                <p className="text-[7px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
                  Found
                </p>

                <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-e6cfaa))]">
                  {resultTitle(result)}
                </p>

                {result.outcome_type === "item" && result.quantity ? (
                  <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-a99b89))]">
                    Quantity: {result.quantity}
                  </p>
                ) : null}

                <p className="mt-3 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
                  {result.attempts_remaining} attempts remain today
                </p>
              </div>
            ) : (
              <div>
                <p className="font-serif text-lg text-[rgb(var(--sep-colour-bca884))]">
                  Search when ready
                </p>
                <p className="mt-2 text-[8px] leading-4 text-[rgb(var(--sep-colour-756958))]">
                  Each search spends one of your shared daily Gathering attempts.
                </p>
              </div>
            )}

            {message && !result && !searching ? (
              <div className="absolute inset-x-3 bottom-3 border border-[rgb(var(--sep-colour-734238))]/45 bg-[rgb(var(--sep-colour-21130f))] px-3 py-2 text-[9px] text-[rgb(var(--sep-colour-cf766b))]">
                {message}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </details>
  );
}
''', encoding="utf-8")

print("Gathering panel patch applied.")
print(f"Created: {actions_file.relative_to(ROOT)}")
print(f"Created: {panel_file.relative_to(ROOT)}")
print(f"Updated: {game_page.relative_to(ROOT)}")
print()
print("Next: run npm run build (or your normal local build check).")
