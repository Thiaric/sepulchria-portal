#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()

PAGE = ROOT / "app/(portal)/admin/items/page.tsx"
ACTIONS = ROOT / "app/(portal)/admin/items/actions.ts"

for path in (PAGE, ACTIONS):
    if not path.exists():
        raise SystemExit(f"Missing file: {path}")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text and old not in text:
        print(f"SKIP  {label} (already patched)")
        return text
    if old not in text:
        raise SystemExit(f"Could not patch {label}: expected block not found.")
    print(f"PATCH {label}")
    return text.replace(old, new, 1)

page = PAGE.read_text(encoding="utf-8")

page = replace_once(
    page,
    """type CraftingRecipeOption = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};
""",
    """type CraftingRecipeOption = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  result_item_id: string;
};
""",
    "recipe option result item",
)

page = replace_once(
    page,
    """    supabase
      .from("crafting_recipes")
      .select("id, name, slug, is_active")
""",
    """    supabase
      .from("crafting_recipes")
      .select("id, name, slug, is_active, result_item_id")
""",
    "load recipe result item",
)

page = replace_once(
    page,
    """  const selectedItem =
    items.find((item) => item.id === selectedItemId) ?? null;
  const selectedEffects =
""",
    """  const selectedItem =
    items.find((item) => item.id === selectedItemId) ?? null;
  const selectedItemRecipe =
    selectedItem
      ? recipes.find(
          (recipe) =>
            recipe.result_item_id === selectedItem.id,
        ) ?? null
      : null;
  const selectedEffects =
""",
    "detect existing recipe",
)

page = replace_once(
    page,
    """                  <ItemForm
                    action={updateItem}
                    item={selectedItem}
                    categories={categories}
                    subcategories={subcategories}
                    recipes={recipes}
                  />
""",
    """                  <ItemForm
                    action={updateItem}
                    item={selectedItem}
                    categories={categories}
                    subcategories={subcategories}
                    recipes={recipes}
                    ingredientItems={ingredientItems}
                    existingCraftingRecipe={selectedItemRecipe}
                  />
""",
    "pass recipe state to editor",
)

page = replace_once(
    page,
    """  recipes,
  ingredientItems = [],
}: {
  action: typeof createItem | typeof updateItem;
  item?: Item;
  categories: Category[];
  subcategories: Subcategory[];
  recipes: CraftingRecipeOption[];
  ingredientItems?: {
    id: string;
    name: string;
    is_active: boolean;
  }[];
}) {
""",
    """  recipes,
  ingredientItems = [],
  existingCraftingRecipe = null,
}: {
  action: typeof createItem | typeof updateItem;
  item?: Item;
  categories: Category[];
  subcategories: Subcategory[];
  recipes: CraftingRecipeOption[];
  ingredientItems?: {
    id: string;
    name: string;
    is_active: boolean;
  }[];
  existingCraftingRecipe?: CraftingRecipeOption | null;
}) {
""",
    "ItemForm recipe state prop",
)

page = replace_once(
    page,
    """        {!item ? (
          <ItemCreateRecipeFields
            ingredientItems={ingredientItems}
          />
        ) : null}

        <button
""",
    """        {!item || !existingCraftingRecipe ? (
          <ItemCreateRecipeFields
            ingredientItems={ingredientItems}
          />
        ) : (
          <div className="mt-4 w-full border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4">
              <div>
                <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
                  Crafting
                </p>
                <p className="mt-1 font-serif text-base text-[rgb(var(--sep-colour-d8bf91))]">
                  This Item already has a crafting Recipe.
                </p>
              </div>

              <a
                href={`/admin/crafting-recipes#recipe-${existingCraftingRecipe.id}`}
                className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:bg-[rgb(var(--sep-colour-4a321e))]"
              >
                Edit Recipe
              </a>
            </div>
          </div>
        )}

        <button
""",
    "show create recipe fields when editing",
)

PAGE.write_text(page, encoding="utf-8")

actions = ACTIONS.read_text(encoding="utf-8")

