from pathlib import Path

ROOT = Path.cwd()
if not (ROOT / 'package.json').exists():
    raise SystemExit('ERROR: Run this from the root of sepulchria-portal.')

def replace_once(rel, old, new, label, all_occurrences=False):
    path = ROOT / rel
    if not path.exists():
        raise SystemExit(f'ERROR: Missing {rel}')
    text = path.read_text(encoding='utf-8')
    if new in text:
        print(f'SKIP: {label} already installed')
        return
    if old not in text:
        raise SystemExit(f'ERROR: Expected code not found for {label} in {rel}. Send me this exact error.')
    if all_occurrences:
        text = text.replace(old, new)
    else:
        text = text.replace(old, new, 1)
    path.write_text(text, encoding='utf-8')
    print(f'OK: {label}')

# Extend the authoritative server helper.
access_path = ROOT / 'lib/private-locations/access.ts'
access_text = access_path.read_text(encoding='utf-8')
append_block = '\n\nexport type VisiblePrivateLocation = {\n  roomId: string;\n  name: string;\n  description: string | null;\n  imageUrl: string | null;\n  role: "owner" | "member" | "staff";\n};\n\nexport async function getVisiblePrivateLocations(\n  characterId: string,\n): Promise<VisiblePrivateLocation[]> {\n  const admin =\n    createPrivilegedClient();\n\n  const staff =\n    await getStaffSession();\n\n  const {\n    data: privateRows,\n    error: privateRowsError,\n  } = await admin\n    .from("private_location_rooms")\n    .select(\n      "room_id, owner_character_id",\n    );\n\n  if (privateRowsError) {\n    throw new Error(\n      `Unable to load Private Locations: ${privateRowsError.message}`,\n    );\n  }\n\n  if (\n    !privateRows ||\n    privateRows.length === 0\n  ) {\n    return [];\n  }\n\n  const ownerIds = [\n    ...new Set(\n      privateRows.map(\n        (row) =>\n          row.owner_character_id,\n      ),\n    ),\n  ];\n\n  const {\n    data: entitlements,\n    error: entitlementError,\n  } = await admin\n    .from(\n      "character_feature_entitlements",\n    )\n    .select("character_id, enabled")\n    .eq(\n      "feature_key",\n      "private_chat",\n    )\n    .in(\n      "character_id",\n      ownerIds,\n    );\n\n  if (entitlementError) {\n    throw new Error(\n      `Unable to load Private Location entitlements: ${entitlementError.message}`,\n    );\n  }\n\n  const enabledOwners =\n    new Set(\n      (entitlements ?? [])\n        .filter(\n          (entry) =>\n            entry.enabled === true,\n        )\n        .map(\n          (entry) =>\n            entry.character_id,\n        ),\n    );\n\n  const enabledPrivateRows =\n    privateRows.filter(\n      (row) =>\n        enabledOwners.has(\n          row.owner_character_id,\n        ),\n    );\n\n  if (\n    enabledPrivateRows.length === 0\n  ) {\n    return [];\n  }\n\n  const roomIds =\n    enabledPrivateRows.map(\n      (row) => row.room_id,\n    );\n\n  const {\n    data: rooms,\n    error: roomsError,\n  } = await admin\n    .from("rooms")\n    .select(\n      "id, name, description, image_url",\n    )\n    .in("id", roomIds)\n    .eq("is_active", true);\n\n  if (roomsError) {\n    throw new Error(\n      `Unable to load Private Location rooms: ${roomsError.message}`,\n    );\n  }\n\n  const roomById =\n    new Map(\n      (rooms ?? []).map(\n        (room) => [\n          room.id,\n          room,\n        ],\n      ),\n    );\n\n  let activeMemberRoomIds =\n    new Set<string>();\n\n  if (!staff) {\n    const {\n      data: memberships,\n      error: membershipError,\n    } = await admin\n      .from(\n        "private_location_members",\n      )\n      .select("room_id")\n      .eq(\n        "character_id",\n        characterId,\n      )\n      .eq("status", "active")\n      .eq("role", "member");\n\n    if (membershipError) {\n      throw new Error(\n        `Unable to load Private Location memberships: ${membershipError.message}`,\n      );\n    }\n\n    activeMemberRoomIds =\n      new Set(\n        (memberships ?? []).map(\n          (membership) =>\n            membership.room_id,\n        ),\n      );\n  }\n\n  return enabledPrivateRows\n    .map((row) => {\n      const room =\n        roomById.get(\n          row.room_id,\n        );\n\n      if (!room) {\n        return null;\n      }\n\n      if (staff) {\n        return {\n          roomId: room.id,\n          name: room.name,\n          description:\n            room.description,\n          imageUrl:\n            room.image_url,\n          role:\n            "staff" as const,\n        };\n      }\n\n      if (\n        row.owner_character_id ===\n        characterId\n      ) {\n        return {\n          roomId: room.id,\n          name: room.name,\n          description:\n            room.description,\n          imageUrl:\n            room.image_url,\n          role:\n            "owner" as const,\n        };\n      }\n\n      if (\n        activeMemberRoomIds.has(\n          room.id,\n        )\n      ) {\n        return {\n          roomId: room.id,\n          name: room.name,\n          description:\n            room.description,\n          imageUrl:\n            room.image_url,\n          role:\n            "member" as const,\n        };\n      }\n\n      return null;\n    })\n    .filter(\n      (\n        entry,\n      ): entry is VisiblePrivateLocation =>\n        entry !== null,\n    )\n    .sort((a, b) =>\n      a.name.localeCompare(\n        b.name,\n        "en",\n        {\n          sensitivity: "base",\n        },\n      ),\n    );\n}\n'
if 'export async function getVisiblePrivateLocations' not in access_text:
    access_path.write_text(access_text.rstrip() + '\n' + append_block, encoding='utf-8')
    print('OK: visible Private Locations server helper')
