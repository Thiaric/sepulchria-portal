from pathlib import Path
import subprocess
import re
import colorsys

ROOT = Path.cwd()
EXPECTED = "1dd2235"

THEMES = ROOT / "app/portal-themes.css"
GALLERY = ROOT / "components/portal/portal-skin-gallery.tsx"
COSMETICS = ROOT / "components/cosmetics/cosmetic-runtime.tsx"
PRICE = ROOT / "components/characters/ActivePriceEffects.tsx"
TROPHIES = ROOT / "components/characters/character-trophies-display.tsx"
ROOM_MESSAGES = ROOT / "app/(portal)/game/components/RoomMessageList.tsx"

ACCENT_FILES = [
    ROOT / "app/(portal)/game/components/GatheringPanel.tsx",
    ROOT / "app/(portal)/crafting/crafting-workbench.tsx",
    ROOT / "app/(portal)/game/components/HouseOfChancesPanel.tsx",
]

ALL_FILES = [
    THEMES,
    GALLERY,
    COSMETICS,
    PRICE,
    TROPHIES,
    ROOM_MESSAGES,
    *ACCENT_FILES,
]

head = subprocess.check_output(
    ["git", "rev-parse", "--short", "HEAD"],
    text=True,
).strip()

if head != EXPECTED:
    raise SystemExit(
        f"Expected HEAD {EXPECTED}, found {head}. "
        "Refusing to patch a different baseline."
    )

texts = {}
for path in ALL_FILES:
    if not path.exists():
        raise SystemExit(f"Missing required file: {path}")
    texts[path] = path.read_text(encoding="utf-8")

# ---------------------------------------------------------------------
# 1. CHARACTER SHEET
# ---------------------------------------------------------------------

price_old = '''  return <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-5 sm:p-6">'''
price_new = '''  return <section data-profile-price-box="true" className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-5 sm:p-6">'''

if texts[PRICE].count(price_old) != 1:
    raise SystemExit("The Price box anchor did not match exactly once.")
new_price = texts[PRICE].replace(price_old, price_new, 1)

trophy_track_old = '''                              <div className="mt-1.5 h-1 overflow-hidden bg-[rgb(var(--sep-colour-090706))]">
                                <div
                                  className="h-full bg-[rgb(var(--sep-colour-9b7545))]"'''
trophy_track_new = '''                              <div
                                data-trophy-progress-track="true"
                                className="mt-1.5 h-1 overflow-hidden bg-[rgb(var(--sep-colour-090706))]"
                              >
                                <div
                                  data-trophy-progress-fill="true"
                                  className="h-full bg-[rgb(var(--sep-colour-9b7545))]"'''

if texts[TROPHIES].count(trophy_track_old) != 1:
    raise SystemExit("Trophy progress-bar anchor did not match exactly once.")
new_trophies = texts[TROPHIES].replace(
    trophy_track_old,
    trophy_track_new,
    1,
)

cosmetic_anchor = '''      [data-cosmetic-surface="off-character"][data-has-off-character-message-frame="true"] > * {
        position: relative;
        z-index: 2;
      }
'''

cosmetic_extra = cosmetic_anchor + '''
      /* PROFILE BACKGROUND FOLLOW-UP — 1dd2235 */

      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        [data-profile-price-box="true"] {
        background-color:
          rgb(var(--sep-colour-090705) / 40%) !important;
      }

      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        [data-character-sheet-panel="ledger"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-"] {
        background-color:
          rgb(var(--sep-colour-090705) / 50%) !important;
      }

      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        [data-trophy-progress-track="true"] {
        background-color:
          rgb(var(--sep-colour-090706)) !important;
      }

      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        [data-trophy-progress-fill="true"] {
        background-color:
          rgb(var(--sep-colour-9b7545)) !important;
      }
'''

if texts[COSMETICS].count(cosmetic_anchor) != 1:
    raise SystemExit("Cosmetic-runtime final anchor did not match exactly once.")
new_cosmetics = texts[COSMETICS].replace(
    cosmetic_anchor,
    cosmetic_extra,
    1,
)

# ---------------------------------------------------------------------
# 2. REPORT BUTTONS
# ---------------------------------------------------------------------

