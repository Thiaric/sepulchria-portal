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

export function CraftingWorkbench({
  recipes,
  inventory,
}: CraftingWorkbenchProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedRecipeId, setSelectedRecipeId] = useState(
    recipes[0]?.id ?? "",
  );
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
      <section className="mt-7 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-10 text-center">
        <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
          Recipe book
        </p>
        <h2 className="mt-3 font-serif text-2xl text-[rgb(var(--sep-colour-dec79d))]">
          No recipes known
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[11px] leading-6 text-[rgb(var(--sep-colour-8f8271))]">
          This character has not learned any crafting recipes yet. Recipes only appear here after they are learned in play.
        </p>
      </section>
    );
  }

  return (
    <div className="mt-7 grid min-h-[620px] gap-4 xl:grid-cols-[minmax(230px,0.72fr)_minmax(380px,1.35fr)_minmax(260px,0.85fr)]">
      <section className="min-w-0 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
        <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 px-4 py-3">
          <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
            Materials at hand
          </p>
          <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dec79d))]">
            Inventory
          </h2>
        </div>

        <div className="max-h-[680px] space-y-2 overflow-y-auto p-3">
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
                  title="Drag onto the workbench, or double-click to place"
                  className={`flex w-full items-center gap-3 border p-2 text-left transition ${
                    draggedItemId === item.id
                      ? "border-[rgb(var(--sep-colour-bb8b48))] bg-[rgb(var(--sep-colour-302015))]"
                      : usedByRecipe
                        ? "border-[rgb(var(--sep-colour-765a37))] bg-[rgb(var(--sep-colour-1c1510))] hover:border-[rgb(var(--sep-colour-a47b43))]"
                        : "border-[rgb(var(--sep-colour-4f3b28))]/55 bg-[rgb(var(--sep-colour-100c09))] hover:border-[rgb(var(--sep-colour-765a37))]"
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-0d0a08))]">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt=""
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <span className="font-serif text-xl text-[rgb(var(--sep-colour-715b3d))]">◇</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] text-[rgb(var(--sep-colour-d6c3a2))]">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-78664f))]">
                      {qualityLabel(item.quality)}
                    </p>
                  </div>

                  <span className="shrink-0 border border-[rgb(var(--sep-colour-644b2e))]/55 bg-[rgb(var(--sep-colour-21170f))] px-2 py-1 text-[10px] text-[rgb(var(--sep-colour-d8bb87))]">
                    ×{item.quantity}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="p-4 text-center text-[10px] leading-5 text-[rgb(var(--sep-colour-786f64))]">
              No stackable materials are currently in the character&apos;s root inventory.
            </p>
          )}
        </div>
      </section>

      <section className="relative min-w-0 overflow-hidden border border-[rgb(var(--sep-colour-765a37))]/60 bg-[radial-gradient(circle_at_center,rgb(var(--sep-colour-261b12)),rgb(var(--sep-colour-100c09))_70%)]">
        <div className="absolute inset-3 border border-[rgb(var(--sep-colour-6e5332))]/20 pointer-events-none" />

        <div className="relative flex h-full min-h-[620px] flex-col p-5 sm:p-6">
          <div className="text-center">
            <p className="text-[8px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
              Crafting bench
            </p>
            <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-ead5ac))]">
              {selectedRecipe?.name}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
              {selectedRecipe?.description}
            </p>
          </div>

          <div className="my-6 grid flex-1 content-center gap-3 sm:grid-cols-2">
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
                  className={`relative min-h-28 border p-3 transition ${
                    filled
                      ? "border-[rgb(var(--sep-colour-c29148))] bg-[rgb(var(--sep-colour-382517))]/75"
                      : draggingMatch
                        ? "border-[rgb(var(--sep-colour-d0a15c))] bg-[rgb(var(--sep-colour-2d2115))]"
                        : enough
                          ? "border-[rgb(var(--sep-colour-6f5637))] bg-[rgb(var(--sep-colour-17110d))]/80"
                          : "border-[rgb(var(--sep-colour-573b2f))]/70 bg-[rgb(var(--sep-colour-130d0b))]/80"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (filled) {
                        setFilledSlots((current) => ({ ...current, [ingredient.item_id]: false }));
                      } else {
                        fillIngredient(ingredient.item_id);
                      }
                    }}
                    className="flex h-full w-full items-center gap-3 text-left"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0a08))]">
                      {ingredient.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ingredient.image_url}
                          alt=""
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <span className="font-serif text-2xl text-[rgb(var(--sep-colour-715b3d))]">◇</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] text-[rgb(var(--sep-colour-d8c39e))]">
                        {ingredient.name}
                      </p>
                      <p className={`mt-1 text-[9px] ${enough ? "text-[rgb(var(--sep-colour-9fb27c))]" : "text-[rgb(var(--sep-colour-bf7466))]"}`}>
                        {owned} / {ingredient.quantity} owned
                      </p>
                      <p className="mt-1 text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-75644e))]">
                        {filled ? "Placed on bench" : enough ? "Drop here" : "Missing material"}
                      </p>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center border border-[rgb(var(--sep-colour-765a37))] bg-[rgb(var(--sep-colour-0d0a08))]">
                  {selectedRecipe?.result.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedRecipe.result.image_url}
                      alt=""
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <span className="font-serif text-2xl text-[rgb(var(--sep-colour-8e724c))]">✦</span>
                  )}
                </div>
                <div>
                  <p className="text-[7px] uppercase tracking-[0.19em] text-[rgb(var(--sep-colour-796448))]">
                    Result
                  </p>
                  <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-e2c99d))]">
                    {selectedRecipe?.result_quantity} × {selectedRecipe?.result.name}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={autofill}
                  disabled={!allRequirementsOwned || isPending}
                  className="border border-[rgb(var(--sep-colour-654b2e))] bg-[rgb(var(--sep-colour-17110d))] px-4 py-2 text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-bba37e))] transition hover:border-[rgb(var(--sep-colour-927047))] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Fill ingredients
                </button>

                <button
                  type="button"
                  onClick={craft}
                  disabled={!allRequirementsOwned || !allSlotsFilled || isPending}
                  className="border border-[rgb(var(--sep-colour-a47b43))] bg-[rgb(var(--sep-colour-472d18))] px-5 py-2 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-f3d7a5))] transition hover:border-[rgb(var(--sep-colour-d0a15c))] hover:bg-[rgb(var(--sep-colour-5c391d))] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {isPending ? "Crafting…" : "Craft"}
                </button>
              </div>
            </div>

            {notice ? (
              <p
                className={`mt-4 border px-3 py-2 text-[10px] leading-5 ${
                  notice.tone === "success"
                    ? "border-[rgb(var(--sep-colour-5c7043))]/70 bg-[rgb(var(--sep-colour-172014))] text-[rgb(var(--sep-colour-b7c99c))]"
                    : "border-[rgb(var(--sep-colour-71433b))]/70 bg-[rgb(var(--sep-colour-241310))] text-[rgb(var(--sep-colour-d69b8d))]"
                }`}
              >
                {notice.text}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="min-w-0 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
        <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 px-4 py-3">
          <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
            Learned knowledge
          </p>
          <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dec79d))]">
            Known Recipes
          </h2>
          <p className="mt-1 text-[8px] text-[rgb(var(--sep-colour-786f64))]">
            {recipes.length} known
          </p>
        </div>

        <div className="max-h-[680px] space-y-2 overflow-y-auto p-3">
          {recipes.map((recipe) => {
            const selected = recipe.id === selectedRecipeId;
            const craftable = recipe.ingredients.every((ingredient) =>
              (inventoryByItemId.get(ingredient.item_id)?.quantity ?? 0) >= ingredient.quantity,
            );

            return (
              <button
                key={recipe.id}
                type="button"
                onClick={() => chooseRecipe(recipe.id)}
                className={`w-full border p-3 text-left transition ${
                  selected
                    ? "border-[rgb(var(--sep-colour-a47b43))] bg-[rgb(var(--sep-colour-302015))]"
                    : "border-[rgb(var(--sep-colour-4f3b28))]/55 bg-[rgb(var(--sep-colour-100c09))] hover:border-[rgb(var(--sep-colour-765a37))]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-0d0a08))]">
                    {recipe.result.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={recipe.result.image_url}
                        alt=""
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <span className="font-serif text-xl text-[rgb(var(--sep-colour-715b3d))]">✦</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-base leading-5 text-[rgb(var(--sep-colour-d8c39e))]">
                      {recipe.name}
                    </p>
                    <p className={`mt-1 text-[7px] uppercase tracking-[0.16em] ${craftable ? "text-[rgb(var(--sep-colour-94ad75))]" : "text-[rgb(var(--sep-colour-8a655a))]"}`}>
                      {craftable ? "Materials available" : "Materials missing"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