actions = replace_once(
    actions,
    """    const values = await itemValues(formData);

    if (values.stackable) {
""",
    """    const values = await itemValues(formData);

    const recipeBundle =
      await newRecipeBundleValues(
        formData,
      );

    if (recipeBundle) {
      const {
        data: existingRecipe,
        error: existingRecipeError,
      } = await supabase
        .from("crafting_recipes")
        .select("id")
        .eq("result_item_id", itemId)
        .maybeSingle();

      if (existingRecipeError) {
        throw new Error(
          existingRecipeError.message,
        );
      }

      if (existingRecipe) {
        throw new Error(
          "This Item already has a crafting Recipe.",
        );
      }
    }

    if (values.stackable) {
""",
    "validate recipe creation on edit",
)

actions = replace_once(
    actions,
    """    const { error } = await supabase.from("items").update(values).eq("id", itemId);
    if (error) throw new Error(error.message);
""",
    """    const {
      data: updatedItem,
      error,
    } = await supabase
      .from("items")
      .update(values)
      .eq("id", itemId)
      .select(
        "id, name, slug, description, image_url, is_active, sort_order",
      )
      .single();

    if (error || !updatedItem) {
      throw new Error(
        error?.message ??
          "Unable to update Item.",
      );
    }

    if (recipeBundle) {
      let createdRecipeId:
        string | null = null;

      try {
        const {
          data: recipe,
          error: recipeError,
        } = await supabase
          .from("crafting_recipes")
          .insert({
            name: updatedItem.name,
            slug: `craft-${updatedItem.slug}`,
            description:
              updatedItem.description ?? "",
            result_item_id:
              updatedItem.id,
            result_quantity:
              recipeBundle.resultQuantity,
            is_active:
              updatedItem.is_active,
            sort_order:
              updatedItem.sort_order ?? 0,
          })
          .select("id")
          .single();

        if (
          recipeError ||
          !recipe
        ) {
          throw new Error(
            recipeError?.message ??
              "Unable to create crafting recipe.",
          );
        }

        createdRecipeId =
          recipe.id;

        const {
          error: ingredientsError,
        } = await supabase
          .from("crafting_recipe_ingredients")
          .insert(
            recipeBundle.ingredients.map(
              (ingredient) => ({
                recipe_id: recipe.id,
                ingredient_item_id:
                  ingredient.itemId,
                quantity:
                  ingredient.quantity,
                sort_order:
                  ingredient.sortOrder,
              }),
            ),
          );

        if (ingredientsError) {
          throw new Error(
            ingredientsError.message,
          );
        }

        const {
          error: recipeItemError,
        } = await supabase
          .from("items")
          .insert({
            name:
              `Recipe: ${updatedItem.name}`,
            slug:
              `recipe-${updatedItem.slug}`,
            description:
              updatedItem.description ?? "",
            image_url:
              updatedItem.image_url,
            category_id:
              recipeBundle.bookCategoryId,
            subcategory_id: null,
            quality: "average",
            transfer_policy: "free",
            is_quest_item: false,
            is_active:
              updatedItem.is_active,
            stackable: true,
            max_stack: 99,
            reference_value:
              recipeBundle.recipeDocumentReferenceValue,
            is_usable: true,
            use_behaviour: "consumable",
            max_charges: null,
            target_mode: "self",
            cooldown_minutes: null,
            success_die: null,
            success_threshold: null,
            success_attribute: null,
            resolution_mode: "automatic",
            counter_options: [],
            damage_dice: null,
            damage_type: null,
            container_capacity: null,
            teaches_recipe_id:
              recipe.id,
            sort_order:
              updatedItem.sort_order ?? 0,
          });

        if (recipeItemError) {
          throw new Error(
            recipeItemError.message,
          );
        }
      } catch (recipeError) {
        if (createdRecipeId) {
          await supabase
            .from("crafting_recipes")
            .delete()
            .eq("id", createdRecipeId);
        }

        throw recipeError;
      }
    }
""",
    "create recipe bundle on existing Item save",
)

ACTIONS.write_text(actions, encoding="utf-8")

print()
print("DONE")
print("Changed only:")
print("  app/(portal)/admin/items/page.tsx")
print("  app/(portal)/admin/items/actions.ts")
print("No database changes.")
print("Run: npm run build")
