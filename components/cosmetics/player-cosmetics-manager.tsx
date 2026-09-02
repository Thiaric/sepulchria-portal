"use client";

import { useMemo, useState, useTransition } from "react";

import { setEquippedCosmetic } from "@/app/(portal)/cosmetics/actions";
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

export function PlayerCosmeticsManager({
  initialCosmetics,
  initialEquipped,
}: {
  initialCosmetics: PlayerCosmeticRow[];
  initialEquipped: Partial<
    Record<CosmeticCategory, string | null>
  >;
}) {
  const firstAvailable =
    COSMETIC_CATEGORIES.find((category) =>
      initialCosmetics.some((item) => item.category === category),
    ) ?? "sheet_frame";

  const [category, setCategory] =
    useState<CosmeticCategory>(firstAvailable);
  const [equipped, setEquipped] = useState(initialEquipped);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(
    () =>
      initialCosmetics.filter(
        (item) => item.category === category,
      ),
    [initialCosmetics, category],
  );

  const equippedId = equipped[category] ?? null;

  function changeEquipped(cosmeticId: string | null) {
    setMessage("");
    setFailed(false);

    const data = new FormData();
    data.set("slot", category);
    data.set("cosmeticId", cosmeticId ?? "");

    startTransition(async () => {
      try {
        await setEquippedCosmetic(data);
        setEquipped((current) => ({
          ...current,
          [category]: cosmeticId,
        }));
        setMessage(
          cosmeticId ? "Cosmetic equipped." : "Cosmetic unequipped.",
        );
      } catch (error) {
        setFailed(true);
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to update cosmetic.",
        );
      }
    });
  }

  return (
    <section className="mt-7 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-5 py-4">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-a68152))]">
          Your collection
        </p>
        <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc99f))]">
          Equipped Appearance
        </h2>
      </header>

      <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 p-4">
        <select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value as CosmeticCategory);
            setMessage("");
          }}
          className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
        >
          {COSMETIC_CATEGORIES
  .filter((value) =>
    initialCosmetics.some(
      (item) => item.category === value,
    ),
  )
  .map((value) => (
    <option key={value} value={value}>
      {COSMETIC_LABELS[value]}
    </option>
  ))}
        </select>
      </div>

      {message ? (
        <div
          className={[
            "mx-5 mt-5 border px-4 py-3 text-xs",
            failed
              ? "border-red-800/55 text-red-200"
              : "border-[rgb(var(--sep-colour-56754f))]/55 text-[rgb(var(--sep-colour-c5d7bd))]",
          ].join(" ")}
        >
          {message}
        </div>
      ) : null}

      <div className="p-5">
        {equippedId ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-[rgb(var(--sep-colour-765937))]/45 bg-[rgb(var(--sep-colour-21170f))] px-4 py-3">
            <p className="font-serif text-lg text-[rgb(var(--sep-colour-dfc99f))]">
              {initialCosmetics.find((item) => item.id === equippedId)
                ?.name ?? "Equipped cosmetic"}
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={() => changeEquipped(null)}
              className="border border-[rgb(var(--sep-colour-765937))]/55 px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-cbb28a))] disabled:opacity-45"
            >
              Unequip
            </button>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => {
            const isEquipped = item.id === equippedId;

            return (
              <article
                key={item.id}
                className={[
                  "overflow-hidden border bg-[rgb(var(--sep-colour-100c09))]",
                  isEquipped
                    ? "border-[rgb(var(--sep-colour-987344))]"
                    : "border-[rgb(var(--sep-colour-59432c))]/45",
                ].join(" ")}
              >
                <div className="flex h-44 items-center justify-center bg-[rgb(var(--sep-colour-0d0a08))] p-4">
                  {item.previewImageUrl ?? item.assetUrl ? (
                    <img
                      src={item.previewImageUrl ?? item.assetUrl ?? ""}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : null}
                </div>

                <div className="p-4">
                  <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                    {COSMETIC_LABELS[item.category]}
                  </p>
                  <h3 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))]">
                    {item.name}
                  </h3>
                  <p className="mt-2 min-h-10 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                    {item.description || "Collectible Sepulchria cosmetic."}
                  </p>
                  <button
                    type="button"
                    disabled={pending || isEquipped}
                    onClick={() => changeEquipped(item.id)}
                    className="mt-4 w-full border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))] disabled:opacity-45"
                  >
                    {isEquipped
                      ? "Equipped"
                      : pending
                        ? "Working..."
                        : "Equip"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <p className="border border-dashed border-[rgb(var(--sep-colour-59432c))]/40 px-5 py-10 text-center font-serif text-lg text-[rgb(var(--sep-colour-bba17a))]">
            No {COSMETIC_LABELS[category].toLowerCase()} owned yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}
