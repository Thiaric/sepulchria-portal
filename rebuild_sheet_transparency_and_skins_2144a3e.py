from pathlib import Path
import subprocess
import re
import colorsys

ROOT = Path.cwd()
EXPECTED = "2144a3e"

COSMETIC = ROOT / "components/cosmetics/cosmetic-runtime.tsx"
THEMES = ROOT / "app/portal-themes.css"
GALLERY = ROOT / "components/portal/portal-skin-gallery.tsx"
ACCENT_FILES = [
    ROOT / "app/(portal)/game/components/GatheringPanel.tsx",
    ROOT / "app/(portal)/crafting/crafting-workbench.tsx",
    ROOT / "app/(portal)/game/components/HouseOfChancesPanel.tsx",
]

paths = [COSMETIC, THEMES, GALLERY, *ACCENT_FILES]

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
for path in paths:
    if not path.exists():
        raise SystemExit(f"Missing required file: {path}")
    texts[path] = path.read_text(encoding="utf-8")

# ---------------------------------------------------------------------
# 1. PROFILE BACKGROUND
# ---------------------------------------------------------------------

profile_anchor = '''      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-17110d))]"],
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-15100d))]"],
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-120e0b))]"] {
        background-color:
          rgb(var(--sep-colour-090705) / 40%) !important;
      }
'''

profile_extra = profile_anchor + '''
      /*
       * PROFILE BACKGROUND — COMPLETE PANEL TRANSPARENCY
       *
       * The requested sheet tabs contain additional dark surface tokens.
       * Make their structural Sepulchria-colour surfaces 40% opaque
       * (therefore 60% transparent) only on the requested tabs.
       *
       * Feats/gifts, Warping and Edit are intentionally not included.
       */
      [data-cosmetic-surface="sheet"][data-has-profile-background="true"]
        :is(
          [data-character-sheet-panel="short"],
          [data-character-sheet-panel="profile"],
          [data-character-sheet-panel="inventory"],
          [data-character-sheet-panel="ledger"],
          [data-character-sheet-panel="trophies"],
          [data-character-sheet-panel="offgame"],
          [data-character-sheet-panel="audit"]
        )
        :is(section, article, div)[class*="bg-[rgb(var(--sep-colour-"] {
        background-color:
          rgb(var(--sep-colour-090705) / 40%) !important;
      }
'''

if texts[COSMETIC].count(profile_anchor) != 1:
    raise SystemExit(
        "Profile background anchor did not match exactly once. Nothing changed."
    )

new_cosmetic = texts[COSMETIC].replace(profile_anchor, profile_extra, 1)

# ---------------------------------------------------------------------
# 2. SKINS
# ---------------------------------------------------------------------

MARKER = "/* SEPULCHRIA RICH SKIN PALETTES — 2144a3e */"
if MARKER in texts[THEMES]:
    raise SystemExit(
        "Rich skin palette marker already exists. Refusing to duplicate it."
    )

colour_tokens = sorted(set(
    re.findall(r"--sep-colour-([0-9a-fA-F]{6})\s*:", texts[THEMES])
))
rgb_tokens = sorted(set(
    re.findall(
        r"--sep-rgb-(\d+)-(\d+)-(\d+)\s*:",
        texts[THEMES],
    )
))

if len(colour_tokens) < 100:
    raise SystemExit(
        f"Expected a large Sepulchria colour-token set; found only {len(colour_tokens)}."
    )

