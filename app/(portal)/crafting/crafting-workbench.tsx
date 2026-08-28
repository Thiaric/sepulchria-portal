"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import { craftRecipeAction } from "./actions";
import { usePortalSkin } from "@/components/portal/portal-skin-provider";

const CRAFTING_SKIN_ACCENTS: Record<string, string> = {
  sepulchria: "#b68b4f",
  vellum: "#5d4930",
  starfall: "#758fd6",
  "rose-nocturne": "#b36d8b",
  "verdant-reliquary": "#4f9c70",
  "amethyst-veil": "#9b6ac4",
  moonlit: "#b58a4c",
  emberforge: "#c7773d",
  deepwater: "#4f969d",
  "blood-court": "#9d3744",
  ashen: "#9fd4ef",
  "ivory-archive": "#d1c6ad",
  "aelari-dawn": "#e7d9a8",
  "dwarven-deep": "#b37945",
  "mortal-hearth": "#aaa79d",
  "wolfs-moon": "#9aaeb7",
};

export type CraftingInventoryItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  quality: string;
  quantity: number;
};

export type CraftingIngredient = {
  item_id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  quality: string;
  quantity: number;
  sort_order: number;
};

export type KnownCraftingRecipe = {
  id: string;
  name: string;
  slug: string;
  description: string;
  result_quantity: number;
  sort_order: number;
  result: {
    id: string;
    name: string;
    slug: string;
    description: string;
    image_url: string | null;
    quality: string;
  };
  ingredients: CraftingIngredient[];
};

type CraftingWorkbenchProps = {
  recipes: KnownCraftingRecipe[];
  inventory: CraftingInventoryItem[];
};

type Notice = {
  tone: "success" | "error";
  text: string;
};

function qualityLabel(value: string) {
  if (!value) return "Average";

  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(" ");
}

function ItemImage({
  src,
  fallback = "◇",
  size = "md",
}: {
  src: string | null;
  fallback?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dimensions =
    size === "lg"
      ? "h-20 w-20"
      : size === "sm"
        ? "h-10 w-10"
        : "h-12 w-12";

  return (
    <div
      className={`flex ${dimensions} shrink-0 items-center justify-center overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0a08))]`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full object-contain p-1"
        />
      ) : (
        <span className="font-serif text-xl text-[rgb(var(--sep-colour-756247))]">
          {fallback}
        </span>
      )}
    </div>
  );
}

function ingredientPosition(
  index: number,
  total: number,
) {
  if (total === 1) {
    return "col-start-2 row-start-1";
  }

  if (total === 2) {
    return index === 0
      ? "col-start-1 row-start-2"
      : "col-start-3 row-start-2";
  }

  if (total === 3) {
    return [
      "col-start-2 row-start-1",
      "col-start-1 row-start-2",
      "col-start-3 row-start-2",
    ][index] ?? "";
  }

  if (total === 4) {
    return [
      "col-start-2 row-start-1",
      "col-start-3 row-start-2",
      "col-start-2 row-start-3",
      "col-start-1 row-start-2",
    ][index] ?? "";
  }

  return "";
}

