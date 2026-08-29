from pathlib import Path
import re
import sys

ROOT = Path.cwd()

OWN = ROOT / "app/(portal)/character/page.tsx"
PUBLIC = ROOT / "components/characters/public-character-profile.tsx"
DISPLAY = ROOT / "components/characters/character-display-trophies.tsx"


def fail(message):
    print(f"\nERROR: {message}")
    sys.exit(1)


def read(path):
    if not path.exists():
        fail(f"Missing file: {path}")
    return path.read_text(encoding="utf-8")


def write(path, text):
    path.write_text(text, encoding="utf-8")
    print(f"UPDATED: {path.relative_to(ROOT)}")


def patch_display():
    text = read(DISPLAY)
    text = text.replace(
        'className="ml-auto inline-flex flex-wrap items-center justify-end gap-1.5"',
        'className="inline-flex flex-wrap items-center justify-end gap-1.5"',
    )
    write(DISPLAY, text)


def patch_own():
    text = read(OWN)

    pattern = re.compile(
        r'<div className="mt-1 flex w-full flex-wrap items-center justify-between gap-2\.5">\s*'
        r'<h1 className="break-words font-serif text-3xl text-\[rgb\(var\(--sep-colour-ecd9b2\)\)\] sm:text-\[2\.15rem\]">\s*'
        r'\{character\.display_name\s*\?\?\s*"Unnamed character"\}\s*'
        r'</h1>\s*'
        r'\{character\.id \? \(\s*'
        r'<CharacterDisplayTrophies\s*characterId=\{character\.id\}\s*/>\s*'
        r'\) : null\}\s*'
        r'</div>',
        re.DOTALL,
    )

    match = pattern.search(text)
    if not match:
        fail("Could not find own-sheet name/Trophy header.")

    replacement = (
        '<div className="mt-1 grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4">\n'
        '                      <h1 className="min-w-0 break-words font-serif text-3xl text-[rgb(var(--sep-colour-ecd9b2))] sm:text-[2.15rem]">\n'
        '                        {character.display_name ??\n'
        '                          "Unnamed character"}\n'
        '                      </h1>\n\n'
        '                      {character.id ? (\n'
        '                        <div className="justify-self-end">\n'
        '                          <CharacterDisplayTrophies\n'
        '                            characterId={character.id}\n'
        '                          />\n'
        '                        </div>\n'
        '                      ) : null}\n'
        '                    </div>'
    )

    text = text[:match.start()] + replacement + text[match.end():]
    write(OWN, text)


def patch_public():
    text = read(PUBLIC)

    pattern = re.compile(
        r'<div className="mt-1 flex w-full flex-wrap items-center justify-between gap-2\.5">\s*'
        r'<h1 className="break-words font-serif text-3xl text-\[rgb\(var\(--sep-colour-ecd9b2\)\)\] sm:text-\[2\.15rem\]">\s*'
        r'\{fullName\}\s*'
        r'</h1>\s*'
        r'<CharacterDisplayTrophies\s*characterId=\{character\.id\}\s*/>\s*'
        r'</div>',
        re.DOTALL,
    )

    match = pattern.search(text)
    if not match:
        fail("Could not find public-sheet name/Trophy header.")

    replacement = (
        '<div className="mt-1 grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4">\n'
        '                    <h1 className="min-w-0 break-words font-serif text-3xl text-[rgb(var(--sep-colour-ecd9b2))] sm:text-[2.15rem]">\n'
        '                      {fullName}\n'
        '                    </h1>\n\n'
        '                    <div className="justify-self-end">\n'
        '                      <CharacterDisplayTrophies\n'
        '                        characterId={character.id}\n'
        '                      />\n'
        '                    </div>\n'
        '                  </div>'
    )

    text = text[:match.start()] + replacement + text[match.end():]
    write(PUBLIC, text)


def main():
    for path in (OWN, PUBLIC, DISPLAY):
        if not path.exists():
            fail(
                "Run this from the sepulchria-portal repository root. "
                f"Missing: {path.relative_to(ROOT)}"
            )

    print("Fixing Display Trophies alignment for real...")
    print("No GitHub or Vercel operations are performed.\n")

    patch_display()
    patch_own()
    patch_public()

    print("\nSUCCESS.")
    print("Run: npm run build")


if __name__ == "__main__":
    main()
