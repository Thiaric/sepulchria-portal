"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
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

const SKIN_SWATCHES: Record<
  string,
  {
    background: string;
    accent: string;
  }
> = {
  sepulchria: {
    background: "#120f0d",
    accent: "#b68b4f",
  },
  vellum: {
    background: "#d9cfb5",
    accent: "#6b2332",
  },
  starfall: {
    background: "#040816",
    accent: "#7fa9dc",
  },
  "rose-nocturne": {
    background: "#12070f",
    accent: "#c67c69",
  },
  "verdant-reliquary": {
    background: "#040f09",
    accent: "#93c988",
  },
  "amethyst-veil": {
    background: "#0d0714",
    accent: "#c99a4c",
  },
  moonlit: {
    background: "#090806",
    accent: "#b58a4c",
  },
  emberforge: {
    background: "#0e0805",
    accent: "#d27b35",
  },
  deepwater: {
    background: "#031012",
    accent: "#efb67f",
  },
  "blood-court": {
    background: "#120407",
    accent: "#d88888",
  },
  ashen: {
    background: "#c2d6e1",
    accent: "#174b38",
  },
  "ivory-archive": {
    background: "#0b0c0d",
    accent: "#a9b7c2",
  },
  "aelari-dawn": {
    background: "#d7dcc3",
    accent: "#8d271c",
  },
  "dwarven-deep": {
    background: "#c1b197",
    accent: "#5b3823",
  },
  "mortal-hearth": {
    background: "#c3c4bd",
    accent: "#563627",
  },
  "wolfs-moon": {
    background: "#c4cdd0",
    accent: "#d9bd78",
  },
};

function getSkinSwatch(slug: string) {
  return (
    SKIN_SWATCHES[slug] ?? {
      background: "#120f0d",
      accent: "#b68b4f",
    }
  );
}

type SkinPreviewCss = CSSProperties & {
  "--sep-skin-c1"?: string;
  "--sep-skin-c2"?: string;
  "--sep-global-c1"?: string;
  "--sep-global-c2"?: string;
};

function getLegacyPreviewVariables(
  slug: string,
): SkinPreviewCss | undefined {
  if (
    slug !== "sepulchria" &&
    slug !== "moonlit"
  ) {
    return undefined;
  }

  return {
    "--sep-skin-c1": "169 138 96",
    "--sep-skin-c2": "211 194 170",
    "--sep-global-c1": "169 138 96",
    "--sep-global-c2": "211 194 170",
  };
}

function threeColourSwatch(
  background: string,
): string {
  return `conic-gradient(
    from -90deg,
    ${background} 0deg 120deg,
    rgb(var(--sep-skin-c1, var(--sep-colour-a98a60))) 120deg 240deg,
    rgb(var(--sep-skin-c2, var(--sep-colour-d3c2aa))) 240deg 360deg
  )`;
}

