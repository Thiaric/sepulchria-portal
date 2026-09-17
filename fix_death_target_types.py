from pathlib import Path
import re
import sys

path = Path("app/(portal)/game/actions.ts")

if not path.exists():
    print("ERROR: Run this from the sepulchria-portal repository root.")
    sys.exit(1)

text = path.read_text(encoding="utf-8")
original = text

pattern = re.compile(
    r'''(?P<indent>[ \t]*)\{\s*
(?P=indent)[ \t]+id:\s*character\.id,\s*
(?P=indent)[ \t]+displayName:\s*character\.display_name,\s*
(?P=indent)[ \t]+isSelf:\s*true,\s*
(?P=indent)\}''',
    re.MULTILINE,
)

matches = list(pattern.finditer(text))

if not matches:
    if "lifeState: character.life_state" in text and "diedAt: character.died_at" in text:
        print("Nothing to do: all matching self-target blocks already contain death state.")
        sys.exit(0)

    print("ERROR: Could not find the remaining self-target block in game/actions.ts.")
    print("No files were changed.")
    sys.exit(1)

def repl(match: re.Match) -> str:
    indent = match.group("indent")
    inner = indent + "  "
    return (
        f"{indent}{{\n"
        f"{inner}id: character.id,\n"
        f"{inner}displayName: character.display_name,\n"
        f"{inner}isSelf: true,\n"
        f"{inner}lifeState: character.life_state,\n"
        f"{inner}diedAt: character.died_at,\n"
        f"{indent}}}"
    )

text = pattern.sub(repl, text)

backup = path.with_suffix(path.suffix + ".before-death-target-fix")
backup.write_text(original, encoding="utf-8")
path.write_text(text, encoding="utf-8", newline="\n")

print(f"SUCCESS: patched {len(matches)} remaining self-target block(s).")
print(f"Backup: {backup}")
print("Now run: npm run build")
