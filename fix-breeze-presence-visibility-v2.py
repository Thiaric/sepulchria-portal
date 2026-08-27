from pathlib import Path
import subprocess, re

BASE = '937d886751b040dbf8b832261e5a566626e6e53b'
root = Path.cwd()

def fail(message):
    print(f"ERROR: {message}")
    raise SystemExit(1)

head = subprocess.check_output(["git","rev-parse","HEAD"], cwd=root, text=True).strip()
if head != BASE:
    fail(f"This corrected patch was built on pushed master {BASE}, but local HEAD is {head}. No files were changed.")

paths = {
    "access": root / "lib/breeze-lodgings/access.ts",
    "context": root / "lib/portal/get-portal-context.ts",
    "types": root / "types/portal.ts",
    "header": root / "components/portal/portal-header.tsx",
    "counter": root / "components/portal/active-city-counter.tsx",
    "chronicle": root / "components/portal/live-dashboard-chronicle.tsx",
}

for path in paths.values():
    if not path.exists():
        fail(f"Missing required file: {path.relative_to(root)}. No files were changed.")

texts = {k: p.read_text(encoding="utf-8") for k,p in paths.items()}

if "getBreezeLodgingVisibility" in texts["access"]:
    fail("Breeze visibility helper already exists. No files were changed.")