PALETTES = {
    "vellum": {
        "mode": "light",
        "bg0": (218, 207, 185), "bg1": (232, 222, 201),
        "bg2": (241, 234, 219), "bg3": (207, 193, 167),
        "border1": (105, 78, 47), "border2": (67, 50, 35),
        "muted": (104, 87, 67), "soft": (70, 57, 44),
        "text": (43, 34, 27),
        "accent": (145, 101, 43), "bright": (181, 132, 61),
    },
    "ashen": {
        "mode": "light",
        "bg0": (198, 215, 224), "bg1": (217, 229, 234),
        "bg2": (233, 240, 242), "bg3": (181, 202, 212),
        "border1": (59, 80, 92), "border2": (28, 48, 61),
        "muted": (79, 94, 102), "soft": (49, 66, 76),
        "text": (23, 39, 49),
        "accent": (170, 124, 55), "bright": (205, 158, 76),
    },
    "aelari-dawn": {
        "mode": "light",
        "bg0": (223, 222, 194), "bg1": (237, 234, 207),
        "bg2": (247, 243, 222), "bg3": (204, 210, 178),
        "border1": (55, 78, 70), "border2": (29, 52, 51),
        "muted": (82, 98, 80), "soft": (50, 69, 62),
        "text": (32, 51, 47),
        "accent": (163, 121, 51), "bright": (198, 154, 73),
    },
    "dwarven-deep": {
        "mode": "light",
        "bg0": (194, 176, 148), "bg1": (218, 203, 179),
        "bg2": (235, 223, 204), "bg3": (178, 155, 124),
        "border1": (91, 65, 45), "border2": (54, 42, 35),
        "muted": (104, 82, 66), "soft": (70, 55, 46),
        "text": (43, 35, 30),
        "accent": (166, 95, 46), "bright": (204, 128, 64),
    },
    "mortal-hearth": {
        "mode": "light",
        "bg0": (194, 194, 184), "bg1": (216, 214, 203),
        "bg2": (234, 230, 217), "bg3": (171, 172, 164),
        "border1": (73, 74, 72), "border2": (42, 47, 48),
        "muted": (96, 94, 87), "soft": (66, 65, 61),
        "text": (39, 42, 42),
        "accent": (147, 96, 53), "bright": (184, 128, 72),
    },
    "starfall": {
        "mode": "dark",
        "bg0": (5, 9, 22), "bg1": (8, 14, 31),
        "bg2": (12, 21, 43), "bg3": (17, 29, 54),
        "border1": (108, 82, 39), "border2": (154, 116, 48),
        "muted": (139, 139, 145), "soft": (184, 181, 169),
        "text": (230, 224, 207),
        "accent": (201, 157, 67), "bright": (239, 199, 105),
    },
    "rose-nocturne": {
        "mode": "dark",
        "bg0": (18, 7, 15), "bg1": (27, 10, 23),
        "bg2": (39, 15, 32), "bg3": (53, 21, 42),
        "border1": (102, 57, 62), "border2": (144, 82, 70),
        "muted": (151, 122, 119), "soft": (196, 164, 151),
        "text": (235, 219, 205),
        "accent": (190, 123, 91), "bright": (224, 160, 116),
    },
    "verdant-reliquary": {
        "mode": "dark",
        "bg0": (5, 15, 10), "bg1": (8, 23, 16),
        "bg2": (12, 34, 23), "bg3": (18, 46, 31),
        "border1": (84, 79, 43), "border2": (130, 107, 50),
        "muted": (126, 139, 119), "soft": (176, 184, 157),
        "text": (226, 226, 202),
        "accent": (181, 150, 74), "bright": (218, 185, 98),
    },
    "amethyst-veil": {
        "mode": "dark",
        "bg0": (13, 7, 19), "bg1": (20, 10, 29),
        "bg2": (30, 14, 42), "bg3": (43, 20, 57),
        "border1": (93, 70, 62), "border2": (139, 104, 66),
        "muted": (145, 127, 148), "soft": (192, 171, 188),
        "text": (232, 220, 214),
        "accent": (191, 151, 73), "bright": (225, 190, 101),
    },
    "emberforge": {
        "mode": "dark",
        "bg0": (14, 8, 5), "bg1": (23, 12, 7),
        "bg2": (35, 18, 10), "bg3": (49, 25, 13),
        "border1": (105, 64, 37), "border2": (153, 86, 43),
        "muted": (145, 119, 98), "soft": (192, 161, 133),
        "text": (235, 220, 198),
        "accent": (207, 126, 65), "bright": (239, 163, 88),
    },
    "deepwater": {
        "mode": "dark",
        "bg0": (4, 15, 17), "bg1": (6, 23, 27),
        "bg2": (8, 34, 39), "bg3": (12, 47, 52),
        "border1": (82, 76, 56), "border2": (124, 91, 59),
        "muted": (113, 139, 138), "soft": (160, 182, 177),
        "text": (222, 228, 215),
        "accent": (184, 119, 76), "bright": (218, 154, 103),
    },
    "blood-court": {
        "mode": "dark",
        "bg0": (17, 5, 7), "bg1": (27, 7, 10),
        "bg2": (41, 10, 14), "bg3": (57, 14, 20),
        "border1": (100, 61, 42), "border2": (145, 93, 47),
        "muted": (147, 118, 108), "soft": (195, 162, 142),
        "text": (234, 219, 199),
        "accent": (196, 151, 78), "bright": (230, 189, 104),
    },
    "ivory-archive": {
        "mode": "dark",
        "bg0": (12, 12, 11), "bg1": (20, 19, 17),
        "bg2": (29, 28, 25), "bg3": (40, 38, 33),
        "border1": (88, 77, 58), "border2": (129, 111, 77),
        "muted": (147, 141, 127), "soft": (192, 184, 164),
        "text": (232, 226, 210),
        "accent": (190, 161, 104), "bright": (222, 195, 135),
    },
    "wolfs-moon": {
        "mode": "dark",
        "bg0": (7, 11, 13), "bg1": (11, 17, 21),
        "bg2": (17, 26, 31), "bg3": (24, 36, 42),
        "border1": (83, 82, 69), "border2": (123, 108, 72),
        "muted": (133, 145, 148), "soft": (179, 187, 184),
        "text": (226, 228, 219),
        "accent": (190, 163, 105), "bright": (222, 196, 137),
    },
}

