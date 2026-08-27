from pathlib import Path

ROOT = Path.cwd()
page_path = ROOT / "app/(portal)/admin/items/page.tsx"
actions_path = ROOT / "app/(portal)/admin/items/actions.ts"

for path in (page_path, actions_path):
    if not path.exists():
        raise SystemExit(f"ERROR: Missing expected file: {path}")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"ERROR: {label}: expected exactly 1 match, found {count}. No files were written.")
    return text.replace(old, new, 1)

page = page_path.read_text(encoding="utf-8")
actions = actions_path.read_text(encoding="utf-8")

page = replace_once(page, 'type Effect = {\n  id: string;', 'type CraftingRecipeOption = {\n  id: string;\n  name: string;\n  slug: string;\n  is_active: boolean;\n};\n\ntype Effect = {\n  id: string;', 'recipe option type')

page = replace_once(page, '  container_capacity: number | null;\n  sort_order: number;\n  effects: Effect[] | null;', '  container_capacity: number | null;\n  teaches_recipe_id: string | null;\n  sort_order: number;\n  effects: Effect[] | null;', 'Item teaches_recipe_id type')

page = replace_once(page, '  const [categoriesResult, subcategoriesResult, itemsResult] = await Promise.all([', '  const [\n    categoriesResult,\n    subcategoriesResult,\n    recipesResult,\n    itemsResult,\n  ] = await Promise.all([', 'admin items Promise.all variables')

page = replace_once(page, '    supabase\n      .from("items")\n      .select(`', '    supabase\n      .from("crafting_recipes")\n      .select("id, name, slug, is_active")\n      .order("sort_order", { ascending: true })\n      .order("name", { ascending: true }),\n\n    supabase\n      .from("items")\n      .select(`', 'recipes query insertion')

page = replace_once(page, '        container_capacity,\n        sort_order,\n        effects:item_effects(', '        container_capacity,\n        teaches_recipe_id,\n        sort_order,\n        effects:item_effects(', 'items teaches_recipe_id query')

page = replace_once(page, '  const firstError =\n    categoriesResult.error ?? subcategoriesResult.error ?? itemsResult.error;', '  const firstError =\n    categoriesResult.error ??\n    subcategoriesResult.error ??\n    recipesResult.error ??\n    itemsResult.error;', 'admin items error aggregation')

page = replace_once(page, '  const categories = (categoriesResult.data ?? []) as Category[];\n  const subcategories = (subcategoriesResult.data ?? []) as Subcategory[];\n  const items = (itemsResult.data ?? []) as unknown as Item[];', '  const categories = (categoriesResult.data ?? []) as Category[];\n  const subcategories = (subcategoriesResult.data ?? []) as Subcategory[];\n  const recipes =\n    (recipesResult.data ?? []) as CraftingRecipeOption[];\n  const items = (itemsResult.data ?? []) as unknown as Item[];', 'admin items loaded recipes')

page = replace_once(page, '          <ItemForm\n            action={createItem}\n            categories={categories}\n            subcategories={subcategories}\n          />', '          <ItemForm\n            action={createItem}\n            categories={categories}\n            subcategories={subcategories}\n            recipes={recipes}\n          />', 'create ItemForm recipes prop')

page = replace_once(page, '                      <ItemForm\n                        action={updateItem}\n                        item={item}\n                        categories={categories}\n                        subcategories={subcategories}\n                      />', '                      <ItemForm\n                        action={updateItem}\n                        item={item}\n                        categories={categories}\n                        subcategories={subcategories}\n                        recipes={recipes}\n                      />', 'update ItemForm recipes prop')

page = replace_once(page, 'function ItemForm({\n  action,\n  item,\n  categories,\n  subcategories,\n}: {\n  action: typeof createItem | typeof updateItem;\n  item?: Item;\n  categories: Category[];\n  subcategories: Subcategory[];\n}) {', 'function ItemForm({\n  action,\n  item,\n  categories,\n  subcategories,\n  recipes,\n}: {\n  action: typeof createItem | typeof updateItem;\n  item?: Item;\n  categories: Category[];\n  subcategories: Subcategory[];\n  recipes: CraftingRecipeOption[];\n}) {', 'ItemForm recipes prop definition')

