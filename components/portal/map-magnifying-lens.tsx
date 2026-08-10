"use client";

import {
  useEffect,
  useState,
  type PointerEvent,
} from "react";

import { AtmosphericImage } from "@/components/world/atmospheric-image";

type MapMagnifyingLensProps = {
  src: string;
  alt: string;
  zoom?: number;
  diameter?: number;
};

type LensPosition = {
  percentX: number;
  percentY: number;
  pixelX: number;
  pixelY: number;
};

type MapSize = {
  width: number;
  height: number;
};

export function MapMagnifyingLens({
  src,
  alt,
  zoom = 2,
  diameter = 450,
}: MapMagnifyingLensProps) {
  const [enabled, setEnabled] =
    useState(false);

  const [
    hasPosition,
    setHasPosition,
  ] = useState(false);

  const [position, setPosition] =
    useState<LensPosition>({
      percentX: 50,
      percentY: 50,
      pixelX: 0,
      pixelY: 0,
    });

  const [mapSize, setMapSize] =
    useState<MapSize>({
      width: 0,
      height: 0,
    });

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setEnabled(false);
        setHasPosition(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, []);

  useEffect(() => {
    setHasPosition(false);
  }, [src]);

  function updatePosition(
    event: PointerEvent<HTMLDivElement>,
  ) {
    const bounds =
      event.currentTarget.getBoundingClientRect();

    if (
      bounds.width <= 0 ||
      bounds.height <= 0
    ) {
      return;
    }

    const rawPixelX =
      event.clientX - bounds.left;

    const rawPixelY =
      event.clientY - bounds.top;

    const pixelX = Math.max(
      0,
      Math.min(
        bounds.width,
        rawPixelX,
      ),
    );

    const pixelY = Math.max(
      0,
      Math.min(
        bounds.height,
        rawPixelY,
      ),
    );

    const percentX =
      (pixelX / bounds.width) *
      100;

    const percentY =
      (pixelY / bounds.height) *
      100;

    setMapSize({
      width: bounds.width,
      height: bounds.height,
    });

    setPosition({
      percentX,
      percentY,
      pixelX,
      pixelY,
    });

    setHasPosition(true);
  }

  function handlePointerMove(
    event: PointerEvent<HTMLDivElement>,
  ) {
    if (!enabled) {
      return;
    }

    updatePosition(event);
  }

  function handlePointerDown(
    event: PointerEvent<HTMLDivElement>,
  ) {
    if (!enabled) {
      return;
    }

    updatePosition(event);
  }

  const lensSize = diameter;
  const lensRadius =
    lensSize / 2;

  const magnifiedWidth =
    mapSize.width * zoom;

  const magnifiedHeight =
    mapSize.height * zoom;

  /*
   * Clamp the LENS CENTRE inside the
   * map so the circle never sticks out
   * beyond the map container.
   */
  const lensCenterX =
    mapSize.width > 0
      ? Math.max(
          Math.min(
            position.pixelX,
            Math.max(
              lensRadius,
              mapSize.width -
                lensRadius,
            ),
          ),
          Math.min(
            lensRadius,
            mapSize.width / 2,
          ),
        )
      : 0;

  const lensCenterY =
    mapSize.height > 0
      ? Math.max(
          Math.min(
            position.pixelY,
            Math.max(
              lensRadius,
              mapSize.height -
                lensRadius,
            ),
          ),
          Math.min(
            lensRadius,
            mapSize.height / 2,
          ),
        )
      : 0;

  /*
   * Convert the clamped lens centre back
   * to percentages for absolute positioning.
   */
  const lensPercentX =
    mapSize.width > 0
      ? (lensCenterX /
          mapSize.width) *
        100
      : 50;

  const lensPercentY =
    mapSize.height > 0
      ? (lensCenterY /
          mapSize.height) *
        100
      : 50;

  /*
   * Important:
   * the magnified image is still centred
   * on the ACTUAL cursor/tap position,
   * not on the clamped lens centre.
   *
   * So when the lens reaches an edge,
   * the glass stops moving but the
   * inspected point remains accurate.
   */
  const magnifiedLeft =
    lensRadius -
    position.pixelX * zoom;

  const magnifiedTop =
    lensRadius -
    position.pixelY * zoom;

  return (
    <>
      <button
        type="button"
        aria-pressed={enabled}
        aria-label={
          enabled
            ? "Close map magnifying lens"
            : "Open map magnifying lens"
        }
        title={
          enabled
            ? "Close lens (Esc)"
            : "Magnify map"
        }
        onClick={() => {
          setEnabled(
            (current) =>
              !current,
          );

          if (enabled) {
            setHasPosition(
              false,
            );
          }
        }}
        className={`absolute left-3 top-3 z-[80] flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-sm transition ${
          enabled
            ? "border-[#d1a15e] bg-[#3a2818]/95 text-[#f4ddb1] shadow-[0_0_18px_rgba(188,137,73,0.35)]"
            : "border-[#765735]/75 bg-[#17110d]/90 text-[#c9a46e] hover:border-[#b28246] hover:bg-[#2a1d13] hover:text-[#f5ddb2]"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle
            cx="10.8"
            cy="10.8"
            r="6.4"
          />

          <path d="m15.6 15.6 4.2 4.2" />

          <path d="M10.8 7.8v6" />

          <path d="M7.8 10.8h6" />
        </svg>
      </button>

      {enabled ? (
        <div
          onPointerMove={
            handlePointerMove
          }
          onPointerDown={
            handlePointerDown
          }
          onPointerLeave={() => {
            if (
              window.matchMedia(
                "(hover: hover)",
              ).matches
            ) {
              setHasPosition(
                false,
              );
            }
          }}
          className="absolute inset-0 z-[70] cursor-crosshair touch-none overflow-hidden"
          aria-label="Map magnifying lens active"
        >
          {!hasPosition ? (
            <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 border border-[#765735]/60 bg-[#120d09]/90 px-3 py-1.5 text-[8px] uppercase tracking-[0.2em] text-[#c9a46e] shadow-[0_6px_20px_rgba(0,0,0,0.45)]">
              Move or tap over the
              map
            </div>
          ) : null}

          {hasPosition &&
          mapSize.width > 0 &&
          mapSize.height > 0 ? (
            <div
              className="pointer-events-none absolute overflow-hidden rounded-full border-[5px] border-[#6f4b28] bg-[#090705] shadow-[0_12px_30px_rgba(0,0,0,0.9),inset_0_0_0_2px_rgba(225,188,126,0.48),inset_0_0_18px_rgba(0,0,0,0.75)]"
              style={{
                width: `${lensSize}px`,
                height: `${lensSize}px`,
                left: `${lensPercentX}%`,
                top: `${lensPercentY}%`,
                transform:
                  "translate(-50%, -50%)",
              }}
            >
              <div
                className="absolute"
                style={{
                  width: `${magnifiedWidth}px`,
                  height: `${magnifiedHeight}px`,
                  left: `${magnifiedLeft}px`,
                  top: `${magnifiedTop}px`,
                }}
              >
                <AtmosphericImage
                  src={src}
                  alt={alt}
                  variant="map"
                  sizes={`${Math.ceil(
                    magnifiedWidth,
                  )}px`}
                  objectFit="fill"
                />
              </div>

              {/* Inner glass edge */}
              <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-[#e1bc7e]/35" />

              {/* Subtle centre crosshair */}
              <div className="absolute left-1/2 top-1/2 h-px w-4 -translate-x-1/2 -translate-y-1/2 bg-[#f1d39c]/35" />

              <div className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-[#f1d39c]/35" />
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}