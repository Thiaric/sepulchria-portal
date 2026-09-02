from pathlib import Path
import subprocess
import re
import colorsys

ROOT = Path.cwd()
EXPECTED = "1dd2235"

THEMES = ROOT / "app/portal-themes.css"
GALLERY = ROOT / "components/portal/portal-skin-gallery.tsx"
COSMETICS = ROOT / "components/cosmetics/cosmetic-runtime.tsx"
ROOM = ROOT / "app/(portal)/game/components/RoomMessageList.tsx"
PRICE = ROOT / "components/characters/ActivePriceEffects.tsx"
TROPHIES = ROOT / "components/characters/character-trophies-display.tsx"

ACCENT_FILES = [
    ROOT / "app/(portal)/game/components/GatheringPanel.tsx",
    ROOT / "app/(portal)/crafting/crafting-workbench.tsx",
    ROOT / "app/(portal)/game/components/HouseOfChancesPanel.tsx",
]

ALL = [THEMES, GALLERY, COSMETICS, ROOM, PRICE, TROPHIES, *ACCENT_FILES]

head = subprocess.check_output(["git","rev-parse","--short","HEAD"], text=True).strip()
if head != EXPECTED:
    raise SystemExit(f"Expected HEAD {EXPECTED}, found {head}. This patch is based on the last pushed repository.")

texts = {}
for path in ALL:
    if not path.exists(): raise SystemExit(f"Missing required file: {path}")
    texts[path] = path.read_text(encoding="utf-8")

def replace_slug_hex_map(content, replacements):
    for slug, value in replacements.items():
        key = rf'"{re.escape(slug)}"' if "-" in slug else re.escape(slug)
        pat = rf'(\s*{key}\s*:\s*)"[#0-9a-fA-F]{{7}}"'
        content, count = re.subn(pat, lambda m, v=value: f'{m.group(1)}"{v}"', content, count=1)
        if count != 1: raise SystemExit(f"Could not update accent entry for {slug}. Nothing written.")
    return content

def replace_gallery_swatch(content, slug, bg, accent):
    key = f'"{slug}"' if "-" in slug else slug
    pat = re.compile(rf'({re.escape(key)}\s*:\s*\{{\s*background:\s*")[^"]+("\s*,\s*accent:\s*")[^"]+("\s*,\s*\}})', re.S)
    content, count = pat.subn(lambda m: f"{m.group(1)}{bg}{m.group(2)}{accent}{m.group(3)}", content, count=1)
    if count != 1: raise SystemExit(f"Could not update gallery swatch for {slug}. Nothing written.")
    return content

# Character sheet markers
price = texts[PRICE]
if 'data-profile-price-box="true"' not in price:
    old = 'return <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-5 sm:p-6">'
    new = 'return <section data-profile-price-box="true" className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-5 sm:p-6">'
    if price.count(old) != 1: raise SystemExit("Could not mark The Price box.")
    price = price.replace(old,new,1)

trophies = texts[TROPHIES]
if 'data-trophy-progress-track="true"' not in trophies:
    old = '                              <div className="mt-1.5 h-1 overflow-hidden bg-[rgb(var(--sep-colour-090706))]">\n                                <div\n                                  className="h-full bg-[rgb(var(--sep-colour-9b7545))]"'
    new = '                              <div\n                                data-trophy-progress-track="true"\n                                className="mt-1.5 h-1 overflow-hidden bg-[rgb(var(--sep-colour-090706))]"\n                              >\n                                <div\n                                  data-trophy-progress-fill="true"\n                                  className="h-full bg-[rgb(var(--sep-colour-9b7545))]"'
    if trophies.count(old) != 1: raise SystemExit("Could not mark Trophy progress bar.")
    trophies = trophies.replace(old,new,1)

# Normalize the 3 room-message report controls robustly.
# Match the immediate parent <div> of each room-message ReportButton,
# regardless of whitespace, multiline JSX, or previous local class edits.
room = texts[ROOM]

report_parent_pattern = re.compile(
    r'<div\b[^>]*>\s*(?=<ReportButton\s+sourceType="room_message")',
    re.S,
)

report_parents = list(report_parent_pattern.finditer(room))
if len(report_parents) != 3:
    raise SystemExit(
        f"Expected exactly 3 room-message ReportButton parents, found {len(report_parents)}. "
        "Nothing written."
    )

room = report_parent_pattern.sub(
    '<div data-room-report-control="true" '
    'className="absolute right-3 top-3 z-50 pointer-events-auto">\n                          ',
    room,
)

if room.count('data-room-report-control="true"') != 3:
    raise SystemExit(
        "Report-control normalization did not produce exactly 3 markers. "
        "Nothing written."
    )