export function CraftingWorkbench({
  recipes,
  inventory,
}: CraftingWorkbenchProps) {
  const router = useRouter();
  const { skin } = usePortalSkin();
  const craftingAccent =
    CRAFTING_SKIN_ACCENTS[skin] ??
    CRAFTING_SKIN_ACCENTS.sepulchria;

  const [isPending, startTransition] =
    useTransition();

  const [
    selectedRecipeId,
    setSelectedRecipeId,
  ] = useState(
    recipes[0]?.id ?? "",
  );

  const [
    filledSlots,
    setFilledSlots,
  ] = useState<
    Record<string, boolean>
  >({});

  const [
    notice,
    setNotice,
  ] = useState<Notice | null>(
    null,
  );

  const [
    draggedItemId,
    setDraggedItemId,
  ] = useState<string | null>(
    null,
  );

  const selectedRecipe =
    useMemo(
      () =>
        recipes.find(
          (recipe) =>
            recipe.id ===
            selectedRecipeId,
        ) ?? null,
      [
        recipes,
        selectedRecipeId,
      ],
    );

  const inventoryByItemId =
    useMemo(
      () =>
        new Map(
          inventory.map(
            (item) =>
              [
                item.id,
                item,
              ] as const,
          ),
        ),
      [inventory],
    );

  function chooseRecipe(
    recipeId: string,
  ) {
    setSelectedRecipeId(
      recipeId,
    );
    setFilledSlots({});
    setNotice(null);
  }

  function fillIngredient(
    itemId: string,
  ) {
    if (!selectedRecipe) {
      return;
    }

    const requirement =
      selectedRecipe.ingredients.find(
        (ingredient) =>
          ingredient.item_id ===
          itemId,
      );

    if (!requirement) {
      setNotice({
        tone: "error",
        text:
          "That ingredient is not used by this recipe.",
      });
      return;
    }

    const owned =
      inventoryByItemId.get(
        itemId,
      )?.quantity ?? 0;

    if (
      owned <
      requirement.quantity
    ) {
      setNotice({
        tone: "error",
        text: `You need ${requirement.quantity} × ${requirement.name}, but only have ${owned}.`,
      });
      return;
    }

    setFilledSlots(
      (current) => ({
        ...current,
        [itemId]: true,
      }),
    );

    setNotice(null);
  }

  function autofill() {
    if (!selectedRecipe) {
      return;
    }

    const next: Record<
      string,
      boolean
    > = {};

    for (
      const ingredient of
      selectedRecipe.ingredients
    ) {
      const owned =
        inventoryByItemId.get(
          ingredient.item_id,
        )?.quantity ?? 0;

      if (
        owned >=
        ingredient.quantity
      ) {
        next[
          ingredient.item_id
        ] = true;
      }
    }

    setFilledSlots(next);
    setNotice(null);
  }

  const allRequirementsOwned =
    selectedRecipe?.ingredients.every(
      (ingredient) => {
        const owned =
          inventoryByItemId.get(
            ingredient.item_id,
          )?.quantity ?? 0;

        return (
          owned >=
          ingredient.quantity
        );
      },
    ) ?? false;

  const allSlotsFilled =
    selectedRecipe?.ingredients.every(
      (ingredient) =>
        filledSlots[
          ingredient.item_id
        ] === true,
    ) ?? false;

  function craft() {
    if (
      !selectedRecipe ||
      !allRequirementsOwned ||
      !allSlotsFilled ||
      isPending
    ) {
      return;
    }

    setNotice(null);

    startTransition(
      async () => {
        const result =
          await craftRecipeAction(
            selectedRecipe.id,
          );

        setNotice({
          tone: result.success
            ? "success"
            : "error",
          text: result.message,
        });

        if (result.success) {
          setFilledSlots({});
          router.refresh();
        }
      },
    );
  }

  if (!recipes.length) {
    return (
      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-10 text-center">
        <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-886c48))]">
          Recipe Book
        </p>

        <h2 className="mt-3 font-serif text-2xl text-[rgb(var(--sep-colour-ead6ad))]">
          No recipes known
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-[11px] leading-6 text-[rgb(var(--sep-colour-9f9281))]">
          This character has not learned any crafting recipes yet.
        </p>
      </section>
    );
  }

  const spatialLayout =
    (selectedRecipe?.ingredients.length ?? 0) <= 4;

  return (
    <div className="grid h-auto max-h-none min-h-0 w-full gap-3 overflow-visible xl:h-full xl:max-h-full xl:grid-cols-[0.9fr_0.9fr_2.2fr] xl:overflow-hidden">
      <section
        className="relative flex min-h-0 flex-col overflow-hidden border bg-[rgb(var(--sep-colour-120d0a))]/95 xl:h-full"
        style={{
          borderColor: `color-mix(in srgb, ${craftingAccent} 32%, transparent)`,
          boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${craftingAccent}, transparent)` }}
        />
        <div className="shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/35 px-4 py-3">
          <p className="text-[7px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-806b50))]">
            The Maker&apos;s Folio
          </p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-ead6ad))]">
              Known Recipes
            </h2>
            <span
              className="border px-2 py-0.5 font-serif text-xs"
              style={{
                borderColor: `color-mix(in srgb, ${craftingAccent} 30%, transparent)`,
                color: craftingAccent,
              }}
            >
              {recipes.length}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 max-h-48 xl:max-h-none">
          {recipes.map((recipe) => {
            const active = recipe.id === selectedRecipeId;
            const available = recipe.ingredients.every(
              (ingredient) =>
                (inventoryByItemId.get(ingredient.item_id)?.quantity ?? 0) >=
                ingredient.quantity,
            );

            return (
              <button
                key={recipe.id}
                type="button"
                onClick={() => chooseRecipe(recipe.id)}
                className="relative flex w-full items-center gap-3 overflow-hidden border px-3 py-2.5 text-left transition duration-200"
                style={{
                  borderColor: active
                    ? craftingAccent
                    : `color-mix(in srgb, ${craftingAccent} 20%, transparent)`,
                  background: active
                    ? `linear-gradient(90deg, color-mix(in srgb, ${craftingAccent} 12%, rgb(var(--sep-colour-271c12))), rgb(var(--sep-colour-100c09)))`
                    : "rgb(var(--sep-colour-100c09))",
                  boxShadow: active
                    ? `inset 3px 0 0 ${craftingAccent}, 0 0 14px color-mix(in srgb, ${craftingAccent} 8%, transparent)`
                    : "none",
                }}
              >
                <ItemImage src={recipe.result.image_url} size="sm" fallback="✦" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-serif text-[13px] leading-4 text-[rgb(var(--sep-colour-ead6ad))]">
                    {recipe.name}
                  </p>
                  <p
                    className="mt-1 text-[6px] uppercase tracking-[0.16em]"
                    style={{
                      color: available
                        ? craftingAccent
                        : "rgb(var(--sep-colour-806b50))",
                    }}
                  >
                    {available ? "Materials ready" : "Materials missing"}
                  </p>
                </div>
                <span aria-hidden="true" className="text-xs" style={{ color: active ? craftingAccent : "rgb(var(--sep-colour-59432c))" }}>
                  ◆
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section
        className="relative flex min-h-0 flex-col overflow-hidden border bg-[rgb(var(--sep-colour-120d0a))]/95 xl:h-full"
        style={{
          borderColor: `color-mix(in srgb, ${craftingAccent} 32%, transparent)`,
          boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${craftingAccent}, transparent)` }}
        />
        <div className="shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/35 px-4 py-3">
          <p className="text-[7px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-806b50))]">
            Material Tray
          </p>
          <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-ead6ad))]">
            Ingredients at Hand
          </h2>
          <p className="mt-1 text-[6px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-806b50))]">
            Drag · double-click · or autofill
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 max-h-72 xl:max-h-none">
          {inventory.length ? (
            inventory.map((item) => {
              const usedByRecipe = selectedRecipe?.ingredients.some(
                (ingredient) => ingredient.item_id === item.id,
              );

              return (
                <button
                  key={item.id}
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", item.id);
                    event.dataTransfer.effectAllowed = "copy";
                    setDraggedItemId(item.id);
                  }}
                  onDragEnd={() => setDraggedItemId(null)}
                  onDoubleClick={() => fillIngredient(item.id)}
                  className="flex w-full items-center gap-3 border px-3 py-2 text-left transition duration-200"
                  style={{
                    borderColor:
                      draggedItemId === item.id
                        ? craftingAccent
                        : usedByRecipe
                          ? `color-mix(in srgb, ${craftingAccent} 42%, transparent)`
                          : `color-mix(in srgb, ${craftingAccent} 16%, transparent)`,
                    background:
                      draggedItemId === item.id
                        ? `color-mix(in srgb, ${craftingAccent} 12%, rgb(var(--sep-colour-271c12)))`
                        : usedByRecipe
                          ? `color-mix(in srgb, ${craftingAccent} 6%, rgb(var(--sep-colour-17110d)))`
                          : "rgb(var(--sep-colour-100c09))",
                    opacity: usedByRecipe || draggedItemId === item.id ? 1 : 0.72,
                  }}
                >
                  <ItemImage src={item.image_url} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] text-[rgb(var(--sep-colour-d4bd94))]">
                      {item.name}
                    </p>
                    <p className="mt-1 text-[6px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-806b50))]">
                      {qualityLabel(item.quality)}
                    </p>
                  </div>
                  <span
                    className="shrink-0 border bg-black/20 px-2 py-1 font-serif text-[11px]"
                    style={{
                      borderColor: `color-mix(in srgb, ${craftingAccent} 22%, transparent)`,
                      color: usedByRecipe
                        ? craftingAccent
                        : "rgb(var(--sep-colour-d4bd94))",
                    }}
                  >
                    ×{item.quantity}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="px-2 py-4 text-[10px] leading-5 text-[rgb(var(--sep-colour-9f9281))]">
              No crafting materials carried.
            </p>
          )}
        </div>
      </section>

      <section
        className="relative flex min-h-0 flex-col overflow-hidden border bg-[rgb(var(--sep-colour-0d0907))] xl:h-full"
        style={{
          borderColor: `color-mix(in srgb, ${craftingAccent} 42%, transparent)`,
          boxShadow: `0 18px 42px rgba(0,0,0,0.24), 0 0 24px color-mix(in srgb, ${craftingAccent} 6%, transparent)`,
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[-70px] h-40 w-[65%] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: `color-mix(in srgb, ${craftingAccent} 10%, transparent)` }}
        />

        <div className="relative shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/35 px-5 py-3">
          <p className="text-[7px] uppercase tracking-[0.3em] text-[rgb(var(--sep-colour-806b50))]">
            Sepulchrian Workbench
          </p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-ead6ad))]">
                {selectedRecipe?.name}
              </h2>
              <p className="mt-1 max-w-3xl text-[9px] leading-4 text-[rgb(var(--sep-colour-9f9281))]">
                {selectedRecipe?.description}
              </p>
            </div>

            <span
              className="border px-2.5 py-1 text-[6px] uppercase tracking-[0.18em]"
              style={{
                borderColor: allRequirementsOwned
                  ? `color-mix(in srgb, ${craftingAccent} 55%, transparent)`
                  : `color-mix(in srgb, ${craftingAccent} 20%, transparent)`,
                color: allRequirementsOwned
                  ? craftingAccent
                  : "rgb(var(--sep-colour-806b50))",
              }}
            >
              {allRequirementsOwned
                ? allSlotsFilled
                  ? "Assembly ready"
                  : "Materials available"
                : "Missing materials"}
            </span>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-3">
          <div
            className="relative flex min-h-[260px] flex-1 items-center justify-center overflow-auto border p-2 sm:p-3 xl:min-h-[280px] 2xl:min-h-[320px]"
            style={{
              borderColor: `color-mix(in srgb, ${craftingAccent} 25%, transparent)`,
              background: `radial-gradient(circle at center, color-mix(in srgb, ${craftingAccent} 7%, rgb(var(--sep-colour-0d0907))), rgb(var(--sep-colour-080605)) 72%)`,
              boxShadow: "inset 0 0 42px rgba(0,0,0,0.5)",
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] aspect-square -translate-x-1/2 -translate-y-1/2 rotate-45 border"
              style={{ borderColor: `color-mix(in srgb, ${craftingAccent} 13%, transparent)` }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 h-[52%] aspect-square -translate-x-1/2 -translate-y-1/2 rotate-45 border"
              style={{ borderColor: `color-mix(in srgb, ${craftingAccent} 18%, transparent)` }}
            />

            <div
              className={
                spatialLayout
                  ? "relative grid h-full min-h-[240px] max-h-full w-full max-w-[720px] grid-cols-[minmax(0,1fr)_minmax(140px,0.9fr)_minmax(0,1fr)] grid-rows-[minmax(72px,0.9fr)_minmax(128px,1.15fr)_minmax(72px,0.9fr)] items-center justify-items-center gap-2 sm:min-h-[260px] sm:max-w-[740px] sm:grid-cols-[minmax(0,1fr)_minmax(160px,1fr)_minmax(0,1fr)] sm:grid-rows-[minmax(80px,1fr)_minmax(148px,1.2fr)_minmax(80px,1fr)] sm:gap-3"
                  : "relative grid h-full min-h-0 w-full max-w-[760px] auto-rows-fr grid-cols-2 items-center gap-2 2xl:grid-cols-3"
              }
            >
              {spatialLayout ? (
                <div
                  className="relative col-start-2 row-start-2 flex h-28 w-28 items-center justify-center border p-[4px] transition-all duration-300 sm:h-32 sm:w-32 2xl:h-36 2xl:w-36"
                  style={{
                    borderColor: allSlotsFilled
                      ? craftingAccent
                      : `color-mix(in srgb, ${craftingAccent} 38%, transparent)`,
                    background: `linear-gradient(145deg, color-mix(in srgb, ${craftingAccent} ${allSlotsFilled ? 14 : 6}%, rgb(var(--sep-colour-17110d))), rgb(var(--sep-colour-080605)))`,
                    boxShadow: allSlotsFilled
                      ? `0 0 30px color-mix(in srgb, ${craftingAccent} 22%, transparent), inset 0 0 22px color-mix(in srgb, ${craftingAccent} 10%, transparent)`
                      : "inset 0 0 24px rgba(0,0,0,0.55)",
                  }}
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-3 rotate-45 border"
                    style={{ borderColor: `color-mix(in srgb, ${craftingAccent} 24%, transparent)` }}
                  />
                  <div className="relative flex flex-col items-center text-center">
                    <ItemImage
                      src={selectedRecipe?.result.image_url ?? null}
                      size="lg"
                      fallback="✦"
                    />
                    <p className="mt-2 max-w-[120px] truncate font-serif text-[11px] text-[rgb(var(--sep-colour-d4bd94))]">
                      {selectedRecipe?.result.name}
                    </p>
                    <p
                      className="mt-1 text-[6px] uppercase tracking-[0.16em]"
                      style={{
                        color: allSlotsFilled
                          ? craftingAccent
                          : "rgb(var(--sep-colour-806b50))",
                      }}
                    >
                      {allSlotsFilled
                        ? "Ready to make"
                        : `Result × ${selectedRecipe?.result_quantity ?? 1}`}
                    </p>
                  </div>
                </div>
              ) : null}

              {selectedRecipe?.ingredients.map((ingredient, index) => {
                const owned =
                  inventoryByItemId.get(ingredient.item_id)?.quantity ?? 0;
                const filled = filledSlots[ingredient.item_id] === true;
                const enough = owned >= ingredient.quantity;
                const draggingMatch = draggedItemId === ingredient.item_id;

                return (
                  <div
                    key={ingredient.item_id}
                    onDragOver={(event) => {
                      if (draggedItemId === ingredient.item_id) {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "copy";
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const itemId = event.dataTransfer.getData("text/plain");
                      fillIngredient(itemId);
                      setDraggedItemId(null);
                    }}
                    className={`${spatialLayout ? ingredientPosition(index, selectedRecipe.ingredients.length) : ""} relative flex h-auto min-h-[70px] w-full max-w-[160px] items-center border transition duration-200 sm:min-h-[76px] sm:max-w-[180px] xl:max-w-[190px]`}
                    style={{
                      borderColor: filled
                        ? craftingAccent
                        : draggingMatch
                          ? `color-mix(in srgb, ${craftingAccent} 72%, transparent)`
                          : `color-mix(in srgb, ${craftingAccent} 25%, transparent)`,
                      background: filled
                        ? `color-mix(in srgb, ${craftingAccent} 9%, rgb(var(--sep-colour-17110d)))`
                        : "rgb(var(--sep-colour-100c09))",
                      boxShadow: filled
                        ? `0 0 18px color-mix(in srgb, ${craftingAccent} 13%, transparent), inset 0 0 14px color-mix(in srgb, ${craftingAccent} 6%, transparent)`
                        : "none",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (filled) {
                          setFilledSlots((current) => ({
                            ...current,
                            [ingredient.item_id]: false,
                          }));
                        } else {
                          fillIngredient(ingredient.item_id);
                        }
                      }}
                      className="relative z-10 flex h-full min-h-0 w-full items-center gap-2 px-2.5 py-1.5 text-left sm:gap-3 sm:px-3 sm:py-2"
                    >
                      <ItemImage src={ingredient.image_url} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[9px] leading-3.5 text-[rgb(var(--sep-colour-d4bd94))] sm:text-[10px] sm:leading-4">
                          {ingredient.name}
                        </p>
                        <p
                          className="mt-0.5 font-serif text-[8px] sm:text-[9px]"
                          style={{
                            color: enough
                              ? craftingAccent
                              : "rgb(var(--sep-colour-806b50))",
                          }}
                        >
                          {owned} / {ingredient.quantity}
                        </p>
                        <p className="mt-0.5 text-[6px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
                          {filled ? "Placed" : enough ? "Place material" : "Missing"}
                        </p>
                      </div>
                      <span
                        aria-hidden="true"
                        className="text-xs"
                        style={{
                          color: filled
                            ? craftingAccent
                            : "rgb(var(--sep-colour-4e3b29))",
                        }}
                      >
                        {filled ? "◆" : "◇"}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="mt-3 grid shrink-0 gap-3 border bg-[rgb(var(--sep-colour-100c09))] p-3 lg:grid-cols-[1fr_auto] lg:items-center"
            style={{ borderColor: `color-mix(in srgb, ${craftingAccent} 28%, transparent)` }}
          >
            <div className="flex min-w-0 items-center gap-3">
              {!spatialLayout ? (
                <ItemImage
                  src={selectedRecipe?.result.image_url ?? null}
                  size="lg"
                  fallback="✦"
                />
              ) : null}

              <div className="min-w-0">
                <p className="text-[7px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
                  {spatialLayout ? "Workbench state" : "Result"}
                </p>
                <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-d4bd94))]">
                  {spatialLayout
                    ? allSlotsFilled
                      ? `${selectedRecipe?.result_quantity ?? 1} × ${selectedRecipe?.result.name ?? ""} ready`
                      : "Place every required material"
                    : `${selectedRecipe?.result_quantity ?? 1} × ${selectedRecipe?.result.name ?? ""}`}
                </p>

                {notice ? (
                  <p
                    className="mt-1 text-[9px] leading-4"
                    style={{
                      color:
                        notice.tone === "success"
                          ? craftingAccent
                          : "rgb(var(--sep-colour-c17b6c))",
                    }}
                  >
                    {notice.text}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={autofill}
                disabled={!allRequirementsOwned || isPending}
                className="border px-4 py-2.5 text-[7px] uppercase tracking-[0.18em] transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-35"
                style={{
                  borderColor: `color-mix(in srgb, ${craftingAccent} 38%, transparent)`,
                  background: "rgb(var(--sep-colour-17110d))",
                  color: "rgb(var(--sep-colour-dfc79c))",
                }}
              >
                Set the Bench
              </button>

              <button
                type="button"
                onClick={craft}
                disabled={!allRequirementsOwned || !allSlotsFilled || isPending}
                className="relative overflow-hidden border px-5 py-2.5 text-[7px] uppercase tracking-[0.2em] transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-35"
                style={{
                  borderColor: allSlotsFilled
                    ? craftingAccent
                    : `color-mix(in srgb, ${craftingAccent} 28%, transparent)`,
                  background: allSlotsFilled
                    ? `linear-gradient(180deg, color-mix(in srgb, ${craftingAccent} 16%, rgb(var(--sep-colour-3b2919))), rgb(var(--sep-colour-21170f)))`
                    : "rgb(var(--sep-colour-17110d))",
                  color: allSlotsFilled
                    ? `color-mix(in srgb, ${craftingAccent} 44%, rgb(var(--sep-colour-efd6a8)))`
                    : "rgb(var(--sep-colour-dfc79c))",
                  boxShadow: allSlotsFilled
                    ? `0 0 16px color-mix(in srgb, ${craftingAccent} 16%, transparent)`
                    : "none",
                }}
              >
                <span className="relative">
                  {isPending ? "The work takes shape..." : "Craft"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
