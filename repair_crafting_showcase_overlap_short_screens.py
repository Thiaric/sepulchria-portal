from pathlib import Path

path = Path("app/(portal)/crafting/crafting-workbench.tsx")

if not path.exists():
    raise SystemExit(f"Missing expected file: {path}")

text = path.read_text(encoding="utf-8")

replacements = [
    (
        'className="relative flex min-h-[320px] flex-1 items-center justify-center overflow-hidden border p-3"',
        'className="relative flex min-h-[260px] flex-1 items-center justify-center overflow-auto border p-2 sm:p-3 xl:min-h-[280px] 2xl:min-h-[320px]"',
    ),
    (
        '"relative grid h-full min-h-[290px] w-full max-w-[760px] grid-cols-3 grid-rows-3 items-center justify-items-center gap-3"',
        '"relative grid h-full min-h-[240px] max-h-full w-full max-w-[720px] grid-cols-[minmax(0,1fr)_minmax(140px,0.9fr)_minmax(0,1fr)] grid-rows-[minmax(72px,0.9fr)_minmax(128px,1.15fr)_minmax(72px,0.9fr)] items-center justify-items-center gap-2 sm:min-h-[260px] sm:max-w-[740px] sm:grid-cols-[minmax(0,1fr)_minmax(160px,1fr)_minmax(0,1fr)] sm:grid-rows-[minmax(80px,1fr)_minmax(148px,1.2fr)_minmax(80px,1fr)] sm:gap-3"',
    ),
    (
        'className="relative col-start-2 row-start-2 flex h-36 w-36 items-center justify-center border p-[5px] transition-all duration-300 sm:h-40 sm:w-40"',
        'className="relative col-start-2 row-start-2 flex h-28 w-28 items-center justify-center border p-[4px] transition-all duration-300 sm:h-32 sm:w-32 2xl:h-36 2xl:w-36"',
    ),
    (
        'className={`${spatialLayout ? ingredientPosition(index, selectedRecipe.ingredients.length) : ""} relative flex h-full min-h-[86px] w-full max-w-[220px] items-center border transition duration-200`',
        'className={`${spatialLayout ? ingredientPosition(index, selectedRecipe.ingredients.length) : ""} relative flex h-auto min-h-[70px] w-full max-w-[160px] items-center border transition duration-200 sm:min-h-[76px] sm:max-w-[180px] xl:max-w-[190px]`',
    ),
    (
        'className="relative z-10 flex h-full min-h-0 w-full items-center gap-3 px-3 py-2 text-left"',
        'className="relative z-10 flex h-full min-h-0 w-full items-center gap-2 px-2.5 py-1.5 text-left sm:gap-3 sm:px-3 sm:py-2"',
    ),
    (
        'className="line-clamp-2 text-[10px] leading-4 text-[rgb(var(--sep-colour-d4bd94))]"',
        'className="line-clamp-2 text-[9px] leading-3.5 text-[rgb(var(--sep-colour-d4bd94))] sm:text-[10px] sm:leading-4"',
    ),
    (
        'className="mt-0.5 font-serif text-[9px]"',
        'className="mt-0.5 font-serif text-[8px] sm:text-[9px]"',
    ),
]

changed = 0
for old, new in replacements:
    if old in text:
        text = text.replace(old, new, 1)
        changed += 1

if changed < 5:
    raise SystemExit(
        f"Only {changed} expected crafting layout replacements were applied. "
        "The local file likely differs from the expected showcase version."
    )

path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("Crafting workbench compact spatial layout repair applied.")
print("This reduces overlap on shorter screens by shrinking the ritual layout,")
print("making ingredient slots less tall/wide, reducing the central result size,")
print("and allowing the ritual area itself to scroll only as a fallback.")
print("Now run: npm run build")
