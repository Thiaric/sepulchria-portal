import {
  CraftingRecipeForm,
  type CraftingRecipeIngredientValue,
  type CraftingRecipeItemOption,
} from "@/components/admin/crafting-recipe-form";
import {
  AdminActionForm,
} from "@/components/admin/admin-action-form";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

import {
  deleteCraftingRecipe,
  updateCraftingRecipe,
} from "./actions";

type Props = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

type RecipeRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  result_item_id: string;
  result_quantity: number;
  is_active: boolean;
  sort_order: number;
};

type IngredientRow = {
  recipe_id: string;
  ingredient_item_id: string;
  quantity: number;
  sort_order: number;
};

export default async function AdminCraftingRecipesPage({
  searchParams,
}: Props) {
  await requireAdminSection(
    "items",
  );

  const params =
    (await searchParams) ??
    {};

  const supabase =
    await createClient();

  const [
    ingredientCategoryResult,
    itemsResult,
    recipesResult,
    ingredientsResult,
  ] = await Promise.all([
    supabase
      .from(
        "item_categories",
      )
      .select("id")
      .eq(
        "slug",
        "ingredient",
      )
      .maybeSingle(),

    supabase
      .from("items")
      .select(
        "id, name, slug, image_url, is_active, category_id, teaches_recipe_id",
      )
      .order(
        "name",
        {
          ascending: true,
        },
      ),

    supabase
      .from(
        "crafting_recipes",
      )
      .select(
        "id, name, slug, description, result_item_id, result_quantity, is_active, sort_order",
      )
      .order(
        "sort_order",
        {
          ascending: true,
        },
      )
      .order(
        "name",
        {
          ascending: true,
        },
      ),

    supabase
      .from(
        "crafting_recipe_ingredients",
      )
      .select(
        "recipe_id, ingredient_item_id, quantity, sort_order",
      )
      .order(
        "sort_order",
        {
          ascending: true,
        },
      ),
  ]);

  const firstError =
    ingredientCategoryResult.error ??
    itemsResult.error ??
    recipesResult.error ??
    ingredientsResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load Crafting Recipes: ${firstError.message}`,
    );
  }

  const ingredientCategoryId =
    ingredientCategoryResult
      .data?.id ??
    null;

  const allItems =
    (itemsResult.data ??
      []) as (
      CraftingRecipeItemOption & {
        category_id: string;
        teaches_recipe_id:
          | string
          | null;
      }
    )[];

  const resultItems =
    allItems
      .filter(
        (item) =>
          !item
            .teaches_recipe_id,
      )
      .map(
        ({
          category_id:
            _categoryId,
          teaches_recipe_id:
            _teachesRecipeId,
          ...item
        }) => item,
      );

  const ingredientItems =
    allItems
      .filter(
        (item) =>
          ingredientCategoryId &&
          item.category_id ===
            ingredientCategoryId,
      )
      .map(
        ({
          category_id:
            _categoryId,
          teaches_recipe_id:
            _teachesRecipeId,
          ...item
        }) => item,
      );

  const recipes =
    (recipesResult.data ??
      []) as RecipeRow[];

  const ingredientRows =
    (ingredientsResult.data ??
      []) as IngredientRow[];

  const ingredientsByRecipe =
    new Map<
      string,
      CraftingRecipeIngredientValue[]
    >();

  for (
    const row of
    ingredientRows
  ) {
    const current =
      ingredientsByRecipe.get(
        row.recipe_id,
      ) ?? [];

    current.push({
      itemId:
        row.ingredient_item_id,
      quantity:
        row.quantity,
    });

    ingredientsByRecipe.set(
      row.recipe_id,
      current,
    );
  }

  const itemNameById =
    new Map(
      allItems.map(
        (item) => [
          item.id,
          item.name,
        ],
      ),
    );

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
            Administration
          </p>

          <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">
            Crafting Recipes
          </h1>

          <p className="mt-3 max-w-4xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]">
            Review and maintain existing crafting formulas. New recipes are created
            together with their Items from Item Management; use this catalogue to
            change ingredients, quantities, descriptions, activity and other recipe details.
          </p>
        </div>

        {params.error ? (
          <div className="mt-6 border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {params.error}
          </div>
        ) : null}

        <div className="mt-8 space-y-4">
          {recipes.map(
            (recipe) => {
              const ingredients =
                ingredientsByRecipe.get(
                  recipe.id,
                ) ?? [];

              return (
                <details
                  key={
                    recipe.id
                  }
                  id={`recipe-${recipe.id}`}
                  className="scroll-mt-6 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))]"
                >
                  <summary className="cursor-pointer list-none px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-serif text-lg text-[rgb(var(--sep-colour-d8bf91))]">
                          {
                            recipe.name
                          }
                        </p>

                        <p className="mt-1 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-766956))]">
                          Produces{" "}
                          {
                            recipe.result_quantity
                          }{" "}
                          ×{" "}
                          {itemNameById.get(
                            recipe.result_item_id,
                          ) ??
                            "Unknown Item"}
                          {" · "}
                          {
                            ingredients.length
                          }{" "}
                          ingredient
                          {ingredients.length ===
                          1
                            ? ""
                            : "s"}
                        </p>
                      </div>

                      <span className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9b8768))]">
                        {recipe.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>
                  </summary>

                  <div className="border-t border-[rgb(var(--sep-colour-59432c))]/35 p-4 sm:p-5">
                    <CraftingRecipeForm
                      action={
                        updateCraftingRecipe
                      }
                      recipeId={
                        recipe.id
                      }
                      defaultName={
                        recipe.name
                      }
                      defaultSlug={
                        recipe.slug
                      }
                      defaultDescription={
                        recipe.description
                      }
                      defaultResultItemId={
                        recipe.result_item_id
                      }
                      defaultResultQuantity={
                        recipe.result_quantity
                      }
                      defaultSortOrder={
                        recipe.sort_order
                      }
                      defaultActive={
                        recipe.is_active
                      }
                      defaultIngredients={
                        ingredients
                      }
                      resultItems={
                        resultItems
                      }
                      ingredientItems={
                        ingredientItems
                      }
                      submitLabel="Save Recipe"
                    />

                    <div className="mt-5 flex justify-end border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-5">
                      <AdminActionForm
                        action={
                          deleteCraftingRecipe
                        }
                        confirmMessage={`Are you sure you want to permanently delete "${recipe.name}"?`}
                      >
                        <input
                          type="hidden"
                          name="recipeId"
                          value={
                            recipe.id
                          }
                        />

                        <button
                          type="submit"
                          className="border border-red-900/55 bg-red-950/20 px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300"
                        >
                          Delete Recipe
                        </button>
                      </AdminActionForm>
                    </div>
                  </div>
                </details>
              );
            },
          )}
        </div>
      </div>
    </main>
  );
}
