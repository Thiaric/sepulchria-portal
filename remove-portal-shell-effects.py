from pathlib import Path

ROOT = Path.cwd()
path = ROOT / "app/globals.css"

if not path.exists():
    raise SystemExit("Missing app/globals.css")

css = path.read_text(encoding="utf-8")
original = css

markers = [
    "SEPULCHRIA PORTAL - ANIMATED SKIN SHELL EFFECTS V8",
    "SEPULCHRIA PORTAL - SKIN SHELL EFFECTS V7",
]

removed = []

for marker in markers:
    needle = "/* =========================================================\n   " + marker
    if needle in css:
        css = css.split(needle, 1)[0].rstrip() + "\n"
        removed.append(marker)

if not removed:
    raise SystemExit(
        "No shell-effects block was found in app/globals.css. "
        "Nothing was changed."
    )

path.write_text(css, encoding="utf-8")

print("Removed:")
for marker in removed:
    print(" -", marker)

print()
print("The header/sidebar data attributes are left in place because they are harmless")
print("and may be useful for future static styling, but all custom shell effects are gone.")
print("Run: npm run build")
