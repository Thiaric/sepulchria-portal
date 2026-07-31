"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type InteractiveWorldMapProps = {
  areas: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  }[];
};

type MapLevel = "continent" | "city";

type CityHotspot = {
  slug: string;
  shortName: string;
  x: number;
  y: number;
  size: number;
};

const cityHotspots: CityHotspot[] = [
  {
    slug: "the-heart-of-sepulchria",
    shortName: "The Heart",
    x: 48.3,
    y: 47.8,
    size: 6,
  },
  {
    slug: "the-eyes-of-sepulchria",
    shortName: "The Eyes",
    x: 63.8,
    y: 22.4,
    size: 5.5,
  },
  {
    slug: "the-mind-of-sepulchria",
    shortName: "The Mind",
    x: 33.4,
    y: 22.5,
    size: 5.5,
  },
  {
    slug: "the-hands-of-sepulchria",
    shortName: "The Hands",
    x: 26.1,
    y: 36.5,
    size: 5.5,
  },
  {
    slug: "the-blood-of-sepulchria",
    shortName: "The Blood",
    x: 26.3,
    y: 54.3,
    size: 5.5,
  },
  {
    slug: "the-bones-of-sepulchria",
    shortName: "The Bones",
    x: 32.6,
    y: 68.8,
    size: 5.5,
  },
  {
    slug: "the-arms-of-sepulchria",
    shortName: "The Arms",
    x: 70.6,
    y: 36.5,
    size: 5.5,
  },
  {
    slug: "the-breath-of-sepulchria",
    shortName: "The Breath",
    x: 69.8,
    y: 54,
    size: 5.5,
  },
  {
    slug: "the-veins-of-sepulchria",
    shortName: "The Veins",
    x: 64.3,
    y: 68.7,
    size: 5.5,
  },
  {
    slug: "the-soul-of-sepulchria",
    shortName: "The Soul",
    x: 48.6,
    y: 11.3,
    size: 5,
  },
  {
    slug: "the-skin-of-sepulchria",
    shortName: "The Skin",
    x: 48.3,
    y: 73.5,
    size: 5.5,
  },
];