report_class_old = 'className="absolute right-2 top-2 z-10"'
report_class_new = 'className="absolute right-3 top-3 z-50 pointer-events-auto"'

report_count = texts[ROOM_MESSAGES].count(report_class_old)
if report_count != 3:
    raise SystemExit(
        f"Expected exactly 3 room report-button class occurrences, found {report_count}."
    )

new_room_messages = texts[ROOM_MESSAGES].replace(
    report_class_old,
    report_class_new,
)

# ---------------------------------------------------------------------
# 3. SKINS — final refinement pass
# ---------------------------------------------------------------------

MARKER = "/* SEPULCHRIA FINAL POP PASS — 1dd2235 */"
if MARKER in texts[THEMES]:
    raise SystemExit("Final skin pop-pass marker already exists.")

colour_tokens = sorted(set(
    re.findall(
        r"--sep-colour-([0-9a-fA-F]{6})\s*:",
        texts[THEMES],
    )
))
rgb_tokens = sorted(set(
    re.findall(
        r"--sep-rgb-(\d+)-(\d+)-(\d+)\s*:",
        texts[THEMES],
    )
))

if len(colour_tokens) < 100:
    raise SystemExit(
        f"Expected a large colour-token set, found only {len(colour_tokens)}."
    )

PALETTES = {
    "aelari-dawn": {
        "mode": "light",
        "bg0": (220, 222, 198), "bg1": (232, 233, 211),
        "bg2": (242, 242, 224), "bg3": (204, 209, 183),
        "border": (63, 75, 65), "muted": (66, 74, 63),
        "ink": (31, 43, 37),
        "status_red": (129, 54, 49),
        "status_green": (43, 99, 62),
        "status_blue": (45, 80, 111),
    },
    "ashen": {
        "mode": "light",
        "bg0": (195, 214, 224), "bg1": (211, 226, 233),
        "bg2": (229, 238, 242), "bg3": (179, 203, 214),
        "border": (54, 72, 82), "muted": (55, 68, 75),
        "ink": (24, 39, 48),
        "status_red": (131, 55, 53),
        "status_green": (42, 98, 67),
        "status_blue": (45, 80, 118),
    },
    "dwarven-deep": {
        "mode": "light",
        "bg0": (194, 178, 151), "bg1": (215, 203, 181),
        "bg2": (232, 223, 206), "bg3": (177, 158, 130),
        "border": (74, 59, 47), "muted": (66, 52, 42),
        "ink": (39, 32, 28),
        "status_red": (126, 52, 45),
        "status_green": (47, 91, 58),
        "status_blue": (51, 73, 96),
    },
    "mortal-hearth": {
        "mode": "light",
        "bg0": (194, 194, 186), "bg1": (212, 212, 204),
        "bg2": (231, 229, 220), "bg3": (174, 175, 169),
        "border": (69, 70, 68), "muted": (61, 62, 59),
        "ink": (31, 34, 34),
        "status_red": (128, 52, 49),
        "status_green": (45, 91, 58),
        "status_blue": (48, 76, 102),
    },
    "wolfs-moon": {
        "mode": "light",
        "bg0": (199, 204, 204), "bg1": (216, 220, 218),
        "bg2": (233, 235, 230), "bg3": (183, 190, 189),
        "border": (94, 76, 61), "muted": (82, 64, 51),
        "ink": (54, 41, 33),
        "status_red": (126, 51, 47),
        "status_green": (48, 92, 63),
        "status_blue": (55, 80, 105),
    },
    "amethyst-veil": {
        "mode": "dark",
        "bg0": (14, 7, 20), "bg1": (22, 11, 31),
        "bg2": (32, 16, 45), "bg3": (45, 23, 61),
        "border": (104, 72, 47), "accent": (166, 105, 55),
        "accent_hi": (205, 141, 79), "muted": (164, 145, 163),
        "text": (235, 222, 224),
    },
    "ivory-archive": {
        "mode": "dark",
        "bg0": (12, 12, 12), "bg1": (20, 20, 19),
        "bg2": (30, 30, 28), "bg3": (42, 41, 38),
        "border": (92, 96, 100), "accent": (154, 161, 168),
        "accent_hi": (205, 211, 216), "muted": (148, 149, 146),
        "text": (229, 229, 224),
    },
    "verdant-reliquary": {
        "mode": "dark",
        "bg0": (5, 15, 10), "bg1": (8, 24, 16),
        "bg2": (12, 35, 23), "bg3": (18, 48, 31),
        "border": (91, 100, 79), "accent": (154, 164, 137),
        "accent_hi": (206, 211, 190), "muted": (130, 146, 129),
        "text": (226, 232, 218),
    },
    "deepwater": {
        "mode": "dark",
        "bg0": (4, 16, 18), "bg1": (6, 25, 29),
        "bg2": (8, 37, 42), "bg3": (12, 51, 56),
        "border": (91, 54, 74), "accent": (142, 58, 96),
        "accent_hi": (190, 86, 130), "muted": (119, 151, 149),
        "text": (218, 232, 225),
    },
    "blood-court": {
        "mode": "dark",
        "bg0": (18, 5, 7), "bg1": (29, 7, 10),
        "bg2": (43, 10, 15), "bg3": (59, 15, 21),
        "border": (83, 91, 99), "accent": (139, 151, 162),
        "accent_hi": (196, 205, 213), "muted": (153, 129, 128),
        "text": (235, 225, 220),
    },
    "starfall": {
        "mode": "dark",
        "bg0": (5, 9, 22), "bg1": (8, 14, 31),
        "bg2": (12, 21, 43), "bg3": (17, 29, 54),
        "border": (111, 75, 31), "accent": (174, 113, 39),
        "accent_hi": (214, 151, 58), "muted": (140, 142, 150),
        "text": (230, 225, 214),
    },
}

