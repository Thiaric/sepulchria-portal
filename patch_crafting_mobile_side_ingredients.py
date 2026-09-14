from pathlib import Path

path = Path("app/(portal)/crafting/crafting-workbench.tsx")

if not path.exists():
    raise SystemExit(f"Could not find {path}")

text = path.read_text(encoding="utf-8")

marker = """export function CraftingWorkbench({"""
idx = text.find(marker)
if idx == -1:
    raise SystemExit("Could not find CraftingWorkbench().")

before = text[:idx]
after = text[idx:]

if "function isSideIngredient(" not in before:
    helper = """function isSideIngredient(
  index: number,
  total: number,
) {
  if (total === 2) {
    return true;
  }

  if (total === 3) {
    return index === 1 || index === 2;
  }

  if (total === 4) {
    return index === 1 || index === 3;
  }

  return false;
}

"""
    before = before.rstrip() + "\n\n" + helper

text = before + after

old_card = """className={[((`${spatialLayout ? ingredientPosition(index, selectedRecipe.ingredients.length) : ""} group relative flex h-auto min-h-[70px] w-full max-w-[160px] items-center border transition duration-300 ease-out hover:-translate-y-px sm:min-h-[76px] sm:max-w-[180px] xl:max-w-[190px]`)), "crafting_crafting_workbench_div_container_23"].filter(Boolean).join(" ")}"""

new_card = """className={[((`${spatialLayout ? ingredientPosition(index, selectedRecipe.ingredients.length) : ""} group relative flex h-auto min-h-[70px] w-full max-w-[160px] border transition duration-300 ease-out hover:-translate-y-px sm:min-h-[76px] sm:max-w-[180px] xl:max-w-[190px] ${
  spatialLayout &&
  isSideIngredient(index, selectedRecipe.ingredients.length)
    ? "flex-col items-center justify-center gap-1.5 px-2 py-2 text-center xl:flex-row xl:items-center xl:justify-start xl:gap-0 xl:px-0 xl:py-0 xl:text-left"
    : "items-center"
}`)), "crafting_crafting_workbench_div_container_23"].filter(Boolean).join(" ")}"""

if old_card not in text:
    raise SystemExit("Could not find the ingredient card class block.")
text = text.replace(old_card, new_card, 1)

old_info = """<div className="min-w-0 flex-1 crafting_crafting_workbench_div_container_24">"""
new_info = """<div
  className={[
    "min-w-0 crafting_crafting_workbench_div_container_24",
    spatialLayout &&
    isSideIngredient(index, selectedRecipe.ingredients.length)
      ? "w-full flex-none xl:w-auto xl:flex-1"
      : "flex-1",
  ]
    .filter(Boolean)
    .join(" ")}
>"""

if old_info not in text:
    raise SystemExit("Could not find the ingredient info wrapper.")
text = text.replace(old_info, new_info, 1)

path.write_text(text, encoding="utf-8")

print(f"Updated {path}")
print("Side ingredients now stack image-above-text on mobile only.")