pairs = {'chronicle': [('        if (\n'
                '          area?.slug ===\n'
                '            "private-locations" &&\n'
                '          !context.privateLocations.some(\n'
                '            (location) =>\n'
                '              location.roomId ===\n'
                '              room.id,\n'
                '          )\n'
                '        ) {\n'
                '          continue;\n'
                '        }',
                '        if (\n'
                '          area?.slug ===\n'
                '            "private-locations" &&\n'
                '          !context.isStaff &&\n'
                '          !context.privateLocations.some(\n'
                '            (location) =>\n'
                '              location.roomId ===\n'
                '              room.id,\n'
                '          ) &&\n'
                '          !context.visibleBreezeLodgingRoomIds.includes(\n'
                '            room.id,\n'
                '          )\n'
                '        ) {\n'
                '          continue;\n'
                '        }'),
               ('      context.privateLocations,\n'
                '      context.allOrderHeadquartersRoomIds,\n'
                '      context.visibleOrderHeadquartersRoomIds,\n'
                '      context.isStaff,\n'
                '    ]);',
                '      context.privateLocations,\n'
                '      context.allOrderHeadquartersRoomIds,\n'
                '      context.visibleOrderHeadquartersRoomIds,\n'
                '      context.visibleBreezeLodgingRoomIds,\n'
                '      context.isStaff,\n'
                '    ]);')],
 'context': [('import {\n  getOrderHeadquartersVisibility,\n} from "@/lib/order-headquarters/access";',
              'import {\n'
              '  getOrderHeadquartersVisibility,\n'
              '} from "@/lib/order-headquarters/access";\n'
              'import {\n'
              '  getBreezeLodgingVisibility,\n'
              '} from "@/lib/breeze-lodgings/access";'),
             ('    let visibleOrderHeadquartersRoomIds:\n      string[] = [];',
              '    let visibleOrderHeadquartersRoomIds:\n'
              '      string[] = [];\n'
              '\n'
              '    let visibleBreezeLodgingRoomIds:\n'
              '      string[] = [];'),
             ('      const [\n        visiblePrivateResult,\n        headquartersVisibility,\n        roomAccess,',
              '      const [\n'
              '        visiblePrivateResult,\n'
              '        headquartersVisibility,\n'
              '        breezeLodgingVisibility,\n'
              '        roomAccess,'),
             ('        getOrderHeadquartersVisibility(\n          characterId,\n        ),\n        roomAccessPromise,',
              '        getOrderHeadquartersVisibility(\n'
              '          characterId,\n'
              '        ),\n'
              '        getBreezeLodgingVisibility(\n'
              '          characterId,\n'
              '        ),\n'
              '        roomAccessPromise,'),
             ('      visibleOrderHeadquartersRoomIds =\n        headquartersVisibility.visibleRoomIds;\n\n      if (roomAccess) {',
              '      visibleOrderHeadquartersRoomIds =\n'
              '        headquartersVisibility.visibleRoomIds;\n'
              '\n'
              '      visibleBreezeLodgingRoomIds =\n'
              '        breezeLodgingVisibility.visibleRoomIds;\n'
              '\n'
              '      if (roomAccess) {'),
             ('        allOrderHeadquartersRoomIds,\n        visibleOrderHeadquartersRoomIds,\n      };',
              '        allOrderHeadquartersRoomIds,\n'
              '        visibleOrderHeadquartersRoomIds,\n'
              '        visibleBreezeLodgingRoomIds,\n'
              '      };'),
             ('      allOrderHeadquartersRoomIds,\n      visibleOrderHeadquartersRoomIds,\n    };',
              '      allOrderHeadquartersRoomIds,\n      visibleOrderHeadquartersRoomIds,\n      visibleBreezeLodgingRoomIds,\n    };')],
 'counter': [('  allOrderHeadquartersRoomIds: string[];\n  visibleOrderHeadquartersRoomIds: string[];\n};',
              '  allOrderHeadquartersRoomIds: string[];\n'
              '  visibleOrderHeadquartersRoomIds: string[];\n'
              '  visibleBreezeLodgingRoomIds: string[];\n'
              '};'),
             ('  visiblePrivateRoomIds,\n  allOrderHeadquartersRoomIds,\n  visibleOrderHeadquartersRoomIds,\n}: ActiveCityCounterProps) {',
              '  visiblePrivateRoomIds,\n'
              '  allOrderHeadquartersRoomIds,\n'
              '  visibleOrderHeadquartersRoomIds,\n'
              '  visibleBreezeLodgingRoomIds,\n'
              '}: ActiveCityCounterProps) {'),
             ('  const visibleOrderHeadquartersRoomIdSet =\n'
              '    useMemo(\n'
              '      () =>\n'
              '        new Set(\n'
              '          visibleOrderHeadquartersRoomIds,\n'
              '        ),\n'
              '      [visibleOrderHeadquartersRoomIds],\n'
              '    );\n'
              '\n'
              '  const refreshPresence =',
              '  const visibleOrderHeadquartersRoomIdSet =\n'
              '    useMemo(\n'
              '      () =>\n'
              '        new Set(\n'
              '          visibleOrderHeadquartersRoomIds,\n'
              '        ),\n'
              '      [visibleOrderHeadquartersRoomIds],\n'
              '    );\n'
              '\n'
              '  const visibleBreezeLodgingRoomIdSet =\n'
              '    useMemo(\n'
              '      () =>\n'
              '        new Set(\n'
              '          visibleBreezeLodgingRoomIds,\n'
              '        ),\n'
              '      [visibleBreezeLodgingRoomIds],\n'
              '    );\n'
              '\n'
              '  const refreshPresence ='),
             ('      visiblePrivateRoomIdSet,\n      allOrderHeadquartersRoomIdSet,\n      visibleOrderHeadquartersRoomIdSet,\n    ]);',
              '      visiblePrivateRoomIdSet,\n'
              '      allOrderHeadquartersRoomIdSet,\n'
              '      visibleOrderHeadquartersRoomIdSet,\n'
              '      visibleBreezeLodgingRoomIdSet,\n'
              '    ]);')],
 'header': [('              visibleOrderHeadquartersRoomIds={\n'
             '                context.visibleOrderHeadquartersRoomIds\n'
             '              }\n'
             '            />',
             '              visibleOrderHeadquartersRoomIds={\n'
             '                context.visibleOrderHeadquartersRoomIds\n'
             '              }\n'
             '              visibleBreezeLodgingRoomIds={\n'
             '                context.visibleBreezeLodgingRoomIds\n'
             '              }\n'
             '            />')],
 'types': [('  allOrderHeadquartersRoomIds: string[];\n  visibleOrderHeadquartersRoomIds: string[];\n};',
            '  allOrderHeadquartersRoomIds: string[];\n'
            '  visibleOrderHeadquartersRoomIds: string[];\n'
            '  visibleBreezeLodgingRoomIds: string[];\n'
            '};')]}

