from pathlib import Path
import re

ROOT = Path.cwd()
path = ROOT / "app/(portal)/store/page.tsx"

if not path.exists():
    raise SystemExit(f"Missing file: {path}")

text = path.read_text(encoding="utf-8")
original = text

# Fix the accidental column leak:
# is_personal_selectable belongs to music_tracks, NOT store_products.
pattern = re.compile(
    r'(\.from\("store_products"\)\s*\.select\(\s*")([^"]*)("\s*\))',
    re.S,
)

match = pattern.search(text)
if not match:
    raise SystemExit("Could not find the store_products select in player Store page.")

columns = match.group(2)
cleaned = re.sub(
    r'\s*,?\s*is_personal_selectable\s*,?',
    lambda m: ", " if "," in m.group(0) else "",
    columns,
)
cleaned = re.sub(r',\s*,', ',', cleaned)
cleaned = re.sub(r'\s+,', ',', cleaned)
cleaned = re.sub(r',\s*$', '', cleaned.strip())
cleaned = re.sub(r'^\s*,', '', cleaned)

text = (
    text[:match.start(2)]
    + cleaned
    + text[match.end(2):]
)

# Ensure music_tracks still has is_personal_selectable available for its filter.
music_pattern = re.compile(
    r'(\.from\("music_tracks"\)\s*\.select\(\s*")([^"]*)("\s*\))',
    re.S,
)
music_match = music_pattern.search(text)

if not music_match:
    raise SystemExit("Could not find the music_tracks select in player Store page.")

music_columns = music_match.group(2)

if "is_personal_selectable" not in music_columns:
    music_columns = music_columns.rstrip()
    if music_columns:
        music_columns += ", is_personal_selectable"
    else:
        music_columns = "is_personal_selectable"

    text = (
        text[:music_match.start(2)]
        + music_columns
        + text[music_match.end(2):]
    )

if text == original:
    print("No changes needed: Store queries are already correct.")
else:
    path.write_text(text, encoding="utf-8")
    print("Fixed player Store queries:")
    print("- removed is_personal_selectable from store_products")
    print("- ensured is_personal_selectable is selected from music_tracks")

print("Now run: npm run build")
