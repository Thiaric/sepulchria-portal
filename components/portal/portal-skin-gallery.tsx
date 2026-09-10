"use client";

import { useState } from "react";
import { selectPortalSkin } from "@/app/(portal)/appearance/actions";
import { usePortalSkin } from "@/components/portal/portal-skin-provider";

export type AppearanceSkin = {
  id: string;
  slug: string;
  name: string;
  description: string;
  previewImageUrl: string | null;
  pricePence: number | null;
  isDefault: boolean;
  owned: boolean;
  source: "paid" | "staff" | null;
};

function priceLabel(skin: AppearanceSkin) {
  if (skin.isDefault) {
    return "Included";
  }

  if (typeof skin.pricePence === "number") {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(skin.pricePence / 100);
  }

  return "Premium";
}

function statusLabel(
  entry: AppearanceSkin,
  current: boolean,
  unlocked: boolean,
) {
  if (current) return "Current";
  if (!unlocked) return priceLabel(entry);
  if (entry.source === "paid") return "Purchased";
  if (entry.source === "staff") return "Granted";
  return "Owned";
}

function swatchBackground() {
  return `conic-gradient(
    from -90deg,
    rgb(var(--sep-colour-120f0d)) 0deg 120deg,
    rgb(var(--sep-skin-c1)) 120deg 240deg,
    rgb(var(--sep-skin-c2)) 240deg 360deg
  )`;
}

