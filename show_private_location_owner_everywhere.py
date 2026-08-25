from pathlib import Path

ROOT = Path.cwd()
ACCESS = ROOT / "lib/private-locations/access.ts"
TYPES = ROOT / "types/portal.ts"
PAGE = ROOT / "app/(portal)/private-locations/page.tsx"
CONTEXT = ROOT / "components/portal/portal-context-panel.tsx"

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were applied.")

for path in (ACCESS, TYPES, PAGE, CONTEXT):
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")

access = ACCESS.read_text(encoding="utf-8")
types = TYPES.read_text(encoding="utf-8")
page = PAGE.read_text(encoding="utf-8")
context = CONTEXT.read_text(encoding="utf-8")

old = '''export type VisiblePrivateLocation = {
  roomId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  role: "owner" | "member" | "staff";
};'''
new = '''export type VisiblePrivateLocation = {
  roomId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  ownerName: string;
  role: "owner" | "member" | "staff";
};'''
if old not in access:
    fail("Could not locate VisiblePrivateLocation type in access.ts")
access = access.replace(old, new, 1)

anchor = '''  const {
    data: entitlements,
    error: entitlementError,
  } = await admin
'''
insert = '''  const {
    data: ownerCharacters,
    error: ownerCharactersError,
  } = await admin
    .from("characters")
    .select(
      "id, display_name, first_name, surname",
    )
    .in("id", ownerIds);

  if (ownerCharactersError) {
    throw new Error(
      `Unable to load Private Location owners: ${ownerCharactersError.message}`,
    );
  }

  const ownerNameById = new Map(
    (ownerCharacters ?? []).map(
      (owner) => [
        owner.id,
        owner.display_name?.trim() ||
          `${owner.first_name ?? ""} ${owner.surname ?? ""}`.trim() ||
          "Unknown owner",
      ],
    ),
  );

  const {
    data: entitlements,
    error: entitlementError,
  } = await admin
'''
if anchor not in access:
    fail("Could not locate entitlement query anchor in access.ts")
access = access.replace(anchor, insert, 1)

repls = [
(
'''          imageUrl:
            room.image_url,
          role:
            "staff" as const,''',
'''          imageUrl:
            room.image_url,
          ownerName:
            ownerNameById.get(
              row.owner_character_id,
            ) ?? "Unknown owner",
          role:
            "staff" as const,'''
),
(
'''          imageUrl:
            room.image_url,
          role:
            "owner" as const,''',
'''          imageUrl:
            room.image_url,
          ownerName:
            ownerNameById.get(
              row.owner_character_id,
            ) ?? "Unknown owner",
          role:
            "owner" as const,'''
),
(
'''          imageUrl:
            room.image_url,
          role:
            "member" as const,''',
'''          imageUrl:
            room.image_url,
          ownerName:
            ownerNameById.get(
              row.owner_character_id,
            ) ?? "Unknown owner",
          role:
            "member" as const,'''
),
]
for before, after in repls:
    if before not in access:
        fail("Could not locate a private-location return shape")
    access = access.replace(before, after, 1)

old = '''export type PortalPrivateLocation = {
  roomId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  role: "owner" | "member" | "staff";
};'''
new = '''export type PortalPrivateLocation = {
  roomId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  ownerName: string;
  role: "owner" | "member" | "staff";
};'''
if old not in types:
    fail("Could not locate PortalPrivateLocation type")
types = types.replace(old, new, 1)

old = '''    .from("characters")
    .select("id")
    .eq("user_id", user.id)'''
new = '''    .from("characters")
    .select(
      "id, display_name, first_name, surname",
    )
    .eq("user_id", user.id)'''
if old not in page:
    fail("Could not locate viewer character query on private-locations page")
page = page.replace(old, new, 1)

old = '''        role: location.role,
      }),'''
new = '''        role: location.role,
        ownerName: location.ownerName,
      }),'''
if old not in page:
    fail("Could not locate visible-location mapping on private-locations page")
page = page.replace(old, new, 1)

old = '''          room: ownedRoom,
          role: "owner",
        },'''
new = '''          room: ownedRoom,
          role: "owner",
          ownerName: label(
            character as CharacterSummary,
          ),
        },'''
if old not in page:
    fail("Could not locate owned-room fallback mapping")
page = page.replace(old, new, 1)

old = '''            ({ room, role }) => ('''
new = '''            ({ room, ownerName }) => ('''
if old not in page:
    fail("Could not locate private-location card destructuring")
page = page.replace(old, new, 1)

old = '''                    <span className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-8e795c))]">
                      {role}
                    </span>'''
new = '''                    <span className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-8e795c))]">
                      Owner · {ownerName}
                    </span>'''
if old not in page:
    fail("Could not locate private-location card role label")
page = page.replace(old, new, 1)

old = '''                  <p className="mt-1 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-75644f))]">
                    {location.role}
                  </p>'''
new = '''                  <p className="mt-1 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-75644f))]">
                    Owner · {location.ownerName}
                  </p>'''
if old not in context:
    fail("Could not locate Private Locations context role label")
context = context.replace(old, new, 1)

required = {
    ACCESS: ["ownerName: string;", "ownerNameById", "Unable to load Private Location owners"],
    TYPES: ["ownerName: string;"],
    PAGE: ["Owner · {ownerName}", "ownerName: location.ownerName"],
    CONTEXT: ["Owner · {location.ownerName}"],
}
texts = {ACCESS: access, TYPES: types, PAGE: page, CONTEXT: context}

for path, markers in required.items():
    for marker in markers:
        if marker not in texts[path]:
            fail(f"Validation failed for {path.relative_to(ROOT)}: missing {marker}")

ACCESS.write_text(access, encoding="utf-8", newline="\n")
TYPES.write_text(types, encoding="utf-8", newline="\n")
PAGE.write_text(page, encoding="utf-8", newline="\n")
CONTEXT.write_text(context, encoding="utf-8", newline="\n")

print("PRIVATE LOCATION OWNER DISPLAY PATCH APPLIED")
print()
print("- /private-locations cards show Owner · <character>")
print("- Private Locations context list shows Owner · <character>")
print("- owner names come from private_location_rooms.owner_character_id")
print("- viewer role is no longer shown in those player-facing labels")
print()
print("Run: npm run build")
