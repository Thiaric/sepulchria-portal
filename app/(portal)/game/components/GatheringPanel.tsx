"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  gatherAtCurrentLocation,
  type GatheringResult,
} from "../gathering-actions";
import { formatRemnants } from "@/lib/economy/currency";
import { usePortalSkin } from "@/components/portal/portal-skin-provider";

const GATHERING_SKIN_ACCENTS: Record<string, string> = {
  sepulchria: "#b68b4f",
  vellum: "#5d4930",
  starfall: "#758fd6",
  "rose-nocturne": "#b36d8b",
  "verdant-reliquary": "#4f9c70",
  "amethyst-veil": "#9b6ac4",
  moonlit: "#b58a4c",
  emberforge: "#c7773d",
  deepwater: "#4f969d",
  "blood-court": "#9d3744",
  ashen: "#9fd4ef",
  "ivory-archive": "#d1c6ad",
  "aelari-dawn": "#e7d9a8",
  "dwarven-deep": "#b37945",
  "mortal-hearth": "#aaa79d",
  "wolfs-moon": "#9aaeb7",
};

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
  const { skin } = usePortalSkin();
  const skinAccent =
    GATHERING_SKIN_ACCENTS[skin] ??
    GATHERING_SKIN_ACCENTS.sepulchria;
  const readableTokenColour =
    "rgb(var(--sep-colour-e6cfaa))";

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
                  <svg
                    key={index}
                    viewBox="0 0 12 12"
                    aria-label={
                      remaining
                        ? "Gathering attempt available"
                        : "Gathering attempt spent"
                    }
                    role="img"
                    className="h-2.5 w-2.5 shrink-0"
                    style={{ color: readableTokenColour }}
                  >
                    <circle
                      cx="6"
                      cy="6"
                      r="5"
                      fill={remaining ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  </svg>
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
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        >
          <div
            className="motion-safe:animate-pulse absolute -left-[5%] top-[4%] h-56 w-56 rounded-full blur-3xl"
            style={{
              animationDuration: "15s",
              background: `radial-gradient(circle, color-mix(in srgb, ${skinAccent} 17%, white 4%) 0%, color-mix(in srgb, ${skinAccent} 6%, transparent) 52%, transparent 74%)`,
              opacity: 0.38,
            }}
          />
          <div
            className="motion-safe:animate-pulse absolute -right-[7%] bottom-[-18%] h-64 w-64 rounded-full blur-3xl"
            style={{
              animationDuration: "20s",
              animationDelay: "-8s",
              background: `radial-gradient(circle, color-mix(in srgb, ${skinAccent} 13%, white 3%) 0%, color-mix(in srgb, ${skinAccent} 5%, transparent) 50%, transparent 74%)`,
              opacity: 0.3,
            }}
          />
          <div
            className="motion-safe:animate-pulse absolute inset-0"
            style={{
              animationDuration: "12s",
              backgroundImage: `radial-gradient(circle at 14% 30%, color-mix(in srgb, ${skinAccent} 22%, white 5%) 0 1px, transparent 1.25px), radial-gradient(circle at 32% 72%, color-mix(in srgb, ${skinAccent} 14%, transparent) 0 1px, transparent 1.25px), radial-gradient(circle at 64% 24%, color-mix(in srgb, ${skinAccent} 18%, transparent) 0 1px, transparent 1.2px), radial-gradient(circle at 86% 68%, color-mix(in srgb, ${skinAccent} 15%, transparent) 0 1px, transparent 1.2px)`,
              opacity: 0.22,
            }}
          />
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 z-[1] h-32 w-[68%] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background: `color-mix(in srgb, ${skinAccent} 10%, transparent)`,
          }}
        />

        <div className="relative z-10 mx-auto grid max-w-4xl gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-stretch">
          <section
            className="relative overflow-hidden border bg-[linear-gradient(180deg,rgb(var(--sep-colour-17110d)),rgb(var(--sep-colour-0d0907)))] p-4 sm:p-5"
            style={{
              borderColor: `color-mix(in srgb, ${skinAccent} 52%, transparent)`,
              boxShadow: `0 16px 34px rgba(0,0,0,0.32), 0 0 22px color-mix(in srgb, ${skinAccent} 10%, transparent), inset 0 1px 0 color-mix(in srgb, ${skinAccent} 12%, transparent)`,
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[-48px] h-24 w-[70%] -translate-x-1/2 rounded-full blur-3xl"
              style={{
                background: `color-mix(in srgb, ${skinAccent} 9%, transparent)`,
              }}
            />
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

          <section
            className="relative flex min-h-[150px] items-center justify-center overflow-hidden border bg-[linear-gradient(180deg,rgb(var(--sep-colour-17110d)),rgb(var(--sep-colour-0d0907)))] p-4 text-center"
            style={{
              borderColor: `color-mix(in srgb, ${skinAccent} 58%, transparent)`,
              boxShadow: result
                ? `0 16px 34px rgba(0,0,0,0.34), 0 0 28px color-mix(in srgb, ${skinAccent} 16%, transparent), inset 0 1px 0 color-mix(in srgb, ${skinAccent} 14%, transparent)`
                : `0 16px 34px rgba(0,0,0,0.30), 0 0 20px color-mix(in srgb, ${skinAccent} 9%, transparent), inset 0 1px 0 color-mix(in srgb, ${skinAccent} 10%, transparent)`,
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[-42px] h-24 w-[80%] -translate-x-1/2 rounded-full blur-3xl"
              style={{
                background: `color-mix(in srgb, ${skinAccent} ${result ? 15 : 8}%, transparent)`,
              }}
            />
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
