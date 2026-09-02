"use client";

import { useEffect, useRef } from "react";

import {
  PUBLIC_COSMETIC_CATEGORIES,
  type CosmeticCategory,
} from "@/lib/cosmetics/catalogue";

type PublicCosmeticMap =
  Partial<Record<CosmeticCategory, string>>;

const SURFACE_RULES: Record<
  string,
  CosmeticCategory[]
> = {
  sheet: ["profile_background"],
  portrait: ["portrait_frame"],
  nameplate: ["nameplate", "profile_crest"],
  action: ["action_style", "action_flourish"],
  whisper: ["whisper_style"],
  pm: ["pm_frame"],
  instant: ["instant_chat_frame"],
  forum: ["forum_frame"],
};

function cssUrl(value: string) {
  return `url("${value.replace(/"/g, "%22")}")`;
}

function applySurface(
  element: HTMLElement,
  cosmetics: PublicCosmeticMap,
) {
  const surface = element.dataset.cosmeticSurface ?? "";
  const categories = SURFACE_RULES[surface] ?? [];

  for (const category of categories) {
    const asset = cosmetics[category];
    const cssName = `--sep-cosmetic-${category.replaceAll("_", "-")}`;

    if (asset) {
      element.style.setProperty(cssName, cssUrl(asset));
      element.dataset[`has${category
        .split("_")
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join("")}`] = "true";
    } else {
      element.style.removeProperty(cssName);
    }
  }
}

export function CosmeticRuntime() {
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function scan() {
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>(
          "[data-cosmetic-character-id][data-cosmetic-surface]",
        ),
      );

      const ids = Array.from(
        new Set(
          elements
            .map((element) => element.dataset.cosmeticCharacterId ?? "")
            .filter(Boolean),
        ),
      );

      if (!ids.length) return;

      try {
        const response = await fetch(
          `/api/cosmetics/equipped?ids=${encodeURIComponent(
            ids.join(","),
          )}&categories=${encodeURIComponent(
            PUBLIC_COSMETIC_CATEGORIES.join(","),
          )}`,
          { cache: "no-store" },
        );

        const data = (await response.json()) as {
          cosmetics?: Record<
            string,
            Record<string, { assetUrl?: string }>
          >;
        };

        if (!response.ok || cancelled) return;

        const resolved: Record<string, PublicCosmeticMap> = {};

        for (const [characterId, entries] of Object.entries(
          data.cosmetics ?? {},
        )) {
          resolved[characterId] = {};

          for (const [category, entry] of Object.entries(entries)) {
            if (entry.assetUrl) {
              resolved[characterId][
                category as CosmeticCategory
              ] = entry.assetUrl;
            }
          }
        }

        for (const element of elements) {
          const characterId =
            element.dataset.cosmeticCharacterId ?? "";
          applySurface(
            element,
            resolved[characterId] ?? {},
          );
        }
      } catch (error) {
        console.error("Unable to apply cosmetics:", error);
      }
    }

    function schedule() {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
      timer.current = window.setTimeout(() => {
        void scan();
      }, 80);
    }

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    schedule();

    const interval = window.setInterval(() => {
      void scan();
    }, 30000);

    window.addEventListener("focus", schedule);

    return () => {
      cancelled = true;
      observer.disconnect();
      window.clearInterval(interval);
      window.removeEventListener("focus", schedule);
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, []);

  return (
    <style>{`
      [data-cosmetic-surface="portrait"][data-has-portrait-frame="true"] {
        box-sizing: border-box;
        border: 9px solid transparent !important;
        border-image-source: var(--sep-cosmetic-portrait-frame);
        border-image-slice: 12%;
        border-image-width: 1;
        border-image-repeat: stretch;
      }

      [data-cosmetic-surface="nameplate"] {
        position: relative;
        isolation: isolate;
      }

      [data-cosmetic-surface="nameplate"][data-has-nameplate="true"] {
        display: inline-block;
        border: 5px 9px solid transparent;
        border-image-source: var(--sep-cosmetic-nameplate);
        border-image-slice: 18% 10%;
        border-image-width: 1;
        border-image-repeat: stretch;
      }

      [data-cosmetic-surface="nameplate"][data-has-profile-crest="true"]::after {
        content: "";
        position: absolute;
        z-index: 2;
        width: 28px;
        height: 28px;
        right: -18px;
        top: 50%;
        transform: translateY(-50%);
        background-image: var(--sep-cosmetic-profile-crest);
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
        pointer-events: none;
      }

      [data-cosmetic-surface="sheet"][data-has-profile-background="true"] {
        background-image:
          linear-gradient(rgba(0,0,0,.72), rgba(0,0,0,.72)),
          var(--sep-cosmetic-profile-background);
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
      }

      [data-cosmetic-surface="pm"][data-has-pm-frame="true"] {
        border: 8px 10px solid transparent !important;
        border-image-source: var(--sep-cosmetic-pm-frame);
        border-image-slice: 15% 9%;
        border-image-width: 1;
        border-image-repeat: stretch;
      }

      [data-cosmetic-surface="instant"][data-has-instant-chat-frame="true"] {
        border: 6px 8px solid transparent !important;
        border-image-source: var(--sep-cosmetic-instant-chat-frame);
        border-image-slice: 15% 10%;
        border-image-width: 1;
        border-image-repeat: stretch;
      }

      [data-cosmetic-surface="forum"][data-has-forum-frame="true"] {
        border: 10px solid transparent !important;
        border-image-source: var(--sep-cosmetic-forum-frame);
        border-image-slice: 12% 8%;
        border-image-width: 1;
        border-image-repeat: stretch;
      }

      [data-cosmetic-surface="action"] {
        isolation: isolate;
      }

      [data-cosmetic-surface="action"][data-has-action-style="true"] {
        background-image: var(--sep-cosmetic-action-style);
        background-position: center bottom;
        background-repeat: no-repeat;
        background-size: 100% auto;
      }

      [data-cosmetic-surface="action"][data-has-action-flourish="true"]::after {
        content: "";
        position: absolute;
        z-index: 1;
        right: 4px;
        bottom: 0;
        width: min(260px, 38%);
        height: 34px;
        background-image: var(--sep-cosmetic-action-flourish);
        background-position: right bottom;
        background-repeat: no-repeat;
        background-size: contain;
        pointer-events: none;
      }

      [data-cosmetic-surface="whisper"] {
        isolation: isolate;
      }

      [data-cosmetic-surface="whisper"][data-has-whisper-style="true"]::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 0;
        background-image: var(--sep-cosmetic-whisper-style);
        background-position: center;
        background-repeat: no-repeat;
        background-size: 100% 100%;
        opacity: .72;
        pointer-events: none;
      }

      [data-cosmetic-surface="whisper"][data-has-whisper-style="true"] > * {
        position: relative;
        z-index: 1;
      }
    `}</style>
  );
}
