from pathlib import Path
import subprocess, json

BASE = '40a4e3213dca5d9004afd970c668a6d30c1327ff'
FILES = {'panel': 'app/(portal)/game/components/BreezeLodgingsPanel.tsx', 'page': 'app/(portal)/game/page.tsx', 'access': 'lib/breeze-lodgings/access.ts'}
REPLACEMENTS = json.loads("{\"panel\": [[\"  viewer_is_staff: boolean;\\n  image_url: string | null;\", \"  viewer_is_staff: boolean;\\n  rented_by_name: string | null;\\n  image_url: string | null;\"], [\"                          {room.rented_by_me\\n                            ? \\\"Your room\\\"\\n                            : occupied\\n                              ? \\\"Occupied\\\"\\n                              : \\\"Available\\\"}\", \"                          {room.rented_by_me\\n                            ? \\\"Your room\\\"\\n                            : occupied\\n                              ? viewerIsStaff &&\\n                                room.rented_by_name\\n                                ? `Occupied by ${room.rented_by_name}`\\n                                : \\\"Occupied\\\"\\n                              : \\\"Available\\\"}\"]], \"page\": [[\"import {\\n  getBreezeLodgingManageData,\\n} from \\\"@/lib/breeze-lodgings/access\\\";\", \"import {\\n  getBreezeLodgingManageData,\\n  getBreezeLodgingStaffOccupants,\\n} from \\\"@/lib/breeze-lodgings/access\\\";\"], [\"  const breezeManageDataPromise =\\n    roomAreaIsBreezeBedroom(room)\\n      ? getBreezeLodgingManageData(\\n          room.id,\\n          character.id,\\n        )\\n      : Promise.resolve(null);\\n\\n  const [\", \"  const breezeManageDataPromise =\\n    roomAreaIsBreezeBedroom(room)\\n      ? getBreezeLodgingManageData(\\n          room.id,\\n          character.id,\\n        )\\n      : Promise.resolve(null);\\n\\n  const breezeStaffOccupantsPromise =\\n    room.slug ===\\n    \\\"the-breeze-lodgings\\\"\\n      ? getBreezeLodgingStaffOccupants()\\n      : Promise.resolve([]);\\n\\n  const [\"], [\"    breezeLodgingsResult,\\n    breezeManageData,\\n  ] = await Promise.all([\", \"    breezeLodgingsResult,\\n    breezeManageData,\\n    breezeStaffOccupants,\\n  ] = await Promise.all([\"], [\"    breezeLodgingsPromise,\\n    breezeManageDataPromise,\\n  ]);\", \"    breezeLodgingsPromise,\\n    breezeManageDataPromise,\\n    breezeStaffOccupantsPromise,\\n  ]);\"], [\"      \\\"image_url\\\" | \\\"is_outdoors\\\"\\n    >[];\", \"      \\\"image_url\\\" |\\n      \\\"is_outdoors\\\" |\\n      \\\"rented_by_name\\\"\\n    >[];\"], [\"  const breezeLodgings:\\n    BreezeLodgingStateRow[] =\\n    breezeLodgingsBase.map(\", \"  const breezeRenterNames =\\n    new Map(\\n      breezeStaffOccupants.map(\\n        (occupant) => [\\n          occupant.roomId,\\n          occupant.displayName,\\n        ],\\n      ),\\n    );\\n\\n  const breezeLodgings:\\n    BreezeLodgingStateRow[] =\\n    breezeLodgingsBase.map(\"], [\"          is_outdoors:\\n            roomImage?.is_outdoors ?? false,\\n        };\", \"          is_outdoors:\\n            roomImage?.is_outdoors ?? false,\\n          rented_by_name:\\n            breezeRenterNames.get(\\n              lodging.room_id,\\n            ) ?? null,\\n        };\"]]}")
HELPER = '\nexport type BreezeLodgingStaffOccupant = {\n  roomId: string;\n  displayName: string;\n};\n\nexport async function getBreezeLodgingStaffOccupants(): Promise<\n  BreezeLodgingStaffOccupant[]\n> {\n  const staff =\n    await getStaffSession();\n\n  if (!staff) {\n    return [];\n  }\n\n  const admin =\n    createPrivilegedClient();\n\n  await admin.rpc(\n    "expire_breeze_lodging_rentals",\n  );\n\n  const now =\n    new Date().toISOString();\n\n  const {\n    data: rentals,\n    error: rentalsError,\n  } = await admin\n    .from("breeze_lodging_rentals")\n    .select(\n      "room_id, owner_character_id",\n    )\n    .eq("status", "active")\n    .gt("ends_at", now);\n\n  if (rentalsError) {\n    throw new Error(\n      `Unable to load Breeze Lodgings occupants: ${rentalsError.message}`,\n    );\n  }\n\n  const ownerIds = [\n    ...new Set(\n      (rentals ?? []).map(\n        (rental) =>\n          rental.owner_character_id,\n      ),\n    ),\n  ];\n\n  if (ownerIds.length === 0) {\n    return [];\n  }\n\n  const {\n    data: characters,\n    error: charactersError,\n  } = await admin\n    .from("characters")\n    .select("id, display_name")\n    .in("id", ownerIds);\n\n  if (charactersError) {\n    throw new Error(\n      `Unable to load Breeze Lodgings renter names: ${charactersError.message}`,\n    );\n  }\n\n  const namesById =\n    new Map(\n      (characters ?? []).map(\n        (character) => [\n          character.id,\n          character.display_name,\n        ],\n      ),\n    );\n\n  return (rentals ?? [])\n    .map((rental) => {\n      const displayName =\n        namesById.get(\n          rental.owner_character_id,\n        );\n\n      if (!displayName) {\n        return null;\n      }\n\n      return {\n        roomId:\n          String(rental.room_id),\n        displayName:\n          String(displayName),\n      };\n    })\n    .filter(\n      (\n        occupant,\n      ): occupant is BreezeLodgingStaffOccupant =>\n        occupant !== null,\n    );\n}\n'
root = Path.cwd()

