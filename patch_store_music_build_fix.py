from pathlib import Path
import re

ROOT = Path.cwd()

admin_page = ROOT / "app/(portal)/admin/store/page.tsx"
player_page = ROOT / "app/(portal)/store/page.tsx"

for path in (admin_page, player_page):
    if not path.exists():
        raise SystemExit(f"Missing file: {path}")

# ------------------------------------------------------------
# 1) Admin Store: force music_tracks query to the REAL schema.
# ------------------------------------------------------------
text = admin_page.read_text(encoding="utf-8")

patterns = [
    r'\.from\("music_tracks"\)\s*\.select\("id,\s*slug,\s*name,\s*artist,\s*audio_url,\s*is_active,\s*sort_order"\)',
    r'\.from\("music_tracks"\)\s*\.select\("id,\s*slug,\s*name,\s*artist,\s*audio_url,\s*is_active,\s*is_personal_selectable,\s*sort_order"\)',
    r'\.from\("music_tracks"\)\s*\.select\("id,\s*track_key,\s*name,\s*description,\s*is_active,\s*sort_order"\)',
]

replacement = (
    '.from("music_tracks")\n'
    '      .select("id, track_key, name, description, is_active, is_personal_selectable, sort_order")'
)

replaced = False
for pattern in patterns:
    new_text, count = re.subn(pattern, replacement, text, count=1)
    if count:
        text = new_text
        replaced = True
        break

if not replaced:
    # Broader surgical fallback: replace the first music_tracks select only.
    new_text, count = re.subn(
        r'\.from\("music_tracks"\)\s*\.select\("[^"]+"\)',
        replacement,
        text,
        count=1,
    )
    if not count:
        raise SystemExit(
            "Could not find the music_tracks select in admin Store page."
        )
    text = new_text

# Remove any lingering Store references to columns that do not exist.
text = text.replace("track.artist", "track.name")
text = text.replace("track.audio_url", "track.track_key")
text = text.replace("track.slug", "track.track_key")

admin_page.write_text(text, encoding="utf-8")
print("Admin Store music query: fixed")

# ------------------------------------------------------------
# 2) Player Store: remove lingering artist references.
# ------------------------------------------------------------
text = player_page.read_text(encoding="utf-8")

# Ensure MusicTrack matches the existing table usage.
text = re.sub(
    r'type MusicTrack = \{\s*id: string;\s*name: string;\s*artist: string;\s*\};',
    'type MusicTrack = {\n  id: string;\n  name: string;\n};',
    text,
    count=1,
    flags=re.S,
)

# Replace any artist-aware music name map with plain existing track name.
text = re.sub(
    r'const musicNames = new Map\(\s*musicTracks\.map\(\(track\) => \[\s*track\.id,\s*track\.artist\s*\?\s*`\$\{track\.name\} · \$\{track\.artist\}`\s*:\s*track\.name,\s*\]\),\s*\);',
    'const musicNames = new Map(\n    musicTracks.map((track) => [track.id, track.name]),\n  );',
    text,
    count=1,
    flags=re.S,
)

# Direct fallback for any remaining artist references.
text = re.sub(
    r'track\.artist\s*\?\s*`\$\{track\.name\} · \$\{track\.artist\}`\s*:\s*track\.name',
    'track.name',
    text,
)

# Ensure player query does not request artist.
text = text.replace(
    '.select("id, name, artist")',
    '.select("id, name")',
)

player_page.write_text(text, encoding="utf-8")
print("Player Store artist references: fixed")

print("""
DONE.

Now run:
npm run build
""")
