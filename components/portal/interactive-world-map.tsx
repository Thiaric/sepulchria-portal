"use client";

import { RichTextContentClient } from "@/components/editor/rich-text-content-client";
import { MapMagnifyingLens } from "@/components/portal/map-magnifying-lens";
import { AtmosphericImage } from "@/components/world/atmospheric-image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type InteractiveWorldMapProps = {
  areas: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  }[];
};

type MapLevel =
  | "continent"
  | "city";

type CityHotspot = {
  slug: string;
  shortName: string;
  points: string;
  labelX: number;
  labelY: number;
};

/*
 * Polygon coordinates use the map's native 1536 x 1024 coordinate system.
 * Edit `points` to reshape a district.
 */
const cityHotspots: CityHotspot[] = [
  { slug: "the-heart-of-sepulchria", shortName: "The Heart", points: "360,321,617,254,681,262,883,316,894,352,848,382,822,420,839,444,897,474,970,467,966,524,734,596,678,562,608,567,573,595,536,639,524,685,501,730,497,780,522,821,487,843,442,798,455,771,383,723,425,689,438,647,418,622,365,601,376,563,389,519,392,498,436,449,441,384", labelX: 619, labelY: 470 },
  { slug: "the-eyes-of-sepulchria", shortName: "The Eyes", points: "794,82,798,132,793,170,792,206,800,241,898,288,910,271,919,238,930,235,940,256,948,284,1067,333,1173,303,1272,268,1187,168,1131,139,1140,62,1057,44,1034,55,1027,90,934,113", labelX: 1017, labelY: 196 },
  { slug: "the-mind-of-sepulchria", shortName: "The Mind", points: "745,613,760,674,753,754,772,741,877,783,967,732,962,695,986,687,1045,668,1049,645,1048,614,1001,581,984,569,970,548,905,561,809,587", labelX: 889, labelY: 660 },
  { slug: "the-hands-of-sepulchria", shortName: "The Hands", points: "114,710,134,675,197,622,232,598,290,607,355,601,399,611,420,639,423,672,399,705,378,720,378,731,443,771,432,797,437,809,485,850,454,876,438,842,416,875,373,876,357,856,347,877,236,851,183,815,182,780,182,757,167,747,153,748,115,724", labelX: 297, labelY: 736 },
  { slug: "the-blood-of-sepulchria", shortName: "The Blood", points: "514,763,540,792,541,815,611,861,640,869,689,872,689,807,700,773,706,785,747,740,747,701,736,643,716,595,683,573,643,569,605,586,572,606,550,630,552,668,535,689,514,727", labelX: 634, labelY: 717 },
  { slug: "the-bones-of-sepulchria", shortName: "The Bones", points: "714,874,719,807,774,773,851,805,872,828,877,799,1074,699,1080,640,1170,588,1343,670,1472,615,1506,695,1460,784,1356,876,1297,933,1189,967,1169,977,1029,937,990,948,893,902,850,935,805,918,775,918,723,901", labelX: 1138, labelY: 748 },
  { slug: "the-arms-of-sepulchria", shortName: "The Arms", points: "248,351,233,346,203,359,129,385,115,407,98,416,80,497,205,563,237,557,286,573,362,557,373,534,373,515,362,503,367,487,404,461,420,443,424,404,423,379,393,355,347,328,282,354,263,367", labelX: 259, labelY: 452 },
  { slug: "the-breath-of-sepulchria", shortName: "The Breath", points: "889,366,856,374,834,401,840,438,867,457,932,467,977,457,1018,432,1034,415,1071,389,1062,362,948,312,948,280,924,229,904,275,905,359", labelX: 945, labelY: 383 },
  { slug: "the-veins-of-sepulchria", shortName: "The Veins", points: "989,470,977,504,985,538,1012,562,1061,591,1073,566,1084,530,1096,561,1117,579,1166,552,1182,554,1199,530,1209,546,1278,530,1285,503,1294,486,1303,497,1309,516,1347,488,1315,457,1266,432,1209,427,1179,419,1166,396,1149,413,1087,405,1049,420,1038,443", labelX: 1140, labelY: 490 },
  { slug: "the-soul-of-sepulchria", shortName: "The Soul", points: "434,232,472,261,614,234,689,235,777,249,781,192,784,133,780,74,739,63,704,64,704,34,650,26,572,43,561,67,507,80,475,99,483,173", labelX: 626, labelY: 150 },
  { slug: "the-skin-of-sepulchria", shortName: "The Skin", points: "443,107,458,171,426,196,415,214,348,247,254,278,248,249,233,248,226,276,226,289,197,305,148,339,91,369,81,351,61,291,9,213,130,126,222,72,287,23,363,15,443,44", labelX: 245, labelY: 177 },
];

