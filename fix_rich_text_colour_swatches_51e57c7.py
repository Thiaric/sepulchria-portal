from pathlib import Path

path = Path("components/sepulchria/sep-ui-unified.css")

if not path.exists():
    raise SystemExit(
        "ERROR: components/sepulchria/sep-ui-unified.css was not found.\n"
        "Run this script from the root of the sepulchria-portal project."
    )

text = path.read_text(encoding="utf-8")
original = text

needle = 'button[class~="border"]:not([aria-label]),'
replacement = (
    'button[class~="border"]:not([aria-label])'
    ':not([style*="background-color"]),'
)

count = text.count(needle)
if count != 2:
    raise SystemExit(
        "ERROR: Expected to find the ordinary vocabulary button selector "
        f"exactly 2 times, but found {count}.\n"
        "The file does not match commit 51e57c7 closely enough; nothing was changed."
    )

text = text.replace(needle, replacement)

modal_needle = (
    'button[class~="border"]:not([aria-label]):not([class*="red-"]):not(\n'
    '    [class*="amber-"]'
)
modal_replacement = (
    'button[class~="border"]:not([aria-label])'
    ':not([style*="background-color"])'
    ':not([class*="red-"]):not(\n'
    '    [class*="amber-"]'
)

modal_count = text.count(modal_needle)
if modal_count != 1:
    raise SystemExit(
        "ERROR: Expected to find the modal vocabulary selector exactly once, "
        f"but found {modal_count}.\n"
        "Nothing was changed."
    )

text = text.replace(modal_needle, modal_replacement)

if text == original:
    raise SystemExit("ERROR: No changes were made.")

path.write_text(text, encoding="utf-8")

print("Done.")
print("Changed only: components/sepulchria/sep-ui-unified.css")
print("Rich-text Colour/Highlight swatches are now excluded from vocabulary background overrides.")
print("Toolbar buttons, dropdown frames, Default Colour, and other vocabulary styling are untouched.")
