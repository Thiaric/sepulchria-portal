"use client";

import { useMemo, useState, useTransition } from "react";
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
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
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
      ? "h-16 w-16"
      : size === "sm"
        ? "h-9 w-9"
        : "h-12 w-12";

  return (
    <div
      className={`flex ${dimensions} shrink-0 items-center justify-center bg-[rgb(var(--sep-colour-0d0a08))] shadow-[inset_0_0_0_1px_rgba(116,88,54,0.22)]`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full object-contain p-1"
        />
      ) : (
        <span className="font-serif text-xl text-[rgb(var(--sep-colour-715b3d))]">
          {fallback}
        </span>
      )}
    </div>
  );
}

export function CraftingWorkbench({
  recipes,
  inventory,
}: CraftingWorkbenchProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedRecipeId, setSelectedRecipeId] = useState(recipes[0]?.id ?? "");
  const [filledSlots, setFilledSlots] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null,
    [recipes, selectedRecipeId],
  );

  const inventoryByItemId = useMemo(
    () =>
      new Map(
        inventory.map((item) => [item.id, item] as const),
      ),
    [inventory],
  );

  function chooseRecipe(recipeId: string) {
    setSelectedRecipeId(recipeId);
    setFilledSlots({});
    setNotice(null);
  }

  function fillIngredient(itemId: string) {
    if (!selectedRecipe) return;

    const requirement = selectedRecipe.ingredients.find(
      (ingredient) => ingredient.item_id === itemId,
    );

    if (!requirement) {
      setNotice({
        tone: "error",
        text: "That ingredient is not used by this recipe.",
      });
      return;
    }

    const owned = inventoryByItemId.get(itemId)?.quantity ?? 0;

    if (owned < requirement.quantity) {
      setNotice({
        tone: "error",
        text: `You need ${requirement.quantity} × ${requirement.name}, but only have ${owned}.`,
      });
      return;
    }

    setFilledSlots((current) => ({
      ...current,
      [itemId]: true,
    }));
    setNotice(null);
  }

  function autofill() {
    if (!selectedRecipe) return;

    const next: Record<string, boolean> = {};

    for (const ingredient of selectedRecipe.ingredients) {
      const owned = inventoryByItemId.get(ingredient.item_id)?.quantity ?? 0;
      if (owned >= ingredient.quantity) {
        next[ingredient.item_id] = true;
      }
    }

    setFilledSlots(next);
    setNotice(null);
  }

  const allRequirementsOwned =
    selectedRecipe?.ingredients.every((ingredient) => {
      const owned = inventoryByItemId.get(ingredient.item_id)?.quantity ?? 0;
      return owned >= ingredient.quantity;
    }) ?? false;

  const allSlotsFilled =
    selectedRecipe?.ingredients.every(
      (ingredient) => filledSlots[ingredient.item_id] === true,
    ) ?? false;

  function craft() {
    if (!selectedRecipe || !allRequirementsOwned || !allSlotsFilled || isPending) {
      return;
    }

    setNotice(null);

    startTransition(async () => {
      const result = await craftRecipeAction(selectedRecipe.id);

      setNotice({
        tone: result.success ? "success" : "error",
        text: result.message,
      });

      if (result.success) {
        setFilledSlots({});
        router.refresh();
      }
    });
  }

  if (!recipes.length) {
    return (
      <section className="flex min-h-[360px] items-center justify-center bg-[rgb(var(--sep-colour-15100d))]/65 px-8 py-12 shadow-[inset_0_0_0_1px_rgba(116,88,54,0.16)]">
        <div className="max-w-xl text-center">
          <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
            Recipe Book
          </p>
          <h2 className="mt-3 font-serif text-2xl text-[rgb(var(--sep-colour-dec79d))]">
            No recipes known
          </h2>
          <p className="mt-3 text-[11px] leading-6 text-[rgb(var(--sep-colour-8f8271))]">
            This character has not learned any crafting recipes yet. Recipes only appear here after they are learned in play.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-col gap-4">
      <section className="bg-[rgb(var(--sep-colour-15100d))]/72 shadow-[inset_0_0_0_1px_rgba(116,88,54,0.14)]">
        <div className="flex items-center justify-between gap-4 px-4 pb-2 pt-3">
          <div>
            <p className="text-[7px] uppercase tracking-[0.25em] text-[rgb(var(--sep-colour-8c704b))]">
              Learned Knowledge
            </p>
            <h2 className="mt-0.5 font-serif text-lg text-[rgb(var(--sep-colour-dec79d))]">
              Known Recipes
            </h2>
          </div>

          <span className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-75644e))]">
            {recipes.length} known
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto px-3 pb-3">
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
                className={`flex min-w-[220px] max-w-[280px] items-center gap-3 px-3 py-2.5 text-left transition ${
                  active
                    ? "bg-[rgb(var(--sep-colour-2a1d12))] shadow-[inset_0_-2px_0_rgba(181,132,72,0.72)]"
                    : "bg-[rgb(var(--sep-colour-100c09))]/70 hover:bg-[rgb(var(--sep-colour-1c1510))]"
                }`}
              >
                <ItemImage
                  src={recipe.result.image_url}
                  size="sm"
                  fallback="✦"
                />

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-serif text-[14px] leading-4 text-[rgb(var(--sep-colour-dcc59d))]">
                    {recipe.name}
                  </p>
                  <p
                    className={`mt-1 text-[7px] uppercase tracking-[0.14em] ${
                      available
                        ? "text-[rgb(var(--sep-colour-96aa77))]"
                        : "text-[rgb(var(--sep-colour-8a6e54))]"
                    }`}
                  >
                    {available ? "Materials available" : "Materials missing"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_center,rgb(var(--sep-colour-241910)),rgb(var(--sep-colour-100c09))_68%)] px-5 py-5 shadow-[inset_0_0_0_1px_rgba(116,88,54,0.18)] sm:px-6">
        <div className="grid items-center gap-6 xl:grid-cols-[minmax(240px,0.75fr)_minmax(0,2.3fr)_minmax(280px,0.9fr)]">
          <div className="min-w-0">
            <p className="text-[7px] uppercase tracking-[0.26em] text-[rgb(var(--sep-colour-8c704b))]">
              Crafting Bench
            </p>
            <h2 className="mt-1 font-serif text-2xl leading-tight text-[rgb(var(--sep-colour-ead5ac))]">
              {selectedRecipe?.name}
            </h2>
            <p className="mt-2 max-w-sm text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
              {selectedRecipe?.description}
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-stretch justify-center gap-2">
            {selectedRecipe?.ingredients.map((ingredient) => {
              const owned = inventoryByItemId.get(ingredient.item_id)?.quantity ?? 0;
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
                  className={`min-w-[170px] flex-1 basis-[170px] transition ${
                    filled
                      ? "bg-[rgb(var(--sep-colour-342316))]/90 shadow-[inset_0_-2px_0_rgba(190,139,76,0.72)]"
                      : draggingMatch
                        ? "bg-[rgb(var(--sep-colour-2d2115))]"
                        : "bg-[rgb(var(--sep-colour-15100d))]/76"
                  }`}
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
                    className="flex h-full min-h-[82px] w-full items-center gap-3 px-3 py-2 text-left"
                  >
                    <ItemImage src={ingredient.image_url} size="md" />

                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[11px] leading-4 text-[rgb(var(--sep-colour-d8c39e))]">
                        {ingredient.name}
                      </p>
                      <p
                        className={`mt-1 text-[9px] ${
                          enough
                            ? "text-[rgb(var(--sep-colour-9fb27c))]"
                            : "text-[rgb(var(--sep-colour-bf7466))]"
                        }`}
                      >
                        {owned} / {ingredient.quantity}
                      </p>
                      <p className="mt-1 text-[6px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-75644e))]">
                        {filled ? "Placed" : enough ? "Drop here" : "Missing"}
                      </p>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="min-w-0 bg-[rgb(var(--sep-colour-15100d))]/52 px-4 py-3">
            <div className="flex items-center gap-3">
              <ItemImage
                src={selectedRecipe?.result.image_url ?? null}
                size="lg"
                fallback="✦"
              />

              <div className="min-w-0">
                <p className="text-[7px] uppercase tracking-[0.19em] text-[rgb(var(--sep-colour-796448))]">
                  Result
                </p>
                <p className="mt-1 font-serif text-lg leading-5 text-[rgb(var(--sep-colour-e2c99d))]">
                  {selectedRecipe?.result_quantity} × {selectedRecipe?.result.name}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={autofill}
                disabled={!allRequirementsOwned || isPending}
                className="bg-[rgb(var(--sep-colour-1b140f))] px-3 py-2 text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-bba37e))] shadow-[inset_0_0_0_1px_rgba(116,88,54,0.18)] transition hover:bg-[rgb(var(--sep-colour-24180f))] disabled:cursor-not-allowed disabled:opacity-35"
              >
                Fill Ingredients
              </button>

              <button
                type="button"
                onClick={craft}
                disabled={!allRequirementsOwned || !allSlotsFilled || isPending}
                className="bg-[rgb(var(--sep-colour-4a3019))] px-3 py-2 text-[7px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-f0d3a0))] shadow-[inset_0_0_0_1px_rgba(190,139,76,0.28)] transition hover:bg-[rgb(var(--sep-colour-5a391d))] disabled:cursor-not-allowed disabled:bg-[rgb(var(--sep-colour-1b1511))] disabled:text-[rgb(var(--sep-colour-655b50))]"
              >
                {isPending ? "Crafting..." : "Craft"}
              </button>
            </div>

            {notice ? (
              <p
                className={`mt-3 text-[9px] leading-4 ${
                  notice.tone === "success"
                    ? "text-[rgb(var(--sep-colour-a6bd82))]"
                    : "text-[rgb(var(--sep-colour-c17b6c))]"
                }`}
              >
                {notice.text}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="bg-[rgb(var(--sep-colour-15100d))]/72 shadow-[inset_0_0_0_1px_rgba(116,88,54,0.14)]">
        <div className="flex items-end justify-between gap-4 px-4 pb-2 pt-3">
          <div>
            <p className="text-[7px] uppercase tracking-[0.25em] text-[rgb(var(--sep-colour-8c704b))]">
              Materials at Hand
            </p>
            <h2 className="mt-0.5 font-serif text-lg text-[rgb(var(--sep-colour-dec79d))]">
              Ingredients
            </h2>
          </div>

          <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-75644e))]">
            Drag to the bench or double-click
          </p>
        </div>

        {inventory.length ? (
          <div className="grid grid-flow-col auto-cols-[minmax(190px,240px)] gap-2 overflow-x-auto px-3 pb-3">
            {inventory.map((item) => {
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
                  title="Drag onto the workbench, or double-click to place"
                  className={`flex min-h-[68px] items-center gap-3 px-3 py-2 text-left transition ${
                    draggedItemId === item.id
                      ? "bg-[rgb(var(--sep-colour-302015))] shadow-[inset_0_-2px_0_rgba(190,139,76,0.72)]"
                      : usedByRecipe
                        ? "bg-[rgb(var(--sep-colour-1d1510))] hover:bg-[rgb(var(--sep-colour-251a11))]"
                        : "bg-[rgb(var(--sep-colour-100c09))]/70 opacity-72 hover:opacity-100"
                  }`}
                >
                  <ItemImage src={item.image_url} size="md" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] text-[rgb(var(--sep-colour-d6c3a2))]">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-78664f))]">
                      {qualityLabel(item.quality)}
                    </p>
                  </div>

                  <span className="shrink-0 bg-[rgb(var(--sep-colour-21170f))] px-2 py-1 text-[10px] text-[rgb(var(--sep-colour-d8bb87))] shadow-[inset_0_0_0_1px_rgba(116,88,54,0.18)]">
                    ×{item.quantity}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="px-4 pb-4 text-[10px] leading-5 text-[rgb(var(--sep-colour-786f64))]">
            No stackable crafting materials are currently in the character&apos;s root inventory.
          </p>
        )}
      </section>
    </div>
  );
}
