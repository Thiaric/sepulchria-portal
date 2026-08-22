from pathlib import Path
import re

ROOT = Path.cwd()

atmosphere = ROOT / "components/portal/portal-skin-atmosphere.tsx"
themes = ROOT / "app/portal-themes.css"
sql_file = ROOT / "supabase/add-active-ancestry-skins.sql"

for path in (atmosphere, themes):
    if not path.exists():
        raise SystemExit(f"Missing required file: {path}")

if sql_file.exists():
    raise SystemExit(
        "supabase/add-active-ancestry-skins.sql already exists. "
        "Patch stopped rather than overwriting it."
    )

atmo = atmosphere.read_text(encoding="utf-8")
theme_text = themes.read_text(encoding="utf-8")

# Repair renamed existing skin slugs.
replacements = {
    'if (value === "rose") return "rose";':
        'if (value === "rose-nocturne") return "rose";',
    'if (value === "verdant") return "verdant";':
        'if (value === "verdant-reliquary") return "verdant";',
    'if (value === "amethyst") return "amethyst";':
        'if (value === "amethyst-veil") return "amethyst";',
    'if (value === "water") return "water";':
        'if (value === "deepwater") return "water";',
    'if (value === "ember") return "ember";':
        'if (value === "emberforge") return "ember";',
    'if (value === "blood") return "blood";':
        'if (value === "blood-court") return "blood";',
    'if (value === "ivory") return "ivory";':
        'if (value === "ivory-archive") return "ivory";',
}

for old, new in replacements.items():
    if old not in atmo:
        raise SystemExit(
            f"Atmosphere mapping anchor not found: {old}\n"
            "Repository differs from the analysed version. Nothing changed."
        )
    atmo = atmo.replace(old, new, 1)

moonlit_anchor = '  if (value === "moonlit") return "moonlit";'
if moonlit_anchor not in atmo:
    raise SystemExit("Moonlit mapping anchor not found. Nothing changed.")

new_mappings = '''  if (value === "aelari-dawn") return "starfall";
  if (value === "dwarven-deep") return "ashen";
  if (value === "mortal-hearth") return "ember";
  if (value === "wolfs-moon") return "moonlit";'''

atmo = atmo.replace(
    moonlit_anchor,
    moonlit_anchor + "\n" + new_mappings,
    1,
)

# Generate complete variable maps from the CURRENT theme file.
# This adds only new selectors; existing skins are untouched.
marker = "/* Active ancestry skins added 2026-08-22 */"
if marker in theme_text:
    raise SystemExit("Ancestry skin CSS already exists. Nothing changed.")

hex_vars = sorted(set(re.findall(
    r"--sep-colour-([0-9a-fA-F]{6})\s*:",
    theme_text,
)))

rgb_vars = sorted(set(re.findall(
    r"--sep-rgb-(\d{1,3})-(\d{1,3})-(\d{1,3})\s*:",
    theme_text,
)))

if len(hex_vars) < 50:
    raise SystemExit(
        f"Only found {len(hex_vars)} sep-colour variables. "
        "Theme architecture differs from expected. Nothing changed."
    )

