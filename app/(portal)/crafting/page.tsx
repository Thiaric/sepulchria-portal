import Link from "next/link";
import { redirect } from "next/navigation";

import {
  CraftingWorkbench,
  type CraftingInventoryItem,
  type CraftingIngredient,
  type KnownCraftingRecipe,
} from "./crafting-workbench";
import { createClient } from "@/lib/supabase/server";

type RecipeRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  result_item_id: string;
  result_quantity: number;
  sort_order: number;
};

type ItemRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  quality: string;
};

type IngredientRow = {
  recipe_id: string;
  ingredient_item_id: string;
  quantity: number;
  sort_order: number;
};

type InventoryRow = {
  item_id: string;
  quantity: number;
};

export default async function CraftingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: character, error: characterError } = await supabase
    .from("characters")
    .select("id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError) {
    throw new Error(`Unable to identify your character: ${characterError.message}`);
  }

  if (!character) {
    redirect("/character/create");
  }

  const [knownResult, ingredientCategoryResult, inventoryResult] =
    await Promise.all([
      supabase
        .from("character_recipes")
        .select("recipe_id")
        .eq("character_id", character.id),
      supabase
        .from("item_categories")
        .select("id")
        .eq("slug", "ingredient")
        .maybeSingle(),
      supabase
        .from("character_items")
        .select("item_id, quantity")
        .eq("character_id", character.id)
        .is("container_instance_id", null),
    ]);

  if (knownResult.error) {
    throw new Error(`Unable to load known recipes: ${knownResult.error.message}`);
  }

  if (ingredientCategoryResult.error) {
    throw new Error(
      `Unable to load the Ingredient category: ${ingredientCategoryResult.error.message}`,
    );
  }

  if (inventoryResult.error) {
    throw new Error(`Unable to load crafting inventory: ${inventoryResult.error.message}`);
  }

  const knownRecipeIds = (knownResult.data ?? []).map((row) => row.recipe_id);
  const rawInventory = (inventoryResult.data ?? []) as InventoryRow[];
  const inventoryItemIds = [...new Set(rawInventory.map((row) => row.item_id))];

  const recipeResult = knownRecipeIds.length
    ? await supabase
        .from("crafting_recipes")
        .select(
          "id, name, slug, description, result_item_id, result_quantity, sort_order",
        )
        .in("id", knownRecipeIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })
    : { data: [] as RecipeRow[], error: null };

  if (recipeResult.error) {
    throw new Error(`Unable to load recipes: ${recipeResult.error.message}`);
  }

  const recipeRows = (recipeResult.data ?? []) as RecipeRow[];
  const recipeIds = recipeRows.map((recipe) => recipe.id);
  const resultItemIds = [...new Set(recipeRows.map((recipe) => recipe.result_item_id))];

  const [ingredientsResult, resultItemsResult, inventoryItemsResult] =
    await Promise.all([
      recipeIds.length
        ? supabase
            .from("crafting_recipe_ingredients")
            .select("recipe_id, ingredient_item_id, quantity, sort_order")
            .in("recipe_id", recipeIds)
            .order("sort_order", { ascending: true })
        : Promise.resolve({ data: [] as IngredientRow[], error: null }),
      resultItemIds.length
        ? supabase
            .from("items")
            .select("id, name, slug, description, image_url, quality")
            .in("id", resultItemIds)
        : Promise.resolve({ data: [] as ItemRow[], error: null }),
      inventoryItemIds.length && ingredientCategoryResult.data?.id
        ? supabase
            .from("items")
            .select("id, name, slug, description, image_url, quality")
            .in("id", inventoryItemIds)
            .eq("category_id", ingredientCategoryResult.data.id)
            .eq("is_active", true)
        : Promise.resolve({ data: [] as ItemRow[], error: null }),
    ]);

  if (ingredientsResult.error) {
    throw new Error(
      `Unable to load recipe ingredients: ${ingredientsResult.error.message}`,
    );
  }

  if (resultItemsResult.error) {
    throw new Error(
      `Unable to load crafted items: ${resultItemsResult.error.message}`,
    );
  }

  if (inventoryItemsResult.error) {
    throw new Error(
      `Unable to load ingredient details: ${inventoryItemsResult.error.message}`,
    );
  }

  const ingredientRows = (ingredientsResult.data ?? []) as IngredientRow[];
  const recipeIngredientItemIds = [
    ...new Set(ingredientRows.map((row) => row.ingredient_item_id)),
  ];

  const recipeIngredientItemsResult = recipeIngredientItemIds.length
    ? await supabase
        .from("items")
        .select("id, name, slug, description, image_url, quality")
        .in("id", recipeIngredientItemIds)
    : { data: [] as ItemRow[], error: null };

  if (recipeIngredientItemsResult.error) {
    throw new Error(
      `Unable to load recipe material details: ${recipeIngredientItemsResult.error.message}`,
    );
  }

  const resultItems = new Map(
    ((resultItemsResult.data ?? []) as ItemRow[]).map((item) => [item.id, item] as const),
  );

  const ingredientItems = new Map(
    ((recipeIngredientItemsResult.data ?? []) as ItemRow[]).map(
      (item) => [item.id, item] as const,
    ),
  );

  const ingredientsByRecipe = new Map<string, CraftingIngredient[]>();

  for (const row of ingredientRows) {
    const item = ingredientItems.get(row.ingredient_item_id);
    if (!item) continue;

    const entry: CraftingIngredient = {
      item_id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      image_url: item.image_url,
      quality: item.quality,
      quantity: row.quantity,
      sort_order: row.sort_order,
    };

    const current = ingredientsByRecipe.get(row.recipe_id) ?? [];
    current.push(entry);
    ingredientsByRecipe.set(row.recipe_id, current);
  }

  const recipes: KnownCraftingRecipe[] = recipeRows.flatMap((recipe) => {
    const result = resultItems.get(recipe.result_item_id);
    if (!result) return [];

    return [
      {
        id: recipe.id,
        name: recipe.name,
        slug: recipe.slug,
        description: recipe.description,
        result_quantity: recipe.result_quantity,
        sort_order: recipe.sort_order,
        result,
        ingredients: (ingredientsByRecipe.get(recipe.id) ?? []).sort(
          (a, b) => a.sort_order - b.sort_order,
        ),
      },
    ];
  });

  const inventoryQuantityByItem = new Map<string, number>();

  for (const row of rawInventory) {
    inventoryQuantityByItem.set(
      row.item_id,
      (inventoryQuantityByItem.get(row.item_id) ?? 0) + row.quantity,
    );
  }

  const inventory: CraftingInventoryItem[] = (
    (inventoryItemsResult.data ?? []) as ItemRow[]
  )
    .map((item) => ({
      ...item,
      quantity: inventoryQuantityByItem.get(item.id) ?? 0,
    }))
    .filter((item) => item.quantity > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
              Knowledge &amp; craft
            </p>
            <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">
              Crafting Workbench
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]">
              Use materials carried by {character.display_name ?? "your character"} to create items from recipes they have learned.
            </p>
          </div>

          <Link
            href="/character"
            className="border border-[rgb(var(--sep-colour-654b2e))] bg-[rgb(var(--sep-colour-17110d))] px-4 py-2 text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-bba37e))] transition hover:border-[rgb(var(--sep-colour-927047))] hover:text-[rgb(var(--sep-colour-e3c99b))]"
          >
            Character inventory
          </Link>
        </div>

        <CraftingWorkbench recipes={recipes} inventory={inventory} />
      </div>
    </main>
  );
}
