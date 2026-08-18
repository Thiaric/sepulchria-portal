from pathlib import Path
import shutil

ROOT = Path.cwd()
HERE = Path(__file__).resolve().parent
PAYLOAD = HERE / "payload"

if not (ROOT / "package.json").exists():
    raise SystemExit("ERROR: Run this from the sepulchria-portal repository root.")

for src in PAYLOAD.rglob("*"):
    if src.is_file():
        rel = src.relative_to(PAYLOAD)
        dest = ROOT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)

def swap(path, old, new, label):
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"ERROR: Could not find current block: {label}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")

game = ROOT / "app/(portal)/game/page.tsx"
swap(game,
'import RoomRealtime from "./components/RoomRealtime";\n',
'import RoomRealtime from "./components/RoomRealtime";\nimport { OddJobsPanel, type OddJobStateRow } from "./components/OddJobsPanel";\n',
"OddJobsPanel import")

swap(game,
'''type RoomRelation = {
  id: string;
  name: string;
  description: string | null;
''',
'''type RoomRelation = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
''',
"RoomRelation slug")

swap(game,
'''    .select(
  "id, name, description, image_url, area_id, areas(id,name,slug,description)",
)
''',
'''    .select(
  "id, name, slug, description, image_url, area_id, areas(id,name,slug,description)",
)
''',
"room slug select")

swap(game,
'''  const canViewAllWhispers =
    staffSession !== null;

  return (
''',
'''  const canViewAllWhispers =
    staffSession !== null;

  let oddJobs: OddJobStateRow[] = [];

  if (room.slug === "odd-jobs-bureau") {
    const { data: oddJobsData, error: oddJobsError } =
      await supabase.rpc("get_my_odd_jobs_state");

    if (oddJobsError) {
      throw new Error(`Unable to load Odd Jobs Bureau: ${oddJobsError.message}`);
    }

    oddJobs = (oddJobsData ?? []) as OddJobStateRow[];
  }

  return (
''',
"Odd Jobs state loader")

swap(game,
'''    <RoomMessageList
      roomId={room.id}
''',
'''    {room.slug === "odd-jobs-bureau" ? (
      <OddJobsPanel jobs={oddJobs} />
    ) : null}

    <RoomMessageList
      roomId={room.id}
''',
"Odd Jobs panel")

character = ROOT / "app/(portal)/character/page.tsx"
swap(character,
'import { CharacterInventoryDisplay } from "@/components/characters/character-inventory-display";\n',
'import { CharacterInventoryDisplay } from "@/components/characters/character-inventory-display";\nimport { CharacterRemnantsWallet } from "@/components/characters/character-remnants-wallet";\n',
"wallet import")

swap(character,
'''            {character.music_url ? (
              <div className="mt-4">
''',
'''            {own && character.id ? (
              <CharacterRemnantsWallet characterId={character.id} />
            ) : null}

            {character.music_url ? (
              <div className="mt-4">
''',
"wallet render")

admin = ROOT / "app/(portal)/admin/characters/[id]/page.tsx"
swap(admin,
'import { CharacterReviewFields } from "@/components/admin/character-review-fields";\n',
'import { CharacterReviewFields } from "@/components/admin/character-review-fields";\nimport { AdminCharacterRemnants } from "@/components/admin/admin-character-remnants";\n',
"admin wallet import")

swap(admin,
'''        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
''',
'''        <AdminCharacterRemnants characterId={character.id} />

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
''',
"admin wallet render")

print("SUCCESS")
print("Economy 1 app code installed.")
print("Run the SQL file in Supabase BEFORE testing.")
print("Then run: npm run build")