def fail(message):
    print("ERROR:", message)
    raise SystemExit(1)

def git_show(path):
    try:
        return subprocess.check_output(
            ["git", "show", f"{BASE}:{path}"],
            cwd=root,
            text=True,
            encoding="utf-8",
        )
    except subprocess.CalledProcessError as exc:
        fail(f"Could not read {path} from pushed master: {exc}")

head = subprocess.check_output(
    ["git", "rev-parse", "HEAD"],
    cwd=root,
    text=True,
).strip()

if head != BASE:
    fail(
        f"Local HEAD is {head}, but this patch is built against "
        f"latest pushed master {BASE}. No files were changed."
    )

texts = {key: git_show(path) for key, path in FILES.items()}

if "getBreezeLodgingStaffOccupants" in texts["access"]:
    fail("Staff renter-name helper already exists. No files were changed.")

texts["access"] = texts["access"].rstrip() + "\n" + HELPER + "\n"

for key, pairs in REPLACEMENTS.items():
    for old, new in pairs:
        count = texts[key].count(old)
        if count != 1:
            fail(
                f"Anchor mismatch in {FILES[key]}: expected 1, found {count}. "
                "No files were changed."
            )
        texts[key] = texts[key].replace(old, new, 1)

checks = {
    "panel": ["rented_by_name: string | null;", "Occupied by ${room.rented_by_name}"],
    "page": ["getBreezeLodgingStaffOccupants", "breezeStaffOccupantsPromise", "breezeRenterNames"],
    "access": ["export async function getBreezeLodgingStaffOccupants", "owner_character_id"],
}

for key, needles in checks.items():
    for needle in needles:
        if needle not in texts[key]:
            fail(
                f"Validation failed for {FILES[key]}; missing {needle!r}. "
                "No files were changed."
            )

for key, rel in FILES.items():
    (root / rel).write_text(texts[key], encoding="utf-8")

print("Patch applied successfully.")
print("Changed files:")
for rel in FILES.values():
    print(" -", rel)
print("Staff now see: Occupied by <Character Name>.")
print("Players still see the generic Occupied label.")
print("No SQL required.")
print("Next: npm run build")
