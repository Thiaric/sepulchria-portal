"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import { craftRecipeAction } from "./actions";

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
    return "col-start-2 row-start-2";
  }

  if (total === 2) {
    return index === 0
      ? "col-start-1 row-start-2"
      : "col-start-3 row-start-2";
  }

  if (total === 3) {
    return [
      "col-start-2 row-start-1",
      "col-start-1 row-start-3",
      "col-start-3 row-start-3",
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
    <div className="grid h-full max-h-full min-h-0 w-full gap-4 overflow-hidden xl:grid-cols-[1fr_1fr_2fr]">
      <section className="flex h-full min-h-0 flex-col overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95">
        <div className="shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/35 px-4 py-3">
          <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-886c48))]">
            Learned Knowledge
          </p>

          <div className="mt-1 flex items-end justify-between gap-3">
            <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-ead6ad))]">
              Known Recipes
            </h2>

            <span className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-806b50))]">
              {recipes.length}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {recipes.map(
            (recipe) => {
              const active =
                recipe.id ===
                selectedRecipeId;

              const available =
                recipe.ingredients.every(
                  (ingredient) =>
                    (inventoryByItemId.get(
                      ingredient.item_id,
                    )?.quantity ??
                      0) >=
                    ingredient.quantity,
                );

              return (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() =>
                    chooseRecipe(
                      recipe.id,
                    )
                  }
                  className={`flex w-full items-center gap-3 border px-3 py-3 text-left transition ${
                    active
                      ? "border-[rgb(var(--sep-colour-a17a45))] bg-[rgb(var(--sep-colour-3b2919))]"
                      : "border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] hover:border-[rgb(var(--sep-colour-9a7344))]/80 hover:bg-[rgb(var(--sep-colour-271c12))]"
                  }`}
                >
                  <ItemImage
                    src={
                      recipe.result
                        .image_url
                    }
                    size="sm"
                    fallback="✦"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-serif text-[14px] leading-4 text-[rgb(var(--sep-colour-ead6ad))]">
                      {recipe.name}
                    </p>

                    <p
                      className={`mt-1 text-[7px] uppercase tracking-[0.12em] ${
                        available
                          ? "text-[rgb(var(--sep-colour-b88d54))]"
                          : "text-[rgb(var(--sep-colour-806b50))]"
                      }`}
                    >
                      {available
                        ? "Ready"
                        : "Materials missing"}
                    </p>
                  </div>
                </button>
              );
            },
          )}
        </div>
      </section>

      <section className="flex h-full min-h-0 flex-col overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95">
        <div className="shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/35 px-4 py-3">
          <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-886c48))]">
            Materials at Hand
          </p>

          <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-ead6ad))]">
            Ingredients
          </h2>

          <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806b50))]">
            Drag or double-click to place
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {inventory.length ? (
            inventory.map(
              (item) => {
                const usedByRecipe =
                  selectedRecipe?.ingredients.some(
                    (ingredient) =>
                      ingredient.item_id ===
                      item.id,
                  );

                return (
                  <button
                    key={item.id}
                    type="button"
                    draggable
                    onDragStart={(
                      event,
                    ) => {
                      event.dataTransfer.setData(
                        "text/plain",
                        item.id,
                      );

                      event.dataTransfer.effectAllowed =
                        "copy";

                      setDraggedItemId(
                        item.id,
                      );
                    }}
                    onDragEnd={() =>
                      setDraggedItemId(
                        null,
                      )
                    }
                    onDoubleClick={() =>
                      fillIngredient(
                        item.id,
                      )
                    }
                    className={`flex w-full items-center gap-3 border px-3 py-2.5 text-left transition ${
                      draggedItemId ===
                      item.id
                        ? "border-[rgb(var(--sep-colour-a17a45))] bg-[rgb(var(--sep-colour-3b2919))]"
                        : usedByRecipe
                          ? "border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-271c12))] hover:border-[rgb(var(--sep-colour-a17a45))] hover:bg-[rgb(var(--sep-colour-3b2919))]"
                          : "border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] opacity-70 hover:border-[rgb(var(--sep-colour-9a7344))]/80 hover:opacity-100"
                    }`}
                  >
                    <ItemImage
                      src={
                        item.image_url
                      }
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] text-[rgb(var(--sep-colour-d4bd94))]">
                        {item.name}
                      </p>

                      <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-806b50))]">
                        {qualityLabel(
                          item.quality,
                        )}
                      </p>
                    </div>

                    <span className="shrink-0 border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/20 px-2 py-1 text-[10px] text-[rgb(var(--sep-colour-d4bd94))]">
                      ×{item.quantity}
                    </span>
                  </button>
                );
              },
            )
          ) : (
            <p className="px-2 py-4 text-[10px] leading-5 text-[rgb(var(--sep-colour-9f9281))]">
              No crafting materials carried.
            </p>
          )}
        </div>
      </section>

      <section className="flex h-full min-h-0 flex-col overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95">
        <div className="shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/35 px-5 py-4">
          <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-886c48))]">
            Crafting Bench
          </p>

          <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-ead6ad))]">
            {selectedRecipe?.name}
          </h2>

          <p className="mt-2 max-w-3xl text-[10px] leading-5 text-[rgb(var(--sep-colour-9f9281))]">
            {selectedRecipe?.description}
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5">
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/35 bg-black/10 p-4">
            <div
              className={
                spatialLayout
                  ? "grid h-full min-h-0 w-full max-w-[720px] grid-cols-3 grid-rows-[repeat(3,minmax(0,1fr))] items-center justify-items-center gap-2"
                  : "grid h-full min-h-0 w-full max-w-[760px] auto-rows-fr grid-cols-2 items-center gap-2 2xl:grid-cols-3"
              }
            >
              {selectedRecipe?.ingredients.map(
                (
                  ingredient,
                  index,
                ) => {
                  const owned =
                    inventoryByItemId.get(
                      ingredient.item_id,
                    )?.quantity ?? 0;

                  const filled =
                    filledSlots[
                      ingredient.item_id
                    ] === true;

                  const enough =
                    owned >=
                    ingredient.quantity;

                  const draggingMatch =
                    draggedItemId ===
                    ingredient.item_id;

                  return (
                    <div
                      key={
                        ingredient.item_id
                      }
                      onDragOver={(
                        event,
                      ) => {
                        if (
                          draggedItemId ===
                          ingredient.item_id
                        ) {
                          event.preventDefault();
                          event.dataTransfer.dropEffect =
                            "copy";
                        }
                      }}
                      onDrop={(
                        event,
                      ) => {
                        event.preventDefault();

                        const itemId =
                          event.dataTransfer.getData(
                            "text/plain",
                          );

                        fillIngredient(
                          itemId,
                        );

                        setDraggedItemId(
                          null,
                        );
                      }}
                      className={`${spatialLayout ? ingredientPosition(index, selectedRecipe.ingredients.length) : ""} flex h-full min-h-0 w-full max-w-[230px] items-center border transition ${
                        filled
                          ? "border-[rgb(var(--sep-colour-a17a45))] bg-[rgb(var(--sep-colour-3b2919))]"
                          : draggingMatch
                            ? "border-[rgb(var(--sep-colour-9a7344))] bg-[rgb(var(--sep-colour-271c12))]"
                            : "border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (filled) {
                            setFilledSlots(
                              (
                                current,
                              ) => ({
                                ...current,
                                [ingredient.item_id]:
                                  false,
                              }),
                            );
                          } else {
                            fillIngredient(
                              ingredient.item_id,
                            );
                          }
                        }}
                        className="flex h-full min-h-0 w-full items-center gap-3 px-3 py-2 text-left"
                      >
                        <ItemImage
                          src={
                            ingredient.image_url
                          }
                          size="sm"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[10px] leading-4 text-[rgb(var(--sep-colour-d4bd94))]">
                            {ingredient.name}
                          </p>

                          <p
                            className={`mt-0.5 text-[8px] ${
                              enough
                                ? "text-[rgb(var(--sep-colour-b88d54))]"
                                : "text-[rgb(var(--sep-colour-806b50))]"
                            }`}
                          >
                            {owned} /{" "}
                            {
                              ingredient.quantity
                            }
                          </p>

                          <p className="mt-0.5 text-[6px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
                            {filled
                              ? "Placed"
                              : enough
                                ? "Drop here"
                                : "Missing"}
                          </p>
                        </div>
                      </button>
                    </div>
                  );
                },
              )}
            </div>
          </div>

          <div className="mt-4 grid shrink-0 gap-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/20 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex items-center gap-4">
              <ItemImage
                src={
                  selectedRecipe?.result
                    .image_url ??
                  null
                }
                size="lg"
                fallback="✦"
              />

              <div className="min-w-0">
                <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
                  Result
                </p>

                <p className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d4bd94))]">
                  {
                    selectedRecipe?.result_quantity
                  }{" "}
                  ×{" "}
                  {
                    selectedRecipe?.result
                      .name
                  }
                </p>

                {notice ? (
                  <p
                    className={`mt-2 text-[9px] leading-4 ${
                      notice.tone ===
                      "success"
                        ? "text-[rgb(var(--sep-colour-b88d54))]"
                        : "text-[rgb(var(--sep-colour-c17b6c))]"
                    }`}
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
                disabled={
                  !allRequirementsOwned ||
                  isPending
                }
                className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-271c12))] px-4 py-3 text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-dfc79c))] transition hover:border-[rgb(var(--sep-colour-a17a45))] hover:bg-[rgb(var(--sep-colour-3b2919))] disabled:cursor-not-allowed disabled:opacity-35"
              >
                Fill Ingredients
              </button>

              <button
                type="button"
                onClick={craft}
                disabled={
                  !allRequirementsOwned ||
                  !allSlotsFilled ||
                  isPending
                }
                className="border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-271c12))] px-4 py-3 text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-dfc79c))] transition hover:border-[rgb(var(--sep-colour-a17a45))] hover:bg-[rgb(var(--sep-colour-3b2919))] disabled:cursor-not-allowed disabled:opacity-35"
              >
                {isPending
                  ? "Crafting..."
                  : "Craft"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
