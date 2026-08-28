"use server";

import {
  revalidatePath,
} from "next/cache";
import { redirect } from "next/navigation";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

function text(
  formData: FormData,
  name: string,
) {
  const value =
    formData.get(name);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function positiveInteger(
  value: string,
  label: string,
) {
  const parsed =
    Number.parseInt(value, 10);

  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    throw new Error(
      `${label} must be at least 1.`,
    );
  }

  return parsed;
}

function integer(
  value: string,
  fallback = 0,
) {
  if (!value.trim()) {
    return fallback;
  }

  const parsed =
    Number.parseInt(value, 10);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function slugify(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

function isUuid(
  value: string,
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function fail(
  message: string,
): never {
  const params =
    new URLSearchParams();

  params.set(
    "error",
    message,
  );

  redirect(
    `/admin/crafting-recipes?${params.toString()}`,
  );
}

function refresh() {
  revalidatePath(
    "/admin/crafting-recipes",
  );
  revalidatePath(
    "/admin/items",
  );
  revalidatePath(
    "/crafting",
  );
}

type IngredientInput = {
  itemId: string;
  quantity: number;
  sortOrder: number;
};

async function recipeValues(
  formData: FormData,
) {
  const name =
    text(formData, "name");

  if (!name) {
    throw new Error(
      "Recipe name is required.",
    );
  }

  const slug =
    slugify(
      text(formData, "slug") ||
        name,
    );

  if (!slug) {
    throw new Error(
      "A valid recipe slug is required.",
    );
  }

  const resultItemId =
    text(
      formData,
      "resultItemId",
    );

  if (
    !isUuid(resultItemId)
  ) {
    throw new Error(
      "A valid result Item is required.",
    );
  }

  const resultQuantity =
    positiveInteger(
      text(
        formData,
        "resultQuantity",
      ),
      "Result quantity",
    );

  const ingredientItemIds =
    formData
      .getAll(
        "ingredientItemId",
      )
      .map((value) =>
        typeof value === "string"
          ? value.trim()
          : "",
      );

  const ingredientQuantities =
    formData
      .getAll(
        "ingredientQuantity",
      )
      .map((value) =>
        typeof value === "string"
          ? value.trim()
          : "",
      );

  const ingredients:
    IngredientInput[] = [];

  for (
    let index = 0;
    index <
    ingredientItemIds.length;
    index += 1
  ) {
    const itemId =
      ingredientItemIds[
        index
      ] ?? "";

    const rawQuantity =
      ingredientQuantities[
        index
      ] ?? "";

    if (
      !itemId &&
      !rawQuantity
    ) {
      continue;
    }

    if (
      !isUuid(itemId)
    ) {
      throw new Error(
        `Ingredient ${index + 1} is invalid.`,
      );
    }

    ingredients.push({
      itemId,
      quantity:
        positiveInteger(
          rawQuantity,
          `Ingredient ${index + 1} quantity`,
        ),
      sortOrder: index,
    });
  }

  if (!ingredients.length) {
    throw new Error(
      "A crafting recipe needs at least one Ingredient.",
    );
  }

  const uniqueIds =
    new Set(
      ingredients.map(
        (ingredient) =>
          ingredient.itemId,
      ),
    );

  if (
    uniqueIds.size !==
    ingredients.length
  ) {
    throw new Error(
      "The same Ingredient cannot be added twice. Increase its quantity instead.",
    );
  }

  const supabase =
    await createClient();

  const {
    data: resultItem,
    error: resultError,
  } = await supabase
    .from("items")
    .select(
      "id, teaches_recipe_id",
    )
    .eq(
      "id",
      resultItemId,
    )
    .maybeSingle();

  if (
    resultError ||
    !resultItem
  ) {
    throw new Error(
      "The selected result Item could not be found.",
    );
  }

  if (
    resultItem
      .teaches_recipe_id
  ) {
    throw new Error(
      "Recipe and Pattern Items cannot be crafted as recipe outputs.",
    );
  }

  const {
    data: ingredientCategory,
    error:
      ingredientCategoryError,
  } = await supabase
    .from(
      "item_categories",
    )
    .select("id")
    .eq(
      "slug",
      "ingredient",
    )
    .maybeSingle();

  if (
    ingredientCategoryError ||
    !ingredientCategory
  ) {
    throw new Error(
      "The Ingredient Item category could not be found.",
    );
  }

  const {
    data: ingredientItems,
    error:
      ingredientItemsError,
  } = await supabase
    .from("items")
    .select(
      "id, category_id",
    )
    .in(
      "id",
      [
        ...uniqueIds,
      ],
    );

  if (
    ingredientItemsError
  ) {
    throw new Error(
      "Unable to validate recipe Ingredients.",
    );
  }

  if (
    (ingredientItems ?? [])
      .length !==
    uniqueIds.size
  ) {
    throw new Error(
      "One or more selected Ingredients no longer exist.",
    );
  }

  if (
    (ingredientItems ?? [])
      .some(
        (item) =>
          item.category_id !==
          ingredientCategory.id,
      )
  ) {
    throw new Error(
      "Only Items in the Ingredient category can be used as recipe Ingredients.",
    );
  }

  return {
    recipe: {
      name,
      slug,
      description:
        text(
          formData,
          "description",
        ),
      result_item_id:
        resultItemId,
      result_quantity:
        resultQuantity,
      is_active:
        formData.get(
          "isActive",
        ) === "on",
      sort_order:
        integer(
          text(
            formData,
            "sortOrder",
          ),
          0,
        ),
      updated_at:
        new Date().toISOString(),
    },
    ingredients,
  };
}

export async function createCraftingRecipe(
  formData: FormData,
) {
  await requireAdminSection(
    "items",
  );

  const supabase =
    await createClient();

  try {
    const values =
      await recipeValues(
        formData,
      );

    const {
      data: recipe,
      error: recipeError,
    } = await supabase
      .from(
        "crafting_recipes",
      )
      .insert(
        values.recipe,
      )
      .select("id")
      .single();

    if (
      recipeError ||
      !recipe
    ) {
      throw new Error(
        recipeError?.message ??
          "Unable to create the crafting recipe.",
      );
    }

    const {
      error:
        ingredientsError,
    } = await supabase
      .from(
        "crafting_recipe_ingredients",
      )
      .insert(
        values.ingredients.map(
          (
            ingredient,
          ) => ({
            recipe_id:
              recipe.id,
            ingredient_item_id:
              ingredient.itemId,
            quantity:
              ingredient.quantity,
            sort_order:
              ingredient.sortOrder,
          }),
        ),
      );

    if (
      ingredientsError
    ) {
      await supabase
        .from(
          "crafting_recipes",
        )
        .delete()
        .eq(
          "id",
          recipe.id,
        );

      throw new Error(
        ingredientsError.message,
      );
    }

    refresh();
  } catch (error) {
    fail(
      error instanceof Error
        ? error.message
        : "Unable to create the crafting recipe.",
    );
  }

  redirect(
    "/admin/crafting-recipes",
  );
}

export async function updateCraftingRecipe(
  formData: FormData,
) {
  await requireAdminSection(
    "items",
  );

  const recipeId =
    text(
      formData,
      "recipeId",
    );

  if (!isUuid(recipeId)) {
    fail(
      "Invalid crafting recipe.",
    );
  }

  const supabase =
    await createClient();

  try {
    const values =
      await recipeValues(
        formData,
      );

    const {
      error: recipeError,
    } = await supabase
      .from(
        "crafting_recipes",
      )
      .update(
        values.recipe,
      )
      .eq(
        "id",
        recipeId,
      );

    if (recipeError) {
      throw new Error(
        recipeError.message,
      );
    }

    const {
      error: deleteError,
    } = await supabase
      .from(
        "crafting_recipe_ingredients",
      )
      .delete()
      .eq(
        "recipe_id",
        recipeId,
      );

    if (deleteError) {
      throw new Error(
        deleteError.message,
      );
    }

    const {
      error: insertError,
    } = await supabase
      .from(
        "crafting_recipe_ingredients",
      )
      .insert(
        values.ingredients.map(
          (
            ingredient,
          ) => ({
            recipe_id:
              recipeId,
            ingredient_item_id:
              ingredient.itemId,
            quantity:
              ingredient.quantity,
            sort_order:
              ingredient.sortOrder,
          }),
        ),
      );

    if (insertError) {
      throw new Error(
        insertError.message,
      );
    }

    refresh();
  } catch (error) {
    fail(
      error instanceof Error
        ? error.message
        : "Unable to update the crafting recipe.",
    );
  }

  redirect(
    "/admin/crafting-recipes",
  );
}

export async function deleteCraftingRecipe(
  formData: FormData,
) {
  await requireAdminSection(
    "items",
  );

  const recipeId =
    text(
      formData,
      "recipeId",
    );

  if (!isUuid(recipeId)) {
    fail(
      "Invalid crafting recipe.",
    );
  }

  const supabase =
    await createClient();

  try {
    const {
      error,
    } = await supabase.rpc(
      "delete_crafting_recipe_bundle",
      {
        p_recipe_id:
          recipeId,
      },
    );

    if (error) {
      throw new Error(
        error.message,
      );
    }

    refresh();
  } catch (error) {
    fail(
      error instanceof Error
        ? error.message
        : "Unable to delete the crafting recipe.",
    );
  }

  redirect(
    "/admin/crafting-recipes",
  );
}

