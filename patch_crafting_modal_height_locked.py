from pathlib import Path

ROOT = Path.cwd()
page_path = ROOT / "app/(portal)/crafting/page.tsx"
workbench_path = ROOT / "app/(portal)/crafting/crafting-workbench.tsx"

for path in (page_path, workbench_path):
    if not path.exists():
        raise SystemExit(f"ERROR: Missing expected file: {path}")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"ERROR: {label}: expected exactly 1 match, found {count}. No files were written."
        )
    return text.replace(old, new, 1)

page = page_path.read_text(encoding="utf-8")
workbench = workbench_path.read_text(encoding="utf-8")

page = replace_once(page, '      <main\n        data-crafting-page\n        className="mx-auto w-full max-w-none space-y-5 p-5 sm:p-7 lg:p-8"\n      >', '      <main\n        data-crafting-page\n        className="mx-auto flex h-full max-h-full w-full max-w-none flex-col overflow-hidden p-5 sm:p-7 lg:p-8"\n      >', 'Crafting page height container')

page = replace_once(page, '        <header className="relative overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 px-6 py-4 sm:px-8">', '        <header className="relative mb-4 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 px-6 py-4 sm:px-8">', 'Crafting header fixed sizing')

page = replace_once(page, '        <CraftingWorkbench\n          recipes={recipes}\n          inventory={inventory}\n        />', '        <div className="min-h-0 flex-1 overflow-hidden">\n          <CraftingWorkbench\n            recipes={recipes}\n            inventory={inventory}\n          />\n        </div>', 'Crafting workbench wrapper')

count = workbench.count('      <section className="flex min-h-0 flex-col border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95">')
if count != 3:
    raise SystemExit(
        f"ERROR: Column panel sizing: expected exactly 3 matches, found {count}. No files were written."
    )
workbench = workbench.replace('      <section className="flex min-h-0 flex-col border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95">', '      <section className="flex h-full min-h-0 flex-col overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95">')

workbench = replace_once(workbench, '    <div className="grid min-h-[620px] w-full gap-4 xl:grid-cols-[1fr_1fr_2fr]">', '    <div className="grid h-full max-h-full min-h-0 w-full gap-4 overflow-hidden xl:grid-cols-[1fr_1fr_2fr]">', 'Workbench full available height')

workbench = replace_once(workbench, '        <div className="flex min-h-0 flex-1 flex-col p-5">', '        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5">', 'Workbench right body overflow')

workbench = replace_once(workbench, '          <div className="flex min-h-[390px] flex-1 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/35 bg-black/10 p-5">', '          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/35 bg-black/10 p-4">', 'Workbench table fills available height')

workbench = replace_once(workbench, '                  ? "grid h-full w-full max-w-[680px] grid-cols-3 grid-rows-3 items-center justify-items-center gap-4"\n                  : "grid w-full max-w-[720px] grid-cols-2 gap-4 2xl:grid-cols-3"', '                  ? "grid h-full min-h-0 w-full max-w-[680px] grid-cols-3 grid-rows-3 items-center justify-items-center gap-3"\n                  : "grid h-full min-h-0 w-full max-w-[720px] auto-rows-fr grid-cols-2 items-center gap-3 2xl:grid-cols-3"', 'Spatial grid full height')

workbench = replace_once(workbench, '                        className="flex min-h-[104px] w-full flex-col items-center justify-center px-3 py-3 text-center"', '                        className="flex h-full min-h-0 w-full flex-col items-center justify-center px-3 py-2 text-center"', 'Ingredient slot adaptive height')

workbench = replace_once(workbench, '          <div className="mt-4 grid gap-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/20 p-4 lg:grid-cols-[1fr_auto] lg:items-center">', '          <div className="mt-4 grid shrink-0 gap-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/20 p-4 lg:grid-cols-[1fr_auto] lg:items-center">', 'Result controls fixed at bottom')

page_path.write_text(page, encoding="utf-8")
workbench_path.write_text(workbench, encoding="utf-8")

print("SUCCESS")
print("Crafting is now locked to the modal's available height.")
print("Recipes and Ingredients scroll internally.")
print("Workbench/table never scrolls and fills the remaining height.")
print("Next: npm run build")
