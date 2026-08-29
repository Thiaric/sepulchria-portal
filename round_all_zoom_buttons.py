from pathlib import Path
import sys

ROOT = Path.cwd()

TARGETS = [
    ROOT / "components/world/image-preview-button.tsx",
    ROOT / "components/world/location-image-lightbox.tsx",
    ROOT / "components/codex/codex-entry-image-lightbox.tsx",
]


def fail(message):
    print(f"\nERROR: {message}")
    sys.exit(1)


def main():
    print("Rounding all boxed magnifying-glass controls...")
    print("No GitHub or Vercel operations are performed.\n")

    for path in TARGETS:
        if not path.exists():
            fail(
                "Run this from the sepulchria-portal repository root. "
                f"Missing: {path.relative_to(ROOT)}"
            )

        text = path.read_text(
            encoding="utf-8",
        )

        original = text

        # Generic 9x9 zoom button.
        text = text.replace(
            'flex h-9 w-9 cursor-zoom-in items-center justify-center border',
            'flex h-9 w-9 cursor-zoom-in items-center justify-center rounded-full border',
        )

        # Hover zoom indicators in location / Codex images.
        text = text.replace(
            'flex h-8 w-8 items-center justify-center border',
            'flex h-8 w-8 items-center justify-center rounded-full border',
        )

        if text == original:
            # Already rounded is fine; otherwise flag unexpected file drift.
            if "rounded-full" not in text:
                fail(
                    f"Could not find boxed zoom control in {path.relative_to(ROOT)}"
                )

        path.write_text(
            text,
            encoding="utf-8",
        )

        print(
            f"UPDATED: {path.relative_to(ROOT)}"
        )

    print("\nSUCCESS.")
    print(
        "All boxed magnifying-glass controls are now circular."
    )
    print("\nNow run:")
    print("  npm run build")


if __name__ == "__main__":
    main()
