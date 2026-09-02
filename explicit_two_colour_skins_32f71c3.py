from pathlib import Path
import subprocess
import re

ROOT = Path.cwd()
EXPECTED = "32f71c3"
CSS = ROOT / "components/sepulchria/sep-ui-unified.css"
ROOM = ROOT / "app/(portal)/game/components/RoomMessageList.tsx"
GALLERY = ROOT / "components/portal/portal-skin-gallery.tsx"

head = subprocess.check_output(["git","rev-parse","--short","HEAD"], text=True).strip()
if head != EXPECTED:
    raise SystemExit(f"Expected HEAD {EXPECTED}, found {head}. Refusing to patch a different baseline.")

for path in (CSS, ROOM, GALLERY):
    if not path.exists(): raise SystemExit(f"Missing required file: {path}")

css = CSS.read_text(encoding="utf-8")
room = ROOM.read_text(encoding="utf-8")
gallery = GALLERY.read_text(encoding="utf-8")

# Mark speech/action spans semantically.
if 'data-room-message-segment=' not in room:
    old = '          <span\n  className={\n    isAction\n      ? "italic text-[rgb(var(--sep-colour-a98a60))]"\n      : "text-[rgb(var(--sep-colour-d3c2aa))]"\n  }\n  style={{\n    lineHeight: "18px",\n    color:\n      isAction\n        ? actionColour\n        : speechColour,\n  }}\n>'
    new = '          <span\n  data-room-message-segment={\n    isAction ? "action" : "speech"\n  }\n  className={\n    isAction\n      ? "italic text-[rgb(var(--sep-colour-a98a60))]"\n      : "text-[rgb(var(--sep-colour-d3c2aa))]"\n  }\n  style={{\n    lineHeight: "18px",\n    color:\n      isAction\n        ? actionColour\n        : speechColour,\n  }}\n>'
    if room.count(old) != 1: raise SystemExit("Could not locate ActionSpeechText span exactly once. Nothing written.")
    room = room.replace(old,new,1)

MARKER = "/* SEPULCHRIA EXPLICIT TWO-COLOUR COMPOSITION — 32f71c3 */"
if MARKER in css: css = css[:css.index(MARKER)].rstrip() + "\n"

SKINS = {'vellum': ('#34271f', '#702f35', '#8c493e'), 'aelari-dawn': ('#18392f', '#76502f', '#9a6c3b'), 'ashen': ('#173d34', '#704126', '#9a6037'), 'dwarven-deep': ('#2b211b', '#4b5153', '#6d5b4b'), 'mortal-hearth': ('#4b202b', '#27363a', '#713341'), 'wolfs-moon': ('#10283c', '#5a3d2c', '#75513a'), 'amethyst-veil': ('#eee1eb', '#c4814c', '#e0a16c'), 'ivory-archive': ('#eeeae2', '#aebbc6', '#d4dde4'), 'verdant-reliquary': ('#dce8d8', '#b9bea5', '#d9dcc5'), 'deepwater': ('#d8eee7', '#efb078', '#f6c79d'), 'blood-court': ('#eee5e1', '#aebdca', '#d2dce4'), 'starfall': ('#e7e4dc', '#c58a35', '#dfa852')}
parts = [MARKER, "/* Explicit visual roles: ink = prose, accent = links/controls/headings, action = <action> segments. */"]
for slug,(ink,accent,action) in SKINS.items():
    parts.append(f'html[data-portal-skin="{slug}"],\nbody[data-portal-skin="{slug}"],\n[data-portal-skin="{slug}"] {{\n  --sep-skin-role-ink: {ink};\n  --sep-skin-role-accent: {accent};\n  --sep-skin-role-action: {action};\n}}')

skin_selector = ",\n".join(f'html[data-portal-skin="{slug}"], body[data-portal-skin="{slug}"]' for slug in SKINS)

