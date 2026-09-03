from pathlib import Path
import sys

CSS = Path("components/sepulchria/sep-ui-unified.css")

BLOCK = r'''

/* ==================================================================
   DARK SKINS - RICH TEXT BOLD LEGIBILITY
   ==================================================================
   RichTextContent preserves <strong>/<b>, but does not assign an
   explicit weight. Pale skins already show enough visual separation
   with the browser's default bold rendering; light-on-dark skins do not.
   Keep the active skin colours untouched and strengthen weight only.
   ================================================================== */

:is(
  html[data-portal-skin="sepulchria"],
  body[data-portal-skin="sepulchria"],
  html[data-portal-skin="moonlit"],
  body[data-portal-skin="moonlit"],
  html[data-portal-skin="starfall"],
  body[data-portal-skin="starfall"],
  html[data-portal-skin="rose-nocturne"],
  body[data-portal-skin="rose-nocturne"],
  html[data-portal-skin="verdant-reliquary"],
  body[data-portal-skin="verdant-reliquary"],
  html[data-portal-skin="amethyst-veil"],
  body[data-portal-skin="amethyst-veil"],
  html[data-portal-skin="emberforge"],
  body[data-portal-skin="emberforge"],
  html[data-portal-skin="deepwater"],
  body[data-portal-skin="deepwater"],
  html[data-portal-skin="blood-court"],
  body[data-portal-skin="blood-court"],
  html[data-portal-skin="ivory-archive"],
  body[data-portal-skin="ivory-archive"]
) .rich-text-content :is(strong, b) {
  font-weight: 800 !important;
}
'''

def main():
    if not CSS.exists():
        raise RuntimeError(
            "Run this from the sepulchria-portal repository root."
        )

    text = CSS.read_text(encoding="utf-8")

    if "DARK SKINS - RICH TEXT BOLD LEGIBILITY" in text:
        print("Patch already applied.")
        return

    CSS.write_text(
        text.rstrip() + BLOCK + "\n",
        encoding="utf-8",
    )

    print("Patched:")
    print(" - components/sepulchria/sep-ui-unified.css")
    print()
    print("Effect:")
    print(" - Light skins unchanged")
    print(" - Dark skins: rich-text <strong>/<b> uses weight 800")
    print(" - No colour changes")
    print(" - No effect on buttons, navigation, chat, or non-rich-text content")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