def rgb_from_hex_token(token):
    return tuple(int(token[i:i+2], 16) for i in (0, 2, 4))

def hsv(rgb):
    r, g, b = (v / 255.0 for v in rgb)
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    return h * 360.0, s, v

def lum(rgb):
    r, g, b = rgb
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def is_status(original):
    h, s, _ = hsv(original)
    if s < 0.28:
        return None
    if (h <= 18 or h >= 342) and original[0] > 80:
        return "red"
    if 70 <= h <= 165 and original[1] > 70:
        return "green"
    if 185 <= h <= 245 and original[2] > 85:
        return "blue"
    return None

def themed(original, p):
    y = lum(original)
    status = is_status(original)

    if p["mode"] == "light":
        if status == "red":
            return p["status_red"]
        if status == "green":
            return p["status_green"]
        if status == "blue":
            return p["status_blue"]
        if y < 15:
            return p["bg0"]
        if y < 25:
            return p["bg1"]
        if y < 45:
            return p["bg2"]
        if y < 75:
            return p["bg3"]
        if y < 120:
            return p["border"]
        if y < 175:
            return p["muted"]
        return p["ink"]

    if status == "red":
        return (207, 98, 96)
    if status == "green":
        return (116, 171, 126)
    if status == "blue":
        return (112, 145, 190)
    if y < 15:
        return p["bg0"]
    if y < 25:
        return p["bg1"]
    if y < 45:
        return p["bg2"]
    if y < 75:
        return p["bg3"]
    if y < 115:
        return p["border"]
    if y < 155:
        return p["accent"]
    if y < 195:
        return p["accent_hi"]
    if y < 220:
        return p["muted"]
    return p["text"]

def declarations(p):
    out = []
    for token in colour_tokens:
        value = themed(rgb_from_hex_token(token), p)
        out.append(
            f"  --sep-colour-{token}: {value[0]} {value[1]} {value[2]};"
        )
    for rs, gs, bs in rgb_tokens:
        value = themed((int(rs), int(gs), int(bs)), p)
        out.append(
            f"  --sep-rgb-{rs}-{gs}-{bs}: {value[0]} {value[1]} {value[2]};"
        )
    return "\n".join(out)

css = [
    "",
    MARKER,
    "/* Final ancestry skin refinement after visual review. */",
]

for slug, palette in PALETTES.items():
    css.append(
        f'''html[data-portal-skin="{slug}"],
body[data-portal-skin="{slug}"],
[data-portal-skin="{slug}"] {{
{declarations(palette)}
}}'''
    )

LIGHT_SKINS = [
    "aelari-dawn",
    "ashen",
    "dwarven-deep",
    "mortal-hearth",
    "wolfs-moon",
]

