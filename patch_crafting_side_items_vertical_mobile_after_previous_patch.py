from pathlib import Path

path = Path("app/(portal)/crafting/crafting-workbench.tsx")

if not path.exists():
    raise SystemExit(f"Could not find {path}")

text = path.read_text(encoding="utf-8")

old_button = 'className="relative z-10 flex h-full min-h-0 w-full items-center gap-2 px-2.5 py-1.5 text-left sm:gap-3 sm:px-3 sm:py-2 crafting_crafting_workbench_button_action_3"'

new_button = '''className={[
                        "relative z-10 flex h-full min-h-0 w-full crafting_crafting_workbench_button_action_3",
                        spatialLayout &&
                        isSideIngredient(
                          index,
                          selectedRecipe.ingredients.length,
                        )
                          ? "flex-col items-center justify-center gap-1.5 px-2 py-2 text-center xl:flex-row xl:items-center xl:justify-start xl:gap-2 xl:px-2.5 xl:py-1.5 xl:text-left"
                          : "items-center gap-2 px-2.5 py-1.5 text-left sm:gap-3 sm:px-3 sm:py-2",
                      ]
                        .filter(Boolean)
                        .join(" ")}'''

if new_button in text:
    print("The mobile vertical side-item layout is already applied.")
elif old_button in text:
    text = text.replace(old_button, new_button, 1)
    path.write_text(text, encoding="utf-8")
    print(f"Updated {path}")
    print("Only the INNER ingredient button layout was changed.")
    print("Your previously-applied outer-card/text-wrapper changes were left untouched.")
else:
    raise SystemExit(
        "Could not find the inner ingredient button. "
        "Paste the current ingredient card block and I will patch that exact version."
    )
