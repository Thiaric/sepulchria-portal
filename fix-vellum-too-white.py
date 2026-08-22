from pathlib import Path
import re

ROOT = Path.cwd()
path = ROOT / "app/globals.css"

if not path.exists():
    raise SystemExit("Missing app/globals.css")

css = path.read_text(encoding="utf-8")

marker = "SEPULCHRIA PORTAL - VELLUM LIGHT SKIN V9"
needle = "/* =========================================================\n   " + marker

if needle not in css:
    raise SystemExit(
        "Could not find the existing Vellum V9 skin block."
    )

# Keep everything before Vellum, then rebuild Vellum as a LIGHT PARCHMENT skin,
# not an almost-white one.
before = css.split(needle, 1)[0].rstrip()

# Re-read the original token names from the file before the Vellum block.
hex_pattern = re.compile(
    r"--sep-colour-([0-9a-fA-F]{6}):\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3});"
)
rgb_pattern = re.compile(
    r"--sep-rgb-(\d{1,3})-(\d{1,3})-(\d{1,3}):\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3});"
)

hex_tokens = {}
for match in hex_pattern.finditer(before):
    key = match.group(1).lower()
    hex_tokens[key] = tuple(
        int(key[i:i+2], 16)
        for i in (0, 2, 4)
    )

rgb_tokens = {}
for match in rgb_pattern.finditer(before):
    key = (
        int(match.group(1)),
        int(match.group(2)),
        int(match.group(3)),
    )
    rgb_tokens[key] = key

if not hex_tokens:
    raise SystemExit("No portal colour tokens found.")

def luminance(rgb):
    r, g, b = [c / 255 for c in rgb]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def parchment_transform(rgb):
    r, g, b = rgb
    y = luminance(rgb)

    # Preserve obviously semantic state colours (green/red/etc).
    mx = max(rgb)
    mn = min(rgb)
    sat = 0 if mx == 0 else (mx - mn) / mx

    if sat > 0.48:
        # green
        if g > r * 1.25 and g > b * 1.15:
            return rgb
        # red
        if r > g * 1.4 and r > b * 1.35:
            return rgb

    # True parchment hierarchy:
    # darkest original panels -> medium-light parchment
    if y < 0.08:
        return (224, 214, 194)

    # secondary dark surfaces -> slightly lighter parchment
    if y < 0.18:
        return (232, 222, 204)

    # borders / muted dark accents -> tan / antique brown
    if y < 0.38:
        return (151, 128, 94)

    # mid-tone decorative accents -> deep brown
    if y < 0.62:
        return (91, 72, 50)

    # original light/gold text -> charcoal brown
    if y < 0.82:
        return (58, 48, 39)

    # brightest text/highlights -> near-black warm ink
    return (37, 32, 27)

lines = [
    "",
    "/* =========================================================",
    f"   {marker}",
    "   Warm parchment light skin — deliberately NOT white.",
    "   ========================================================= */",
    "",
    '[data-portal-skin="vellum"] {',
]

for key, rgb in sorted(hex_tokens.items()):
    nr, ng, nb = parchment_transform(rgb)
    lines.append(
        f"  --sep-colour-{key}: {nr} {ng} {nb};"
    )

for key in sorted(rgb_tokens):
    nr, ng, nb = parchment_transform(key)
    lines.append(
        f"  --sep-rgb-{key[0]}-{key[1]}-{key[2]}: {nr} {ng} {nb};"
    )

lines += [
    '  --portal-font-body: "Trebuchet MS", ui-sans-serif, system-ui, sans-serif;',
    '  --portal-font-display: Georgia, "Times New Roman", serif;',
    "  --portal-skin-radius: 0px;",
    "  --portal-navigation-icon-filter: grayscale(1) sepia(0.36) saturate(1.05) brightness(0.42) contrast(1.2);",
    "",
    "  --portal-map-hotspot-fill: rgba(92, 76, 54, 0.07);",
    "  --portal-map-hotspot-fill-active: rgba(115, 91, 56, 0.21);",
    "  --portal-map-hotspot-stroke: rgba(93, 72, 44, 0.92);",
    "  --portal-map-hotspot-stroke-active: rgba(43, 35, 27, 1);",
    "  --portal-map-hotspot-glow: drop-shadow(0 0 2px rgba(236, 224, 199, 0.72));",
    "  --portal-map-hotspot-glow-active: drop-shadow(0 0 4px rgba(244, 235, 215, 0.88)) drop-shadow(0 0 9px rgba(89, 67, 40, 0.38));",
    "  --portal-map-hotspot-missing-fill: rgba(229, 220, 202, 0.08);",
    "  --portal-map-hotspot-missing-stroke: rgba(81, 70, 57, 0.62);",
    "  --portal-map-hotspot-missing-glow: drop-shadow(0 0 2px rgba(236, 224, 199, 0.40));",
    "}",
    "",
    # Main canvas: clearly light, but visibly parchment.
    '[data-portal-skin="vellum"] body,',
    'html[data-portal-skin="vellum"] body {',
    "  background: rgb(218 207 187) !important;",
    "  color: rgb(48 41 34) !important;",
    "}",
    "",
    # Shell slightly darker than central content to retain structure.
    '[data-portal-skin="vellum"] [data-portal-header],',
    '[data-portal-skin="vellum"] [data-portal-navigation],',
    '[data-portal-skin="vellum"] [data-portal-right-sidebar] {',
    "  background-color: rgba(216, 205, 184, 0.98) !important;",
    "}",
    "",
    '[data-portal-skin="vellum"] main[data-portal-column] {',
    "  background-color: rgb(230 220 201) !important;",
    "}",
    "",
    '[data-portal-skin="vellum"] :where(input, select, textarea) {',
    "  background-color: rgb(238 229 212) !important;",
    "  color: rgb(43 37 31) !important;",
    "}",
    "",
    '[data-portal-skin="vellum"] ::placeholder {',
    "  color: rgb(112 96 77) !important;",
    "}",
    "",
    '[data-portal-skin="vellum"] :where(button, input, select, textarea, article, section, aside, nav, dialog, [role="dialog"]) {',
    "  border-radius: 0 !important;",
    "}",
    "",
    # Keep magnifier circular regardless of any square-skin rule.
    "[data-map-magnifying-lens-button],",
    "[data-map-magnifying-lens-glass],",
    "[data-map-magnifying-lens-ring] {",
    "  border-radius: 9999px !important;",
    "}",
]

path.write_text(
    before + "\n" + "\n".join(lines) + "\n",
    encoding="utf-8",
)

print("Rebuilt Vellum as a warm parchment light skin.")
print("No SQL required.")
print("Run: npm run build")