# Cosmetic runtime
cos = texts[COSMETICS]
old_follow_marker = "      /* PROFILE BACKGROUND FOLLOW-UP — 1dd2235 */"
if old_follow_marker in cos:
    start = cos.index(old_follow_marker)
    end = cos.index('    `}</style>', start)
    cos = cos[:start] + cos[end:]

cos = cos.replace('[data-cosmetic-surface="action"][data-has-action-style="true"] > * {', '[data-cosmetic-surface="action"][data-has-action-style="true"] > *:not([data-room-report-control="true"]) {')
cos = cos.replace('[data-cosmetic-surface="whisper"][data-has-whisper-style="true"] > * {', '[data-cosmetic-surface="whisper"][data-has-whisper-style="true"] > *:not([data-room-report-control="true"]) {')
cos = cos.replace('[data-cosmetic-surface="off-character"][data-has-off-character-message-frame="true"] > * {', '[data-cosmetic-surface="off-character"][data-has-off-character-message-frame="true"] > *:not([data-room-report-control="true"]) {')

ooc_old = '[data-cosmetic-surface="off-character"][data-has-off-character-message-frame="true"]::before {\n        content: "";\n        position: absolute;\n        z-index: 10;'
ooc_new = '[data-cosmetic-surface="off-character"][data-has-off-character-message-frame="true"]::before {\n        content: "";\n        position: absolute;\n        z-index: 1;'
if ooc_old in cos: cos = cos.replace(ooc_old,ooc_new,1)
elif ooc_new not in cos: raise SystemExit("Could not locate OOC frame z-index.")

follow = '\n      /* VISUAL FOLLOW-UP — dual-tone skins / sheet / report controls */\n      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]\n        [data-profile-price-box="true"] {\n        background-color: rgb(var(--sep-colour-090705) / 40%) !important;\n      }\n\n      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]\n        [data-character-sheet-panel="ledger"]\n        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-"] {\n        background-color: rgb(var(--sep-colour-090705) / 50%) !important;\n      }\n\n      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]\n        [data-trophy-progress-track="true"] {\n        background-color: rgb(var(--sep-colour-090706)) !important;\n      }\n\n      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]\n        [data-trophy-progress-fill="true"] {\n        background-color: rgb(var(--sep-colour-9b7545)) !important;\n      }\n\n      [data-room-report-control="true"] {\n        position: absolute !important;\n        right: 12px !important;\n        top: 12px !important;\n        left: auto !important;\n        bottom: auto !important;\n        z-index: 50 !important;\n        pointer-events: auto !important;\n      }\n\n      [data-room-report-control="true"] * {\n        pointer-events: auto !important;\n      }\n'
anchor = '    `}</style>'
if cos.count(anchor) != 1: raise SystemExit("Cosmetic style closing anchor is not unique.")
cos = cos.replace(anchor, follow + "\n" + anchor, 1)

# Theme palette
themes = texts[THEMES]
for marker in ["/* SEPULCHRIA FINAL POP PASS — 1dd2235 */","/* SEPULCHRIA DUAL-TONE POP PASS — 1dd2235 */"]:
    if marker in themes: themes = themes[:themes.index(marker)].rstrip() + "\n"
colour_tokens = sorted(set(re.findall(r"--sep-colour-([0-9a-fA-F]{6})\s*:", themes)))
rgb_tokens = sorted(set(re.findall(r"--sep-rgb-(\d+)-(\d+)-(\d+)\s*:", themes)))
if len(colour_tokens) < 100: raise SystemExit(f"Expected global colour tokens; found {len(colour_tokens)}.")