page = replace_once(page, '        <Field label="Subcategory">\n          <select\n            name="subcategoryId"\n            defaultValue={item?.subcategory_id ?? ""}\n            className={inputClass}\n          >\n            <option value="">None</option>\n            {categories.map((category) => {\n              const matches = subcategories.filter(\n                (subcategory) => subcategory.category_id === category.id,\n              );\n              if (!matches.length) return null;\n\n              return (\n                <optgroup key={category.id} label={category.name}>\n                  {matches.map((subcategory) => (\n                    <option key={subcategory.id} value={subcategory.id}>\n                      {subcategory.name}\n                      {!subcategory.is_active ? " (inactive)" : ""}\n                    </option>\n                  ))}\n                </optgroup>\n              );\n            })}\n          </select>\n        </Field>', '        <Field label="Subcategory">\n          <select\n            name="subcategoryId"\n            defaultValue={item?.subcategory_id ?? ""}\n            className={inputClass}\n          >\n            <option value="">None</option>\n            {categories.map((category) => {\n              const matches = subcategories.filter(\n                (subcategory) => subcategory.category_id === category.id,\n              );\n              if (!matches.length) return null;\n\n              return (\n                <optgroup key={category.id} label={category.name}>\n                  {matches.map((subcategory) => (\n                    <option key={subcategory.id} value={subcategory.id}>\n                      {subcategory.name}\n                      {!subcategory.is_active ? " (inactive)" : ""}\n                    </option>\n                  ))}\n                </optgroup>\n              );\n            })}\n          </select>\n        </Field>\n\n        <Field label="Teaches Recipe">\n          <select\n            name="teachesRecipeId"\n            defaultValue={item?.teaches_recipe_id ?? ""}\n            className={inputClass}\n          >\n            <option value="">None</option>\n            {recipes.map((recipe) => (\n              <option\n                key={recipe.id}\n                value={recipe.id}\n              >\n                {recipe.name}\n                {!recipe.is_active\n                  ? " (inactive)"\n                  : ""}\n              </option>\n            ))}\n          </select>\n\n          <p className="mt-1.5 text-[8px] leading-4 text-[rgb(var(--sep-colour-806b50))]">\n            When selected, this Item becomes a self-targeted consumable recipe document.\n            Using it from Inventory teaches the linked recipe.\n          </p>\n        </Field>', "Teaches Recipe form field")

actions = replace_once(actions, '  await validateSubcategory(categoryId, subcategoryId);\n\n  const quality = requiredText(formData, "quality", "Quality");', '  await validateSubcategory(categoryId, subcategoryId);\n\n  const teachesRecipeId =\n    optionalText(\n      formData,\n      "teachesRecipeId",\n    );\n\n  if (\n    teachesRecipeId &&\n    !isUuid(teachesRecipeId)\n  ) {\n    throw new Error(\n      "Invalid crafting recipe.",\n    );\n  }\n\n  if (teachesRecipeId) {\n    const supabase =\n      await createClient();\n\n    const {\n      data: recipe,\n      error: recipeError,\n    } = await supabase\n      .from("crafting_recipes")\n      .select("id")\n      .eq("id", teachesRecipeId)\n      .maybeSingle();\n\n    if (\n      recipeError ||\n      !recipe\n    ) {\n      throw new Error(\n        "The selected crafting recipe could not be found.",\n      );\n    }\n  }\n\n  const quality = requiredText(formData, "quality", "Quality");', 'recipe validation in itemValues')

actions = replace_once(actions, '  const isUsable = checkbox(formData, "isUsable");\n\nlet useBehaviour: string | null = null;', '  let isUsable =\n    checkbox(formData, "isUsable");\n\nlet useBehaviour: string | null = null;', 'mutable isUsable')

actions = replace_once(actions, '  const referenceValue = integer(formData, "referenceValue", null);', '  if (teachesRecipeId) {\n    isUsable = true;\n    useBehaviour = "consumable";\n    targetMode = "self";\n    maxCharges = null;\n    cooldownMinutes = null;\n  }\n\n  const referenceValue = integer(formData, "referenceValue", null);', 'force recipe Item mechanics')

actions = replace_once(actions, '    container_capacity: containerCapacity,\n    sort_order: integer(formData, "sortOrder", 0) ?? 0,', '    container_capacity: containerCapacity,\n    teaches_recipe_id: teachesRecipeId,\n    sort_order: integer(formData, "sortOrder", 0) ?? 0,', 'persist teaches_recipe_id')

actions = replace_once(actions, '  revalidatePath("/characters");\n}', '  revalidatePath("/characters");\n  revalidatePath("/crafting");\n}', 'crafting revalidation')

page_path.write_text(page, encoding="utf-8")
actions_path.write_text(actions, encoding="utf-8")

print("SUCCESS")
print("Item Management now supports Teaches Recipe.")
print("Next: npm run build")