surface_selectors = []
surface_child_selectors = []
for slug in LIGHT_SKINS:
    for surface in ("off-character", "whisper"):
        surface_selectors.extend([
            f'html[data-portal-skin="{slug}"] [data-cosmetic-surface="{surface}"]',
            f'body[data-portal-skin="{slug}"] [data-cosmetic-surface="{surface}"]',
        ])
        surface_child_selectors.extend([
            f'html[data-portal-skin="{slug}"] [data-cosmetic-surface="{surface}"] :is(p,span,a,time)',
            f'body[data-portal-skin="{slug}"] [data-cosmetic-surface="{surface}"] :is(p,span,a,time)',
        ])

css.append(
    ",\n".join(surface_selectors)
    + ''' {
  background-color: rgb(var(--sep-colour-15100d) / 86%) !important;
  color: rgb(var(--sep-colour-e4cfaa)) !important;
}'''
)

css.append(
    ",\n".join(surface_child_selectors)
    + ''' {
  color: rgb(var(--sep-colour-e4cfaa)) !important;
}'''
)

css.append(r'''
.portal-skin-atmosphere[data-atmosphere="wolf-moon"] .portal-moon-glow {
  background:
    radial-gradient(
      circle at center,
      rgb(239 243 240 / 0.34),
      rgb(207 218 220 / 0.17) 42%,
      transparent 72%
    ) !important;
}

.portal-skin-atmosphere[data-atmosphere="wolf-moon"] .portal-wolf-mist {
  filter: sepia(.22) saturate(.72) hue-rotate(338deg) brightness(.96) !important;
}

.portal-skin-atmosphere[data-atmosphere="starfall"] .portal-star {
  background: rgb(224 174 83) !important;
  box-shadow:
    0 0 5px rgb(214 151 58 / 0.72),
    0 0 13px rgb(174 113 39 / 0.34) !important;
}

.portal-skin-atmosphere[data-atmosphere="starfall"] .portal-shooting-star {
  background:
    linear-gradient(
      to left,
      rgb(224 174 83 / 0.94),
      rgb(174 113 39 / 0.32),
      transparent
    ) !important;
}
''')

new_themes = (
    texts[THEMES].rstrip()
    + "\n\n"
    + "\n\n".join(css)
    + "\n"
)

# ---------------------------------------------------------------------
# 4. SWATCHES + HARD-CODED ACCENTS
# ---------------------------------------------------------------------

SWATCH_REPLACEMENTS = {
    '  starfall: {\n    background: "#050916",\n    accent: "#c99d43",\n  },':
        '  starfall: {\n    background: "#050916",\n    accent: "#ae7127",\n  },',
    '  "amethyst-veil": {\n    background: "#0d0713",\n    accent: "#bf9749",\n  },':
        '  "amethyst-veil": {\n    background: "#0e0714",\n    accent: "#a66937",\n  },',
    '  deepwater: {\n    background: "#040f11",\n    accent: "#b8774c",\n  },':
        '  deepwater: {\n    background: "#041012",\n    accent: "#8e3a60",\n  },',
    '  "blood-court": {\n    background: "#110507",\n    accent: "#c4974e",\n  },':
        '  "blood-court": {\n    background: "#120507",\n    accent: "#8b97a2",\n  },',
    '  ashen: {\n    background: "#c6d7e0",\n    accent: "#aa7c37",\n  },':
        '  ashen: {\n    background: "#c3d6e0",\n    accent: "#18303a",\n  },',
    '  "ivory-archive": {\n    background: "#0c0c0b",\n    accent: "#bea168",\n  },':
        '  "ivory-archive": {\n    background: "#0c0c0c",\n    accent: "#9aa1a8",\n  },',
    '  "aelari-dawn": {\n    background: "#dfdec2",\n    accent: "#a37933",\n  },':
        '  "aelari-dawn": {\n    background: "#dcdec6",\n    accent: "#1f2b25",\n  },',
    '  "dwarven-deep": {\n    background: "#c2b094",\n    accent: "#a65f2e",\n  },':
        '  "dwarven-deep": {\n    background: "#c2b297",\n    accent: "#27201c",\n  },',
    '  "mortal-hearth": {\n    background: "#c2c2b8",\n    accent: "#936035",\n  },':
        '  "mortal-hearth": {\n    background: "#c2c2ba",\n    accent: "#1f2222",\n  },',
    '  "wolfs-moon": {\n    background: "#070b0d",\n    accent: "#bea369",\n  },':
        '  "wolfs-moon": {\n    background: "#d8dcda",\n    accent: "#523f33",\n  },',
    '  "verdant-reliquary": {\n    background: "#050f0a",\n    accent: "#b5964a",\n  },':
        '  "verdant-reliquary": {\n    background: "#050f0a",\n    accent: "#9aa489",\n  },',
}

