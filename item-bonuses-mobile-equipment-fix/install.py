from pathlib import Path

ROOT = Path.cwd()
DISPLAY = ROOT / 'components/characters/character-inventory-display.tsx'
BROWSER = ROOT / 'components/characters/character-inventory-browser.tsx'

if not (ROOT / 'package.json').exists():
    raise SystemExit('ERROR: Run this installer from the sepulchria-portal repository root.')

for path in (DISPLAY, BROWSER):
    if not path.exists():
        raise SystemExit(f'ERROR: Missing {path.relative_to(ROOT).as_posix()}')

display = DISPLAY.read_text(encoding='utf-8')
browser = BROWSER.read_text(encoding='utf-8')

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'ERROR: Could not find current repository block: {label}')
    return text.replace(old, new, 1)

old_trigger = '    if (effect.trigger_type !== "passive") {\n      continue;\n    }\n'
new_trigger = '    if (\n      effect.trigger_type !== "equipped" ||\n      effect.effect_mode !== "passive"\n    ) {\n      continue;\n    }\n'
display = replace_once(display, old_trigger, new_trigger, 'equipment bonus trigger filter')

inventory_anchor = '          {!compact &&\n          row.description?.trim() ? (\n            <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-[#9f927f]">\n              {\n                row.description\n              }\n            </p>\n          ) : null}\n\n          <Requirements\n            requirements={\n              row.requirements\n            }\n          />\n'
inventory_replacement = '          {!compact &&\n          row.description?.trim() ? (\n            <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-[#9f927f]">\n              {\n                row.description\n              }\n            </p>\n          ) : null}\n\n          {row.equipment_bonuses.length ? (\n            <div className="mt-3 border-t border-[#59432c]/30 pt-2.5">\n              <p className="text-[7px] uppercase tracking-[0.16em] text-[#806b50]">\n                Equipment bonuses\n              </p>\n\n              <div className="mt-2 flex flex-wrap gap-1.5">\n                {row.equipment_bonuses.map(\n                  (bonus) => (\n                    <span\n                      key={bonus.label}\n                      className={`border px-2 py-1 text-[7px] uppercase tracking-[0.1em] ${\n                        bonus.value > 0\n                          ? "border-emerald-900/65 bg-emerald-950/20 text-emerald-400"\n                          : "border-red-900/65 bg-red-950/20 text-red-400"\n                      }`}\n                    >\n                      {bonus.label}{" "}\n                      {bonus.value > 0\n                        ? "+"\n                        : ""}\n                      {bonus.value}\n                    </span>\n                  ),\n                )}\n              </div>\n            </div>\n          ) : null}\n\n          <Requirements\n            requirements={\n              row.requirements\n            }\n          />\n'
browser = replace_once(browser, inventory_anchor, inventory_replacement, 'ItemCard bonus insertion point')

mobile_figure = '      <div className="grid gap-2 p-3 sm:grid-cols-2 md:hidden">\n        <div className="col-span-full mx-auto mb-3 h-[220px] w-[110px]">\n          <div className="relative h-full w-full scale-[0.46] origin-top">\n            <Silhouette />\n          </div>\n        </div>\n\n        {SLOT_ORDER.map(\n'
mobile_no_figure = '      <div className="grid gap-2 p-3 sm:grid-cols-2 md:hidden">\n        {SLOT_ORDER.map(\n'
browser = replace_once(browser, mobile_figure, mobile_no_figure, 'mobile Equipment silhouette')

DISPLAY.write_text(display, encoding='utf-8')
BROWSER.write_text(browser, encoding='utf-8')

print('SUCCESS')
print('Fixed Equipment bonus display and removed the mobile human figure.')
print('No SQL is required.')
print('Now run: npm run build')