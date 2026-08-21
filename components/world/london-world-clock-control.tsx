"use client";

import {
  useMemo,
} from "react";

import { useWorldState } from "@/components/world/world-state-provider";

const LONDON_TIME_ZONE =
  "Europe/London";

function formatLondonDateTime(
  date: Date,
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone:
        LONDON_TIME_ZONE,
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "short",
    },
  ).format(date);
}

function formatLondonDateOnly(
  date: Date,
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone:
        LONDON_TIME_ZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

function formatLondonTimeOnly(
  date: Date,
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone:
        LONDON_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "short",
    },
  ).format(date);
}

export function LondonWorldClockControl() {
  const { gameDate } =
    useWorldState();

  const display =
    useMemo(
      () =>
        formatLondonDateTime(
          gameDate,
        ),
      [gameDate],
    );

  const dateOnly =
    useMemo(
      () =>
        formatLondonDateOnly(
          gameDate,
        ),
      [gameDate],
    );

  const timeOnly =
    useMemo(
      () =>
        formatLondonTimeOnly(
          gameDate,
        ),
      [gameDate],
    );

  return (
    <div className="mt-5">
      {/*
       * Keep the server action supplied
       * with the LIVE game instant rather
       * than the stale SSR value that was
       * present when the page loaded.
       */}
      <input
        type="hidden"
        name="gameDatetime"
        value={
          gameDate.toISOString()
        }
      />

      <p className="text-xs text-[rgb(var(--sep-colour-9a815f))]">
        Game date &amp; time
      </p>

      <div className="mt-2 border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0f0b09))] p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-74634f))]">
              Date
            </p>

            <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-e1cba3))]">
              {dateOnly}
            </p>
          </div>

          <div>
            <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-74634f))]">
              London time
            </p>

            <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-e1cba3))]">
              {timeOnly}
            </p>
          </div>
        </div>

        <p className="mt-4 border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-3 text-[10px] leading-5 text-[rgb(var(--sep-colour-796d5e))]">
          {display}. This clock
          updates every second and
          always uses Europe/London,
          including GMT/BST changes.
        </p>
      </div>
    </div>
  );
}