export function InteractiveWorldMap({
  areas,
}: InteractiveWorldMapProps) {
  const [level, setLevel] =
    useState<MapLevel>("continent");

  const [hoveredArea, setHoveredArea] =
    useState<string | null>(null);

  function findArea(slug: string) {
    return (
      areas.find(
        (area) => area.slug === slug,
      ) ?? null
    );
  }

  const hoveredHotspot =
    cityHotspots.find(
      (hotspot) =>
        hotspot.slug === hoveredArea,
    ) ?? null;

  const hoveredDatabaseArea =
    hoveredHotspot
      ? findArea(hoveredHotspot.slug)
      : null;

  return (
    <section className="overflow-hidden border border-[#654c2f]/50 bg-[#100c09]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#654c2f]/40 bg-[#17110d] px-4 py-3">
        <div>
          <p className="text-[8px] uppercase tracking-[0.28em] text-[#96734a]">
            Explore Asteros
          </p>

          <h2 className="mt-1 font-serif text-xl text-[#e4cda1]">
            {level === "continent"
              ? "The Land of the Fallen"
              : "Sepulchria — The Living Body"}
          </h2>
        </div>

        {level === "city" ? (
          <button
            type="button"
            onClick={() => {
              setHoveredArea(null);
              setLevel("continent");
            }}
            className="border border-[#765735]/60 bg-[#21170f] px-4 py-2 text-[9px] uppercase tracking-[0.2em] text-[#d2ad72] transition hover:border-[#b28246] hover:bg-[#332317] hover:text-[#f5ddb2]"
          >
            ← Return to continent
          </button>
        ) : (
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#776752]">
            Select a destination
          </p>
        )}
      </div>

      <div className="flex w-full justify-center overflow-hidden bg-[#090705]">
        <div
          className="relative aspect-[3/2] w-full max-w-full overflow-hidden"
          style={{
            width:
              "min(100%, calc((100dvh - 18rem) * 1.5))",
          }}
        >
          {/* CONTINENT MAP */}

          <div
            className={`absolute inset-0 transition-all duration-700 ease-out ${
              level === "continent"
                ? "pointer-events-auto translate-x-0 scale-100 opacity-100"
                : "pointer-events-none -translate-x-[4%] scale-110 opacity-0"
            }`}
            aria-hidden={
              level !== "continent"
            }
          >
            <Image
              src="/maps/land-of-the-fallen.png"
              alt="Map of the Land of the Fallen"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 75vw"
              className="object-contain object-center"
            />

            <button
              type="button"
              aria-label="Enter Sepulchria"
              onClick={() =>
                setLevel("city")
              }
              className="group absolute left-[46.72%] top-[62.7%] z-20 aspect-square w-[5.5%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            >
              <span className="absolute inset-0 rounded-full border-2 border-[#ff3b30] bg-[#ff2d20]/10 opacity-85 shadow-[0_0_8px_rgba(255,45,32,0.95),0_0_20px_rgba(255,45,32,0.7),inset_0_0_10px_rgba(255,45,32,0.3)] transition duration-300 group-hover:scale-125 group-hover:border-[#ff766e] group-hover:bg-[#ff2d20]/20 group-hover:opacity-100 group-hover:shadow-[0_0_12px_rgba(255,70,60,1),0_0_32px_rgba(255,45,32,0.95),inset_0_0_14px_rgba(255,70,60,0.45)] motion-safe:animate-pulse" />

              <span className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap border border-[#9f302a] bg-[#160908]/95 px-3 py-1.5 font-serif text-xs text-[#ffc2bd] opacity-0 shadow-[0_8px_22px_rgba(0,0,0,0.8)] transition duration-300 group-hover:-translate-y-1 group-hover:opacity-100">
                Enter Sepulchria
              </span>
            </button>
          </div>

          {/* CITY MAP */}

          <div
            className={`absolute inset-0 transition-all duration-700 ease-out ${
              level === "city"
                ? "pointer-events-auto translate-x-0 scale-100 opacity-100"
                : "pointer-events-none translate-x-[5%] scale-110 opacity-0"
            }`}
            aria-hidden={level !== "city"}
          >
            <Image
              src="/maps/sepulchria-map.png"
              alt="Map of Sepulchria"
              fill
              sizes="(max-width: 1024px) 100vw, 75vw"
              className="object-contain object-center"
            />

            {cityHotspots.map(
              (hotspot) => {
                const area = findArea(
                  hotspot.slug,
                );

                const active =
                  hoveredArea ===
                  hotspot.slug;

                const style = {
                  left: `${hotspot.x}%`,
                  top: `${hotspot.y}%`,
                  width: `${hotspot.size}%`,
                };

                if (!area) {
                  return (
                    <div
                      key={hotspot.slug}
                      style={style}
                      title={`${hotspot.shortName} is not available`}
                      className="absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#655b51]/50 bg-black/10"
                    />
                  );
                }

                return (
                  <Link
                    key={hotspot.slug}
                    href={`/areas/${area.slug}`}
                    style={style}
                    aria-label={`Open ${area.name}`}
                    onMouseEnter={() =>
                      setHoveredArea(
                        hotspot.slug,
                      )
                    }
                    onMouseLeave={() =>
                      setHoveredArea(null)
                    }
                    onFocus={() =>
                      setHoveredArea(
                        hotspot.slug,
                      )
                    }
                    onBlur={() =>
                      setHoveredArea(null)
                    }
                    className="group absolute z-20 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full"
                  >
                    <span
                      className={`absolute inset-0 rounded-full border-2 transition duration-300 ${
                        active
                          ? "scale-125 border-[#ff766e] bg-[#ff2d20]/20 opacity-100 shadow-[0_0_10px_rgba(255,70,60,1),0_0_28px_rgba(255,45,32,0.95),inset_0_0_12px_rgba(255,70,60,0.45)]"
                          : "border-[#e33a30]/75 bg-[#ff2d20]/5 opacity-60 shadow-[0_0_8px_rgba(255,45,32,0.65)]"
                      }`}
                    />

                    <span
                      className={`pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap border border-[#9f302a] bg-[#160908]/95 px-3 py-1.5 font-serif text-xs text-[#ffc2bd] shadow-[0_8px_22px_rgba(0,0,0,0.85)] transition duration-200 ${
                        active
                          ? "-translate-y-1 opacity-100"
                          : "translate-y-0 opacity-0"
                      }`}
                    >
                      {area.name}
                    </span>
                  </Link>
                );
              },
            )}

            {hoveredDatabaseArea ? (
              <div className="pointer-events-none absolute bottom-4 left-1/2 z-40 w-[min(90%,26rem)] -translate-x-1/2 border border-[#9f302a]/80 bg-[#120b09]/95 px-4 py-3 text-center shadow-[0_12px_34px_rgba(0,0,0,0.9)]">
                <p className="text-[8px] uppercase tracking-[0.25em] text-[#e3665e]">
                  Open district
                </p>

                <p className="mt-1 font-serif text-base text-[#f1d7aa]">
                  {hoveredDatabaseArea.name}
                </p>

                {hoveredDatabaseArea.description ? (
                  <p className="mt-1 text-xs leading-5 text-[#a99984]">
                    {
                      hoveredDatabaseArea.description
                    }
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}