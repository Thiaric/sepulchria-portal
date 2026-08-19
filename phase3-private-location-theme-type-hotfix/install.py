from pathlib import Path

ROOT = Path.cwd()

if not (ROOT / "package.json").exists():
    raise SystemExit(
        "ERROR: Run this from the root of sepulchria-portal."
    )

PAGE = ROOT / "app/(portal)/private-locations/page.tsx"

if not PAGE.exists():
    raise SystemExit(
        "ERROR: Could not find app/(portal)/private-locations/page.tsx"
    )

text = PAGE.read_text(encoding="utf-8")

old = '''  let theme:
    | {
        background_colour: string;
        text_colour: string;
      }
    | null = null;'''

new = '''  let theme:
    | {
        background_colour: string;
        speech_colour: string;
        action_colour: string;
        system_colour: string;
        whisper_background_colour: string;
        whisper_text_colour: string;
        offgame_background_colour: string;
        offgame_text_colour: string;
      }
    | null = null;'''

if new in text:
    print("SKIP: theme type hotfix already installed.")
elif old in text:
    PAGE.write_text(
        text.replace(old, new, 1),
        encoding="utf-8",
    )
    print(
        "SUCCESS: Private Location theme type hotfix installed."
    )
else:
    raise SystemExit(
        "ERROR: Could not find the expected old theme type in "
        "app/(portal)/private-locations/page.tsx. "
        "Send me lines around the `let theme:` declaration."
    )

print("Now run: npm run build")
