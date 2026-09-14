from pathlib import Path

path = Path("app/(portal)/crafting/crafting-workbench.tsx")

if not path.exists():
    raise SystemExit(f"Could not find {path}")

text = path.read_text(encoding="utf-8")
original = text

old = 'imageClassName="h-full w-full object-contain p-1 transition-transform duration-500 ease-out group-hover:scale-[1.045]"'
new = 'imageClassName="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.045]"'
if old not in text:
    raise SystemExit("Could not find the shared crafting ItemImage imageClassName.")
text = text.replace(old, new, 1)

old = 'imageClassName="h-full w-full object-contain p-0.5 transition-transform duration-500 ease-out group-hover:scale-[1.045]"'
new = 'imageClassName="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.045]"'
if old not in text:
    raise SystemExit("Could not find the mobile centre-result imageClassName.")
text = text.replace(old, new, 1)

old = '''className="flex items-center justify-center sm:aspect-square sm:overflow-hidden sm:border sm:bg-black/25 sm:p-3 crafting_crafting_workbench_div_container_37"
                      style={{
                        borderColor: `color-mix(in srgb, ${craftingAccent} 40%, transparent)`,
                        boxShadow: `inset 0 0 26px rgba(0,0,0,0.48), 0 0 18px color-mix(in srgb, ${craftingAccent} 8%, transparent)`,
                      }}'''
new = '''className="flex items-center justify-center sm:aspect-square sm:overflow-hidden crafting_crafting_workbench_div_container_37"'''
if old not in text:
    raise SystemExit("Could not find the popup image-well wrapper.")
text = text.replace(old, new, 1)

old = 'imageClassName="h-full w-full object-contain p-1"'
new = 'imageClassName="h-full w-full object-cover"'
if old not in text:
    raise SystemExit("Could not find the popup mobile imageClassName.")
text = text.replace(old, new, 1)

old = 'imageClassName="h-full w-full object-contain"'
new = 'imageClassName="h-full w-full object-cover"'
if old not in text:
    raise SystemExit("Could not find the popup desktop imageClassName.")
text = text.replace(old, new, 1)

if text == original:
    raise SystemExit("No changes were made.")

path.write_text(text, encoding="utf-8")

print(f"Updated {path}")
print("Fixed crafting rarity-frame rendering.")