function priceLabel(
  skin: AppearanceSkin,
) {
  if (skin.isDefault) {
    return "Included";
  }

  if (
    typeof skin.pricePence ===
    "number"
  ) {
    return new Intl.NumberFormat(
      "en-GB",
      {
        style: "currency",
        currency: "GBP",
      },
    ).format(
      skin.pricePence / 100,
    );
  }

  return "Premium";
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

  const [
    workingSlug,
    setWorkingSlug,
  ] = useState<string | null>(
    null,
  );

  const [error, setError] =
    useState<string | null>(null);

  const selectedSkinEntry =
    skins.find(
      (entry) =>
        entry.slug ===
        selectedSkin,
    ) ?? null;

  const selectedSkinSwatch =
    getSkinSwatch(
      selectedSkin,
    );

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

    setWorkingSlug(
      target.slug,
    );
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
    <div>
      {error ? (
        <div className="mb-4 border border-red-800/55 bg-red-950/30 px-4 py-3 text-xs text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between gap-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3">
        <div>
          <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806f59))]">
            Selected skin
          </p>

          <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-e1c89f))]">
            {selectedSkinEntry?.name ??
              selectedSkin}
          </p>
        </div>

        <div
          data-portal-skin={selectedSkin}
          className="portal-skin-scope h-11 w-11 shrink-0 rounded-full border border-[rgb(var(--sep-colour-60482e))]/60 shadow-[0_0_0_2px_rgb(var(--sep-colour-0d0a08))]"
          style={{
            ...getLegacyPreviewVariables(
              selectedSkin,
            ),
            background:
              threeColourSwatch(
                selectedSkinSwatch.background,
              ),
          }}
          title={`${
            selectedSkinEntry?.name ??
            selectedSkin
          }: background, C1 and C2 colours`}
          aria-label={`${
            selectedSkinEntry?.name ??
            selectedSkin
          } colour swatch`}
        />
      </div>

      {isPreviewing ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3">
          <p className="text-xs text-[rgb(var(--sep-colour-baa78c))]">
            Previewing{" "}
            <strong>
              {skin}
            </strong>
            .
          </p>

          <button
            type="button"
            onClick={endPreview}
            className="border border-[rgb(var(--sep-colour-765735))] bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-dfc79c))]"
          >
            End preview
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {skins.map(
          (entry) => {
            const current =
              selectedSkin ===
              entry.slug;

            const unlocked =
              entry.isDefault ||
              entry.owned;

            const swatch =
              getSkinSwatch(
                entry.slug,
              );

            return (
              <div
                key={entry.id}
                data-portal-skin={
                  entry.slug
                }
                className="portal-skin-scope portal-skin-preview-card"
                style={
                  getLegacyPreviewVariables(
                    entry.slug,
                  )
                }
              >
                <article className="portal-skin-preview-surface flex h-full min-h-[200px] flex-col overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] text-[rgb(var(--sep-colour-cbbba3))]">
                  <div className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h2
                          className="portal-skin-preview-title text-xl text-[rgb(var(--sep-colour-e1c89f))]"
                          style={{
                            fontFamily:
                              "var(--portal-font-display)",
                          }}
                        >
                          {
                            entry.name
                          }
                        </h2>

                        <p
                          className="portal-skin-preview-description mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]"
                          style={{
                            fontFamily:
                              "var(--portal-font-body)",
                          }}
                        >
                          {
                            entry.description
                          }
                        </p>
                      </div>

                      <span
                        className="portal-skin-preview-badge shrink-0 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-2 py-1 text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-a99069))]"
                        style={{
                          fontFamily:
                            "var(--portal-font-body)",
                        }}
                      >
                        {current
                          ? "Current"
                          : unlocked
                            ? entry.source ===
                              "paid"
                              ? "Purchased"
                              : entry.source ===
                                  "staff"
                                ? "Granted"
                                : "Owned"
                            : priceLabel(
                                entry,
                              )}
                      </span>
                    </div>

                    {!unlocked ? (
                      <p
                        className="portal-skin-preview-locked mt-4 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3 text-[9px] leading-4 text-[rgb(var(--sep-colour-8f8271))]"
                        style={{
                          fontFamily:
                            "var(--portal-font-body)",
                        }}
                      >
                        Premium skins
                        are unlocked
                        after a
                        real-money
                        purchase is
                        confirmed by
                        staff, or may
                        be granted
                        directly by
                        staff.
                      </p>
                    ) : null}

                    <div
                      data-portal-skin-preview-divider="true"
                      className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-[rgb(var(--sep-colour-60482e))]/25 pt-4"
                    >
                      <div
                        className="h-10 w-10 shrink-0 rounded-full border border-[rgb(var(--sep-colour-60482e))]/60 shadow-[0_0_0_2px_rgb(var(--sep-colour-0d0a08))]"
                        style={{
                          background:
                            threeColourSwatch(
                              swatch.background,
                            ),
                        }}
                        title={`${entry.name}: background, C1 and C2 colours`}
                        aria-label={`${entry.name} colour swatch`}
                      />

                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            previewSkin(
                              entry.slug,
                            )
                          }
                          className="portal-skin-preview-secondary-button border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-baa78c))] transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-19120d))] hover:text-[rgb(var(--sep-colour-d8bb8a))]"
                          style={{
                            fontFamily:
                              "var(--portal-font-body)",
                          }}
                        >
                          Preview
                        </button>

                        {unlocked &&
                        !current ? (
                          <button
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
                            className="portal-skin-preview-primary-button border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b78b50))] hover:bg-[rgb(var(--sep-colour-4a331f))] disabled:opacity-50"
                            style={{
                              fontFamily:
                                "var(--portal-font-body)",
                            }}
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
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}