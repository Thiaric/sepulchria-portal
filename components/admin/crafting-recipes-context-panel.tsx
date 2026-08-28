"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type Entry = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  ingredients: string[];
  searchText: string;
};

export function CraftingRecipesContextPanel() {
  const [entries, setEntries] =
    useState<Entry[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);
  const [search, setSearch] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase =
        createClient();

      const [
        recipesResult,
        linksResult,
        itemsResult,
      ] = await Promise.all([
        supabase
          .from("crafting_recipes")
          .select(
            "id, name, slug, is_active",
          )
          .order(
            "sort_order",
            { ascending: true },
          )
          .order("name"),

        supabase
          .from(
            "crafting_recipe_ingredients",
          )
          .select(
            "recipe_id, ingredient_item_id, sort_order",
          )
          .order(
            "sort_order",
            { ascending: true },
          ),

        supabase
          .from("items")
          .select("id, name"),
      ]);

      if (cancelled) {
        return;
      }

      const firstError =
        recipesResult.error ??
        linksResult.error ??
        itemsResult.error;

      if (firstError) {
        setError(
          firstError.message,
        );
        setLoading(false);
        return;
      }

      const itemNameById =
        new Map(
          (
            itemsResult.data ?? []
          ).map(
            (item) => [
              String(item.id),
              String(item.name),
            ],
          ),
        );

      const ingredientsByRecipe =
        new Map<string, string[]>();

      for (
        const link of
        linksResult.data ?? []
      ) {
        const recipeId =
          String(link.recipe_id);

        const ingredientName =
          itemNameById.get(
            String(
              link.ingredient_item_id,
            ),
          );

        if (!ingredientName) {
          continue;
        }

        const current =
          ingredientsByRecipe.get(
            recipeId,
          ) ?? [];

        current.push(
          ingredientName,
        );

        ingredientsByRecipe.set(
          recipeId,
          current,
        );
      }

      const next =
        (
          recipesResult.data ?? []
        ).map((recipe) => {
          const id =
            String(recipe.id);
          const name =
            String(recipe.name);
          const slug =
            String(recipe.slug);
          const ingredients =
            ingredientsByRecipe.get(
              id,
            ) ?? [];

          return {
            id,
            name,
            slug,
            ingredients,
            active:
              recipe.is_active ===
              true,
            searchText: [
              name,
              slug,
              ...ingredients,
            ]
              .join(" ")
              .toLowerCase(),
          };
        });

      setEntries(next);
      setError(null);
      setLoading(false);
    }

    const handleAdminDataChanged = () => {
      void load();
    };

    window.addEventListener(
      "sepulchria:admin-data-changed",
      handleAdminDataChanged,
    );

    void load();

    return () => {
      cancelled = true;
      window.removeEventListener(
        "sepulchria:admin-data-changed",
        handleAdminDataChanged,
      );
    };
  }, []);

  const query =
    search.trim().toLowerCase();

  const visibleEntries =
    useMemo(
      () =>
        entries.filter(
          (entry) =>
            !query ||
            entry.searchText.includes(
              query,
            ),
        ),
      [entries, query],
    );

  function jump(entry: Entry) {
    const details =
      document.getElementById(
        `recipe-${entry.id}`,
      );

    if (
      details instanceof
      HTMLDetailsElement
    ) {
      details.open = true;
    }

    window.requestAnimationFrame(
      () => {
        details?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      },
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        Administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        Crafting Recipes
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Search by recipe name, slug or Ingredient and jump directly to its editor.
      </p>

      <label className="mt-3 block">
        <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Search Recipes
        </span>

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder="Name, slug or ingredient..."
          className="mt-2 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]"
        />

        <span className="mt-1.5 block text-right text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-6f6353))]">
          {visibleEntries.length}
          {query
            ? ` / ${entries.length}`
            : ""}{" "}
          Recipes
        </span>
      </label>

      {error ? (
        <p className="mt-3 border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-2.5 text-[10px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]">
          {error}
        </p>
      ) : null}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({
              length: 7,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-12 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]"
                />
              ),
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {visibleEntries.map(
              (entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() =>
                    jump(entry)
                  }
                  className="group flex w-full items-center justify-between gap-2 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-left transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-1d150f))]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                      {entry.name}
                    </span>

                    <span className="mt-0.5 block truncate text-[8px] tracking-[0.06em] text-[rgb(var(--sep-colour-6f6252))]">
                      {entry.ingredients.length
                        ? entry.ingredients.join(
                            " · ",
                          )
                        : "No ingredients"}
                    </span>
                  </span>

                  <span
                    title={
                      entry.active
                        ? "Active"
                        : "Inactive"
                    }
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      entry.active
                        ? "bg-emerald-600"
                        : "bg-[rgb(var(--sep-colour-66594b))]"
                    }`}
                  />
                </button>
              ),
            )}
          </div>
        )}

        {!loading &&
        !error &&
        visibleEntries.length ===
          0 ? (
          <p className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3 text-[10px] leading-5 text-[rgb(var(--sep-colour-817361))]">
            No recipes match this search.
          </p>
        ) : null}
      </div>
    </div>
  );
}
