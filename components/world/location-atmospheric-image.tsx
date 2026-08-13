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

function deriveLocationImageUrl(
  baseUrl: string,
  weather: string,
  hour: number,
) {
  if (
    weather === "snow" ||
    weather === "heavy_snow"
  ) {
    return insertSuffixBeforeExtension(
      baseUrl,
      "-s",
    );
  }

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

export function useLocationImageSource(
  src: string,
) {
  const {
    state,
    gameDate,
  } = useWorldState();

  const hour =
    getLondonHour(gameDate);

  return useMemo(
    () =>
      deriveLocationImageUrl(
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
  const atmosphericSrc =
    useLocationImageSource(src);

    const { gameDate } = useWorldState();

const hour = getLondonHour(gameDate);

const isNight =
  hour < 5 || hour >= 21;

  const [
  fallbackStage,
  setFallbackStage,
] = useState<
  "atmospheric" | "night" | "base"
>("atmospheric");

  useEffect(() => {
  setFallbackStage("atmospheric");
}, [atmosphericSrc]);

  const nightSrc =
  insertSuffixBeforeExtension(
    src,
    "-n",
  );

const displayedSrc =
  fallbackStage === "base"
    ? src
    : fallbackStage === "night"
      ? nightSrc
      : atmosphericSrc;

  return (
    <div
      className="absolute inset-0"
      onErrorCapture={() => {
  if (
    fallbackStage === "atmospheric"
  ) {
    if (
      isNight &&
      atmosphericSrc !== nightSrc
    ) {
      setFallbackStage("night");
    } else {
      setFallbackStage("base");
    }

    return;
  }

  if (fallbackStage === "night") {
    setFallbackStage("base");
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
