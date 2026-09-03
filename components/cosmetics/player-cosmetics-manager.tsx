"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  setEquippedCosmetic,
} from "@/app/(portal)/cosmetics/actions";

import {
  COSMETIC_CATEGORIES,
  COSMETIC_LABELS,
  type CosmeticCategory,
} from "@/lib/cosmetics/catalogue";

export type PlayerCosmeticRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: CosmeticCategory;
  previewImageUrl: string | null;
  assetUrl: string | null;
  sortOrder: number;
};

type CatalogueNavigatorEntry = {
  id: string;
  name: string;
  category: CosmeticCategory;
  categoryLabel: string;
};

const CATALOGUE_STORAGE_KEY =
  "sepulchria:owned-cosmetics-catalogue";

const CATALOGUE_EVENT =
  "sepulchria:owned-cosmetics-catalogue";

export function PlayerCosmeticsManager({
  initialCosmetics,
  initialEquipped,
}: {
  initialCosmetics: PlayerCosmeticRow[];
  initialEquipped: Partial<
    Record<CosmeticCategory, string | null>
  >;
}) {
  const [equipped, setEquipped] =
    useState(initialEquipped);

  const [message, setMessage] =
    useState("");

  const [failed, setFailed] =
    useState(false);

  const [pending, startTransition] =
    useTransition();

  const grouped = useMemo(
    () =>
      COSMETIC_CATEGORIES
        .map((category) => ({
          category,
          items:
            initialCosmetics.filter(
              (item) =>
                item.category ===
                category,
            ),
        }))
        .filter(
          (group) =>
            group.items.length > 0,
        ),
    [initialCosmetics],
  );

  useEffect(() => {
    const entries:
      CatalogueNavigatorEntry[] =
      initialCosmetics.map(
        (item) => ({
          id: item.id,
          name: item.name,
          category:
            item.category,
          categoryLabel:
            COSMETIC_LABELS[
              item.category
            ],
        }),
      );

    try {
      sessionStorage.setItem(
        CATALOGUE_STORAGE_KEY,
        JSON.stringify(entries),
      );
    } catch {
      // Live event/message still keeps the navigator usable.
    }

    window.dispatchEvent(
      new CustomEvent(
        CATALOGUE_EVENT,
        {
          detail: {
            entries,
          },
        },
      ),
    );

    if (
      window.parent &&
      window.parent !== window
    ) {
      window.parent.postMessage(
        {
          type:
            CATALOGUE_EVENT,
          entries,
        },
        window.location.origin,
      );
    }
  }, [initialCosmetics]);

  function changeEquipped(
    category: CosmeticCategory,
    cosmeticId: string | null,
  ) {
    setMessage("");
    setFailed(false);

    const data =
      new FormData();

    data.set(
      "slot",
      category,
    );

    data.set(
      "cosmeticId",
      cosmeticId ?? "",
    );

    startTransition(
      async () => {
        try {
          await setEquippedCosmetic(
            data,
          );

          setEquipped(
            (current) => ({
              ...current,
              [category]:
                cosmeticId,
            }),
          );

          setMessage(
            cosmeticId
              ? "Cosmetic equipped."
              : "Cosmetic unequipped.",
          );
        } catch (error) {
          setFailed(true);

          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to update cosmetic.",
          );
        }
      },
    );
  }

  if (
    initialCosmetics.length === 0
  ) {
    return (
      <section className="mt-7 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-8">
        <p className="text-center font-serif text-lg text-[rgb(var(--sep-colour-bba17a))]">
          You do not own any cosmetics yet.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-7">
      {message ? (
        <div
          className={[
            "mb-5 border px-4 py-3 text-xs",
            failed
              ? "border-red-800/55 text-red-200"
              : "border-[rgb(var(--sep-colour-56754f))]/55 text-[rgb(var(--sep-colour-c5d7bd))]",
          ].join(" ")}
        >
          {message}
        </div>
      ) : null}

      <div className="space-y-8">
        {grouped.map(
          ({
            category,
            items,
          }) => {
            const equippedId =
              equipped[
                category
              ] ?? null;

            return (
              <section
                key={category}
                id={`cosmetic-type-${category}`}
                data-cosmetic-category={
                  category
                }
                className="scroll-mt-6 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]"
              >
                <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-5 py-4">
                  <div>
                    <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-a68152))]">
                      Cosmetic type
                    </p>

                    <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))]">
                      {
                        COSMETIC_LABELS[
                          category
                        ]
                      }
                    </h2>
                  </div>

                  <span className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                    {items.length} owned
                  </span>
                </header>

                <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map(
                    (item) => {
                      const isEquipped =
                        item.id ===
                        equippedId;

                      return (
                        <article
                          key={
                            item.id
                          }
                          id={`cosmetic-${item.id}`}
                          data-cosmetic-id={
                            item.id
                          }
                          data-cosmetic-name={
                            item.name
                          }
                          className={[
                            "scroll-mt-6 overflow-hidden border bg-[rgb(var(--sep-colour-100c09))] transition-[border-color,box-shadow,outline] duration-300",
                            isEquipped
                              ? "border-[rgb(var(--sep-colour-987344))] shadow-[0_0_18px_rgba(var(--sep-rgb-177-132-75),0.08)]"
                              : "border-[rgb(var(--sep-colour-59432c))]/45",
                          ].join(
                            " ",
                          )}
                        >
                          <div className="relative flex h-44 items-center justify-center bg-[rgb(var(--sep-colour-0d0a08))] p-4">
                            {isEquipped ? (
                              <span className="absolute right-2 top-2 border border-[rgb(var(--sep-colour-987344))]/65 bg-[rgb(var(--sep-colour-21170f))] px-2 py-1 text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-dfc99f))]">
                                Equipped
                              </span>
                            ) : null}

                            {item.previewImageUrl ??
                            item.assetUrl ? (
                              <img
                                src={
                                  item.previewImageUrl ??
                                  item.assetUrl ??
                                  ""
                                }
                                alt=""
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <span className="text-[9px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-665a4c))]">
                                No preview
                              </span>
                            )}
                          </div>

                          <div className="p-4">
                            <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                              {
                                COSMETIC_LABELS[
                                  item.category
                                ]
                              }
                            </p>

                            <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))]">
                              {
                                item.name
                              }
                            </h3>

                            <p className="mt-2 min-h-10 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                              {item.description ||
                                "Collectible Sepulchria cosmetic."}
                            </p>

                            <button
                              type="button"
                              disabled={
                                pending
                              }
                              onClick={() =>
                                changeEquipped(
                                  category,
                                  isEquipped
                                    ? null
                                    : item.id,
                                )
                              }
                              className={[
                                "mt-4 w-full border px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] disabled:cursor-wait disabled:opacity-45",
                                isEquipped
                                  ? "border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-17110d))] text-[rgb(var(--sep-colour-cbb28a))]"
                                  : "border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] text-[rgb(var(--sep-colour-efd6a8))]",
                              ].join(
                                " ",
                              )}
                            >
                              {pending
                                ? "Working..."
                                : isEquipped
                                  ? "Unequip"
                                  : "Equip"}
                            </button>
                          </div>
                        </article>
                      );
                    },
                  )}
                </div>
              </section>
            );
          },
        )}
      </div>
    </section>
  );
}
