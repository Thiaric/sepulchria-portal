from pathlib import Path

ROOT = Path.cwd()

items_path = ROOT / "app/(portal)/admin/items/actions.ts"
recipes_path = ROOT / "app/(portal)/admin/crafting-recipes/actions.ts"

for path in (items_path, recipes_path):
    if not path.exists():
        raise SystemExit(f"ERROR: Missing expected file: {path}")

items_text = items_path.read_text(encoding="utf-8")
recipes_text = recipes_path.read_text(encoding="utf-8")

old_item_delete = 'export async function deleteItem(formData: FormData) {\n  await requireAdminSection("items");\n  const supabase = await createClient();\n\n  try {\n    const itemId = requiredText(formData, "itemId", "Item");\n    if (!isUuid(itemId)) throw new Error("Invalid item.");\n\n    const [standardResult, instanceResult] = await Promise.all([\n      supabase\n        .from("character_items")\n        .select("id", { count: "exact", head: true })\n        .eq("item_id", itemId),\n      supabase\n        .from("character_item_instances")\n        .select("id", { count: "exact", head: true })\n        .eq("item_id", itemId),\n    ]);\n\n    const countError = standardResult.error ?? instanceResult.error;\n    if (countError) throw new Error(countError.message);\n\n    const ownedCount = (standardResult.count ?? 0) + (instanceResult.count ?? 0);\n    if (ownedCount > 0) {\n      throw new Error(\n        `This item is already represented in ${ownedCount} inventory record${\n          ownedCount === 1 ? "" : "s"\n        }. Deactivate it instead of deleting it.`,\n      );\n    }\n\n    const { error } = await supabase.from("items").delete().eq("id", itemId);\n    if (error) throw new Error(error.message);\n  } catch (error) {\n    fail(error instanceof Error ? error.message : "Unable to delete item.");\n  }\n\n  refresh();\n}\n'
new_item_delete = 'export async function deleteItem(formData: FormData) {\n  await requireAdminSection("items");\n  const supabase = await createClient();\n\n  try {\n    const itemId = requiredText(formData, "itemId", "Item");\n    if (!isUuid(itemId)) throw new Error("Invalid item.");\n\n    const { error } = await supabase.rpc(\n      "delete_item_with_crafting_bundle",\n      { p_item_id: itemId },\n    );\n\n    if (error) throw new Error(error.message);\n  } catch (error) {\n    fail(error instanceof Error ? error.message : "Unable to delete item.");\n  }\n\n  refresh();\n}\n'
old_recipe_delete = 'export async function deleteCraftingRecipe(\n  formData: FormData,\n) {\n  await requireAdminSection(\n    "items",\n  );\n\n  const recipeId =\n    text(\n      formData,\n      "recipeId",\n    );\n\n  if (!isUuid(recipeId)) {\n    fail(\n      "Invalid crafting recipe.",\n    );\n  }\n\n  const supabase =\n    await createClient();\n\n  try {\n    const {\n      count,\n      error: knownError,\n    } = await supabase\n      .from(\n        "character_recipes",\n      )\n      .select(\n        "id",\n        {\n          count: "exact",\n          head: true,\n        },\n      )\n      .eq(\n        "recipe_id",\n        recipeId,\n      );\n\n    if (knownError) {\n      throw new Error(\n        knownError.message,\n      );\n    }\n\n    if (\n      (count ?? 0) > 0\n    ) {\n      throw new Error(\n        "This recipe is already known by one or more characters. Mark it Inactive instead of deleting it.",\n      );\n    }\n\n    const {\n      error,\n    } = await supabase\n      .from(\n        "crafting_recipes",\n      )\n      .delete()\n      .eq(\n        "id",\n        recipeId,\n      );\n\n    if (error) {\n      throw new Error(\n        error.message,\n      );\n    }\n\n    refresh();\n  } catch (error) {\n    fail(\n      error instanceof Error\n        ? error.message\n        : "Unable to delete the crafting recipe.",\n    );\n  }\n\n  redirect(\n    "/admin/crafting-recipes",\n  );\n}'
new_recipe_delete = 'export async function deleteCraftingRecipe(\n  formData: FormData,\n) {\n  await requireAdminSection(\n    "items",\n  );\n\n  const recipeId =\n    text(\n      formData,\n      "recipeId",\n    );\n\n  if (!isUuid(recipeId)) {\n    fail(\n      "Invalid crafting recipe.",\n    );\n  }\n\n  const supabase =\n    await createClient();\n\n  try {\n    const {\n      error,\n    } = await supabase.rpc(\n      "delete_crafting_recipe_bundle",\n      {\n        p_recipe_id:\n          recipeId,\n      },\n    );\n\n    if (error) {\n      throw new Error(\n        error.message,\n      );\n    }\n\n    refresh();\n  } catch (error) {\n    fail(\n      error instanceof Error\n        ? error.message\n        : "Unable to delete the crafting recipe.",\n    );\n  }\n\n  redirect(\n    "/admin/crafting-recipes",\n  );\n}'

item_count = items_text.count(old_item_delete)
recipe_count = recipes_text.count(old_recipe_delete)

if item_count != 1:
    raise SystemExit(
        f"ERROR: Expected exactly 1 deleteItem block from commit 9a427c6, found {item_count}. No files were written."
    )

if recipe_count != 1:
    raise SystemExit(
        f"ERROR: Expected exactly 1 deleteCraftingRecipe block from commit 9a427c6, found {recipe_count}. No files were written."
    )

new_items_text = items_text.replace(
    old_item_delete,
    new_item_delete,
    1,
)

new_recipes_text = recipes_text.replace(
    old_recipe_delete,
    new_recipe_delete,
    1,
)

# Only write after both exact source checks pass.
items_path.write_text(new_items_text, encoding="utf-8")
recipes_path.write_text(new_recipes_text, encoding="utf-8")

print("SUCCESS")
print("Patched deletion lifecycle against commit 9a427c6.")
print("- Delete Item now destroys its crafting bundle through Supabase RPC.")
print("- Delete Crafting Recipe now removes character knowledge and recipe documents through Supabase RPC.")
print("Next: run the supplied SQL in Supabase, then npm run build.")
