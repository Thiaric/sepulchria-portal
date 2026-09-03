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
  "off-character": ["off_character_message_frame"],
  pm: ["pm_frame"],
  instant: ["instant_chat_frame"],
  forum: ["forum_frame"],
};

function cssUrl(value: string) {
  return `url("${value.replace(/"/g, "%22")}")`;
}

function datasetKey(category: CosmeticCategory) {
  return `has${category
    .split("_")
    .map(
      (part) =>
        part[0].toUpperCase() +
        part.slice(1),
    )
    .join("")}`;
}

function applySurface(
  element: HTMLElement,
  cosmetics: PublicCosmeticMap,
) {
  const surface =
    element.dataset.cosmeticSurface ?? "";

  const categories =
    SURFACE_RULES[surface] ?? [];

  for (const category of categories) {
    const asset =
      cosmetics[category];

    const cssName =
      `--sep-cosmetic-${category.replaceAll("_", "-")}`;

    const flag =
      datasetKey(category);

    if (asset) {
      element.style.setProperty(
        cssName,
        cssUrl(asset),
      );

      element.dataset[flag] =
        "true";
    } else {
      element.style.removeProperty(
        cssName,
      );

      delete element.dataset[
        flag
      ];
    }
  }
}

export function CosmeticRuntime() {
  const timer =
    useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function scan() {
      const elements =
        Array.from(
          document.querySelectorAll<HTMLElement>(
            "[data-cosmetic-character-id][data-cosmetic-surface]",
          ),
        );

      const ids =
        Array.from(
          new Set(
            elements
              .map(
                (element) =>
                  element.dataset
                    .cosmeticCharacterId ??
                  "",
              )
              .filter(Boolean),
          ),
        );

      if (!ids.length) {
        return;
      }

      try {
        const response =
          await fetch(
            `/api/cosmetics/equipped?ids=${encodeURIComponent(
              ids.join(","),
            )}&categories=${encodeURIComponent(
              PUBLIC_COSMETIC_CATEGORIES.join(
                ",",
              ),
            )}`,
            {
              cache:
                "no-store",
            },
          );

        const data =
          (await response.json()) as {
            cosmetics?: Record<
              string,
              Record<
                string,
                {
                  assetUrl?: string;
                }
              >
            >;
          };

        if (
          !response.ok ||
          cancelled
        ) {
          return;
        }

        const resolved:
          Record<
            string,
            PublicCosmeticMap
          > = {};

        for (
          const [
            characterId,
            entries,
          ] of Object.entries(
            data.cosmetics ?? {},
          )
        ) {
          resolved[
            characterId
          ] = {};

          for (
            const [
              category,
              entry,
            ] of Object.entries(
              entries,
            )
          ) {
            if (
              entry.assetUrl
            ) {
              resolved[
                characterId
              ][
                category as CosmeticCategory
              ] =
                entry.assetUrl;
            }
          }
        }

        for (
          const element of
            elements
        ) {
          const characterId =
            element.dataset
              .cosmeticCharacterId ??
            "";

          applySurface(
            element,
            resolved[
              characterId
            ] ?? {},
          );
        }
      } catch (error) {
        console.error(
          "Unable to apply cosmetics:",
          error,
        );
      }
    }

    function schedule() {
      if (
        timer.current !== null
      ) {
        window.clearTimeout(
          timer.current,
        );
      }

      timer.current =
        window.setTimeout(
          () => {
            void scan();
          },
          80,
        );
    }

    const observer =
      new MutationObserver(
        schedule,
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      },
    );

    schedule();

    const interval =
      window.setInterval(
        () => {
          void scan();
        },
        30000,
      );

    window.addEventListener(
      "focus",
      schedule,
    );

    return () => {
      cancelled = true;
      observer.disconnect();

      window.clearInterval(
        interval,
      );

      window.removeEventListener(
        "focus",
        schedule,
      );

      if (
        timer.current !== null
      ) {
        window.clearTimeout(
          timer.current,
        );
      }
    };
  }, []);

  return (
    <style>{`
      /*
       * Cosmetic composition layer.
       *
       * The artwork is deliberately kept in pseudo-elements or backgrounds.
       * Content remains real portal UI above the cosmetic layer.
       */

      [data-cosmetic-surface] {
        --sep-cosmetic-shell-z: 4;
      }

      /* ---------------------------------------------------------------
       * PORTRAIT FRAME
       * Ornamental shell around the portrait, without consuming the
       * portrait's usable image area.
       * --------------------------------------------------------------- */
      [data-cosmetic-surface="portrait"][data-has-portrait-frame="true"] {
        position: relative !important;
        isolation: isolate;
        overflow: visible !important;
        z-index: 0;
      }

      [data-cosmetic-surface="portrait"][data-has-portrait-frame="true"]::after {
        content: "";
        position: absolute;
        z-index: var(--sep-cosmetic-shell-z);
        inset: -7px;
        border: 12px solid transparent;
        border-image-source: var(--sep-cosmetic-portrait-frame);
        border-image-slice: 13% 13%;
        border-image-width: 1;
        border-image-repeat: stretch;
        pointer-events: none;
        filter: drop-shadow(0 3px 6px rgba(0,0,0,.42));
      }

      [data-cosmetic-surface="portrait"][data-has-portrait-frame="true"] > img {
        position: relative;
        z-index: 1;
      }

      /* ---------------------------------------------------------------
       * NAMEPLATE + CREST
       * A genuine identity plate rather than a tight border on text.
       * --------------------------------------------------------------- */
      [data-cosmetic-surface="nameplate"] {
        position: relative;
        isolation: isolate;
      }

      [data-cosmetic-surface="nameplate"][data-has-nameplate="true"] {
        /*
         * Keep the protected centre around the identity text, but scale
         * the breathing room with the display's own font size.
         * Large profile names therefore get a complete plate while
         * compact identity displays stay compact.
         */
        display: inline-block;
        width: fit-content;
        max-width: 100%;
        padding:
          0.22em
          clamp(16px, 1.05em, 34px)
          0.24em
          clamp(14px, 0.9em, 30px) !important;
        margin-block: -0.12em 0.08em;
        overflow: visible;
      }

      [data-cosmetic-surface="nameplate"][data-has-nameplate="true"]::before {
        content: "";
        position: absolute;
        z-index: -1;

        /*
         * The 1600×320 nameplate is very wide. A deeper vertical slice
         * and independently-sized horizontal/vertical border widths keep
         * the top/bottom rails visible instead of leaving only the large
         * end ornaments.
         */
        inset: -0.45em -0.48em;
        border-style: solid;
        border-color: transparent;
        border-width:
          clamp(8px, 0.55em, 18px)
          clamp(14px, 0.95em, 30px);
        border-image-source: var(--sep-cosmetic-nameplate);
        border-image-slice: 26% 11% fill;
        border-image-width: 1;
        border-image-repeat: stretch;
        pointer-events: none;
        filter: drop-shadow(0 2px 6px rgba(0,0,0,.38));
      }

      [data-cosmetic-surface="nameplate"][data-has-profile-crest="true"]::after {
        content: "";
        position: absolute;
        z-index: 5;
        width: 30px;
        height: 30px;
        right: -14px;
        top: 50%;
        transform: translateY(-50%);
        background-image: var(--sep-cosmetic-profile-crest);
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
        pointer-events: none;
        filter: drop-shadow(0 2px 5px rgba(0,0,0,.5));
      }

      /* ---------------------------------------------------------------
       * PROFILE BACKGROUND
       *
       * The artwork is its own layer INSIDE the sheet-frame border.
       * This makes a 2400×1600 profile background align with the same
       * inner rectangle as the equipped sheet frame, instead of being
       * painted underneath the border itself.
       *
       * Only panel BACKGROUNDS become translucent. We never set opacity
       * on a content container, so text/icons/borders remain fully opaque.
       * --------------------------------------------------------------- */
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"] {
        position: relative;
        isolation: isolate;
        background: transparent !important;
      }

      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]::before {
        content: "";
        position: absolute;
        z-index: -1;
        inset: 0;
        background-image:
          linear-gradient(
            rgba(4,7,13,.16),
            rgba(4,7,13,.24)
          ),
          var(--sep-cosmetic-profile-background);
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        pointer-events: none;
      }

      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-17110d))]"],
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-15100d))]"],
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-120e0b))]"] {
        background-color:
          rgb(var(--sep-colour-090705) / 40%) !important;
      }

      /*
       * PROFILE BACKGROUND — COMPLETE PANEL TRANSPARENCY
       *
       * The requested sheet tabs contain additional dark surface tokens.
       * Make their structural Sepulchria-colour surfaces 40% opaque
       * (therefore 60% transparent) only on the requested tabs.
       *
       * Feats/gifts, Warping and Edit are intentionally not included.
       */
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(
          [data-character-sheet-panel="short"],
          [data-character-sheet-panel="profile"],
          [data-character-sheet-panel="inventory"],
          [data-character-sheet-panel="ledger"],
          [data-character-sheet-panel="trophies"],
          [data-character-sheet-panel="offgame"],
          [data-character-sheet-panel="audit"]
        )
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-"] {
        background-color:
          rgb(var(--sep-colour-090705) / 40%) !important;
      }

      /* ---------------------------------------------------------------
       * SHARED ORNAMENTAL MESSAGE/POST SHELLS
       * --------------------------------------------------------------- */
      [data-cosmetic-surface="pm"][data-has-pm-frame="true"],
      [data-cosmetic-surface="instant"][data-has-instant-chat-frame="true"],
      [data-cosmetic-surface="forum"][data-has-forum-frame="true"] {
        position: relative !important;
        isolation: isolate;
        overflow: visible !important;
      }

      [data-cosmetic-surface="pm"][data-has-pm-frame="true"]::after,
      [data-cosmetic-surface="instant"][data-has-instant-chat-frame="true"]::after,
      [data-cosmetic-surface="forum"][data-has-forum-frame="true"]::after {
        content: "";
        position: absolute;
        z-index: var(--sep-cosmetic-shell-z);
        pointer-events: none;
        filter: drop-shadow(0 3px 7px rgba(0,0,0,.32));
      }

      [data-cosmetic-surface="pm"][data-has-pm-frame="true"]::after {
        /*
         * Pure overlay anchored to the OUTER PM card.
         * Message content controls its own height and padding.
         */
        inset: -6px -6px;
        border: 12px solid transparent;
        border-image-source: var(--sep-cosmetic-pm-frame);
        border-image-slice: 14% 9%;
        border-image-width: 1;
        border-image-repeat: stretch;
      }

      [data-cosmetic-surface="instant"][data-has-instant-chat-frame="true"] {
        position: relative !important;
        isolation: isolate;
        overflow: visible !important;
      }

      [data-cosmetic-surface="instant"][data-has-instant-chat-frame="true"]::after {
        inset: -11px -6px;
        border: 10px solid transparent;
        border-image-source: var(--sep-cosmetic-instant-chat-frame);
        border-image-slice: 15% 10%;
        border-image-width: 1;
        border-image-repeat: stretch;
      }

      [data-cosmetic-surface="forum"][data-has-forum-frame="true"] {
        /*
         * Overlay only: the cosmetic must not alter the forum-post layout.
         */
        padding: 0 !important;
      }

      [data-cosmetic-surface="forum"][data-has-forum-frame="true"]::after {
        /*
         * Move the 9-slice rail outside the post's real perimeter instead
         * of drawing it visibly inside the authored post.
         */
        inset: -16px -10px;
        border: 14px solid transparent;
        border-image-source: var(--sep-cosmetic-forum-frame);
        border-image-slice: 12% 8%;
        border-image-width: 1;
        border-image-repeat: stretch;
      }

      /* ---------------------------------------------------------------
       * LOCATION ACTION STYLE / FLOURISH
       * Accents never cover the prose.
       * --------------------------------------------------------------- */
      [data-cosmetic-surface="action"] {
        position: relative;
        isolation: isolate;
      }

      [data-cosmetic-surface="action"][data-has-action-style="true"]::before {
        content: "";
        position: absolute;
        z-index: 0;
        inset: 0;
        background-image:
          linear-gradient(
            to right,
            transparent 0%,
            rgba(255,255,255,.018) 12%,
            rgba(255,255,255,.026) 50%,
            rgba(255,255,255,.018) 88%,
            transparent 100%
          ),
          var(--sep-cosmetic-action-style);
        background-position:
          center,
          center bottom;
        background-repeat:
          no-repeat,
          no-repeat;
        background-size:
          100% 100%,
          100% auto;
        pointer-events: none;
        opacity: .9;
      }

      [data-cosmetic-surface="action"][data-has-action-style="true"] > *:not([data-room-report-control="true"]) {
        position: relative;
        z-index: 2;
      }

      [data-cosmetic-surface="action"][data-has-action-flourish="true"]::after {
        content: "";
        position: absolute;
        z-index: 1;
        right: 4px;
        bottom: 1px;
        width: min(300px, 36%);
        height: 38px;
        background-image: var(--sep-cosmetic-action-flourish);
        background-position: right bottom;
        background-repeat: no-repeat;
        background-size: contain;
        pointer-events: none;
        opacity: .9;
      }

      /* ---------------------------------------------------------------
       * WHISPER VEIL
       *
       * ONE complete transparent PNG frames the entire whisper.
       * The PNG is rendered once as a full-size overlay.
       * Its transparent centre leaves the whisper content visible.
       * --------------------------------------------------------------- */
      [data-cosmetic-surface="whisper"] {
        position: relative;
        isolation: isolate;
        overflow: visible;
        border: 1px solid #7d628f !important;
      }

      [data-cosmetic-surface="whisper"][data-has-whisper-style="true"] {
        border-color: #7d628f !important;

        background:
          linear-gradient(
            100deg,
            rgba(37,19,52,.80),
            rgba(25,18,40,.66) 55%,
            rgba(40,19,54,.74)
          ) !important;

        box-shadow:
          inset 0 0 20px rgba(150,88,200,.10);
      }

      /*
       * The complete uploaded frame PNG.
       * Exactly ONE copy, covering the whole whisper article.
       */
      [data-cosmetic-surface="whisper"][data-has-whisper-style="true"]::before {
        content: "";
        position: absolute;
        z-index: 10;

        inset: 0;

        background-image:
          var(--sep-cosmetic-whisper-style);
        background-position:
          center;
        background-repeat:
          no-repeat;
        background-size:
          101% 100%;

        pointer-events: none;
        filter:
          drop-shadow(0 0 5px rgba(155,91,207,.20));
      }

      /*
       * No second copy. No bottom rail. No 9-slice.
       */
      [data-cosmetic-surface="whisper"][data-has-whisper-style="true"]::after {
        content: none;
      }

      /*
       * Content stays readable underneath the transparent centre.
       * The frame itself remains visually above it.
       */
      [data-cosmetic-surface="whisper"][data-has-whisper-style="true"] > *:not([data-room-report-control="true"]) {
        position: relative;
        z-index: 2;
      }


      /* ---------------------------------------------------------------
       * OFF-CHARACTER MESSAGE FRAME
       * One complete transparent PNG over the whole OOC // message,
       * using the same rendering model as Whisper Veil.
       * --------------------------------------------------------------- */
      [data-cosmetic-surface="off-character"] {
        position: relative;
        isolation: isolate;
        overflow: visible;
        border: 1px solid #627f9f !important;
      }

      [data-cosmetic-surface="off-character"][data-has-off-character-message-frame="true"] {
        border-color: #627f9f !important;
      }

      [data-cosmetic-surface="off-character"][data-has-off-character-message-frame="true"]::before {
        content: "";
        position: absolute;
        z-index: 1;
        inset: 0;
        background-image:
          var(--sep-cosmetic-off-character-message-frame);
        background-position:
          center;
        background-repeat:
          no-repeat;
        background-size:
          101% 100%;
        pointer-events: none;
        filter:
          drop-shadow(0 0 5px rgba(98,127,159,.20));
      }

      [data-cosmetic-surface="off-character"][data-has-off-character-message-frame="true"]::after {
        content: none;
      }

      [data-cosmetic-surface="off-character"][data-has-off-character-message-frame="true"] > *:not([data-room-report-control="true"]) {
        position: relative;
        z-index: 2;
      }


      /* VISUAL FOLLOW-UP — dual-tone skins / sheet / report controls */
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        [data-profile-price-box="true"] {
        background-color: rgb(var(--sep-colour-090705) / 40%) !important;
      }

      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        [data-character-sheet-panel="ledger"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-"] {
        background-color: rgb(var(--sep-colour-090705) / 50%) !important;
      }

      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        [data-trophy-progress-track="true"] {
        background-color: rgb(var(--sep-colour-090706)) !important;
      }

      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        [data-trophy-progress-fill="true"] {
        background-color: rgb(var(--sep-colour-9b7545)) !important;
      }

      [data-room-report-control="true"] {
        position: absolute !important;
        right: 12px !important;
        top: 12px !important;
        left: auto !important;
        bottom: auto !important;
        z-index: 50 !important;
        pointer-events: auto !important;
      }

      [data-room-report-control="true"] * {
        pointer-events: auto !important;
      }

    `}</style>
  );
}