def original_rgb_from_hex(token):
    return tuple(int(token[i:i+2], 16) for i in (0, 2, 4))

def rgb_to_hsv_deg(rgb):
    r, g, b = (v / 255 for v in rgb)
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    return h * 360, s, v

def luminance(rgb):
    r, g, b = rgb
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def themed_colour(original, p):
    y = luminance(original)
    h, s, _ = rgb_to_hsv_deg(original)

    is_red = (h <= 18 or h >= 342) and s >= 0.30 and original[0] > 80
    is_green = 70 <= h <= 165 and s >= 0.22 and original[1] > 70
    is_blue = 185 <= h <= 245 and s >= 0.28 and original[2] > 90

    if is_red:
        return (151, 58, 53) if p["mode"] == "light" else (207, 103, 94)
    if is_green:
        return (49, 108, 67) if p["mode"] == "light" else (119, 172, 123)
    if is_blue:
        return (55, 91, 135) if p["mode"] == "light" else (112, 145, 190)

    if p["mode"] == "light":
        if y < 15:
            return p["bg0"]
        if y < 25:
            return p["bg1"]
        if y < 45:
            return p["bg2"]
        if y < 78:
            return p["bg3"]
        if y < 115:
            return p["border1"]
        if y < 150:
            if 18 <= h <= 65 and s >= 0.20:
                return p["accent"]
            return p["muted"]
        if y < 190:
            if 18 <= h <= 65 and s >= 0.18:
                return p["bright"]
            return p["soft"]
        if y < 220:
            return p["soft"]
        return p["text"]

    if y < 15:
        return p["bg0"]
    if y < 25:
        return p["bg1"]
    if y < 45:
        return p["bg2"]
    if y < 78:
        return p["bg3"]
    if y < 115:
        return p["border1"]
    if y < 150:
        if 18 <= h <= 65 and s >= 0.18:
            return p["accent"]
        return p["muted"]
    if y < 190:
        if 18 <= h <= 65 and s >= 0.16:
            return p["bright"]
        return p["soft"]
    if y < 220:
        return p["soft"]
    return p["text"]

