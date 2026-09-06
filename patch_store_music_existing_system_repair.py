from pathlib import Path
import re

ROOT = Path.cwd()

def load(path):
    if not path.exists():
        raise SystemExit(f"Missing file: {path}")
    return path.read_text(encoding="utf-8")

def save(path, text):
    path.write_text(text, encoding="utf-8")

# Admin Store page
page = ROOT / "app/(portal)/admin/store/page.tsx"
text = load(page)

for name in ("createMusicTrack", "deleteMusicTrack", "updateMusicTrack"):
    text = re.sub(rf'^\s*{name},\s*\n', '', text, flags=re.M)

text = re.sub(
    r'admin\.from\("music_tracks"\)\.select\("\*"\)\.order\("sort_order"\)\.order\("name"\)',
    'admin.from("music_tracks").select("id, track_key, name, description, is_active, is_personal_selectable, sort_order").order("sort_order").order("name")',
    text,
)

start = text.find('<section id="store-music"')
if start != -1:
    next_section = text.find('<section id="store-discounts"', start)
    if next_section == -1:
        raise SystemExit("Found Store music section but could not locate Store discounts section after it.")
    text = text[:start] + text[next_section:]

text = text.replace(
    'musicTracks.filter((x) => x.is_active).map((track) => (',
    'musicTracks.filter((x) => x.is_active && x.is_personal_selectable).map((track) => (',
)

text = text.replace(
    '{track.name}{track.artist ? ` · ${track.artist}` : ""}',
    '{track.name}',
)

save(page, text)
print("Admin Store: repaired to existing music_tracks schema")

# Admin Store actions
actions = ROOT / "app/(portal)/admin/store/actions.ts"
text = load(actions)

old_row = (
    '    portal_skin_id: grantType === "portal_skin" ? target : null,\n'
    '    cosmetic_item_id: grantType === "cosmetic" ? target : null,\n'
    '    feature_key: grantType === "feature" ? target : null,'
)
new_row = (
    '    portal_skin_id: grantType === "portal_skin" ? target : null,\n'
    '    cosmetic_item_id: grantType === "cosmetic" ? target : null,\n'
    '    music_track_id: grantType === "music" ? target : null,\n'
    '    feature_key: grantType === "feature" ? target : null,'
)
if old_row in text and new_row not in text:
    text = text.replace(old_row, new_row, 1)

text = re.sub(
    r'export async function createMusicTrack\(formData: FormData\) \{.*?(?=export async function createStoreDiscount)',
    '',
    text,
    flags=re.S,
)

save(actions, text)
print("Admin Store actions: repaired")

# Player Store
player = ROOT / "app/(portal)/store/page.tsx"
text = load(player)

text = text.replace(
    '.from("music_tracks")\n      .select("id, name, artist")',
    '.from("music_tracks")\n      .select("id, name")',
)

text = text.replace(
    '.eq("is_active", true)\n      .order("sort_order", { ascending: true })',
    '.eq("is_active", true)\n      .eq("is_personal_selectable", true)\n      .order("sort_order", { ascending: true })',
    1,
)

text = text.replace(
    'type MusicTrack = {\n  id: string;\n  name: string;\n  artist: string;\n};',
    'type MusicTrack = {\n  id: string;\n  name: string;\n};',
)

old_map = (
    '  const musicNames = new Map(\n'
    '    musicTracks.map((track) => [\n'
    '      track.id,\n'
    '      track.artist\n'
    '        ? `${track.name} · ${track.artist}`\n'
    '        : track.name,\n'
    '    ]),\n'
    '  );'
)
new_map = (
    '  const musicNames = new Map(\n'
    '    musicTracks.map((track) => [track.id, track.name]),\n'
    '  );'
)
if old_map in text:
    text = text.replace(old_map, new_map, 1)

save(player, text)
print("Player Store: repaired to existing music catalogue")

print("DONE")
