"use client";

import {
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ItemImageFrame } from "@/components/items/item-image-frame";

export type ItemHoverPreviewData = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  quality: string;
  category_name: string | null;
  subcategory_name: string | null;
  reference_value: number | null;
  is_usable: boolean;
  use_behaviour: string | null;
  target_mode: string | null;
  cooldown_minutes: number | null;
  success_die: number | null;
  success_threshold: number | null;
  success_attribute: string | null;
  damage_dice: string | null;
  damage_type: string | null;
  is_equippable: boolean;
  equip_slot: string | null;
  hands_required: number;
};

function pretty(
  value: string | null | undefined,
) {
  if (!value) return "";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (x) =>
      x.toUpperCase(),
    );
}

export function ItemHoverPreview({
  item,
  children,
}: {
  item: ItemHoverPreviewData;
  children: ReactNode;
}) {
  const wrapperRef =
    useRef<HTMLSpanElement | null>(
      null,
    );

  const [openUp, setOpenUp] =
    useState(false);

  const mechanics: string[] = [];

  function updateDirection() {
    const element =
      wrapperRef.current;

    if (!element) return;

    const rect =
      element.getBoundingClientRect();

    const estimatedPopupHeight =
      320;

    const spaceBelow =
      window.innerHeight -
      rect.bottom;

    const spaceAbove =
      rect.top;

    setOpenUp(
      spaceBelow <
        estimatedPopupHeight &&
        spaceAbove >
          spaceBelow,
    );
  }

  if (
    item.is_equippable &&
    item.equip_slot
  ) {
    mechanics.push(
      `Equip: ${pretty(
        item.equip_slot,
      )}${
        item.hands_required === 2
          ? " · Two-handed"
          : ""
      }`,
    );
  }

  if (item.is_usable) {
    if (item.use_behaviour) {
      mechanics.push(
        `Use: ${pretty(
          item.use_behaviour,
        )}`,
      );
    }

    if (item.target_mode) {
      mechanics.push(
        `Target: ${pretty(
          item.target_mode,
        )}`,
      );
    }

    if (item.success_die) {
      mechanics.push(
        `Roll: d${item.success_die}${
          item.success_attribute
            ? ` + ${pretty(
                item.success_attribute,
              )}`
            : ""
        }${
          item.success_threshold
            ? ` · DC ${item.success_threshold}`
            : ""
        }`,
      );
    }

    if (item.damage_dice) {
      mechanics.push(
        `Damage: ${item.damage_dice}${
          item.damage_type
            ? ` ${pretty(
                item.damage_type,
              )}`
            : ""
        }`,
      );
    }

    if (item.cooldown_minutes) {
      mechanics.push(
        `Cooldown: ${item.cooldown_minutes} min`,
      );
    }
  }

  return (
    <span
      ref={wrapperRef}
      onMouseEnter={
        updateDirection
      }
      onFocus={updateDirection}
      className="group/item-preview relative inline-flex max-w-full"
    >
      <button
        type="button"
        className="cursor-help text-left font-serif text-[rgb(var(--sep-colour-d8c29b))] underline decoration-[rgb(var(--sep-colour-765937))]/60 underline-offset-2 outline-none transition hover:text-[rgb(var(--sep-colour-efd6a8))] focus:text-[rgb(var(--sep-colour-efd6a8))]"
      >
        {children}
      </button>

      <span
        className={[
          "pointer-events-none absolute left-0 z-[9999] hidden w-[420px] max-w-[calc(100vw-72px)]",
          "group-hover/item-preview:block group-focus-within/item-preview:block",
          openUp
            ? "bottom-full mb-2"
            : "top-full mt-2",
        ].join(" ")}
      >
        <span className="pointer-events-auto block border border-[rgb(var(--sep-colour-8d6d3e))]/65 bg-[rgb(var(--sep-colour-0e0a08))] p-4 text-left shadow-[0_20px_55px_rgba(var(--sep-rgb-0-0-0),0.6)]">
          <span className="flex gap-3">
            <ItemImageFrame
              src={item.image_url}
              quality={
                item.quality ||
                "average"
              }
              className="h-16 w-16 shrink-0"
              badgeSize="sm"
              imageClassName="h-full w-full object-contain p-1"
            />

            <span className="min-w-0 flex-1">
              <span className="block font-serif text-base text-[rgb(var(--sep-colour-dec89f))]">
                {item.name}
              </span>

              <span className="mt-1 block text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-776957))]">
                {item.category_name ??
                  "Item"}

                {item.subcategory_name
                  ? ` · ${item.subcategory_name}`
                  : ""}

                {" · "}

                {pretty(
                  item.quality ||
                    "average",
                )}
              </span>
            </span>
          </span>

          {item.description?.trim() ? (
            <span className="mt-3 block whitespace-pre-wrap text-xs leading-5 text-[rgb(var(--sep-colour-9f927f))]">
              {item.description}
            </span>
          ) : null}

          {mechanics.length ? (
            <span className="mt-3 block space-y-1 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-3">
              {mechanics.map(
                (entry) => (
                  <span
                    key={entry}
                    className="block text-[8px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-a99578))]"
                  >
                    {entry}
                  </span>
                ),
              )}
            </span>
          ) : null}

          {item.reference_value !==
          null ? (
            <span className="mt-3 block border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-2 text-[8px] text-[rgb(var(--sep-colour-756958))]">
              Reference value:{" "}
              {item.reference_value.toLocaleString(
                "en-GB",
              )}
            </span>
          ) : null}
        </span>
      </span>
    </span>
  );
}