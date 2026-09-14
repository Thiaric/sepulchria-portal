"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Recipe = {
  id: string;
  name: string;
};

type Ingredient = {
  recipe_id: string;
  ingredient_item_id: string;
  quantity: number;
};

type InventoryRow = {
  item_id: string;
  quantity: number;
};

type IngredientName = {
  id: string;
  name: string;
};

type MissingIngredient = {
  itemId: string;
  name: string;
  required: number;
  owned: number;
  missing: number;
};

type RecipeStatus = {
  id: string;
  name: string;
  ready: boolean;
  missingUnits: number;
  missingKinds: number;
  missingIngredients: MissingIngredient[];
};

const CRAFTING_SELECT_RECIPE_EVENT =
  "sepulchria:crafting-select-recipe";

export function CraftingContextPanel() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [ingredientNames, setIngredientNames] = useState<IngredientName[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setError("Unable to identify your character.");
          setLoading(false);
        }
        return;
      }

      const { data: character, error: characterError } = await supabase
        .from("characters")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (characterError || !character) {
        if (!cancelled) {
          setError(
            characterError?.message ??
              "Unable to identify your character.",
          );
          setLoading(false);
        }
        return;
      }

      const characterId = character.id;

      async function refresh() {
        const [knownResult, inventoryResult] = await Promise.all([
          supabase
            .from("character_recipes")
            .select("recipe_id")
            .eq("character_id", characterId),
          supabase
            .from("character_items")
            .select("item_id, quantity")
            .eq("character_id", characterId)
            .is("container_instance_id", null),
        ]);

        if (cancelled) return;

        if (knownResult.error || inventoryResult.error) {
          setError(
            knownResult.error?.message ??
              inventoryResult.error?.message ??
              "Unable to load crafting context.",
          );
          setLoading(false);
          return;
        }

        const recipeIds = (knownResult.data ?? []).map((row) =>
          String(row.recipe_id),
        );

        if (!recipeIds.length) {
          setRecipes([]);
          setIngredients([]);
          setIngredientNames([]);
          setInventory(
            ((inventoryResult.data ?? []) as InventoryRow[]).map((row) => ({
              item_id: String(row.item_id),
              quantity: Number(row.quantity ?? 0),
            })),
          );
          setError(null);
          setLoading(false);
          return;
        }

        const [recipeResult, ingredientResult] = await Promise.all([
          supabase
            .from("crafting_recipes")
            .select("id, name")
            .in("id", recipeIds)
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),
          supabase
            .from("crafting_recipe_ingredients")
            .select("recipe_id, ingredient_item_id, quantity")
            .in("recipe_id", recipeIds),
        ]);

        if (cancelled) return;

        if (recipeResult.error || ingredientResult.error) {
          setError(
            recipeResult.error?.message ??
              ingredientResult.error?.message ??
              "Unable to load crafting context.",
          );
          setLoading(false);
          return;
        }

        const nextIngredients = (ingredientResult.data ?? []).map((row) => ({
          recipe_id: String(row.recipe_id),
          ingredient_item_id: String(row.ingredient_item_id),
          quantity: Number(row.quantity ?? 0),
        }));

        const ingredientItemIds = [
          ...new Set(
            nextIngredients.map(
              (ingredient) => ingredient.ingredient_item_id,
            ),
          ),
        ];

        const itemResult = ingredientItemIds.length
          ? await supabase
              .from("items")
              .select("id, name")
              .in("id", ingredientItemIds)
          : { data: [] as IngredientName[], error: null };

        if (cancelled) return;

        if (itemResult.error) {
          setError(itemResult.error.message);
          setLoading(false);
          return;
        }

        setRecipes(
          (recipeResult.data ?? []).map((row) => ({
            id: String(row.id),
            name: String(row.name),
          })),
        );

        setIngredients(nextIngredients);

        setIngredientNames(
          (itemResult.data ?? []).map((row) => ({
            id: String(row.id),
            name: String(row.name),
          })),
        );

        setInventory(
          ((inventoryResult.data ?? []) as InventoryRow[]).map((row) => ({
            item_id: String(row.item_id),
            quantity: Number(row.quantity ?? 0),
          })),
        );

        setError(null);
        setLoading(false);
      }

      await refresh();

      if (cancelled) {
        return;
      }

      channel = supabase.channel(
        `crafting-context-${characterId}-${crypto.randomUUID()}`,
      );

      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "character_items",
          filter: `character_id=eq.${characterId}`,
        },
        () => {
          void refresh();
        },
      );

      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "character_recipes",
          filter: `character_id=eq.${characterId}`,
        },
        () => {
          void refresh();
        },
      );

      channel.subscribe();
    }

    void load();

    return () => {
      cancelled = true;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);

  const summary = useMemo(() => {
    const inventoryByItem = new Map<string, number>();

    for (const row of inventory) {
      inventoryByItem.set(
        row.item_id,
        (inventoryByItem.get(row.item_id) ?? 0) + row.quantity,
      );
    }

    const nameByItem = new Map(
      ingredientNames.map((item) => [item.id, item.name] as const),
    );

    const ingredientsByRecipe = new Map<string, Ingredient[]>();

    for (const ingredient of ingredients) {
      const current =
        ingredientsByRecipe.get(ingredient.recipe_id) ?? [];

      current.push(ingredient);
      ingredientsByRecipe.set(ingredient.recipe_id, current);
    }

    const statuses: RecipeStatus[] = recipes.map((recipe) => {
      const requirements =
        ingredientsByRecipe.get(recipe.id) ?? [];

      const missingIngredients: MissingIngredient[] = [];

      for (const requirement of requirements) {
        const owned =
          inventoryByItem.get(requirement.ingredient_item_id) ?? 0;

        const missing = Math.max(
          0,
          requirement.quantity - owned,
        );

        if (missing > 0) {
          missingIngredients.push({
            itemId: requirement.ingredient_item_id,
            name:
              nameByItem.get(requirement.ingredient_item_id) ??
              "Unknown ingredient",
            required: requirement.quantity,
            owned,
            missing,
          });
        }
      }

      return {
        id: recipe.id,
        name: recipe.name,
        ready: missingIngredients.length === 0,
        missingUnits: missingIngredients.reduce(
          (total, ingredient) => total + ingredient.missing,
          0,
        ),
        missingKinds: missingIngredients.length,
        missingIngredients,
      };
    });

    const usedIngredientIds = new Set(
      ingredients.map(
        (ingredient) => ingredient.ingredient_item_id,
      ),
    );

    const materialUnitsCarried = [...usedIngredientIds].reduce(
      (total, itemId) =>
        total + (inventoryByItem.get(itemId) ?? 0),
      0,
    );

    const missingIngredientKinds = new Set<string>();

    for (const status of statuses) {
      for (const ingredient of status.missingIngredients) {
        missingIngredientKinds.add(ingredient.itemId);
      }
    }

    return {
      statuses,
      craftableNow: statuses.filter((recipe) => recipe.ready).length,
      materialUnitsCarried,
      missingIngredientKinds: missingIngredientKinds.size,
    };
  }, [recipes, ingredients, inventory, ingredientNames]);

  const workbenchRecipes = useMemo(
    () =>
      [...summary.statuses].sort((a, b) => {
        if (a.ready !== b.ready) {
          return a.ready ? -1 : 1;
        }

        if (a.missingKinds !== b.missingKinds) {
          return a.missingKinds - b.missingKinds;
        }

        if (a.missingUnits !== b.missingUnits) {
          return a.missingUnits - b.missingUnits;
        }

        return a.name.localeCompare(b.name);
      }),
    [summary.statuses],
  );

  function selectRecipe(recipeId: string) {
    window.dispatchEvent(
      new CustomEvent(CRAFTING_SELECT_RECIPE_EVENT, {
        detail: { recipeId },
      }),
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <p
          data-skin-role="primary"
          className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-global-c1))]"
        >
          Knowledge &amp; Craft
        </p>

        <h2
          data-skin-role="secondary"
          className="mt-1 font-serif text-xl text-[rgb(var(--sep-global-c2))]"
        >
          Workbench
        </h2>
      </div>

      {error ? (
        <p className="mt-3 text-[10px] leading-5 text-red-400">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-3 text-[10px] text-[rgb(var(--sep-global-c1))]">
          Reading your recipe book...
        </p>
      ) : (
        <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <section className="border border-[rgb(var(--sep-global-c1))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3">
            <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-global-c1))]">
              Crafting Overview
            </p>

            <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden border border-[rgb(var(--sep-global-c1))]/25 bg-[rgb(var(--sep-global-c1))]/20">
              <div className="bg-[rgb(var(--sep-colour-15100d))] px-2.5 py-2">
                <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-global-c1))]">
                  Recipes Known
                </p>
                <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-global-c2))]">
                  {recipes.length}
                </p>
              </div>

              <div className="bg-[rgb(var(--sep-colour-15100d))] px-2.5 py-2">
                <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-global-c1))]">
                  Craftable Now
                </p>
                <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-global-c2))]">
                  {summary.craftableNow}
                </p>
              </div>

              <div className="bg-[rgb(var(--sep-colour-15100d))] px-2.5 py-2">
                <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-global-c1))]">
                  Materials Carried
                </p>
                <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-global-c2))]">
                  {summary.materialUnitsCarried}
                </p>
              </div>

              <div className="group relative bg-[rgb(var(--sep-colour-15100d))] px-2.5 py-2">
                <p className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-global-c1))]">
                  Missing Materials
                </p>
                <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-global-c2))]">
                  {summary.missingIngredientKinds}
                </p>

                {summary.missingIngredientKinds > 0 ? (
                  <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden w-60 border border-[rgb(var(--sep-global-c1))]/45 bg-[rgb(var(--sep-colour-100c09))] p-3 shadow-xl group-hover:block">
                    <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-global-c1))]">
                      Missing across known recipes
                    </p>

                    <div className="mt-2 space-y-1.5">
                      {[
                        ...new Map(
                          summary.statuses.flatMap((recipe) =>
                            recipe.missingIngredients.map((ingredient) => [
                              ingredient.itemId,
                              ingredient,
                            ] as const),
                          ),
                        ).values(),
                      ].map((ingredient) => (
                        <div
                          key={ingredient.itemId}
                          className="flex items-center justify-between gap-3 text-[9px]"
                        >
                          <span className="truncate text-[rgb(var(--sep-global-c2))]">
                            {ingredient.name}
                          </span>
                          <span className="shrink-0 text-[rgb(var(--sep-global-c1))]">
                            need {ingredient.missing}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="border border-[rgb(var(--sep-global-c1))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-global-c1))]">
                  Workbench Notes
                </p>
                <h3 className="mt-1 font-serif text-[15px] text-[rgb(var(--sep-global-c2))]">
                  Closest to Crafting
                </h3>
              </div>

              <span className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-global-c1))]">
                {summary.craftableNow} ready
              </span>
            </div>

            <div className="mt-2 space-y-1.5">
              {workbenchRecipes.length ? (
                workbenchRecipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => selectRecipe(recipe.id)}
                    className="group/recipe relative flex w-full items-center justify-between gap-2 border border-[rgb(var(--sep-global-c1))]/25 bg-[rgb(var(--sep-colour-15100d))] px-2.5 py-2 text-left transition hover:border-[rgb(var(--sep-global-c1))]/65 hover:bg-[rgb(var(--sep-global-c1))]/10"
                    title={
                      recipe.ready
                        ? `Open ${recipe.name} in the workbench`
                        : undefined
                    }
                  >
                    <span className="min-w-0 truncate font-serif text-[12px] text-[rgb(var(--sep-global-c2))]">
                      {recipe.name}
                    </span>

                    <span className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={[
                          "text-[7px] uppercase tracking-[0.1em]",
                          recipe.ready
                            ? "text-emerald-400"
                            : "text-[rgb(var(--sep-global-c1))]",
                        ].join(" ")}
                      >
                        {recipe.ready
                          ? "Ready"
                          : `Missing ${recipe.missingUnits}`}
                      </span>

                      <span className="text-[9px] text-[rgb(var(--sep-global-c1))] opacity-45 transition group-hover/recipe:translate-x-0.5 group-hover/recipe:opacity-100">
                        →
                      </span>
                    </span>

                    {!recipe.ready ? (
                      <div className="pointer-events-none absolute right-2 top-full z-50 mt-1 hidden w-64 border border-[rgb(var(--sep-global-c1))]/45 bg-[rgb(var(--sep-colour-100c09))] p-3 shadow-xl group-hover/recipe:block">
                        <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-global-c1))]">
                          Missing for {recipe.name}
                        </p>

                        <div className="mt-2 space-y-1.5">
                          {recipe.missingIngredients.map((ingredient) => (
                            <div
                              key={ingredient.itemId}
                              className="flex items-start justify-between gap-3 text-[9px]"
                            >
                              <span className="min-w-0 text-[rgb(var(--sep-global-c2))]">
                                {ingredient.name}
                              </span>

                              <span className="shrink-0 text-right text-[rgb(var(--sep-global-c1))]">
                                {ingredient.owned}/{ingredient.required}
                                <span className="ml-1 opacity-75">
                                  (-{ingredient.missing})
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>

                        <p className="mt-2 border-t border-[rgb(var(--sep-global-c1))]/20 pt-2 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-global-c1))]/80">
                          Click to open recipe
                        </p>
                      </div>
                    ) : null}
                  </button>
                ))
              ) : (
                <p className="text-[10px] leading-5 text-[rgb(var(--sep-global-c1))]">
                  No recipes learned yet.
                </p>
              )}
            </div>
          </section>

          <section className="border border-[rgb(var(--sep-global-c1))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3">
            <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-global-c1))]">
              Crafting Notes
            </p>

            <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-global-c2))]">
              Click any recipe above to open it directly in the Crafting
              Workbench. Hover a recipe marked Missing to see exactly which
              materials are still required.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