new_gallery = texts[GALLERY]
for old, new in SWATCH_REPLACEMENTS.items():
    count = new_gallery.count(old)
    if count != 1:
        raise SystemExit(
            f"Gallery swatch replacement expected once, found {count}: {old[:50]!r}"
        )
    new_gallery = new_gallery.replace(old, new, 1)

ACCENT_LINES = {
    '  starfall: "#c99d43",': '  starfall: "#ae7127",',
    '  "amethyst-veil": "#bf9749",': '  "amethyst-veil": "#a66937",',
    '  deepwater: "#b8774c",': '  deepwater: "#8e3a60",',
    '  "blood-court": "#c4974e",': '  "blood-court": "#8b97a2",',
    '  ashen: "#aa7c37",': '  ashen: "#18303a",',
    '  "ivory-archive": "#bea168",': '  "ivory-archive": "#9aa1a8",',
    '  "aelari-dawn": "#a37933",': '  "aelari-dawn": "#1f2b25",',
    '  "dwarven-deep": "#a65f2e",': '  "dwarven-deep": "#27201c",',
    '  "mortal-hearth": "#936035",': '  "mortal-hearth": "#1f2222",',
    '  "wolfs-moon": "#bea369",': '  "wolfs-moon": "#523f33",',
    '  "verdant-reliquary": "#b5964a",': '  "verdant-reliquary": "#9aa489",',
}

new_accent_files = {}
for path in ACCENT_FILES:
    content = texts[path]
    for old, new in ACCENT_LINES.items():
        count = content.count(old)
        if count != 1:
            raise SystemExit(
                f"{path}: expected one accent line {old!r}, found {count}."
            )
        content = content.replace(old, new, 1)
    new_accent_files[path] = content

# ---------------------------------------------------------------------
# 5. WRITE ONLY AFTER ALL VALIDATION
# ---------------------------------------------------------------------

PRICE.write_text(new_price, encoding="utf-8")
TROPHIES.write_text(new_trophies, encoding="utf-8")
COSMETICS.write_text(new_cosmetics, encoding="utf-8")
ROOM_MESSAGES.write_text(new_room_messages, encoding="utf-8")
THEMES.write_text(new_themes, encoding="utf-8")
GALLERY.write_text(new_gallery, encoding="utf-8")

for path, content in new_accent_files.items():
    path.write_text(content, encoding="utf-8")

print("✓ Final visual refinement patch applied to 1dd2235")
print("")
print("SKINS")
print("  ✓ Aelari: light + dark ink")
print("  ✓ Birdfolk: light blue + dark ink")
print("  ✓ Dwarven Deep: deep brown/charcoal text instead of orange")
print("  ✓ Fair Folk: purple + bronze")
print("  ✓ Human/Mortal: dark ink")
print("  ✓ Littling: silver instead of gold")
print("  ✓ Reptilian: green + stone/bone instead of gold")
print("  ✓ Siranthi: aqua + dark pink")
print("  ✓ Vampire: blood red + blade-steel silver")
print("  ✓ Vaskari: deeper old gold, less yellow")
print("  ✓ Wolf's Moon: moonlight + fur brown")
print("  ✓ approved Cinder/Cambion/Kareshi untouched")
print("  ✓ light-skin OOC/whisper text explicitly readable")
print("")
print("CHARACTER SHEET")
print("  ✓ The Price explicitly translucent")
print("  ✓ Ledger changed to 50% opacity")
print("  ✓ Trophy progress bars exempted from transparency flattening")
print("")
print("ROOM CHAT")
print("  ✓ report buttons aligned consistently")
print("  ✓ all 3 report buttons moved to z-50 above cosmetic frames")
print("  ✓ all 3 report buttons explicitly pointer-events-auto")