function getAreaInfoPosition(
  hotspot: CityHotspot,
) {
  const xPercent =
    (hotspot.labelX / 1536) * 100;

  const yPercent =
    (hotspot.labelY / 1024) * 100;

  /*
   * Put the information panel on the opposite
   * side of the map from the hovered district.
   *
   * Values are deliberately kept away from the
   * edges so the box remains inside the map.
   */
  const left =
    xPercent < 50 ? 72 : 28;

  const top =
    yPercent < 50 ? 72 : 28;

  return {
    left: `${left}%`,
    top: `${top}%`,
  };
}

export function InteractiveWorldMap({
  areas,
}: InteractiveWorldMapProps) {
  const searchParams =
    useSearchParams();

  const [level, setLevel] =
    useState<MapLevel>(() =>
      searchParams.get("map") ===
      "sepulchria"
        ? "city"
        : "continent",
    );

  const [
    hoveredArea,
    setHoveredArea,
  ] = useState<string | null>(
    null,
  );


  const mapAreaRef =
    useRef<HTMLDivElement>(null);

  const [
    mapSize,
    setMapSize,
  ] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const mapArea =
      mapAreaRef.current;

    if (!mapArea) {
      return;
    }

    const updateMapSize = () => {
      const rect =
        mapArea.getBoundingClientRect();

      const portalMain =
        mapArea.closest(
          "main[data-portal-column]",
        );

      const availableBottom =
        portalMain instanceof HTMLElement
          ? portalMain.getBoundingClientRect()
              .bottom
          : window.innerHeight;

      const availableHeight =
        Math.max(
          0,
          availableBottom -
            rect.top,
        );

      const availableWidth =
        mapArea.clientWidth;

      /*
       * Both map images are 1536 x 1024,
       * therefore their natural ratio is 3:2.
       *
       * We choose the largest 3:2 rectangle that
       * fits BOTH the available width and the
       * remaining height of the central portal body.
       */
      const widthFromHeight =
        availableHeight * 1.5;

      const width =
        Math.min(
          availableWidth,
          widthFromHeight,
        );

      const height =
        width / 1.5;

      setMapSize({
        width:
          Math.floor(width),
        height:
          Math.floor(height),
      });
    };

    updateMapSize();

    const resizeObserver =
      new ResizeObserver(
        updateMapSize,
      );

    resizeObserver.observe(
      mapArea,
    );

    const portalMain =
      mapArea.closest(
        "main[data-portal-column]",
      );

    if (
      portalMain instanceof HTMLElement
    ) {
      resizeObserver.observe(
        portalMain,
      );
    }

    window.addEventListener(
      "resize",
      updateMapSize,
    );

    return () => {
      resizeObserver.disconnect();

      window.removeEventListener(
        "resize",
        updateMapSize,
      );
    };
  }, []);

  function findArea(
    slug: string,
  ) {
    return (
      areas.find(
        (area) =>
          area.slug === slug,
      ) ?? null
    );
  }

  const hoveredHotspot =
    cityHotspots.find(
      (hotspot) =>
        hotspot.slug ===
        hoveredArea,
    ) ?? null;

  const hoveredDatabaseArea =
    hoveredHotspot
      ? findArea(
          hoveredHotspot.slug,
        )
      : null;

      const hoveredInfoPosition =
  hoveredHotspot
    ? getAreaInfoPosition(
        hoveredHotspot,
      )
    : null;

  const currentMapSrc =
    level === "continent"
      ? "/maps/land-of-the-fallenv2.png"
      : "/maps/sepulchria-mapv2.png";

  const currentMapAlt =
    level === "continent"
      ? "Map of The Godscar"
      : "Map of Sepulchria";

  return (
    <section className="relative z-10 overflow-visible border border-[#654c2f]/50 bg-[#100c09]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#654c2f]/40 bg-[#17110d] px-4 py-2">
        <div>
          <p className="text-[8px] uppercase tracking-[0.28em] text-[#96734a]">
            Welcome to Aureth -
            Explore the World and
            choose where your story
            will continue
          </p>

          <h2 className="mt-0 font-serif text-xl text-[#e4cda1]">
            {level ===
            "continent"
              ? "The Godscar"
              : "Sepulchria — The Living Body"}
          </h2>
        </div>

        {level === "city" ? (
          <button
            type="button"
            onClick={() => {
              setHoveredArea(
                null,
              );
              setLevel(
                "continent",
              );
            }}
            className="border border-[#765735]/80 bg-[#21170f] px-4 py-2 text-[9px] uppercase tracking-[0.2em] text-[#9c8156] transition hover:border-[#b28246] hover:bg-[#332317] hover:text-[#fad798]"
          >
            ← Return to continent
          </button>
        ) : (
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#776752]">
            Select a destination
          </p>
        )}
      </div>

      <div
        ref={mapAreaRef}
        className="flex w-full min-w-0 justify-center overflow-hidden bg-[#090705]"
      >
        <div
          className="relative min-w-0 max-w-full overflow-hidden"
          style={
            mapSize
              ? {
                  width: `${mapSize.width}px`,
                  height: `${mapSize.height}px`,
                }
              : {
                  width: "100%",
                  aspectRatio: "3 / 2",
                  maxHeight:
                    "calc(100dvh - 12rem)",
                }
          }
        >
          {/* CONTINENT MAP */}

          <div
            className={`absolute inset-0 transition-all duration-700 ease-out ${
              level ===
              "continent"
                ? "pointer-events-auto translate-x-0 scale-100 opacity-100"
                : "pointer-events-none -translate-x-[4%] scale-110 opacity-0"
            }`}
            aria-hidden={
              level !==
              "continent"
            }
          >
            <AtmosphericImage
  src="/maps/land-of-the-fallenv2.png"
  nightSrc="/maps/land-of-the-fallenv2-n.png"
  alt="Map of The Godscar"
              variant="map"
              priority
              sizes="(max-width: 1024px) 100vw, 75vw"
              objectFit="contain"
            />

            <button
              type="button"
              aria-label="Enter Sepulchria"
              onClick={() =>
                setLevel("city")
              }
              className="group absolute left-[47.09%] top-[69.7%] z-20 aspect-square w-[10.9%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            >
              <span className="absolute inset-0 rounded-full border-[3px] border-[#c39a58] bg-[#b28246]/10 opacity-95 shadow-[0_0_4px_rgba(225,185,120,1),0_0_11px_rgba(178,130,70,0.95),0_0_22px_rgba(178,130,70,0.65),inset_0_0_7px_rgba(178,130,70,0.22)] transition duration-300 group-hover:scale-125 group-hover:border-[4px] group-hover:border-[#e1b978] group-hover:bg-[#b28246]/20 group-hover:opacity-100 group-hover:shadow-[0_0_6px_rgba(238,204,143,1),0_0_16px_rgba(225,185,120,1),0_0_34px_rgba(178,130,70,0.9),inset_0_0_10px_rgba(225,185,120,0.30)] motion-safe:animate-pulse" />

              <span className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap border border-[#8f6a3d] bg-[#17110d]/95 px-3 py-1.5 font-serif text-xs text-[#e7c991] opacity-0 shadow-[0_8px_22px_rgba(0,0,0,0.8)] transition duration-300 group-hover:-translate-y-1 group-hover:opacity-100">
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
            aria-hidden={
              level !== "city"
            }
          >
            <AtmosphericImage
  src="/maps/sepulchria-mapv2.png"
  nightSrc="/maps/sepulchria-mapv2-n.png"
  alt="Map of Sepulchria"
              variant="map"
              sizes="(max-width: 1024px) 100vw, 75vw"
              objectFit="contain"
            />

            <svg
              viewBox="0 0 1536 1024"
              preserveAspectRatio="none"
              className="absolute inset-0 z-20 h-full w-full"
              aria-label="Sepulchria districts"
            >
              <defs>
                <filter id="district-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="7" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {cityHotspots.map((hotspot) => {
                const area = findArea(hotspot.slug);
                const active = hoveredArea === hotspot.slug;

                if (!area) {
                  return (
                    <polygon
                      key={hotspot.slug}
                      points={hotspot.points}
                      fill="rgba(0,0,0,0.10)"
                      stroke="rgba(139,105,64,0.82)"
                      strokeWidth="3"
                      vectorEffect="non-scaling-stroke"
                      style={{
                        filter:
                          "drop-shadow(0 0 2px rgba(139,105,64,0.55))",
                      }}
                    />
                  );
                }

                return (
                  <Link
                    key={hotspot.slug}
                    href={`/areas/${area.slug}`}
                    aria-label={`Open ${area.name}`}
                    onMouseEnter={() => setHoveredArea(hotspot.slug)}
                    onMouseLeave={() => setHoveredArea(null)}
                    onFocus={() => setHoveredArea(hotspot.slug)}
                    onBlur={() => setHoveredArea(null)}
                  >
                    <polygon
                      points={hotspot.points}
                      className="cursor-pointer transition-all duration-300"
                      fill={active ? "rgba(178,130,70,0.20)" : "rgba(178,130,70,0.045)"}
                      stroke={active ? "rgba(238,204,143,1)" : "rgba(195,154,88,0.98)"}
                      strokeWidth={active ? 5 : 3}
                      vectorEffect="non-scaling-stroke"
                      style={{
                        filter: active
                          ? "drop-shadow(0 0 5px rgba(238,204,143,0.95)) drop-shadow(0 0 11px rgba(178,130,70,0.75))"
                          : "drop-shadow(0 0 2px rgba(178,130,70,0.72))",
                      }}
                    />
                  </Link>
                );
              })}
            </svg>

            {cityHotspots.map((hotspot) => {
              const area = findArea(hotspot.slug);
              if (!area || hoveredArea !== hotspot.slug) return null;

              return (
                <div
                  key={`label-${hotspot.slug}`}
                  className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full whitespace-nowrap border border-[#8f6a3d] bg-[#17110d]/95 px-3 py-1.5 font-serif text-xs text-[#e7c991] shadow-[0_8px_22px_rgba(0,0,0,0.85)]"
                  style={{
                    left: `${(hotspot.labelX / 1536) * 100}%`,
                    top: `${(hotspot.labelY / 1024) * 100}%`,
                  }}
                >
                  {area.name}
                </div>
              );
            })}

            {hoveredDatabaseArea &&
hoveredInfoPosition ? (
  <div
    className="pointer-events-none absolute z-40 hidden w-[min(42%,26rem)] -translate-x-1/2 -translate-y-1/2 border border-[#8f6a3d]/80 bg-[#120b09]/95 px-4 py-3 text-center shadow-[0_12px_34px_rgba(0,0,0,0.9)] transition-[left,top] duration-200 md:block"
    style={hoveredInfoPosition}
  >
    <p className="font-serif text-base text-[#f1d7aa]">
      {hoveredDatabaseArea.name}
    </p>

    {hoveredDatabaseArea.description ? (
      <RichTextContentClient
        body={
          hoveredDatabaseArea.description
        }
        className="mt-1 text-xs leading-5 text-[#a99984] [&_p]:m-0 [&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-xs [&_img]:hidden [&_table]:hidden"
      />
    ) : null}
  </div>
) : null}
              
          </div>

          {/*
           * SHARED MAP LENS
           *
           * It sits above whichever map is active.
           * While enabled it intentionally captures
           * map pointer events, so hotspot navigation
           * cannot accidentally fire while someone
           * is examining the map through the lens.
           */}
          <MapMagnifyingLens
            key={currentMapSrc}
            src={currentMapSrc}
            alt={currentMapAlt}
            zoom={2}
            diameter={450}
          />
        </div>
            </div>

      {level === "city" &&
      hoveredDatabaseArea ? (
        <div className="border-t border-[#654c2f]/50 bg-[#17110d] px-4 py-3 md:hidden">
          <p className="text-[8px] uppercase tracking-[0.22em] text-[#96734a]">
            District
          </p>

          <p className="mt-1 font-serif text-base text-[#f1d7aa]">
            {hoveredDatabaseArea.name}
          </p>

          {hoveredDatabaseArea.description ? (
            <RichTextContentClient
              body={
                hoveredDatabaseArea.description
              }
              className="mt-1 text-[11px] leading-4 text-[#a99984] [&_p]:m-0 [&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-xs [&_img]:hidden [&_table]:hidden"
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}