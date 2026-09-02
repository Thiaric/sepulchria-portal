from pathlib import Path
import subprocess

ROOT = Path.cwd()
head = subprocess.check_output(['git','rev-parse','--short','HEAD'], text=True).strip()
if not head.startswith('8c67697'):
    raise SystemExit(f'Expected HEAD 8c67697, found {head}')

rel = 'lib/cosmetics/get-equipped-cosmetic.ts'
path = ROOT / rel
text = path.read_text(encoding='utf-8')

old1 = '  const preferences = preferencesResult.data ?? [];\n  const cosmeticIds = Array.from(\n    new Set(\n      preferences.flatMap((row) =>\n        columns\n          .map((column) =>\n            String((row as Record<string, unknown>)[column] ?? ""),\n          )\n          .filter(Boolean),\n      ),\n    ),\n  );\n'
new1 = '  const preferences =\n    ((preferencesResult.data ?? []) as unknown[]) as Array<\n      Record<string, unknown>\n    >;\n\n  const cosmeticIds = Array.from(\n    new Set(\n      preferences.flatMap((row) =>\n        columns\n          .map((column) =>\n            String(row[column] ?? ""),\n          )\n          .filter(Boolean),\n      ),\n    ),\n  );\n'
if old1 not in text:
    raise SystemExit('Preference normalisation block not found')
text = text.replace(old1, new1, 1)

old2 = '  for (const row of preferences) {\n    const characterId = String(row.character_id);\n\n    for (const category of categories) {\n      const column = COSMETIC_PREFERENCE_COLUMN[category];\n      const cosmeticId = String(\n        (row as Record<string, unknown>)[column] ?? "",\n      );\n'
new2 = '  for (const row of preferences) {\n    const characterId = String(\n      row.character_id ?? "",\n    );\n\n    for (const category of categories) {\n      const column =\n        COSMETIC_PREFERENCE_COLUMN[\n          category\n        ];\n\n      const cosmeticId = String(\n        row[column] ?? "",\n      );\n'
if old2 not in text:
    raise SystemExit('Preference iteration block not found')
text = text.replace(old2, new2, 1)

path.write_text(text, encoding='utf-8')
print('Fixed Supabase dynamic preference row typing.')