PALETTES = {'vellum': {'mode': 'light', 'surface': [(217, 207, 181), (232, 224, 202), (244, 238, 220), (201, 188, 159)], 'ink': (47, 38, 31), 'muted': (78, 65, 53), 'secondary': (112, 55, 45), 'secondary_hi': (143, 72, 55)}, 'aelari-dawn': {'mode': 'light', 'surface': [(215, 220, 195), (230, 233, 211), (242, 243, 225), (196, 207, 178)], 'ink': (29, 49, 40), 'muted': (58, 78, 67), 'secondary': (105, 72, 42), 'secondary_hi': (139, 94, 49)}, 'ashen': {'mode': 'light', 'surface': [(194, 214, 225), (212, 228, 235), (232, 241, 244), (177, 202, 214)], 'ink': (24, 43, 55), 'muted': (54, 76, 89), 'secondary': (116, 69, 43), 'secondary_hi': (151, 87, 49)}, 'dwarven-deep': {'mode': 'light', 'surface': [(193, 177, 151), (214, 202, 179), (233, 224, 206), (176, 157, 129)], 'ink': (42, 34, 29), 'muted': (67, 56, 47), 'secondary': (70, 70, 67), 'secondary_hi': (91, 77, 64)}, 'mortal-hearth': {'mode': 'light', 'surface': [(195, 196, 189), (214, 215, 208), (232, 232, 225), (176, 179, 173)], 'ink': (30, 34, 35), 'muted': (59, 65, 65), 'secondary': (92, 55, 57), 'secondary_hi': (123, 69, 68)}, 'wolfs-moon': {'mode': 'light', 'surface': [(196, 205, 208), (215, 222, 223), (235, 238, 235), (177, 189, 192)], 'ink': (65, 48, 38), 'muted': (91, 70, 56), 'secondary': (111, 87, 69), 'secondary_hi': (142, 112, 86)}, 'amethyst-veil': {'mode': 'dark', 'surface': [(13, 7, 20), (21, 10, 31), (31, 15, 45), (44, 21, 61)], 'ink': (237, 225, 231), 'muted': (170, 151, 172), 'secondary': (151, 92, 51), 'secondary_hi': (198, 128, 69)}, 'ivory-archive': {'mode': 'dark', 'surface': [(11, 12, 13), (19, 20, 21), (29, 30, 31), (41, 42, 43)], 'ink': (238, 238, 233), 'muted': (164, 167, 169), 'secondary': (139, 151, 162), 'secondary_hi': (205, 214, 221)}, 'verdant-reliquary': {'mode': 'dark', 'surface': [(4, 15, 9), (7, 24, 15), (11, 35, 22), (17, 48, 30)], 'ink': (230, 235, 221), 'muted': (137, 154, 136), 'secondary': (145, 151, 127), 'secondary_hi': (205, 209, 181)}, 'deepwater': {'mode': 'dark', 'surface': [(3, 16, 18), (5, 25, 29), (8, 37, 42), (11, 51, 56)], 'ink': (222, 235, 230), 'muted': (126, 158, 157), 'secondary': (133, 50, 91), 'secondary_hi': (190, 79, 126)}, 'blood-court': {'mode': 'dark', 'surface': [(18, 4, 7), (29, 7, 10), (43, 10, 15), (59, 14, 21)], 'ink': (239, 229, 224), 'muted': (164, 137, 136), 'secondary': (126, 140, 153), 'secondary_hi': (195, 206, 215)}, 'starfall': {'mode': 'dark', 'surface': [(4, 8, 22), (7, 14, 32), (11, 21, 44), (16, 29, 56)], 'ink': (233, 229, 219), 'muted': (145, 149, 160), 'secondary': (157, 97, 31), 'secondary_hi': (205, 137, 47)}}

def token_rgb(token): return tuple(int(token[i:i+2],16) for i in (0,2,4))
def hsv(rgb):
    r,g,b=(x/255 for x in rgb); h,s,v=colorsys.rgb_to_hsv(r,g,b); return h*360,s,v
def luminance(rgb):
    r,g,b=rgb; return .2126*r+.7152*g+.0722*b
def status_family(rgb):
    h,s,_=hsv(rgb)
    if s < .30: return None
    if (h <= 18 or h >= 342) and rgb[0] > 85: return "red"
    if 70 <= h <= 165 and rgb[1] > 75: return "green"
    if 185 <= h <= 245 and rgb[2] > 90: return "blue"
    return None
def is_original_warm_accent(rgb):
    h,s,_=hsv(rgb); y=luminance(rgb); return 18 <= h <= 55 and s >= .16 and 70 <= y <= 215
def map_colour(rgb,p):
    y=luminance(rgb); status=status_family(rgb)
    if status=="red": return (133,49,47) if p["mode"]=="light" else (210,100,98)
    if status=="green": return (39,96,62) if p["mode"]=="light" else (116,176,129)
    if status=="blue": return (43,78,112) if p["mode"]=="light" else (112,148,194)
    if is_original_warm_accent(rgb): return p["secondary_hi"] if y>=155 else p["secondary"]
    s0,s1,s2,s3=p["surface"]
    if p["mode"]=="light":
        if y<15:return s0
        if y<28:return s1
        if y<50:return s2
        if y<82:return s3
        if y<130:return p["muted"]
        return p["ink"]
    if y<15:return s0
    if y<28:return s1
    if y<50:return s2
    if y<82:return s3
    if y<135:return p["muted"]
    if y<205:return p["secondary"]
    return p["ink"]
def declarations(p):
    ink=p["ink"]; sec=p["secondary"]; hi=p["secondary_hi"]
    out=[f"  --sep-skin-ink: {ink[0]} {ink[1]} {ink[2]};",f"  --sep-skin-secondary: {sec[0]} {sec[1]} {sec[2]};",f"  --sep-skin-secondary-bright: {hi[0]} {hi[1]} {hi[2]};"]
    for token in colour_tokens:
        v=map_colour(token_rgb(token),p); out.append(f"  --sep-colour-{token}: {v[0]} {v[1]} {v[2]};")
    for rs,gs,bs in rgb_tokens:
        v=map_colour((int(rs),int(gs),int(bs)),p); out.append(f"  --sep-rgb-{rs}-{gs}-{bs}: {v[0]} {v[1]} {v[2]};")
    return "\n".join(out)

