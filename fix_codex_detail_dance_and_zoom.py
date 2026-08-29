from pathlib import Path
import sys

ROOT = Path.cwd()

HERO = ROOT / "components/codex/codex-entry-hero.tsx"
ZOOM = ROOT / "components/world/image-preview-button.tsx"


def fail(message):
    print(f"\nERROR: {message}")
    sys.exit(1)


def read(path):
    if not path.exists():
        fail(
            "Run this from the sepulchria-portal repository root. "
            f"Missing: {path.relative_to(ROOT)}"
        )
    return path.read_text(encoding="utf-8")


def write(path, text):
    path.write_text(text, encoding="utf-8")
    print(f"UPDATED: {path.relative_to(ROOT)}")


def main():
    print("Fixing Codex detail-page movement + hero zoom button...")
    print("No GitHub or Vercel operations are performed.\n")

    # ------------------------------------------------------------
    # 1. Stop full-entry pages from behaving like interactive cards.
    # ------------------------------------------------------------
    text = read(HERO)

    old_article = '<article className="space-y-5">'
    new_article = (
        '<article '
        'data-sep-interaction-ignore="true" '
        'className="space-y-5">'
    )

    if old_article in text:
        text = text.replace(
            old_article,
            new_article,
            1,
        )
    elif new_article not in text:
        fail(
            "Could not find the CodexEntryHero outer article."
        )

    write(HERO, text)

    # ------------------------------------------------------------
    # 2. Make the full-entry magnifier genuinely circular.
    #
    # sep-ui-unified.css targets button[class~="border"][aria-label]
    # and applies border-radius: 0 !important.
    #
    # Using border-[1px] + border-solid keeps the exact same border
    # visually but means the button no longer has an exact `border`
    # class, so rounded-full is no longer overridden.
    # ------------------------------------------------------------
    text = read(ZOOM)

    old_zoom = (
        'className="absolute right-3 top-3 z-30 flex h-9 w-9 '
        'cursor-zoom-in items-center justify-center rounded-full border '
    )

    new_zoom = (
        'className="absolute right-3 top-3 z-30 flex h-9 w-9 '
        'cursor-zoom-in items-center justify-center rounded-full '
        'border-[1px] border-solid '
    )

    if old_zoom in text:
        text = text.replace(
            old_zoom,
            new_zoom,
            1,
        )
    elif new_zoom not in text:
        fail(
            "Could not find the full-entry ImagePreviewButton zoom class."
        )

    write(ZOOM, text)

    print("\nSUCCESS.")
    print("\nThis shared fix applies to full entries for:")
    print("  - Ancestries")
    print("  - Associations")
    print("  - Orders")
    print("\nChanges:")
    print("  - whole CodexEntryHero no longer tilts/moves with the mouse")
    print("  - hero magnifier no longer matches the global square-button CSS")
    print("  - magnifier keeps rounded-full and becomes genuinely circular")
    print("\nNow run:")
    print("  npm run build")


if __name__ == "__main__":
    main()
