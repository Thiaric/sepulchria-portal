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
    <main className="p-5 sm:p-7 lg:p-9 admin_crafting_recipes_page_main_main">
      <div className="mx-auto max-w-7xl admin_crafting_recipes_page_div_container">
        <div className="admin_crafting_recipes_page_div_crafting_recipes">
          <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))] admin_crafting_recipes_page_p_crafting_recipes">
            Administration
          </p>

          <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))] admin_crafting_recipes_page_h1_crafting_recipes">
            Crafting Recipes
          </h1>

          <p className="mt-3 max-w-4xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))] admin_crafting_recipes_page_p_crafting_recipes_2">
            Review and maintain existing crafting formulas. New recipes are created
            together with their Items from Item Management; use this catalogue to
            change ingredients, quantities, descriptions, activity and other recipe details.
          </p>
        </div>

        {params.error ? (
          <div className="mt-6 border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-400 admin_crafting_recipes_page_div_container_2">
            {params.error}
          </div>
        ) : null}

        <div className="mt-8 space-y-4 admin_crafting_recipes_page_div_container_3">
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
                  className="scroll-mt-6 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] admin_crafting_recipes_page_details_details"
                >
                  <summary className="cursor-pointer list-none px-4 py-4 admin_crafting_recipes_page_summary_summary">
                    <div className="flex flex-wrap items-center justify-between gap-4 admin_crafting_recipes_page_div_container_4">
                      <div className="min-w-0 admin_crafting_recipes_page_div_container_5">
                        <p className="font-serif text-lg text-[rgb(var(--sep-colour-d8bf91))] admin_crafting_recipes_page_p_text">
                          {
                            recipe.name
                          }
                        </p>

                        <p className="mt-1 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-766956))] admin_crafting_recipes_page_p_text_2">
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

                      <span className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9b8768))] admin_crafting_recipes_page_span_text">
                        {recipe.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>
                  </summary>

                  <div className="border-t border-[rgb(var(--sep-colour-59432c))]/35 p-4 sm:p-5 admin_crafting_recipes_page_div_container_6">
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

                    <div className="mt-5 flex justify-end border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-5 admin_crafting_recipes_page_div_container_7">
                      <AdminActionForm
                        action={
                          deleteCraftingRecipe
                        }
                        confirmMessage={`Are you sure you want to permanently delete "${recipe.name}"?`}
                      >
                        <input className="admin_crafting_recipes_page_input_recipe_id"
                          type="hidden"
                          name="recipeId"
                          value={
                            recipe.id
                          }
                        />

                        <button
                          type="submit"
                          className="border border-red-900/55 bg-red-950/20 px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-red-300 admin_crafting_recipes_page_button_delete_recipe"
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