css=["/* SEPULCHRIA DUAL-TONE POP PASS — 1dd2235 */","/* True dual-tone palettes. No animation property is overridden. */"]
for slug,p in PALETTES.items():
    css.append(f'html[data-portal-skin="{slug}"],\nbody[data-portal-skin="{slug}"],\n[data-portal-skin="{slug}"] {{\n{declarations(p)}\n}}')

LIGHT=["vellum","aelari-dawn","ashen","dwarven-deep","mortal-hearth","wolfs-moon"]
for slug in LIGHT:
    css.append(f'html[data-portal-skin="{slug}"] [data-cosmetic-surface="off-character"],\nbody[data-portal-skin="{slug}"] [data-cosmetic-surface="off-character"] {{\n  background-color: rgb(var(--sep-colour-15100d) / 88%) !important;\n  color: rgb(var(--sep-skin-ink)) !important;\n}}\n\nhtml[data-portal-skin="{slug}"] [data-cosmetic-surface="off-character"] :is(p,span,a,time),\nbody[data-portal-skin="{slug}"] [data-cosmetic-surface="off-character"] :is(p,span,a,time) {{\n  color: rgb(var(--sep-skin-ink)) !important;\n}}')
css.append('\n.portal-skin-atmosphere[data-atmosphere="starfall"] .portal-star {\n  background: rgb(215 159 65) !important;\n  box-shadow: 0 0 5px rgb(205 137 47 / .78), 0 0 14px rgb(157 97 31 / .38) !important;\n}\n.portal-skin-atmosphere[data-atmosphere="starfall"] .portal-shooting-star {\n  background: linear-gradient(to left, rgb(220 166 72 / .94), rgb(157 97 31 / .34), transparent) !important;\n}\n')
themes = themes.rstrip() + "\n\n" + "\n\n".join(css) + "\n"

SWATCH = {'vellum': ('#d9cfb5', '#70372d'), 'aelari-dawn': ('#d7dcc3', '#69482a'), 'ashen': ('#c2d6e1', '#74452b'), 'dwarven-deep': ('#c1b197', '#464643'), 'mortal-hearth': ('#c3c4bd', '#5c3739'), 'wolfs-moon': ('#c4cdd0', '#6f5745'), 'amethyst-veil': ('#0d0714', '#975c33'), 'ivory-archive': ('#0b0c0d', '#8b97a2'), 'verdant-reliquary': ('#040f09', '#91977f'), 'deepwater': ('#031012', '#85325b'), 'blood-court': ('#120407', '#7e8c99'), 'starfall': ('#040816', '#9d611f')}
gallery=texts[GALLERY]
for slug,(bg,accent) in SWATCH.items(): gallery=replace_gallery_swatch(gallery,slug,bg,accent)
ACCENTS={slug:accent for slug,(_,accent) in SWATCH.items()}
accent_files={path:replace_slug_hex_map(texts[path],ACCENTS) for path in ACCENT_FILES}

for path,old,new in [(THEMES,texts[THEMES],themes),(GALLERY,texts[GALLERY],gallery),(COSMETICS,texts[COSMETICS],cos),(ROOM,texts[ROOM],room),(PRICE,texts[PRICE],price),(TROPHIES,texts[TROPHIES],trophies)]:
    if old==new: raise SystemExit(f"{path}: expected a change but produced none. Nothing written.")

THEMES.write_text(themes,encoding="utf-8")
GALLERY.write_text(gallery,encoding="utf-8")
COSMETICS.write_text(cos,encoding="utf-8")
ROOM.write_text(room,encoding="utf-8")
PRICE.write_text(price,encoding="utf-8")
TROPHIES.write_text(trophies,encoding="utf-8")
for path,content in accent_files.items(): path.write_text(content,encoding="utf-8")

print("✓ Dual-tone skin/OOC/report rebuild applied on HEAD 1dd2235")
print("✓ Human Mark OOC: light surface + dark ink, frame behind prose")
print("✓ Littling: true silver secondary")
print("✓ All 3 report buttons: same top-right absolute layer, clickable")
print("✓ Other skins: actual primary + secondary families, Kareshi principle")
print("✓ Vaskari: deeper antique gold; animation rules untouched")
print("✓ The Price / Ledger / Trophy-bar fixes included")
print("✓ Works whether the previous unpushed visual patch was run or not")