parts.append(f'/* Normal tokenised text = readable ink. */\n:is(\n{skin_selector}\n) [data-portal-shell]\n:is(p, span, time, label, li, dd, dt)[class*="text-[rgb(var(--sep-colour-"] {{\n  color: var(--sep-skin-role-ink) !important;\n}}')
parts.append(f'/* Visible second family on major UI roles. */\n:is(\n{skin_selector}\n) [data-portal-shell]\n:is(a[href], button:not(:disabled), [role="button"], h1, h2, h3, h4, h5, h6) {{\n  color: var(--sep-skin-role-accent) !important;\n}}\n\n:is(\n{skin_selector}\n) [data-portal-shell]\n:is(span, p, div)[class*="uppercase"][class*="tracking-"] {{\n  color: var(--sep-skin-role-accent) !important;\n}}')
parts.append(f'/* Room speech/actions are deliberately different. */\n:is(\n{skin_selector}\n) [data-room-message-segment="speech"] {{\n  color: var(--sep-skin-role-ink) !important;\n}}\n\n:is(\n{skin_selector}\n) [data-room-message-segment="action"] {{\n  color: var(--sep-skin-role-action) !important;\n}}')
parts.append(f'/* Unified controls carry the second family too. */\n:is(\n{skin_selector}\n) [data-portal-shell] {{\n  --sep-unified-control-text: var(--sep-skin-role-accent);\n  --sep-unified-control-text-hover: var(--sep-skin-role-action);\n  --sep-unified-control-border-hover: var(--sep-skin-role-accent);\n  --sep-unified-field-text: var(--sep-skin-role-ink);\n  --sep-unified-field-focus: var(--sep-skin-role-accent);\n  --sep-unified-context-border-hover: var(--sep-skin-role-accent);\n}}')

for slug in ("vellum","aelari-dawn","ashen","dwarven-deep","mortal-hearth","wolfs-moon"):
    parts.append(f'html[data-portal-skin="{slug}"] [data-cosmetic-surface="off-character"] :is(p, span, a, time),\nbody[data-portal-skin="{slug}"] [data-cosmetic-surface="off-character"] :is(p, span, a, time) {{\n  color: var(--sep-skin-role-ink) !important;\n}}\n\nhtml[data-portal-skin="{slug}"] [data-portal-shell]\n:is(p, span, time, label, li, dd, dt)[class*="text-[rgb(var(--sep-colour-"],\nbody[data-portal-skin="{slug}"] [data-portal-shell]\n:is(p, span, time, label, li, dd, dt)[class*="text-[rgb(var(--sep-colour-"] {{\n  color: var(--sep-skin-role-ink) !important;\n}}')

parts.append('html[data-portal-skin="deepwater"] [data-cosmetic-surface="action"] :is(a,button,h1,h2,h3,h4,span[class*="uppercase"]),\nbody[data-portal-skin="deepwater"] [data-cosmetic-surface="action"] :is(a,button,h1,h2,h3,h4,span[class*="uppercase"]) {\n  color: var(--sep-skin-role-accent) !important;\n}')
css = css.rstrip() + "\n\n" + "\n\n".join(parts) + "\n"

SWATCHES = {'vellum': ('#d9cfb5', '#702f35'), 'aelari-dawn': ('#d7dcc3', '#76502f'), 'ashen': ('#c2d6e1', '#173d34'), 'dwarven-deep': ('#c1b197', '#4b5153'), 'mortal-hearth': ('#c3c4bd', '#4b202b'), 'wolfs-moon': ('#c4cdd0', '#10283c'), 'amethyst-veil': ('#0d0714', '#c4814c'), 'ivory-archive': ('#0b0c0d', '#aebbc6'), 'verdant-reliquary': ('#040f09', '#b9bea5'), 'deepwater': ('#031012', '#efb078'), 'blood-court': ('#120407', '#aebdca'), 'starfall': ('#040816', '#c58a35')}

def replace_swatch(content, slug, bg, accent):
    key = f'"{slug}"' if "-" in slug else slug
    pat = re.compile(rf'({re.escape(key)}\s*:\s*\{{\s*background:\s*")[^"]+("\s*,\s*accent:\s*")[^"]+("\s*,\s*\}})', re.S)
    content,count = pat.subn(lambda m: f"{m.group(1)}{bg}{m.group(2)}{accent}{m.group(3)}", content, count=1)
    if count != 1: raise SystemExit(f"Could not update Appearance swatch for {slug}. Nothing written.")
    return content

for slug,(bg,accent) in SWATCHES.items(): gallery = replace_swatch(gallery,slug,bg,accent)

planned = {CSS:css, ROOM:room, GALLERY:gallery}
changed = [p for p,c in planned.items() if c != p.read_text(encoding="utf-8")]
if not changed: raise SystemExit("Everything is already in the requested state.")
for path in changed: path.write_text(planned[path], encoding="utf-8")

print("✓ Explicit two-colour skin composition applied on 32f71c3")
print("✓ Birdfolk: light sky + deep forest green text + dark copper second colour")
print("✓ Mortal Heart: light neutral + deep burgundy text + graphite second colour")
print("✓ Wolf Moon: moonlight + very dark navy text + fur-brown second colour")
print("✓ Siranthi: pale mint speech + pale orange action/accent; no pink")
print("✓ Other non-approved skins get explicit ink + accent roles too")
print("✓ Kareshi / Cinder / Cambion / Rose-approved palettes untouched")
print("✓ Skin animations untouched")
print("Files changed:")
for path in changed: print(f"  - {path.relative_to(ROOT)}")
