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

  /*
   * TIME OF DAY
   *
   * Night uses dedicated artwork, so there
   * is NO additional nighttime darkening.
   *
   * 05:00–06:59 = dawn
   * 07:00–17:59 = full daylight
   * 18:00–19:59 = evening
   * 20:00–04:59 = dedicated night image
   */

  if (
    hour >= 5 &&
    hour < 7
  ) {
    brightness *= 1;
  } else if (
    hour >= 18 &&
    hour < 20
  ) {
    brightness *= 1;
  }

  /*
   * WEATHER
   *
   * Keep the existing weather effects
   * regardless of which artwork is shown.
   */
  if (
    [
      "cloudy",
      "overcast",
      "fog",
      "drizzle",
      "rain",
      "heavy_rain",
      "storm",
      "hail",
    ].includes(weather)
  ) {
    saturation *=
      weather === "cloudy"
        ? 1
        : 1;

    brightness *=
      weather === "storm"
        ? 1
        : weather === "hail"
          ? 1
          : weather ===
              "overcast"
            ? 1
            : 1;
  }

  if (
    [
      "snow",
      "heavy_snow",
    ].includes(weather)
  ) {
    saturation *= 1;
  }

  return `brightness(${brightness}) saturate(${saturation})`;
}

export function AtmosphericImage({
  src,
  nightSrc,
  alt,
  variant = "scene",
  priority,
  sizes,
  objectFit = "cover",
  showWeatherEffects = true,
}: {
  src: string;
  nightSrc?: string;
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
    showWeatherEffects?: boolean;
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

  const isNight =
  hour < 5 ||
  hour >= 20;

const selectedSrc =
  isNight && nightSrc
    ? nightSrc
    : src;

const normalisedSrc =
  selectedSrc.startsWith("/") ||
  selectedSrc.startsWith("http://") ||
  selectedSrc.startsWith("https://")
    ? selectedSrc
    : `/${selectedSrc}`;

return (
  <>
    <Image
      src={normalisedSrc}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={`${objectFitClass} object-center transition-[filter] duration-1000`}
      style={{
        filter:
  atmosphericFilter(
    hour,
    showWeatherEffects
      ? state.weather
      : "clear",
    variant,
  ),
      }}
    />

    {showWeatherEffects ? (
  <AtmosphericOverlay />
) : null}
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

  

  const rainConfig = {
    drizzle: {
      count: 14,
      height: 8,
      width: 1,
      opacity: 0.3,
      speed: 0.9,
      angle: 7,
      drift: -4,
    },

    rain: {
      count: 36,
      height: 12,
      width: 1,
      opacity: 0.48,
      speed: 0.82,
      angle: 8,
      drift: -5,
    },

    heavy_rain: {
      count: 80,
      height: 15,
      width: 1.1,
      opacity: 0.62,
      speed: 0.68,
      angle: 9,
      drift: -6,
    },

    storm: {
      count: 110,
      height: 17,
      width: 1.2,
      opacity: 0.7,
      speed: 0.62,
      angle: 11,
      drift: -7,
    },
  } as const;

  /*
   * +30% snow volume compared with
   * the previous version.
   */
  const snowConfig = {
    snow: {
      count: 36,
      minSize: 2,
      maxSize: 4,
      opacity: 0.66,
      speed: 7.4,
      drift: 5,
    },

    heavy_snow: {
      count: 111,
      minSize: 2,
      maxSize: 5,
      opacity: 0.84,
      speed: 6,
      drift: 7,
    },
  } as const;

  /*
   * Hail is deliberately visually different
   * from both rain and snow:
   * small solid pellets, steeper fall,
   * and a little lateral movement.
   */
  const hailConfig = {
    count: 72,
    minSize: 2,
    maxSize: 4,
    opacity: 0.88,
    speed: 1.15,
    drift: -3,
  };

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

  const isHail =
    weather === "hail";

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
      aria-hidden="true"
    >
      

      {fog ? (
        <>
          <div className="sep-fog" />
          <div className="sep-fog sep-fog-b" />
        </>
      ) : null}

      {/* RAIN */}
      {currentRainConfig
        ? Array.from(
            {
              length:
                currentRainConfig.count,
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

                  height: `${
                    currentRainConfig.height +
                    (index % 3)
                  }%`,

                  width: `${
                    currentRainConfig.width
                  }px`,

                  opacity:
                    Math.max(
                      0.2,
                      currentRainConfig.opacity -
                        (index % 4) *
                          0.025,
                    ),

                  animationDelay: `${
                    -(index % 17) *
                    0.11
                  }s`,

                  animationDuration: `${
                    currentRainConfig.speed +
                    (index % 5) *
                      0.03
                  }s`,

                  ["--rain-drift" as string]:
                    `${currentRainConfig.drift}vw`,

                  ["--rain-angle" as string]:
                    `${currentRainConfig.angle}deg`,
                }}
              />
            ),
          )
        : null}

      {/* SNOW */}
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
                            0.035,
                      ),

                    animationDelay: `${
                      -(index % 19) *
                      0.23
                    }s`,

                    animationDuration: `${
                      currentSnowConfig.speed +
                      (index % 7) *
                        0.3
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

      {/* HAIL */}
      {isHail
        ? Array.from(
            {
              length:
                hailConfig.count,
            },
            (_, index) => {
              const sizeRange =
                hailConfig.maxSize -
                hailConfig.minSize +
                1;

              const size =
                hailConfig.minSize +
                (index % sizeRange);

              return (
                <i
                  key={`h${index}`}
                  className="sep-hail"
                  style={{
                    left: `${
                      (index * 43) %
                      103
                    }%`,

                    width: `${size}px`,
                    height: `${size}px`,

                    opacity:
                      Math.max(
                        0.5,
                        hailConfig.opacity -
                          (index % 4) *
                            0.045,
                      ),

                    animationDelay: `${
                      -(index % 17) *
                      0.08
                    }s`,

                    animationDuration: `${
                      hailConfig.speed +
                      (index % 5) *
                        0.06
                    }s`,

                    ["--hail-drift" as string]:
                      `${
                        index % 2 === 0
                          ? hailConfig.drift
                          : -hailConfig.drift *
                            0.55
                      }vw`,
                  }}
                />
              );
            },
          )
        : null}

      {/* STORM */}
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

          background:
            linear-gradient(
              to bottom,
              transparent,
              rgba(var(--sep-rgb-210-226-240),0.86)
            );

          transform:
            rotate(
              var(
                --rain-angle,
                8deg
              )
            );

          transform-origin: center;

          animation:
            sep-rain-fall
            linear infinite;
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
                  8deg
                )
              );
          }

          to {
            transform:
              translate3d(
                var(
                  --rain-drift,
                  -5vw
                ),
                760%,
                0
              )
              rotate(
                var(
                  --rain-angle,
                  8deg
                )
              );
          }
        }

        .sep-snow {
          position: absolute;
          top: -7%;

          border-radius: 999px;

          background:
            rgba(var(--sep-rgb-244-247-250),0.94);

          box-shadow:
            0 0 3px
            rgba(var(--sep-rgb-255-255-255),0.24);

          animation:
            sep-snow-fall
            linear infinite;
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
              rotate(110deg);
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
              rotate(220deg);
          }
        }

        .sep-hail {
          position: absolute;
          top: -5%;

          border-radius: 999px;

          background:
            rgba(var(--sep-rgb-225-235-241),0.96);

          box-shadow:
            0 0 2px
            rgba(var(--sep-rgb-255-255-255),0.5);

          animation:
            sep-hail-fall
            linear infinite;
        }

        @keyframes sep-hail-fall {
          0% {
            transform:
              translate3d(
                0,
                0,
                0
              );
          }

          100% {
            transform:
              translate3d(
                var(
                  --hail-drift,
                  -3vw
                ),
                115vh,
                0
              );
          }
        }

        .sep-fog {
          position: absolute;
          inset: -20% -35%;

          background:
            radial-gradient(
              ellipse at center,
              rgba(var(--sep-rgb-210-215-210),0.22),
              rgba(var(--sep-rgb-160-170-165),0.1)
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
              rgba(var(--sep-rgb-8-13-20),0.18),
              rgba(var(--sep-rgb-5-9-15),0.3)
            );
        }

        .sep-lightning {
          position: absolute;
          inset: 0;

          background: white;
          opacity: 0;

          animation:
            sep-lightning
            16s ease-in-out infinite;
        }

        @keyframes sep-lightning {
          0%,
          84%,
          91%,
          100% {
            opacity: 0;
          }

          87% {
            opacity: 0.09;
          }
        }

        @media (
          prefers-reduced-motion:
            reduce
        ) {
          .sep-rain,
          .sep-snow,
          .sep-hail,
          .sep-fog,
          .sep-lightning {
            animation: none !important;
          }

          .sep-lightning {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}