from pathlib import Path

ROOT = Path.cwd()
path = ROOT / "app/(portal)/admin/items/actions.ts"

if not path.exists():
    raise SystemExit(f"ERROR: Missing expected file: {path}")

text = path.read_text(encoding="utf-8")
old = 'export async function deleteItem(formData: FormData) {\n  await requireAdminSection("items");\n  const supabase = await createClient();\n\n  try {\n    const itemId = requiredText(formData, "itemId", "Item");\n    if (!isUuid(itemId)) throw new Error("Invalid item.");\n\n    const [standardResult, instanceResult] = await Promise.all([\n      supabase\n        .from("character_items")\n        .select("id", { count: "exact", head: true })\n        .eq("item_id", itemId),\n      supabase\n        .from("character_item_instances")\n        .select("id", { count: "exact", head: true })\n        .eq("item_id", itemId),\n    ]);\n\n    const countError = standardResult.error ?? instanceResult.error;\n    if (countError) throw new Error(countError.message);\n\n    const ownedCount = (standardResult.count ?? 0) + (instanceResult.count ?? 0);\n    if (ownedCount > 0) {\n      throw new Error(\n        `This item is already represented in ${ownedCount} inventory record${\n          ownedCount === 1 ? "" : "s"\n        }. Deactivate it instead of deleting it.`,\n      );\n    }\n\n    const { error } = await supabase.from("items").delete().eq("id", itemId);\n    if (error) throw new Error(error.message);\n  } catch (error) {\n    fail(error instanceof Error ? error.message : "Unable to delete item.");\n  }\n\n  refresh();\n}\n'
new = 'export async function deleteItem(formData: FormData) {\n  await requireAdminSection("items");\n  const supabase = await createClient();\n\n  try {\n    const itemId = requiredText(formData, "itemId", "Item");\n    if (!isUuid(itemId)) throw new Error("Invalid item.");\n\n    const { error } = await supabase.rpc(\n      "delete_item_with_crafting_bundle",\n      { p_item_id: itemId },\n    );\n\n    if (error) throw new Error(error.message);\n  } catch (error) {\n    fail(error instanceof Error ? error.message : "Unable to delete item.");\n  }\n\n  refresh();\n}\n'

count = text.count(old)
if count != 1:
    raise SystemExit(
        f"ERROR: Expected exactly 1 current deleteItem function, found {count}. No files were written."
    )

text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("Admin Item deletion now calls the transactional crafting-bundle delete RPC.")
print("Next: npm run build")
