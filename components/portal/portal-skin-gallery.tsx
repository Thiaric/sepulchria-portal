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

  const isPreviewing =
    skin !== selectedSkin;

  async function useSkin(target: AppearanceSkin) {
    if (!target.owned && !target.isDefault) {
      return;
    }

    setWorkingSlug(target.slug);
    setError(null);

    const result =
      await selectPortalSkin(target.slug);

    setWorkingSlug(null);

    if (!result.ok) {
      setError(result.error ?? "Unable to select skin.");
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

      {isPreviewing ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3">
          <p className="text-xs text-[rgb(var(--sep-colour-baa78c))]">
            Previewing <strong>{skin}</strong>.
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
        {skins.map((entry) => {
          const current =
            selectedSkin === entry.slug;
          const unlocked =
            entry.isDefault || entry.owned;

          return (
            <article
              key={entry.id}
              className="overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]"
            >
              {entry.previewImageUrl ? (
                <img
                  src={entry.previewImageUrl}
                  alt=""
                  className="h-36 w-full object-cover"
                />
              ) : (
                <div className="flex h-28 items-center justify-center border-b border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-100c09))]">
                  <span className="font-serif text-2xl text-[rgb(var(--sep-colour-dfc79c))]">
                    ◐
                  </span>
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-e1c89f))]">
                      {entry.name}
                    </h2>
                    <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                      {entry.description}
                    </p>
                  </div>

                  <span className="shrink-0 border border-[rgb(var(--sep-colour-60482e))]/45 px-2 py-1 text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-a99069))]">
                    {current
                      ? "Current"
                      : unlocked
                        ? entry.source === "paid"
                          ? "Purchased"
                          : entry.source === "staff"
                            ? "Granted"
                            : "Owned"
                        : priceLabel(entry)}
                  </span>
                </div>

                {!unlocked ? (
                  <p className="mt-4 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3 text-[9px] leading-4 text-[rgb(var(--sep-colour-8f8271))]">
                    Premium skins are unlocked after a real-money
                    purchase is confirmed by staff, or may be
                    granted directly by staff.
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => previewSkin(entry.slug)}
                    className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-baa78c))]"
                  >
                    Preview
                  </button>

                  {unlocked && !current ? (
                    <button
                      type="button"
                      disabled={workingSlug === entry.slug}
                      onClick={() => void useSkin(entry)}
                      className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-3 py-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-efd6a8))] disabled:opacity-50"
                    >
                      {workingSlug === entry.slug
                        ? "Saving..."
                        : "Use skin"}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