def luminance(rgb):
    r, g, b = [c / 255.0 for c in rgb]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def interpolate(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

def map_palette(rgb, anchors):
    y = max(0.0, min(1.0, luminance(rgb)))
    pos = y * (len(anchors) - 1)
    lo = int(pos)
    hi = min(lo + 1, len(anchors) - 1)
    return interpolate(anchors[lo], anchors[hi], pos - lo)

PALETTES = {
    "aelari-dawn": [
        (5, 11, 17),
        (14, 29, 41),
        (48, 73, 88),
        (154, 169, 159),
        (232, 221, 185),
        (249, 244, 224),
    ],
    "dwarven-deep": [
        (5, 5, 5),
        (19, 18, 17),
        (52, 47, 42),
        (105, 78, 51),
        (177, 119, 61),
        (225, 198, 151),
    ],
    "mortal-hearth": [
        (10, 7, 5),
        (31, 21, 15),
        (73, 48, 30),
        (132, 92, 53),
        (196, 151, 88),
        (239, 218, 176),
    ],
    "wolfs-moon": [
        (5, 7, 8),
        (14, 18, 20),
        (39, 49, 51),
        (82, 98, 99),
        (154, 168, 168),
        (222, 228, 224),
    ],
}

def selector(slug):
    return (
        f'html[data-portal-skin="{slug}"],\n'
        f'body[data-portal-skin="{slug}"],\n'
        f'[data-portal-skin="{slug}"]'
    )

blocks = [marker]

for slug, palette in PALETTES.items():
    lines = [selector(slug) + " {"]

    for key in hex_vars:
        source = tuple(int(key[i:i+2], 16) for i in (0, 2, 4))
        mapped = map_palette(source, palette)
        lines.append(
            f"  --sep-colour-{key}: "
            f"{mapped[0]} {mapped[1]} {mapped[2]};"
        )

    for r, g, b in rgb_vars:
        source = (int(r), int(g), int(b))
        mapped = map_palette(source, palette)
        lines.append(
            f"  --sep-rgb-{r}-{g}-{b}: "
            f"{mapped[0]} {mapped[1]} {mapped[2]};"
        )

    lines.append("}")
    blocks.append("\n".join(lines))

theme_text = theme_text.rstrip() + "\n\n" + "\n\n".join(blocks) + "\n"

sql = '''-- Active ancestry portal skins.
-- Inactive ancestries intentionally omitted:
-- Half-Aelari, Half-Vaskari, Nephilim.

insert into public.portal_skins (
  slug,
  name,
  description,
  preview_image_url,
  price_pence,
  is_default,
  is_active,
  sort_order
)
values
  (
    'aelari-dawn',
    'Aelari''s Dawn',
    'Luminous ivory, pale gold and cool sky-blue inspired by the Aelari.',
    null,
    null,
    false,
    true,
    200
  ),
  (
    'dwarven-deep',
    'Dwarven Deep',
    'Black stone, iron, bronze and forge-red inspired by the Dwarves.',
    null,
    null,
    false,
    true,
    210
  ),
  (
    'mortal-hearth',
    'Mortal Hearth',
    'Warm earth, old gold and firelit cream inspired by Humanity.',
    null,
    null,
    false,
    true,
    220
  ),
  (
    'wolfs-moon',
    'Wolf''s Moon',
    'Charcoal, cold grey and moon-silver inspired by the Werewolves.',
    null,
    null,
    false,
    true,
    230
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  preview_image_url = excluded.preview_image_url,
  price_pence = excluded.price_pence,
  is_default = excluded.is_default,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;
'''

# Write only after every check has passed.
atmosphere.write_text(atmo, encoding="utf-8")
themes.write_text(theme_text, encoding="utf-8")
sql_file.write_text(sql, encoding="utf-8")

print("Updated components/portal/portal-skin-atmosphere.tsx")
print("Updated app/portal-themes.css")
print("Created supabase/add-active-ancestry-skins.sql")
print("")
print("Added active ancestry skins:")
print("  Aelari     -> Aelari's Dawn")
print("  Dwarves    -> Dwarven Deep")
print("  Humans     -> Mortal Hearth")
print("  Werewolves -> Wolf's Moon")
print("")
print("Inactive ancestries skipped:")
print("  Half-Aelari, Half-Vaskari, Nephilim")
print("")
print("Atmosphere assignments:")
print("  Aelari's Dawn -> Starfall-style twinkling")
print("  Dwarven Deep  -> Ashen-style rising ash")
print("  Mortal Hearth -> Ember-style embers")
print("  Wolf's Moon   -> Moonlit-style faint glow")
print("")
print("Also repaired the renamed existing skin atmosphere mappings.")
print("No existing skin CSS block was removed or rewritten.")
print("No weather, maps, sidebars, header, location-image or status code was touched.")
print("")
print("NEXT:")
print("1. Run this patch.")
print("2. Run supabase/add-active-ancestry-skins.sql in Supabase.")
print("3. npm run build")
