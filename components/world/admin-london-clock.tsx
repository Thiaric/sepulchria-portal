"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

const LONDON_TIME_ZONE =
  "Europe/London";

function londonParts(date: Date) {
  const formatter =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          LONDON_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZoneName: "short",
      },
    );

  const parts =
    formatter.formatToParts(
      date,
    );

  const get = (
    type: Intl.DateTimeFormatPartTypes,
  ) =>
    parts.find(
      (part) =>
        part.type === type,
    )?.value ?? "";

  return {
    day: get("day"),
    month: get("month"),
    year: get("year"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
    zone:
      get("timeZoneName") ||
      "London",
  };
}

export function AdminLondonClock() {
  const [now, setNow] =
    useState(() => new Date());

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        setNow(new Date());
      }, 1_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const parts = useMemo(
    () => londonParts(now),
    [now],
  );

  /*
   * The server action expects an ISO-compatible
   * datetime value in `gameDatetime`.
   *
   * A Date represents one absolute instant, so
   * sending toISOString() correctly preserves
   * the same moment represented by the London
   * display regardless of BST/GMT.
   */
  const submitValue =
    now.toISOString();

  return (
    <div className="mt-5">
      <input
        type="hidden"
        name="gameDatetime"
        value={submitValue}
      />

      <p className="text-xs text-[rgb(var(--sep-colour-9a815f))]">
        Game date &amp; time
      </p>

      <div className="mt-2 border border-[rgb(var(--sep-colour-60482e))] bg-[rgb(var(--sep-colour-0f0b09))] p-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-74634f))]">
              Date
            </p>

            <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-e1cba3))]">
              {parts.day}/
              {parts.month}/
              {parts.year}
            </p>
          </div>

          <div className="sm:text-right">
            <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-74634f))]">
              Time
            </p>

            <p className="mt-1 font-serif text-2xl tabular-nums text-[rgb(var(--sep-colour-efd5a8))]">
              {parts.hour}:
              {parts.minute}:
              {parts.second}
            </p>
          </div>
        </div>

        
      </div>
    </div>
  );
}