for key, replacements in pairs.items():
    for old, new in replacements:
        if texts[key].count(old) != 1:
            fail(f"Anchor mismatch in {paths[key].relative_to(root)}. No files were changed.")

new = dict(texts)
new["access"] = new["access"].rstrip() + '\nexport type BreezeLodgingVisibility = {\n  allRoomIds: string[];\n  visibleRoomIds: string[];\n};\n\nexport async function getBreezeLodgingVisibility(\n  characterId: string,\n): Promise<BreezeLodgingVisibility> {\n  const admin = createPrivilegedClient();\n  await admin.rpc("expire_breeze_lodging_rentals");\n\n  const { data: lodgingRooms, error: lodgingRoomsError } = await admin\n    .from("breeze_lodging_rooms")\n    .select("room_id");\n\n  if (lodgingRoomsError) {\n    throw new Error(`Unable to load Breeze Lodgings rooms: ${lodgingRoomsError.message}`);\n  }\n\n  const allRoomIds = [...new Set((lodgingRooms ?? []).map((row) => String(row.room_id)))];\n  const staff = await getStaffSession();\n\n  if (staff) {\n    return { allRoomIds, visibleRoomIds: allRoomIds };\n  }\n\n  const now = new Date().toISOString();\n\n  const { data: ownedRentals, error: ownedRentalsError } = await admin\n    .from("breeze_lodging_rentals")\n    .select("room_id")\n    .eq("owner_character_id", characterId)\n    .eq("status", "active")\n    .gt("ends_at", now);\n\n  if (ownedRentalsError) {\n    throw new Error(`Unable to load owned Breeze Lodgings rooms: ${ownedRentalsError.message}`);\n  }\n\n  const { data: guestRows, error: guestRowsError } = await admin\n    .from("breeze_lodging_guests")\n    .select("rental:breeze_lodging_rentals!breeze_lodging_guests_rental_id_fkey(room_id,status,ends_at)")\n    .eq("character_id", characterId)\n    .eq("status", "active");\n\n  if (guestRowsError) {\n    throw new Error(`Unable to load Breeze Lodgings guest visibility: ${guestRowsError.message}`);\n  }\n\n  const visible = new Set((ownedRentals ?? []).map((rental) => String(rental.room_id)));\n\n  for (const row of guestRows ?? []) {\n    const relation = Array.isArray(row.rental) ? row.rental[0] ?? null : row.rental;\n\n    if (\n      relation &&\n      relation.status === "active" &&\n      relation.ends_at &&\n      relation.ends_at > now\n    ) {\n      visible.add(String(relation.room_id));\n    }\n  }\n\n  return { allRoomIds, visibleRoomIds: [...visible] };\n}\n' + "\n"

for key, replacements in pairs.items():
    for old, repl in replacements:
        new[key] = new[key].replace(old, repl, 1)

pattern = re.compile(r'visibleOrderHeadquartersRoomIdSet\.has\(\s*room\.id,?\s*\)')
matches = list(pattern.finditer(new["counter"]))
if not matches:
    fail("Could not locate ActiveCityCounter Order HQ visibility checks. No files were changed.")

extra = ' ||\n                visibleBreezeLodgingRoomIdSet.has(\n                  room.id,\n                )'
new["counter"] = pattern.sub(lambda m: m.group(0) + extra, new["counter"])

for key, needle in [
    ("context","visibleBreezeLodgingRoomIds"),
    ("types","visibleBreezeLodgingRoomIds"),
    ("header","visibleBreezeLodgingRoomIds"),
    ("counter","visibleBreezeLodgingRoomIdSet"),
    ("chronicle","visibleBreezeLodgingRoomIds"),
]:
    if needle not in new[key]:
        fail(f"Internal validation failed for {paths[key].relative_to(root)}. No files were changed.")

for key, path in paths.items():
    path.write_text(new[key], encoding="utf-8")

print("Breeze Lodgings presence visibility patch applied successfully.")
print("ActiveCityCounter access checks extended:", len(matches))
print("Changed files:")
for key in ["access","context","types","header","counter","chronicle"]:
    print(" -", paths[key].relative_to(root))
print("No SQL is required.")
print("Next: npm run build")
