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

  const fog =
    weather === "fog";

  const night =
    hour < 5 ||
    hour >= 21;

  const rainConfig = {
    drizzle: {
      count: 20,
      height: 8,
      width: 1,
      opacity: 0.35,
      speed: 1.15,
      angle: 4,
      drift: -3,
    },

    rain: {
      count: 42,
      height: 16,
      width: 1,
      opacity: 0.68,
      speed: 0.7,
      angle: 9,
      drift: -6,
    },

    heavy_rain: {
      count: 78,
      height: 24,
      width: 1.3,
      opacity: 0.88,
      speed: 0.44,
      angle: 14,
      drift: -10,
    },

    storm: {
      count: 105,
      height: 30,
      width: 1.5,
      opacity: 0.95,
      speed: 0.32,
      angle: 19,
      drift: -15,
    },
  } as const;

  const snowConfig = {
    snow: {
      count: 32,
      minSize: 2,
      maxSize: 4,
      opacity: 0.72,
      speed: 7.6,
      drift: 5,
    },

    heavy_snow: {
      count: 76,
      minSize: 3,
      maxSize: 7,
      opacity: 0.94,
      speed: 4.7,
      drift: 12,
    },
  } as const;

  const currentRainConfig =
    weather in rainConfig
      ? rainConfig[
          weather as keyof typeof rainConfig
        ]
      : null;

  const currentSnowConfig =
    weather in snowConfig
      ? snowConfig[
          weather as keyof typeof snowConfig
        ]
      : null;

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

      {currentRainConfig
        ? Array.from(
            {
              length:
                currentRainConfig.count,
            },
            (_, index) => {
              const variation =
                (index % 7) * 0.025;

              return (
                <i
                  key={`r${index}`}
                  className="sep-rain"
                  style={{
                    left: `${
                      (index * 37) % 103
                    }%`,

                    height: `${
                      currentRainConfig.height +
                      (index % 4) * 1.5
                    }%`,

                    width: `${
                      currentRainConfig.width
                    }px`,

                    opacity:
                      Math.max(
                        0.2,
                        currentRainConfig.opacity -
                          (index % 5) *
                            0.035,
                      ),

                    animationDelay: `${
                      -(index % 17) *
                      0.09
                    }s`,

                    animationDuration: `${
                      currentRainConfig.speed +
                      variation
                    }s`,

                    ["--rain-drift" as string]:
                      `${currentRainConfig.drift}vw`,

                    ["--rain-angle" as string]:
                      `${currentRainConfig.angle}deg`,
                  }}
                />
              );
            },
          )
        : null}

      {currentSnowConfig
        ? Array.from(
            {
              length:
                currentSnowConfig.count,
            },
            (_, index) => {
              const sizeRange =
                currentSnowConfig.maxSize -
                currentSnowConfig.minSize +
                1;

              const size =
                currentSnowConfig.minSize +
                (index % sizeRange);

              return (
                <i
                  key={`s${index}`}
                  className="sep-snow"
                  style={{
                    left: `${
                      (index * 41) %
                      101
                    }%`,

                    width: `${size}px`,
                    height: `${size}px`,

                    opacity:
                      Math.max(
                        0.35,
                        currentSnowConfig.opacity -
                          (index % 5) *
                            0.045,
                      ),

                    animationDelay: `${
                      -(index % 19) *
                      0.23
                    }s`,

                    animationDuration: `${
                      currentSnowConfig.speed +
                      (index % 8) *
                        0.35
                    }s`,

                    ["--snow-drift" as string]:
                      `${
                        index % 2 === 0
                          ? currentSnowConfig.drift
                          : -currentSnowConfig.drift *
                            0.55
                      }vw`,
                  }}
                />
              );
            },
          )
        : null}

      {weather === "storm" ? (
        <>
          <div className="sep-storm-darkening" />
          <div className="sep-lightning" />
        </>
      ) : null}

      <style jsx global>{`
        .sep-rain {
          position: absolute;
          top: -30%;
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(
              210,
              226,
              240,
              0.9
            )
          );
          transform:
            rotate(
              var(
                --rain-angle,
                10deg
              )
            );
          transform-origin: center;
          animation:
            sep-rain-fall linear infinite;
        }

        @keyframes sep-rain-fall {
          from {
            transform:
              translate3d(
                0,
                0,
                0
              )
              rotate(
                var(
                  --rain-angle,
                  10deg
                )
              );
          }

          to {
            transform:
              translate3d(
                var(
                  --rain-drift,
                  -7vw
                ),
                760%,
                0
              )
              rotate(
                var(
                  --rain-angle,
                  10deg
                )
              );
          }
        }

        .sep-snow {
          position: absolute;
          top: -7%;
          border-radius: 999px;
          background: rgba(
            244,
            247,
            250,
            0.95
          );
          box-shadow:
            0 0 3px
            rgba(
              255,
              255,
              255,
              0.25
            );
          animation:
            sep-snow-fall linear infinite;
        }

        @keyframes sep-snow-fall {
          0% {
            transform:
              translate3d(
                0,
                0,
                0
              )
              rotate(0deg);
          }

          50% {
            transform:
              translate3d(
                var(
                  --snow-drift,
                  5vw
                ),
                58vh,
                0
              )
              rotate(140deg);
          }

          100% {
            transform:
              translate3d(
                calc(
                  var(
                    --snow-drift,
                    5vw
                  ) *
                  -0.35
                ),
                115vh,
                0
              )
              rotate(300deg);
          }
        }

        .sep-fog {
          position: absolute;
          inset: -20% -35%;
          background:
            radial-gradient(
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
          animation:
            sep-fog-drift
            18s ease-in-out
            infinite alternate;
        }

        .sep-fog-b {
          animation-duration: 26s;
          animation-direction:
            alternate-reverse;
          opacity: 0.65;
        }

        @keyframes sep-fog-drift {
          to {
            transform:
              translateX(18%)
              scale(1.08);
          }
        }

        .sep-storm-darkening {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              to bottom,
              rgba(
                8,
                13,
                20,
                0.18
              ),
              rgba(
                5,
                9,
                15,
                0.32
              )
            );
        }

        .sep-lightning {
          position: absolute;
          inset: 0;
          background: white;
          opacity: 0;
          animation:
            sep-lightning
            7s infinite;
        }

        @keyframes sep-lightning {
          0%,
          82%,
          84%,
          86%,
          89%,
          100% {
            opacity: 0;
          }

          83% {
            opacity: 0.26;
          }

          85% {
            opacity: 0.08;
          }

          87% {
            opacity: 0.34;
          }

          88% {
            opacity: 0.04;
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