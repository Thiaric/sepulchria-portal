from pathlib import Path

path = Path("app/(portal)/crafting/crafting-workbench.tsx")

if not path.exists():
    raise SystemExit(f"Could not find {path}")

text = path.read_text(encoding="utf-8")

marker = "export function CraftingWorkbench({"
if marker not in text:
    raise SystemExit("Could not find CraftingWorkbench().")

if "function isSideIngredient(" not in text:
    idx = text.index(marker)
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
    text = text[:idx] + helper + text[idx:]

old_button = 'className="relative z-10 flex h-full min-h-0 w-full items-center gap-2 px-2.5 py-1.5 text-left sm:gap-3 sm:px-3 sm:py-2 crafting_crafting_workbench_button_action_3"'

new_button = """className={[
                        "relative z-10 flex h-full min-h-0 w-full crafting_crafting_workbench_button_action_3",
                        spatialLayout &&
                        isSideIngredient(
                          index,
                          selectedRecipe.ingredients.length,
                        )
                          ? "flex-col items-center justify-center gap-1.5 px-2 py-2 text-center xl:flex-row xl:justify-start xl:gap-2 xl:px-2.5 xl:py-1.5 xl:text-left"
                          : "items-center gap-2 px-2.5 py-1.5 text-left sm:gap-3 sm:px-3 sm:py-2",
                      ]
                        .filter(Boolean)
                        .join(" ")}"""

if old_button not in text:
    raise SystemExit("Could not find the ingredient button class.")
text = text.replace(old_button, new_button, 1)

old_info = '<div className="min-w-0 flex-1 crafting_crafting_workbench_div_container_24">'

new_info = """<div
                        className={[
                          "min-w-0 crafting_crafting_workbench_div_container_24",
                          spatialLayout &&
                          isSideIngredient(
                            index,
                            selectedRecipe.ingredients.length,
                          )
                            ? "w-full flex-none xl:w-auto xl:flex-1"
                            : "flex-1",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >"""

if old_info not in text:
    raise SystemExit("Could not find the ingredient text wrapper.")
text = text.replace(old_info, new_info, 1)

path.write_text(text, encoding="utf-8")

print(f"Updated {path}")
print("Side ingredient cards are vertical on narrow views; top/bottom remain unchanged.")
print("Desktop xl+ returns to the existing horizontal layout.")