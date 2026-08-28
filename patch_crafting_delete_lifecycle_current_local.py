from pathlib import Path

ROOT = Path.cwd()

items_path = ROOT / "app/(portal)/admin/items/actions.ts"
recipes_path = ROOT / "app/(portal)/admin/crafting-recipes/actions.ts"

for path in (items_path, recipes_path):
    if not path.exists():
        raise SystemExit(f"ERROR: Missing expected file: {path}")

def replace_between(text: str, start_marker: str, end_marker: str, replacement: str, label: str) -> str:
    start = text.find(start_marker)
    if start == -1:
        raise SystemExit(f"ERROR: Could not find start of {label}. No files were written.")

    end = text.find(end_marker, start)
    if end == -1:
        raise SystemExit(f"ERROR: Could not find end marker for {label}. No files were written.")

    return text[:start] + replacement + "\n" + text[end:]

items_text = items_path.read_text(encoding="utf-8")
recipes_text = recipes_path.read_text(encoding="utf-8")

new_item_delete = 'export async function deleteItem(formData: FormData) {\n  await requireAdminSection("items");\n  const supabase = await createClient();\n\n  try {\n    const itemId = requiredText(formData, "itemId", "Item");\n    if (!isUuid(itemId)) throw new Error("Invalid item.");\n\n    const { error } = await supabase.rpc(\n      "delete_item_with_crafting_bundle",\n      { p_item_id: itemId },\n    );\n\n    if (error) throw new Error(error.message);\n  } catch (error) {\n    fail(error instanceof Error ? error.message : "Unable to delete item.");\n  }\n\n  refresh();\n}\n'
new_recipe_delete = 'export async function deleteCraftingRecipe(\n  formData: FormData,\n) {\n  await requireAdminSection(\n    "items",\n  );\n\n  const recipeId =\n    text(\n      formData,\n      "recipeId",\n    );\n\n  if (!isUuid(recipeId)) {\n    fail(\n      "Invalid crafting recipe.",\n    );\n  }\n\n  const supabase =\n    await createClient();\n\n  try {\n    const {\n      error,\n    } = await supabase.rpc(\n      "delete_crafting_recipe_bundle",\n      {\n        p_recipe_id:\n          recipeId,\n      },\n    );\n\n    if (error) {\n      throw new Error(\n        error.message,\n      );\n    }\n\n    refresh();\n  } catch (error) {\n    fail(\n      error instanceof Error\n        ? error.message\n        : "Unable to delete the crafting recipe.",\n    );\n  }\n\n  redirect(\n    "/admin/crafting-recipes",\n  );\n}\n'

updated_items = replace_between(
    items_text,
    "export async function deleteItem(formData: FormData) {",
    "\nfunction effectValues(",
    new_item_delete,
    "deleteItem",
)

recipe_start = "export async function deleteCraftingRecipe("
recipe_pos = recipes_text.find(recipe_start)
if recipe_pos == -1:
    raise SystemExit("ERROR: Could not find deleteCraftingRecipe. No files were written.")

# deleteCraftingRecipe is the final exported action in this file at the inspected commit.
updated_recipes = recipes_text[:recipe_pos] + new_recipe_delete + "\n"

# Sanity checks before writing.
if updated_items.count('export async function deleteItem(formData: FormData)') != 1:
    raise SystemExit("ERROR: Final deleteItem count is not 1. No files were written.")

if updated_recipes.count("export async function deleteCraftingRecipe(") != 1:
    raise SystemExit("ERROR: Final deleteCraftingRecipe count is not 1. No files were written.")

items_path.write_text(updated_items, encoding="utf-8")
recipes_path.write_text(updated_recipes, encoding="utf-8")

print("SUCCESS")
print("Replaced deleteItem and deleteCraftingRecipe using structural anchors.")
print("No unrelated code was matched or rewritten.")
print("Next: npm run build")
