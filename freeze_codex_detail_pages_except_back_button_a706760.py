from pathlib import Path
import subprocess

BASE = 'a706760'
REPLACEMENTS = [('components/codex/codex-entry-hero.tsx', '      <section\n        className="relative overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-110d0a))]"', '      <section\n        data-sep-interaction-ignore="true"\n        className="relative overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-110d0a))]"', 'CodexEntryHero main hero section'), ('components/codex/codex-entry-hero.tsx', '      {betweenHeroAndRecord}\n\n      {recordReplacement ?? (\n      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-6 sm:p-8">', '      <div data-sep-interaction-ignore="true">\n        {betweenHeroAndRecord}\n      </div>\n\n      <div data-sep-interaction-ignore="true">\n      {recordReplacement ?? (\n      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-6 sm:p-8">', 'CodexEntryHero lower content opening'), ('components/codex/codex-entry-hero.tsx', '      </section>\n      )}\n    </article>', '      </section>\n      )}\n      </div>\n    </article>', 'CodexEntryHero lower content closing'), ('app/(portal)/orders/[slug]/page.tsx', '        <article className="mt-5 space-y-5">', '        <article\n          data-sep-interaction-ignore="true"\n          className="mt-5 space-y-5"\n        >', 'Order detail article')]

head = subprocess.run(
    ["git", "rev-parse", "--short", "HEAD"],
    check=True, capture_output=True, text=True, encoding='utf-8'
).stdout.strip()

if not head.startswith(BASE):
    raise SystemExit(f'This patch expects HEAD {BASE}; current HEAD is {head}. No files were changed.')

texts = {}
for path, old, new, label in REPLACEMENTS:
    p = Path(path)
    if not p.exists():
        raise SystemExit(f'Missing {path}. No files were changed.')
    if path not in texts:
        texts[path] = p.read_text(encoding='utf-8')
    if old not in texts[path]:
        raise SystemExit(f'Could not find {label} in {path}. No files were changed.')
    texts[path] = texts[path].replace(old, new, 1)

for path, text in texts.items():
    Path(path).write_text(text, encoding='utf-8')

print('SUCCESS')
print('')
print("- Ancestry detail: only 'Back to ancestries' keeps interaction.")
print("- Association detail: only 'Back to associations' keeps interaction.")
print("- Order detail: only 'Back to Orders' keeps interaction.")
print('- Image preview controls remain clickable but visually fixed.')
print('- Right context sidebars are untouched.')
print('')
print('Run: npm run build')
