from pathlib import Path
import re

ROOT = Path.cwd()
TARGET = ROOT / "components/world/atmospheric-image.tsx"

if not TARGET.exists():
    raise SystemExit("Missing components/world/atmospheric-image.tsx")

text = TARGET.read_text(encoding="utf-8")
original = text

rgba_pattern = re.compile(
    r'rgba\(\s*var\(\s*--sep-rgb-(\d+)-(\d+)-(\d+)\s*\)\s*,\s*([^)]+?)\s*\)'
)

rgb_pattern = re.compile(
    r'rgb\(\s*var\(\s*--sep-rgb-(\d+)-(\d+)-(\d+)\s*\)\s*\)'
)

rgba_count = 0
rgb_count = 0

def replace_rgba(match):
    global rgba_count
    rgba_count += 1
    r, g, b, alpha = match.groups()
    return f"rgba({r}, {g}, {b}, {alpha.strip()})"

def replace_rgb(match):
    global rgb_count
    rgb_count += 1
    r, g, b = match.groups()
    return f"rgb({r}, {g}, {b})"

text = rgba_pattern.sub(replace_rgba, text)
text = rgb_pattern.sub(replace_rgb, text)

if text == original:
    raise SystemExit(
        "Patch made no changes. The current atmospheric-image.tsx no longer "
        "contains skin RGB variables; stop and send me that file."
    )

guard = '''/*
 * IMPORTANT:
 * Atmospheric/weather effect colours are intentionally hardcoded below.
 * They are semantic world effects and MUST NOT be transformed by portal skins.
 */

'''
anchor = '"use client";\n\n'
if guard not in text and anchor in text:
    text = text.replace(anchor, anchor + guard, 1)

TARGET.write_text(text, encoding="utf-8")

print("Fixed:", TARGET)
print(f"Converted {rgba_count} rgba weather colours.")
print(f"Converted {rgb_count} rgb weather colours.")
print("")
print("This intentionally does NOT modify portal-themes.css.")
print("Weather effects are now skin-independent.")
print("")
print("Next run:")
print("  npm run build")
