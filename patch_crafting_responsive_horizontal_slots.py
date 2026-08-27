from pathlib import Path

ROOT = Path.cwd()
path = ROOT / "app/(portal)/crafting/crafting-workbench.tsx"

if not path.exists():
    raise SystemExit(f"ERROR: Missing expected file: {path}")

text = path.read_text(encoding="utf-8")

def replace_once(old: str, new: str, label: str):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"ERROR: {label}: expected exactly 1 match, found {count}. No files were written."
        )
    text = text.replace(old, new, 1)

replace_once(
    '                  ? "grid h-full min-h-0 w-full max-w-[680px] grid-cols-3 grid-rows-3 items-center justify-items-center gap-3"\n                  : "grid h-full min-h-0 w-full max-w-[720px] auto-rows-fr grid-cols-2 items-center gap-3 2xl:grid-cols-3"',
    '                  ? "grid h-full min-h-0 w-full max-w-[720px] grid-cols-3 grid-rows-[repeat(3,minmax(0,1fr))] items-center justify-items-center gap-2"\n                  : "grid h-full min-h-0 w-full max-w-[760px] auto-rows-fr grid-cols-2 items-center gap-2 2xl:grid-cols-3"',
    "responsive spatial grid",
)

replace_once(
    '                      className={`${spatialLayout ? ingredientPosition(index, selectedRecipe.ingredients.length) : ""} w-full max-w-[200px] border transition ${',
    '                      className={`${spatialLayout ? ingredientPosition(index, selectedRecipe.ingredients.length) : ""} flex h-full min-h-0 w-full max-w-[230px] items-center border transition ${',
    "ingredient slot container",
)

old_button = '''                      <button
                        type="button"
                        onClick={() => {
                          if (filled) {
                            setFilledSlots(
                              (
                                current,
                              ) => ({
                                ...current,
                                [ingredient.item_id]:
                                  false,
                              }),
                            );
                          } else {
                            fillIngredient(
                              ingredient.item_id,
                            );
                          }
                        }}
                        className="flex h-full min-h-0 w-full flex-col items-center justify-center px-3 py-2 text-center"
                      >
                        <ItemImage
                          src={
                            ingredient.image_url
                          }
                        />

                        <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-[rgb(var(--sep-colour-d4bd94))]">
                          {ingredient.name}
                        </p>

                        <p
                          className={`mt-1 text-[8px] ${
                            enough
                              ? "text-[rgb(var(--sep-colour-b88d54))]"
                              : "text-[rgb(var(--sep-colour-806b50))]"
                          }`}
                        >
                          {owned} /{" "}
                          {
                            ingredient.quantity
                          }
                        </p>

                        <p className="mt-1 text-[6px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
                          {filled
                            ? "Placed"
                            : enough
                              ? "Drop here"
                              : "Missing"}
                        </p>
                      </button>'''

new_button = '''                      <button
                        type="button"
                        onClick={() => {
                          if (filled) {
                            setFilledSlots(
                              (
                                current,
                              ) => ({
                                ...current,
                                [ingredient.item_id]:
                                  false,
                              }),
                            );
                          } else {
                            fillIngredient(
                              ingredient.item_id,
                            );
                          }
                        }}
                        className="flex h-full min-h-0 w-full items-center gap-3 px-3 py-2 text-left"
                      >
                        <ItemImage
                          src={
                            ingredient.image_url
                          }
                          size="sm"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[10px] leading-4 text-[rgb(var(--sep-colour-d4bd94))]">
                            {ingredient.name}
                          </p>

                          <p
                            className={`mt-0.5 text-[8px] ${
                              enough
                                ? "text-[rgb(var(--sep-colour-b88d54))]"
                                : "text-[rgb(var(--sep-colour-806b50))]"
                            }`}
                          >
                            {owned} /{" "}
                            {
                              ingredient.quantity
                            }
                          </p>

                          <p className="mt-0.5 text-[6px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
                            {filled
                              ? "Placed"
                              : enough
                                ? "Drop here"
                                : "Missing"}
                          </p>
                        </div>
                      </button>'''

replace_once(
    old_button,
    new_button,
    "horizontal ingredient slot content",
)

path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("Workbench ingredient slots updated.")
print("Next: npm run build")
