from pathlib import Path
import sys

ROOT = Path.cwd()

OWN_PAGE = ROOT / "app/(portal)/character/page.tsx"
PUBLIC_PROFILE = ROOT / "components/characters/public-character-profile.tsx"
MECHANICS = ROOT / "components/characters/character-mechanics-display.tsx"


def fail(message: str) -> None:
    print(f"\nERROR: {message}")
    sys.exit(1)


def read(path: Path) -> str:
    if not path.exists():
        fail(f"Missing file: {path}")
    return path.read_text(encoding="utf-8")


def write(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")
    print(f"UPDATED: {path.relative_to(ROOT)}")


def patch_trophy_alignment(path: Path) -> None:
    text = read(path)

    old = 'className="mt-1 flex flex-wrap items-center justify-between gap-2.5"'
    new = 'className="mt-1 flex w-full flex-wrap items-center justify-between gap-2.5"'

    if old in text:
        text = text.replace(old, new, 1)
    elif new not in text:
        fail(
            f"Could not find Trophy/name row in {path.relative_to(ROOT)}"
        )

    write(path, text)


def patch_mechanics_tooltip() -> None:
    text = read(MECHANICS)

    old_tooltip = (
        'className="pointer-events-none absolute bottom-full right-0 z-30 mb-2 '
        'hidden w-max max-w-[340px] border border-[rgb(var(--sep-colour-765937))]/70 '
        'bg-[rgb(var(--sep-colour-0b0806))] px-3 py-2 text-left shadow-xl '
        'group-hover:block group-focus-within:block"'
    )

    new_tooltip = (
        'className="pointer-events-none absolute bottom-full right-0 z-30 mb-2 '
        'hidden w-72 max-w-[calc(100vw-2rem)] border '
        'border-[rgb(var(--sep-colour-60482e))]/45 '
        'bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-left '
        'group-hover:block group-focus-within:block"'
    )

    if old_tooltip in text:
        text = text.replace(
            old_tooltip,
            new_tooltip,
            1,
        )
    elif 'w-72 max-w-[calc(100vw-2rem)]' not in text:
        fail(
            "Could not find the Attributes calculation tooltip container."
        )

    # The actual overflow culprit: both lines were forced to never wrap.
    text = text.replace(
        'className="block whitespace-nowrap text-[7px] uppercase leading-4 tracking-[0.08em] text-[rgb(var(--sep-colour-756958))]"',
        'className="block whitespace-normal break-words text-[7px] uppercase leading-4 tracking-[0.08em] text-[rgb(var(--sep-colour-756958))]"',
    )

    text = text.replace(
        'className="mt-0.5 block whitespace-nowrap text-[7px] uppercase leading-4 tracking-[0.08em] text-[rgb(var(--sep-colour-756958))]"',
        'className="mt-1 block whitespace-normal break-words text-[7px] uppercase leading-4 tracking-[0.08em] text-[rgb(var(--sep-colour-756958))]"',
    )

    write(MECHANICS, text)


def main() -> None:
    for path in (
        OWN_PAGE,
        PUBLIC_PROFILE,
        MECHANICS,
    ):
        if not path.exists():
            fail(
                "Run this from the sepulchria-portal repository root. "
                f"Missing: {path.relative_to(ROOT)}"
            )

    print("Fixing Trophy alignment + Warping tooltip overflow...")
    print("No GitHub or Vercel operations are performed.\n")

    patch_trophy_alignment(OWN_PAGE)
    patch_trophy_alignment(PUBLIC_PROFILE)
    patch_mechanics_tooltip()

    print("\nSUCCESS.")
    print("\nChanges:")
    print("  - Trophy/name row now spans full width")
    print("  - displayed Trophies can align fully right on public sheets")
    print("  - Attributes calculation tooltip now wraps")
    print("  - tooltip no longer runs outside its panel")
    print("  - tooltip styling uses the normal portal panel vocabulary")
    print("\nNow run: npm run build")


if __name__ == "__main__":
    main()