def declarations_for_palette(p):
    lines = []
    for token in colour_tokens:
        value = themed_colour(original_rgb_from_hex(token), p)
        lines.append(
            f"  --sep-colour-{token}: {value[0]} {value[1]} {value[2]};"
        )
    for rs, gs, bs in rgb_tokens:
        value = themed_colour((int(rs), int(gs), int(bs)), p)
        lines.append(
            f"  --sep-rgb-{rs}-{gs}-{bs}: {value[0]} {value[1]} {value[2]};"
        )
    return "\n".join(lines)

rich_css = [
    "",
    MARKER,
    "/*",
    " * Rich semantic palettes. Moonlit / Kareshi Night is intentionally",
    " * left untouched as the reference skin.",
    " */",
]

for slug, palette in PALETTES.items():
    rich_css.append(
        f'''html[data-portal-skin="{slug}"],
body[data-portal-skin="{slug}"],
[data-portal-skin="{slug}"] {{
{declarations_for_palette(palette)}
}}'''
    )

rich_css.append(r'''
.portal-skin-atmosphere[data-atmosphere="starfall"] .portal-star {
  background: rgb(239 211 139) !important;
  box-shadow:
    0 0 5px rgb(239 199 105 / 0.72),
    0 0 13px rgb(201 157 67 / 0.32) !important;
}

.portal-skin-atmosphere[data-atmosphere="starfall"] .portal-shooting-star {
  background:
    linear-gradient(
      to left,
      rgb(239 211 139 / 0.92),
      rgb(201 157 67 / 0.28),
      transparent
    ) !important;
}
''')

new_themes = (
    texts[THEMES].rstrip()
    + "\n\n"
    + "\n\n".join(rich_css)
    + "\n"
)

# ---------------------------------------------------------------------
# 3. SWATCHES + SPECIAL-PANEL ACCENTS
# ---------------------------------------------------------------------

old_swatches = '''  sepulchria: {
    background: "#120f0d",
    accent: "#b68b4f",
  },
  vellum: {
    background: "#e7dcc2",
    accent: "#5d4930",
  },
  starfall: {
    background: "#080d1e",
    accent: "#758fd6",
  },
  "rose-nocturne": {
    background: "#1a0e18",
    accent: "#b36d8b",
  },
  "verdant-reliquary": {
    background: "#07140f",
    accent: "#4f9c70",
  },
  "amethyst-veil": {
    background: "#120b19",
    accent: "#9b6ac4",
  },
  moonlit: {
    background: "#090806",
    accent: "#b58a4c",
  },
  emberforge: {
    background: "#110b08",
    accent: "#c7773d",
  },
  deepwater: {
    background: "#071416",
    accent: "#4f969d",
  },
  "blood-court": {
    background: "#140708",
    accent: "#9d3744",
  },
  ashen: {
    background: "#0c2030",
    accent: "#9fd4ef",
  },
  "ivory-archive": {
    background: "#171615",
    accent: "#d1c6ad",
  },
  "aelari-dawn": {
    background: "#0f1f2e",
    accent: "#e7d9a8",
  },
  "dwarven-deep": {
    background: "#111517",
    accent: "#b37945",
  },
  "mortal-hearth": {
    background: "#242627",
    accent: "#aaa79d",
  },
  "wolfs-moon": {
    background: "#11191e",
    accent: "#9aaeb7",
  },
'''

