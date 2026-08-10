"use client";

import Image from "next/image";

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

function atmosphericFilter(
  hour: number,
  weather: string,
  variant:
    | "scene"
    | "map",
) {
  let brightness = 1;
  let saturation = 1;

  const minimumBrightness =
    variant === "map"
      ? 0.55
      : 0.34;

  if (
    hour < 5 ||
    hour >= 21
  ) {
    brightness *=
      minimumBrightness;
  } else if (hour < 7) {
    brightness *= 0.72;
  } else if (hour >= 18) {
    brightness *=
      hour >= 20
        ? 0.55
        : 0.76;
  }

  if (
    [
      "cloudy",
      "overcast",
      "fog",
      "drizzle",
      "rain",
      "heavy_rain",
      "storm",
    ].includes(weather)
  ) {
    saturation *=
      weather === "cloudy"
        ? 0.78
        : 0.64;

    brightness *=
      weather === "storm"
        ? 0.72
        : weather ===
            "overcast"
          ? 0.82
          : 0.9;
  }

  if (
    [
      "snow",
      "heavy_snow",
    ].includes(weather)
  ) {
    saturation *= 0.82;
  }

  return `brightness(${Math.max(
    minimumBrightness,
    brightness,
  )}) saturate(${saturation})`;
}

export function AtmosphericImage({
  src,
  alt,
  variant = "scene",
  priority,
  sizes,
  objectFit = "cover",
}: {
  src: string;
  alt: string;
  variant?:
    | "scene"
    | "map";
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

  const objectFitClass =
    objectFit === "fill"
      ? "object-fill"
      : objectFit ===
          "contain"
        ? "object-contain"
        : "object-cover";

  return (
    <>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={`${objectFitClass} object-center transition-[filter] duration-1000`}
        style={{
          filter:
            atmosphericFilter(
              hour,
              state.weather,
              variant,
            ),
        }}
      />

      <AtmosphericOverlay />
    </>
  );
}

export function AtmosphericOverlay() {
  const {
    state,
    gameDate,
  } = useWorldState();

  const hour =
    getLondonHour(gameDate);

  const weather =
    state.weather;

  const rain =
    [
      "drizzle",
      "rain",
      "heavy_rain",
      "storm",
    ].includes(weather);

  const snow =
    [
      "snow",
      "heavy_snow",
    ].includes(weather);

  const fog =
    weather === "fog";

  const night =
    hour < 5 ||
    hour >= 21;

  const particleCount =
    weather === "storm" ||
    weather ===
      "heavy_rain" ||
    weather ===
      "heavy_snow"
      ? 70
      : state.weather_intensity ===
          "heavy"
        ? 60
        : state.weather_intensity ===
            "light"
          ? 28
          : 44;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
      aria-hidden="true"
    >
      {night ? (
        <div className="absolute inset-0 bg-[#06101c]/15" />
      ) : null}

      {fog ? (
        <>
          <div className="sep-fog" />
          <div className="sep-fog sep-fog-b" />
        </>
      ) : null}

      {rain
        ? Array.from(
            {
              length:
                particleCount,
            },
            (_, index) => (
              <i
                key={`r${index}`}
                className="sep-rain"
                style={{
                  left: `${
                    (index * 37) %
                    103
                  }%`,
                  animationDelay: `${
                    -(
                      index % 17
                    ) * 0.11
                  }s`,
                  animationDuration: `${
                    0.48 +
                    (index % 7) *
                      0.055
                  }s`,
                }}
              />
            ),
          )
        : null}

      {snow
        ? Array.from(
            {
              length:
                particleCount,
            },
            (_, index) => (
              <i
                key={`s${index}`}
                className="sep-snow"
                style={{
                  left: `${
                    (index * 41) %
                    101
                  }%`,
                  width: `${
                    2 +
                    (index % 4)
                  }px`,
                  height: `${
                    2 +
                    (index % 4)
                  }px`,
                  animationDelay: `${
                    -(
                      index % 19
                    ) * 0.23
                  }s`,
                  animationDuration: `${
                    4.2 +
                    (index % 8) *
                      0.45
                  }s`,
                }}
              />
            ),
          )
        : null}

      {weather === "storm" ? (
        <div className="sep-lightning" />
      ) : null}

      <style jsx global>{`
        .sep-rain {
          position: absolute;
          top: -18%;
          height: 18%;
          width: 1px;
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(210, 226, 240, 0.82)
          );
          transform: rotate(10deg);
          animation: sep-rain-fall
            linear infinite;
        }

        @keyframes sep-rain-fall {
          to {
            transform: translate3d(
                -7vw,
                760%,
                0
              )
              rotate(10deg);
          }
        }

        .sep-snow {
          position: absolute;
          top: -5%;
          border-radius: 999px;
          background: rgba(
            244,
            247,
            250,
            0.9
          );
          animation: sep-snow-fall
            linear infinite;
        }

        @keyframes sep-snow-fall {
          to {
            transform: translate3d(
                7vw,
                115vh,
                0
              )
              rotate(260deg);
          }
        }

        .sep-fog {
          position: absolute;
          inset: -20% -35%;
          background: radial-gradient(
            ellipse at center,
            rgba(
              210,
              215,
              210,
              0.22
            ),
            rgba(
                160,
                170,
                165,
                0.1
              )
              38%,
            transparent 70%
          );
          filter: blur(18px);
          animation: sep-fog-drift
            18s ease-in-out infinite
            alternate;
        }

        .sep-fog-b {
          animation-duration: 26s;
          animation-direction:
            alternate-reverse;
          opacity: 0.65;
        }

        @keyframes sep-fog-drift {
          to {
            transform: translateX(
                18%
              )
              scale(1.08);
          }
        }

        .sep-lightning {
          position: absolute;
          inset: 0;
          background: white;
          opacity: 0;
          animation: sep-lightning
            8s infinite;
        }

        @keyframes sep-lightning {
          0%,
          86%,
          88%,
          90%,
          100% {
            opacity: 0;
          }

          87% {
            opacity: 0.22;
          }

          89% {
            opacity: 0.08;
          }
        }

        @media (
          prefers-reduced-motion:
            reduce
        ) {
          .sep-rain,
          .sep-snow,
          .sep-fog,
          .sep-lightning {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