else:
    print('SKIP: visible Private Locations server helper already installed')

replace_once('types/portal.ts', 'export type PortalContext = {\n  user: {', 'export type PortalPrivateLocation = {\n  roomId: string;\n  name: string;\n  description: string | null;\n  imageUrl: string | null;\n  role: "owner" | "member" | "staff";\n};\n\nexport type PortalContext = {\n  user: {', 'Portal private location type', False)
replace_once('types/portal.ts', '  currentRoomAccessAllowed: boolean;\n};', '  currentRoomAccessAllowed: boolean;\n  isStaff: boolean;\n  privateLocations: PortalPrivateLocation[];\n};', 'Portal context staff/private locations fields', False)
replace_once('lib/portal/get-portal-context.ts', 'import {\n  getPrivateLocationAccess,\n} from "@/lib/private-locations/access";', 'import {\n  getPrivateLocationAccess,\n  getVisiblePrivateLocations,\n} from "@/lib/private-locations/access";\nimport {\n  getStaffSession,\n} from "@/lib/auth/require-staff";', 'portal context private visibility/staff imports', False)
replace_once('lib/portal/get-portal-context.ts', '    let currentRoomAccessAllowed =\n      true;\n\n    if (characterData) {', '    let currentRoomAccessAllowed =\n      true;\n\n    const staffSession =\n      await getStaffSession();\n\n    let privateLocations:\n      Awaited<\n        ReturnType<\n          typeof getVisiblePrivateLocations\n        >\n      > = [];\n\n    if (characterData) {', 'portal context staff/private list state', False)
replace_once('lib/portal/get-portal-context.ts', '      const characterId = character.id;\n\n      if (\n        character.current_room_id\n      ) {', '      const characterId = character.id;\n\n      privateLocations =\n        await getVisiblePrivateLocations(\n          characterId,\n        );\n\n      if (\n        character.current_room_id\n      ) {', 'load visible private locations into portal context', False)
replace_once('lib/portal/get-portal-context.ts', '      currentRoomAccessAllowed,\n    };', '      currentRoomAccessAllowed,\n      isStaff:\n        staffSession !== null,\n      privateLocations,\n    };', 'return staff/private locations in portal context', False)
replace_once('components/portal/portal-header.tsx', '            <ActiveCityCounter initialCount={onlineCharacterCount} />', '            <ActiveCityCounter\n              initialCount={onlineCharacterCount}\n              isStaff={\n                staffSession !== null\n              }\n            />', 'staff-aware People in Sepulchria modal', False)
replace_once('components/portal/active-city-counter.tsx', 'type ActiveCityCounterProps = {\n  initialCount: number;\n};', 'type ActiveCityCounterProps = {\n  initialCount: number;\n  isStaff: boolean;\n};', 'ActiveCityCounter staff prop type', False)
replace_once('components/portal/active-city-counter.tsx', 'export function ActiveCityCounter({\n  initialCount,\n}: ActiveCityCounterProps) {', 'export function ActiveCityCounter({\n  initialCount,\n  isStaff,\n}: ActiveCityCounterProps) {', 'ActiveCityCounter receives staff', False)
replace_once('components/portal/active-city-counter.tsx', '            privateRoom\n              ? null\n              : room?.name,', '            privateRoom &&\n            !isStaff\n              ? null\n              : room?.name,', 'staff can search private room names', False)
replace_once('components/portal/active-city-counter.tsx', '      presentCharacters,\n      searchQuery,\n    ]);', '      presentCharacters,\n      searchQuery,\n      isStaff,\n    ]);', 'staff dependency in presence search', False)
replace_once('components/portal/active-city-counter.tsx', '                              presence.room_id &&\n                              !privateRoom ? (', '                              presence.room_id &&\n                              (\n                                !privateRoom ||\n                                isStaff\n                              ) ? (', 'staff retains Go jump for private rooms', False)
replace_once('components/portal/live-dashboard-chronicle.tsx', '        if (\n          area?.slug ===\n          "private-locations"\n        ) {\n          continue;\n        }', '        if (\n          area?.slug ===\n            "private-locations" &&\n          !context.isStaff\n        ) {\n          continue;\n        }', 'dashboard Private Location cards visible to staff only', False)
replace_once('components/portal/live-dashboard-chronicle.tsx', '    }, []);', '    }, [context.isStaff]);', 'dashboard refresh uses staff visibility', False)
replace_once('components/portal/portal-sidebar.tsx', '  href: "/private-location",\n  activePaths: ["/private-location"],', '  href: "/private-locations",\n  activePaths: ["/private-locations"],', 'canonical Private Locations sidebar route', False)
replace_once('components/portal/portal-sidebar.tsx', 'type PortalSidebarProps = {\n  unreadMessageCount: number;\n  unreadForumCount: number;\n};', 'type PortalSidebarProps = {\n  unreadMessageCount: number;\n  unreadForumCount: number;\n  isStaff: boolean;\n};', 'sidebar staff prop type', False)
replace_once('components/portal/portal-sidebar.tsx', 'export function PortalSidebar({\n  unreadMessageCount,\n  unreadForumCount,\n}: PortalSidebarProps) {', 'export function PortalSidebar({\n  unreadMessageCount,\n  unreadForumCount,\n  isStaff,\n}: PortalSidebarProps) {', 'sidebar receives staff', False)
replace_once('components/portal/portal-sidebar.tsx', '      setHasPrivateLocationAccess(\n        entitlementResult.data?.enabled === true ||\n        Boolean(membershipResult.data),\n      );', '      setHasPrivateLocationAccess(\n        isStaff ||\n        entitlementResult.data?.enabled === true ||\n        Boolean(membershipResult.data),\n      );', 'staff always sees Private Locations sidebar link', False)
replace_once('components/portal/portal-sidebar.tsx', '    }, []);', '    }, [isStaff]);', 'private sidebar refresh tracks staff', False)
replace_once('app/(portal)/layout.tsx', '                  unreadForumCount={\n                    unreadForumCount\n                  }\n                />', '                  unreadForumCount={\n                    unreadForumCount\n                  }\n                  isStaff={\n                    context.isStaff\n                  }\n                />', 'layout passes staff to left sidebar', False)
replace_once('app/(portal)/game/page.tsx', '    <Link\n      href={`/areas/${roomArea.slug}`}\n      title="Return to the area page"\n      className="flex min-w-0 items-center justify-center border border-[#725c3d] bg-[#21190f] px-2 py-1.5 text-center text-[8px] uppercase tracking-[0.12em] text-[#d6bb8d] transition hover:border-[#a17a49] hover:bg-[#352718] hover:text-[#f0d6a7] sm:px-3 sm:text-[9px] sm:tracking-[0.18em]"\n    >\n      ← Back to {roomArea.name}\n    </Link>', '    <Link\n      href={\n        roomArea.slug ===\n        "private-locations"\n          ? "/private-locations"\n          : `/areas/${roomArea.slug}`\n      }\n      title={\n        roomArea.slug ===\n        "private-locations"\n          ? "Return to Private Locations"\n          : "Return to the area page"\n      }\n      className="flex min-w-0 items-center justify-center border border-[#725c3d] bg-[#21190f] px-2 py-1.5 text-center text-[8px] uppercase tracking-[0.12em] text-[#d6bb8d] transition hover:border-[#a17a49] hover:bg-[#352718] hover:text-[#f0d6a7] sm:px-3 sm:text-[9px] sm:tracking-[0.18em]"\n    >\n      ← Back to{" "}\n      {roomArea.slug ===\n      "private-locations"\n        ? "Private Locations"\n        : roomArea.name}\n    </Link>', 'Private Location Back buttons route correctly', True)
replace_once('app/(portal)/private-location/actions.ts', 'revalidatePath("/private-location");', 'revalidatePath("/private-locations");', 'canonical Private Locations revalidation paths', True)
replace_once('components/portal/portal-context-panel.tsx', 'import { GameContextPanel } from "@/components/portal/game-context-panel";', 'import { GameContextPanel } from "@/components/portal/game-context-panel";\nimport {\n  enterRoomFromMap,\n} from "@/app/(portal)/game/actions";', 'Private Locations context jump action import', False)
replace_once('components/portal/portal-context-panel.tsx', '  const areaMatch =\n    pathname.match(\n      /^\\/areas\\/([^/]+)$/,\n    );', '  if (\n    pathname ===\n    "/private-locations"\n  ) {\n    return (\n      <PrivateLocationsContext\n        context={context}\n      />\n    );\n  }\n\n  const areaMatch =\n    pathname.match(\n      /^\\/areas\\/([^/]+)$/,\n    );', 'move Private Locations context to canonical page', False)
replace_once('components/portal/portal-context-panel.tsx', 'function MessagesContext({\n  context,\n}: PortalContextPanelProps) {', '\nfunction PrivateLocationsContext({\n  context,\n}: PortalContextPanelProps) {\n  const locations =\n    context.privateLocations;\n\n  return (\n    <div className="flex h-full min-h-0 flex-col">\n      <ContextHeading\n        eyebrow="Invitation-only"\n        title="Private Locations"\n      />\n\n      <p className="text-[11px] leading-5 text-[#938673]">\n        {context.isStaff\n          ? "Enabled Private Locations. Staff may enter any listed room."\n          : "Private Locations currently available to your character."}\n      </p>\n\n      <div className="my-4 h-px bg-[#59432c]/35" />\n\n      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">\n        {locations.map(\n          (location) => (\n            <article\n              key={\n                location.roomId\n              }\n              className="border border-[#59432c]/40 bg-[#100c09] p-3"\n            >\n              <div className="flex items-start justify-between gap-3">\n                <div className="min-w-0">\n                  <p className="truncate font-serif text-sm text-[#d6bd91]">\n                    {location.name}\n                  </p>\n\n                  <p className="mt-1 text-[7px] uppercase tracking-[0.14em] text-[#75644f]">\n                    {location.role}\n                  </p>\n                </div>\n\n                <form\n                  action={\n                    enterRoomFromMap\n                  }\n                >\n                  <input\n                    type="hidden"\n                    name="roomId"\n                    value={\n                      location.roomId\n                    }\n                  />\n\n                  <button\n                    type="submit"\n                    title={`Enter ${location.name}`}\n                    aria-label={`Enter ${location.name}`}\n                    className="flex h-7 w-7 items-center justify-center border border-[#765937] bg-[#271c12] text-[10px] text-[#dfc79c] transition hover:border-[#997042] hover:bg-[#3b2919]"\n                  >\n                    →\n                  </button>\n                </form>\n              </div>\n            </article>\n          ),\n        )}\n\n        {locations.length ===\n        0 ? (\n          <p className="border border-[#59432c]/30 bg-[#100c09]/60 p-3 text-[11px] leading-5 text-[#8f8271]">\n            No enabled Private Locations\n            are currently available.\n          </p>\n        ) : null}\n      </div>\n    </div>\n  );\n}\n\nfunction MessagesContext({\n  context,\n}: PortalContextPanelProps) {', 'Private Locations right-side context navigator', False)