new_swatches = '''  sepulchria: {
    background: "#120f0d",
    accent: "#b68b4f",
  },
  vellum: {
    background: "#dad0b9",
    accent: "#91652b",
  },
  starfall: {
    background: "#050916",
    accent: "#c99d43",
  },
  "rose-nocturne": {
    background: "#12070f",
    accent: "#be7b5b",
  },
  "verdant-reliquary": {
    background: "#050f0a",
    accent: "#b5964a",
  },
  "amethyst-veil": {
    background: "#0d0713",
    accent: "#bf9749",
  },
  moonlit: {
    background: "#090806",
    accent: "#b58a4c",
  },
  emberforge: {
    background: "#0e0805",
    accent: "#cf7e41",
  },
  deepwater: {
    background: "#040f11",
    accent: "#b8774c",
  },
  "blood-court": {
    background: "#110507",
    accent: "#c4974e",
  },
  ashen: {
    background: "#c6d7e0",
    accent: "#aa7c37",
  },
  "ivory-archive": {
    background: "#0c0c0b",
    accent: "#bea168",
  },
  "aelari-dawn": {
    background: "#dfdec2",
    accent: "#a37933",
  },
  "dwarven-deep": {
    background: "#c2b094",
    accent: "#a65f2e",
  },
  "mortal-hearth": {
    background: "#c2c2b8",
    accent: "#936035",
  },
  "wolfs-moon": {
    background: "#070b0d",
    accent: "#bea369",
  },
'''

if texts[GALLERY].count(old_swatches) != 1:
    raise SystemExit(
        "Portal skin swatch map did not match exactly once. Nothing changed."
    )
new_gallery = texts[GALLERY].replace(old_swatches, new_swatches, 1)

old_accents = '''  sepulchria: "#b68b4f",
  vellum: "#5d4930",
  starfall: "#758fd6",
  "rose-nocturne": "#b36d8b",
  "verdant-reliquary": "#4f9c70",
  "amethyst-veil": "#9b6ac4",
  moonlit: "#b58a4c",
  emberforge: "#c7773d",
  deepwater: "#4f969d",
  "blood-court": "#9d3744",
  ashen: "#9fd4ef",
  "ivory-archive": "#d1c6ad",
  "aelari-dawn": "#e7d9a8",
  "dwarven-deep": "#b37945",
  "mortal-hearth": "#aaa79d",
  "wolfs-moon": "#9aaeb7",
'''

new_accents = '''  sepulchria: "#b68b4f",
  vellum: "#91652b",
  starfall: "#c99d43",
  "rose-nocturne": "#be7b5b",
  "verdant-reliquary": "#b5964a",
  "amethyst-veil": "#bf9749",
  moonlit: "#b58a4c",
  emberforge: "#cf7e41",
  deepwater: "#b8774c",
  "blood-court": "#c4974e",
  ashen: "#aa7c37",
  "ivory-archive": "#bea168",
  "aelari-dawn": "#a37933",
  "dwarven-deep": "#a65f2e",
  "mortal-hearth": "#936035",
  "wolfs-moon": "#bea369",
'''

new_accents_by_file = {}
for path in ACCENT_FILES:
    count = texts[path].count(old_accents)
    if count != 1:
        raise SystemExit(
            f"Skin accent map: expected exactly 1 match in {path}, found {count}. "
            "Nothing changed."
        )
    new_accents_by_file[path] = texts[path].replace(
        old_accents, new_accents, 1
    )

# Atomic write phase after all validation.
COSMETIC.write_text(new_cosmetic, encoding="utf-8")
THEMES.write_text(new_themes, encoding="utf-8")
GALLERY.write_text(new_gallery, encoding="utf-8")
for path, content in new_accents_by_file.items():
    path.write_text(content, encoding="utf-8")

print("✓ Character-sheet transparency + skin overhaul applied for 2144a3e")
print("  Character sheet:")
print("    - Short/Profile/Inventory/Ledger/Trophies/Offgame/Log extra surfaces")
print("      now use 40% panel opacity (60% transparency) with a profile background")
print("    - Feats, Warping and Edit were deliberately excluded")
print("  Skins:")
print("    - Moonlit / Kareshi Night left untouched")
print("    - Vaskari / Starfall is now deep celestial blue + antique gold")
print("    - other dark skins now have contrasting metal accent families")
print("    - light skins now have distinct page/panel/inset levels and dark ink")
print("    - appearance swatches and special panel accents match the new palettes")
print(f"    - {len(colour_tokens)} colour tokens rebuilt per skin")
print("  Files changed:")
for path in paths:
    print(f"    - {path.relative_to(ROOT)}")
