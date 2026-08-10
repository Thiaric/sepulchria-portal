"use client";

import {
  useMemo,
} from "react";

import { useWorldState } from "@/components/world/world-state-provider";

const ICONS: Record<
  string,
  string
> = {
  clear: "☀",
  partly_cloudy: "◐",
  cloudy: "☁",
  overcast: "☁",
  fog: "≋",
  drizzle: "☂",
  rain: "☂",
  heavy_rain: "☂",
  storm: "ϟ",
  snow: "❄",
  heavy_snow: "❄",
};

const LONDON_TIME_ZONE =
  "Europe/London";

function getLondonHour(
  date: Date,
) {
  const hour =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          LONDON_TIME_ZONE,
        hour: "2-digit",
        hour12: false,
      },
    ).format(date);

  return Number.parseInt(
    hour,
    10,
  );
}

function weatherLabel(
  value: string,
) {
  return value
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

export function WorldIndicator() {
  const {
    state,
    gameDate,
  } = useWorldState();

  const hour =
    getLondonHour(gameDate);

  const phase =
    hour < 5
      ? "Night"
      : hour < 7
        ? "Dawn"
        : hour < 18
          ? "Day"
          : hour < 20
            ? "Dusk"
            : "Night";

  const time = useMemo(
    () =>
      new Intl.DateTimeFormat(
        "en-GB",
        {
          timeZone:
            LONDON_TIME_ZONE,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        },
      ).format(gameDate),
    [gameDate],
  );

  const zone = useMemo(
    () => {
      const parts =
        new Intl.DateTimeFormat(
          "en-GB",
          {
            timeZone:
              LONDON_TIME_ZONE,
            timeZoneName: "short",
          },
        ).formatToParts(
          gameDate,
        );

      return (
        parts.find(
          (part) =>
            part.type ===
            "timeZoneName",
        )?.value ?? "London"
      );
    },
    [gameDate],
  );

  return (
    <div
      className="hidden h-10 items-center gap-2 border border-[#614b31] bg-[#17120f] px-3 text-[#c9aa79] md:flex"
      title={`${weatherLabel(
        state.weather,
      )} · ${
        state.temperature_c
      }°C · ${phase}`}
    >
      <span aria-hidden="true">
        {ICONS[state.weather] ??
          "◌"}
      </span>

      <span className="text-[9px] uppercase tracking-[0.15em]">
        {state.temperature_c}°C
      </span>

      <span>·</span>

      <span className="font-serif text-sm text-[#e0c89e]">
        {time}
      </span>

    
    </div>
  );
}