# Build canonical /private-locations page from the current management page.
source_page = ROOT / 'app/(portal)/private-location/page.tsx'
canonical_page = ROOT / 'app/(portal)/private-locations/page.tsx'
page_text = source_page.read_text(encoding='utf-8')

# Make the copied page import the existing server actions and authoritative visibility helper.
page_text = page_text.replace('} from "./actions";', '} from "../private-location/actions";', 1)
import_anchor = 'import {\n  createClient,\n} from "@/lib/supabase/server";'
visibility_import = import_anchor + '\nimport {\n  getVisiblePrivateLocations,\n} from "@/lib/private-locations/access";'
if 'getVisiblePrivateLocations' not in page_text:
    page_text = page_text.replace(import_anchor, visibility_import, 1)

old_access_block = '''  const {
    data: memberships,
    error: membershipError,
  } = await supabase
    .from("private_location_members")
    .select(`
      room_id,
      role,
      status,
      room:rooms(
        id,
        name,
        description,
        image_url
      )
    `)
    .eq(
      "character_id",
      character.id,
    )
    .eq("status", "active");

  if (membershipError) {
    throw new Error(
      membershipError.message,
    );
  }

  let accessible =
    (memberships ?? [])
      .map((row) => {
        const relation =
          row.room;

        const room =
          Array.isArray(relation)
            ? relation[0]
            : relation;

        return room
          ? {
              room,
              role: row.role,
            }
          : null;
      })
      .filter(Boolean)
      .filter(
        (entry) =>
          entry?.role !== "owner" ||
          ownerEnabled,
      ) as Array<{
        room: {
          id: string;
          name: string;
          description: string | null;
          image_url: string | null;
        };
        role: string;
      }>;'''

new_access_block = '''  const visibleLocations =
    await getVisiblePrivateLocations(
      character.id,
    );

  let accessible =
    visibleLocations.map(
      (location) => ({
        room: {
          id: location.roomId,
          name: location.name,
          description:
            location.description,
          image_url:
            location.imageUrl,
        },
        role: location.role,
      }),
    );'''

if old_access_block in page_text:
    page_text = page_text.replace(old_access_block, new_access_block, 1)
elif 'await getVisiblePrivateLocations' not in page_text:
    raise SystemExit('ERROR: Could not replace the Private Locations accessible-list block.')

canonical_page.parent.mkdir(parents=True, exist_ok=True)
canonical_page.write_text(page_text, encoding='utf-8')
print('OK: canonical /private-locations page')

# Keep old singular URL as a compatibility redirect only.
source_page.write_text('''import { redirect } from "next/navigation";\n\nexport default function LegacyPrivateLocationPage() {\n  redirect("/private-locations");\n}\n''', encoding='utf-8')
print('OK: /private-location now redirects to /private-locations')

print()
print('SUCCESS: Private Locations routing/staff/context fixes installed.')
print('Now run: npm run build')