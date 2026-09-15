from pathlib import Path

ROOT = Path.cwd()
CHAR = ROOT / "app/(portal)/admin/characters/[id]/page.tsx"

if not CHAR.exists():
    raise SystemExit(f"ERROR: run from repo root; missing {CHAR}")

s = CHAR.read_text(encoding="utf-8")

query_old = '''        eligibility:gift_races(
          race_id
        )'''
query_new = '''        eligibility:gift_races(
          race_id,
          race:races(id, name)
        )'''

if query_old in s:
    s = s.replace(query_old, query_new, 1)
elif "race:races(id, name)" not in s:
    raise SystemExit("ERROR: ancestry eligibility query not found")

options_old = '''      choiceGroup:
        gift.ancestry_choice_group ?? null,
      raceIds: (gift.eligibility ?? []).map(
        (entry) => entry.race_id,
      ),
    })) satisfies AdminAncestryGiftOption[];'''

options_new = '''      choiceGroup:
        gift.ancestry_choice_group ?? null,
      raceIds: (gift.eligibility ?? []).map(
        (entry) => entry.race_id,
      ),
      raceNames: (gift.eligibility ?? [])
        .map((entry: any) => {
          const race = Array.isArray(entry.race)
            ? entry.race[0] ?? null
            : entry.race;
          return race?.name ?? null;
        })
        .filter(
          (name: string | null): name is string =>
            Boolean(name),
        ),
    })) satisfies AdminAncestryGiftOption[];'''

if "raceNames: (gift.eligibility ?? [])" not in s:
    if options_old not in s:
        raise SystemExit("ERROR: ancestryGiftOptions block not found")
    s = s.replace(options_old, options_new, 1)

CHAR.write_text(s, encoding="utf-8")

print("SUCCESS")
print("Fixed app/(portal)/admin/characters/[id]/page.tsx")
print("No backup created.")
