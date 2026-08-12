"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { AtmosphericImage } from "@/components/world/atmospheric-image";
import { useWorldState } from "@/components/world/world-state-provider";

const LONDON_TIME_ZONE =
  "Europe/London";

function getLondonHour(
  date: Date,
) {
  const formatted =
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
    formatted,
    10,
  );
}

function insertSuffixBeforeExtension(
  url: string,
  suffix: string,
) {
  const queryIndex =
    url.search(/[?#]/);

  const pathname =
    queryIndex >= 0
      ? url.slice(0, queryIndex)
      : url;

  const tail =
    queryIndex >= 0
      ? url.slice(queryIndex)
      : "";

  const slashIndex =
    pathname.lastIndexOf("/");

  const dotIndex =
    pathname.lastIndexOf(".");

  if (
    dotIndex <= slashIndex
  ) {
    return `${pathname}${suffix}${tail}`;
  }

  return `${pathname.slice(
    0,
    dotIndex,
  )}${suffix}${pathname.slice(
    dotIndex,
  )}${tail}`;
}

function getLocationImageUrl(
  baseUrl: string,
  weather: string,
  hour: number,
) {
  /*
   * Snow has priority over night.
   *
   * The weather engine currently uses "snow" and "heavy_snow".
   */
  if (
    weather === "snow" ||
    weather === "heavy_snow"
  ) {
    return insertSuffixBeforeExtension(
      baseUrl,
      "-s",
    );
  }

  /*
   * Match the portal's existing AtmosphericImage day/night rules:
   * night from 21:00 through 04:59.
   */
  if (
    hour < 5 ||
    hour >= 21
  ) {
    return insertSuffixBeforeExtension(
      baseUrl,
      "-n",
    );
  }

  return baseUrl;
}

export function LocationAtmosphericImage({
  src,
  alt,
  priority,
  sizes,
  objectFit = "cover",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  objectFit?:
    | "cover"
    | "fill"
    | "contain";
}) {
  const {
    state,
    gameDate,
  } = useWorldState();

  const hour =
    getLondonHour(gameDate);

  const atmosphericSrc =
    useMemo(
      () =>
        getLocationImageUrl(
          src,
          state.weather,
          hour,
        ),
      [
        src,
        state.weather,
        hour,
      ],
    );

  const [
    fallbackToBase,
    setFallbackToBase,
  ] = useState(false);

  useEffect(() => {
    setFallbackToBase(false);
  }, [atmosphericSrc]);

  const displayedSrc =
    fallbackToBase
      ? src
      : atmosphericSrc;

  return (
    <div
      className="absolute inset-0"
      onErrorCapture={() => {
        if (
          displayedSrc !== src
        ) {
          setFallbackToBase(true);
        }
      }}
    >
      <AtmosphericImage
        key={displayedSrc}
        src={displayedSrc}
        alt={alt}
        variant="scene"
        priority={priority}
        sizes={sizes}
        objectFit={objectFit}
      />
    </div>
  );
}
