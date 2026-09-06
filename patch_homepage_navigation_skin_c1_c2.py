from pathlib import Path
import shutil

ROOT = Path.cwd()
home = ROOT / 'components' / 'homepage' / 'sepulchria-homepage.tsx'
css = ROOT / 'app' / 'globals.css'

if not home.exists() or not css.exists():
    raise SystemExit('Run this from the sepulchria-portal repo root.')

h = home.read_text(encoding='utf-8')
g = css.read_text(encoding='utf-8')

def once(text, old, new, label):
    c = text.count(old)
    if c != 1:
        raise SystemExit(f'STOP: {label}: expected 1 match, found {c}. No files changed.')
    return text.replace(old, new, 1)

h = once(h,
    '      className={`group relative min-h-[64px] overflow-hidden border px-4 py-3 transition duration-300 focus-visible:outline-none',
    '      data-homepage-nav-button="true"\n      className={`group relative min-h-[64px] overflow-hidden border px-4 py-3 transition duration-300 focus-visible:outline-none',
    'HomepageButton marker')

h = once(h,
    '      className="group relative min-h-[64px] overflow-hidden border border-[rgb(var(--sep-colour-654b30))]/55 bg-[rgb(var(--sep-colour-15100c))]/92 px-4 py-3 text-left transition duration-300 hover:-translate-y-0.5',
    '      data-homepage-nav-button="true"\n      className="group relative min-h-[64px] overflow-hidden border border-[rgb(var(--sep-colour-654b30))]/55 bg-[rgb(var(--sep-colour-15100c))]/92 px-4 py-3 text-left transition duration-300 hover:-translate-y-0.5',
    'HomepageActionButton marker')

targets = [
    ('symbol', '<span className="absolute right-4 top-1/2 -translate-y-1/2 font-serif text-3xl text-[rgb(var(--sep-colour-a87c43))]/15 transition duration-500 group-hover:scale-125 group-hover:text-[rgb(var(--sep-colour-c99a58))]/25">'),
    ('eyebrow', '<span className="relative block text-[7px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-836c50))]">'),
    ('label', '<span className="relative mt-1 block font-serif text-base text-[rgb(var(--sep-colour-dfc89d))] transition group-hover:text-[rgb(var(--sep-colour-f0d7a6))]">'),
    ('accent', '<span className="absolute bottom-0 left-0 h-px w-0 bg-[rgb(var(--sep-colour-c18d4c))] transition-all duration-500 group-hover:w-full" />'),
]

for role, old in targets:
    c = h.count(old)
    if c != 2:
        raise SystemExit(f'STOP: {role}: expected 2 matches, found {c}. No files changed.')
    new = old.replace('<span ', f'<span data-homepage-nav-role="{role}" ')
    h = h.replace(old, new, 2)

marker = 'HOMEPAGE NAVIGATION - SEMANTIC SKIN C1/C2'
if marker not in g:
    g += '''

/* HOMEPAGE NAVIGATION - SEMANTIC SKIN C1/C2 */
html[data-portal-skin] [data-homepage-nav-button="true"] {
  border-color: color-mix(in srgb, rgb(var(--sep-skin-c1)) 55%, transparent) !important;
}
html[data-portal-skin] [data-homepage-nav-button="true"]:hover {
  border-color: rgb(var(--sep-skin-c1)) !important;
}
html[data-portal-skin] [data-homepage-nav-button="true"] [data-homepage-nav-role="eyebrow"] {
  color: rgb(var(--sep-skin-c2)) !important;
}
html[data-portal-skin] [data-homepage-nav-button="true"] [data-homepage-nav-role="label"] {
  color: rgb(var(--sep-skin-c1)) !important;
}
html[data-portal-skin] [data-homepage-nav-button="true"] [data-homepage-nav-role="symbol"] {
  color: rgb(var(--sep-skin-c2)) !important;
  opacity: .55;
}
html[data-portal-skin] [data-homepage-nav-button="true"]:hover [data-homepage-nav-role="symbol"] {
  opacity: .8;
}
html[data-portal-skin] [data-homepage-nav-button="true"] [data-homepage-nav-role="accent"] {
  background: rgb(var(--sep-skin-c1)) !important;
}
'''

for path in (home, css):
    backup = path.with_suffix(path.suffix + '.before_homepage_nav_skin.bak')
    if not backup.exists():
        shutil.copy2(path, backup)

home.write_text(h, encoding='utf-8')
css.write_text(g, encoding='utf-8')

print('DONE')
print('Homepage nav: border C1, eyebrow C2, label C1, symbol C2, accent C1.')
print('Now run: npm run build')
