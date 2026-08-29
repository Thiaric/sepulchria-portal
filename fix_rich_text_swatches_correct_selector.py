from pathlib import Path

path = Path("components/sepulchria/sep-ui-unified.css")

if not path.exists():
    raise SystemExit(
        "ERROR: components/sepulchria/sep-ui-unified.css was not found.\n"
        "Run this script from the root of sepulchria-portal."
    )

text = path.read_text(encoding="utf-8")
original = text

# RichTextEditor colour/highlight swatches have BOTH:
# - class token "border"
# - aria-label
# - inline background-color
#
# Therefore they are matched by the vocabulary's aria-label/icon-button rule.
# Exclude only aria-label buttons carrying an explicit inline background colour.
needle = 'button[class~="border"][aria-label]:not(.portal-left-shell *):not('
replacement = (
    'button[class~="border"][aria-label]'
    ':not([style*="background-color"])'
    ':not(.portal-left-shell *):not('
)

count = text.count(needle)

if count != 2:
    raise SystemExit(
        "ERROR: Expected the icon-button vocabulary selector exactly 2 times "
        f"(normal + hover), but found {count}.\n"
        "Nothing was changed."
    )

text = text.replace(needle, replacement)

if text == original:
    raise SystemExit("ERROR: No changes were made.")

path.write_text(text, encoding="utf-8")

print("Done.")
print("Changed only: components/sepulchria/sep-ui-unified.css")
print("Excluded inline-colour aria-label buttons from the icon-button vocabulary rule.")
print("This targets the RichTextEditor Colour/Highlight swatches, including hover.")