export function PortalSkinGallery({
  skins,
}: {
  skins: AppearanceSkin[];
}) {
  const {
    skin,
    selectedSkin,
    commitSkin,
    previewSkin,
    endPreview,
  } = usePortalSkin();

  const [workingSlug, setWorkingSlug] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const selectedSkinEntry =
    skins.find(
      (entry) =>
        entry.slug === selectedSkin,
    ) ?? null;

  const isPreviewing =
    skin !== selectedSkin;

  async function useSkin(
    target: AppearanceSkin,
  ) {
    if (
      !target.owned &&
      !target.isDefault
    ) {
      return;
    }

    setWorkingSlug(target.slug);
    setError(null);

    const result =
      await selectPortalSkin(
        target.slug,
      );

    setWorkingSlug(null);

    if (!result.ok) {
      setError(
        result.error ??
          "Unable to select skin.",
      );
      return;
    }

    commitSkin(target.slug);
  }

  return (
    <div className="components_portal_portal_skin_gallery_div_container">
      {error ? (
        <div className="mb-4 border border-red-800/55 bg-red-950/30 px-4 py-3 text-xs text-red-300 components_portal_portal_skin_gallery_div_container_2">
          {error}
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between gap-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3 components_portal_portal_skin_gallery_div_container_3">
        <div className="components_portal_portal_skin_gallery_div_container_4">
          <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806f59))] components_portal_portal_skin_gallery_p_text">
            Selected skin
          </p>

          <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-e1c89f))] components_portal_portal_skin_gallery_p_text_2">
            {selectedSkinEntry?.name ??
              selectedSkin}
          </p>
        </div>

        <div
          data-portal-skin={selectedSkin}
          data-selected-skin-swatch="true"
          className="portal-skin-scope h-11 w-11 shrink-0 rounded-full components_portal_portal_skin_gallery_div_container_5"
          style={{
            background: swatchBackground(),
            border:
              "1px solid rgb(var(--sep-skin-c1) / .60)",
            boxShadow:
              "0 0 0 2px rgb(13 10 8)",
          }}
          title={`${
            selectedSkinEntry?.name ??
            selectedSkin
          }: actual applied background, C1 and C2`}
          aria-label={`${
            selectedSkinEntry?.name ??
            selectedSkin
          } colour swatch`}
        />
      </div>

      {isPreviewing ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3 components_portal_portal_skin_gallery_div_container_6">
          <p className="text-xs text-[rgb(var(--sep-colour-baa78c))] components_portal_portal_skin_gallery_p_text_3">
            Previewing{" "}
            <strong className="components_portal_portal_skin_gallery_strong_emphasis">{skin}</strong>.
          </p>

          <button
            type="button"
            onClick={endPreview}
            className="border border-[rgb(var(--sep-colour-765735))] bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-dfc79c))] components_portal_portal_skin_gallery_button_end_preview"
          >
            End preview
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 components_portal_portal_skin_gallery_div_container_7">
        {skins.map((entry) => {
          const current =
            selectedSkin === entry.slug;

          const unlocked =
            entry.isDefault ||
            entry.owned;

          return (
            <article
              key={entry.id}
              data-portal-skin={entry.slug}
              data-skin-preview-card="true"
              className="portal-skin-scope flex h-full min-h-[200px] flex-col overflow-hidden components_portal_portal_skin_gallery_article_article"
            >
              <div className="flex h-full flex-col p-5 components_portal_portal_skin_gallery_div_container_8">
                <div className="flex items-start justify-between gap-4 components_portal_portal_skin_gallery_div_container_9">
                  <div className="min-w-0 flex-1 components_portal_portal_skin_gallery_div_container_10">
                    <h2
                      data-skin-preview-role="title"
                      className="text-xl components_portal_portal_skin_gallery_h2_heading"
                    >
                      {entry.name}
                    </h2>

                    <p
                      data-skin-preview-role="description"
                      className="mt-2 text-[11px] leading-5 components_portal_portal_skin_gallery_p_text_4"
                    >
                      {entry.description}
                    </p>
                  </div>

                  <span
                    data-skin-preview-role="badge"
                    className="shrink-0 px-2 py-1 text-[7px] uppercase tracking-[0.15em] components_portal_portal_skin_gallery_span_text"
                  >
                    {statusLabel(
                      entry,
                      current,
                      unlocked,
                    )}
                  </span>
                </div>

                

                <div
                  data-skin-preview-role="divider"
                  className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4 components_portal_portal_skin_gallery_div_container_11"
                >
                  <div
                    className="h-10 w-10 shrink-0 rounded-full components_portal_portal_skin_gallery_div_container_12"
                    style={{
                      background:
                        swatchBackground(),
                      border:
                        "1px solid rgb(var(--sep-skin-c1) / .60)",
                      boxShadow:
                        "0 0 0 2px rgb(13 10 8)",
                    }}
                    title={`${entry.name}: actual applied background, C1 and C2`}
                    aria-label={`${entry.name} colour swatch`}
                  />

                  <div className="flex flex-wrap justify-end gap-2 components_portal_portal_skin_gallery_div_container_13">
                    {!current ? (
  <button
    data-skin-preview-role="button"
    type="button"
    onClick={() =>
      previewSkin(
        entry.slug,
      )
    }
    className="px-3 py-2 text-[8px] uppercase tracking-[0.15em] transition components_portal_portal_skin_gallery_button_preview"
  >
    Preview
  </button>
) : null}

                    {unlocked &&
                    !current ? (
                      <button
                        data-skin-preview-role="button"
                        type="button"
                        disabled={
                          workingSlug ===
                          entry.slug
                        }
                        onClick={() =>
                          void useSkin(
                            entry,
                          )
                        }
                        className="px-3 py-2 text-[8px] uppercase tracking-[0.15em] transition disabled:opacity-50 components_portal_portal_skin_gallery_button_action"
                      >
                        {workingSlug ===
                        entry.slug
                          ? "Saving..."
                          : "Use skin"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <style jsx global>{`
        /*
         * Each Appearance card is a real isolated skin scope.
         * It uses the SAME CSS variables as the actual portal:
         *   background = --sep-colour-120f0d
         *   primary    = --sep-skin-c1
         *   secondary  = --sep-skin-c2
         */
        [data-selected-skin-swatch="true"][data-portal-skin="sepulchria"] {
          --sep-skin-c1: 169 138 96 !important;
          --sep-skin-c2: 211 194 170 !important;
        }

        /* CINDER ORIGINAL PREVIEW DEFAULT TOKENS
         * sepulchria is the default skin, so it does not have the same
         * explicit nested skin block as the non-default skins. Without this,
         * its card inherits C1/C2 from whichever skin is currently active.
         */
        [data-skin-preview-card="true"][data-portal-skin="sepulchria"] {
          --sep-skin-c1: 169 138 96 !important;
          --sep-skin-c2: 211 194 170 !important;
          --sep-global-c1: 169 138 96 !important;
          --sep-global-c2: 211 194 170 !important;
        }

        [data-skin-preview-card="true"] {
          background:
            rgb(var(--sep-colour-120f0d)) !important;
          border:
            1px solid
            rgb(var(--sep-skin-c1) / .45) !important;
          color:
            rgb(var(--sep-skin-c2)) !important;
          font-family:
            var(--portal-font-body);
        }

        [data-skin-preview-card="true"]
          [data-skin-preview-role="title"] {
          color:
            rgb(var(--sep-skin-c1)) !important;
          -webkit-text-fill-color:
            rgb(var(--sep-skin-c1)) !important;
          font-family:
            var(--portal-font-display);
        }

        [data-skin-preview-card="true"]
          [data-skin-preview-role="description"] {
          color:
            rgb(var(--sep-skin-c2)) !important;
          -webkit-text-fill-color:
            rgb(var(--sep-skin-c2)) !important;
        }

        [data-skin-preview-card="true"]
          [data-skin-preview-role="badge"],
        [data-skin-preview-card="true"]
          [data-skin-preview-role="button"] {
          border:
            1px solid
            rgb(var(--sep-skin-c1) / .50) !important;
          background:
            rgb(var(--sep-colour-120f0d)) !important;
          color:
            rgb(var(--sep-skin-c1)) !important;
          -webkit-text-fill-color:
            rgb(var(--sep-skin-c1)) !important;
        }

        [data-skin-preview-card="true"]
          [data-skin-preview-role="button"]:hover {
          border-color:
            rgb(var(--sep-skin-c1)) !important;
          background:
            color-mix(
              in srgb,
              rgb(var(--sep-skin-c1)) 12%,
              rgb(var(--sep-colour-120f0d))
            ) !important;
        }

        [data-skin-preview-card="true"]
          [data-skin-preview-role="divider"] {
          border-top:
            1px solid
            rgb(var(--sep-skin-c1) / .28) !important;
        }
      `}</style>
    </div>
  );
}
