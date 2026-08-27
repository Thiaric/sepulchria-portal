from pathlib import Path

ROOT = Path.cwd()
path = ROOT / "components/admin/crafting-recipe-form.tsx"

if not path.exists():
    raise SystemExit(f"ERROR: Missing expected file: {path}")

text = path.read_text(encoding="utf-8")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"ERROR: {label}: expected exactly 1 match, found {count}. No files were written."
        )
    return text.replace(old, new, 1)

text = replace_once(text, '  const [\n    ingredients,\n    setIngredients,\n  ] = useState<\n    CraftingRecipeIngredientValue[]\n  >(', '  const [\n    selectedResultItemId,\n    setSelectedResultItemId,\n  ] = useState(\n    defaultResultItemId,\n  );\n\n  const [\n    ingredients,\n    setIngredients,\n  ] = useState<\n    CraftingRecipeIngredientValue[]\n  >(', 'selected result state')

text = replace_once(text, '  return (\n    <AdminActionForm', '  const selectedResultItem =\n    resultItems.find(\n      (item) =>\n        item.id ===\n        selectedResultItemId,\n    ) ?? null;\n\n  return (\n    <AdminActionForm', 'selected result item derivation')

text = replace_once(text, '        <Field label="Recipe name">\n          <input\n            name="name"\n            required\n            defaultValue={\n              defaultName\n            }\n            className={\n              inputClass\n            }\n          />\n        </Field>\n\n        <Field label="Slug">\n          <input\n            name="slug"\n            defaultValue={\n              defaultSlug\n            }\n            placeholder="Auto from recipe name"\n            className={\n              inputClass\n            }\n          />\n        </Field>\n\n        <Field label="Crafted result Item">\n          <select\n            name="resultItemId"\n            required\n            defaultValue={\n              defaultResultItemId\n            }\n            className={\n              inputClass\n            }\n          >\n            <option\n              value=""\n              disabled\n            >\n              Select Item\n            </option>\n\n            {resultItems.map(\n              (item) => (\n                <option\n                  key={\n                    item.id\n                  }\n                  value={\n                    item.id\n                  }\n                >\n                  {item.name}\n                  {!item.is_active\n                    ? " (inactive)"\n                    : ""}\n                </option>\n              ),\n            )}\n          </select>\n        </Field>\n\n        <Field label="Result quantity">\n          <input\n            type="number"\n            name="resultQuantity"\n            min={1}\n            required\n            defaultValue={\n              defaultResultQuantity\n            }\n            className={\n              inputClass\n            }\n          />\n        </Field>', '        <Field label="Crafted result Item">\n          <select\n            name="resultItemId"\n            required\n            value={\n              selectedResultItemId\n            }\n            onChange={(\n              event,\n            ) =>\n              setSelectedResultItemId(\n                event.target.value,\n              )\n            }\n            className={\n              inputClass\n            }\n          >\n            <option\n              value=""\n              disabled\n            >\n              Select Item\n            </option>\n\n            {resultItems.map(\n              (item) => (\n                <option\n                  key={\n                    item.id\n                  }\n                  value={\n                    item.id\n                  }\n                >\n                  {item.name}\n                  {!item.is_active\n                    ? " (inactive)"\n                    : ""}\n                </option>\n              ),\n            )}\n          </select>\n        </Field>\n\n        <Field label="Name">\n          <input\n            value={\n              selectedResultItem?.name ??\n              ""\n            }\n            readOnly\n            placeholder="Select an Item first"\n            className={`${inputClass} cursor-default opacity-80`}\n          />\n\n          <input\n            type="hidden"\n            name="name"\n            value={\n              selectedResultItem?.name ??\n              ""\n            }\n          />\n        </Field>\n\n        <Field label="Slug">\n          <input\n            name="slug"\n            defaultValue={\n              defaultSlug\n            }\n            placeholder="Auto from Item name"\n            className={\n              inputClass\n            }\n          />\n        </Field>\n\n        <Field label="Result quantity">\n          <input\n            type="number"\n            name="resultQuantity"\n            min={1}\n            required\n            defaultValue={\n              defaultResultQuantity\n            }\n            className={\n              inputClass\n            }\n          />\n        </Field>', 'recipe identity fields')

path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("Crafting Recipe form updated.")
print("Result Item comes first; Name is inherited and read-only.")
print("Next: npm run build")
