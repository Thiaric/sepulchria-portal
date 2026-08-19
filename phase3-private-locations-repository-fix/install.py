from pathlib import Path

ROOT = Path.cwd()
if not (ROOT / 'package.json').exists():
    raise SystemExit('ERROR: Run this from the root of sepulchria-portal.')

def replace_once(rel, old, new, label):
    path = ROOT / rel
    if not path.exists():
        raise SystemExit(f'ERROR: Missing {rel}')
    text = path.read_text(encoding='utf-8')
    if new in text:
        print(f'SKIP: {label} already installed')
        return
    if old not in text:
        raise SystemExit(f'ERROR: Could not find expected code for {label} in {rel}. Send me this exact error.')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')
    print(f'OK: {label}')

replace_once('app/(portal)/private-location/actions.ts', '  if (existing) {\n    return existing.room_id as string;\n  }', '  if (existing) {\n    const {\n      error: ownerMembershipError,\n    } = await admin\n      .from("private_location_members")\n      .upsert(\n        {\n          room_id: existing.room_id,\n          character_id: character.id,\n          role: "owner",\n          status: "active",\n          updated_at:\n            new Date().toISOString(),\n        },\n        {\n          onConflict:\n            "room_id,character_id",\n        },\n      );\n\n    if (ownerMembershipError) {\n      throw new Error(\n        `Unable to repair Private Location ownership: ${ownerMembershipError.message}`,\n      );\n    }\n\n    return existing.room_id as string;\n  }', 'repair existing owner membership')
replace_once('app/(portal)/private-location/page.tsx', '  const accessible =\n    (memberships ?? [])\n      .map((row) => {', '  let accessible =\n    (memberships ?? [])\n      .map((row) => {', 'make accessible Private Locations list mutable')
replace_once('app/(portal)/private-location/page.tsx', '      })\n      .filter(Boolean) as Array<{\n        room: {\n          id: string;\n          name: string;\n          description: string | null;\n          image_url: string | null;\n        };\n        role: string;\n      }>;', '      })\n      .filter(Boolean)\n      .filter(\n        (entry) =>\n          entry?.role !== "owner" ||\n          ownerEnabled,\n      ) as Array<{\n        room: {\n          id: string;\n          name: string;\n          description: string | null;\n          image_url: string | null;\n        };\n        role: string;\n      }>;', "hide disabled owner's room from accessible list")
replace_once('app/(portal)/private-location/page.tsx', '    ownedRoom =\n      roomResult.data;\n\n    theme =\n      themeResult.data;', '    ownedRoom =\n      roomResult.data;\n\n    if (\n      ownedRoom &&\n      !accessible.some(\n        (entry) =>\n          entry.room.id ===\n          ownedRoom?.id,\n      )\n    ) {\n      accessible = [\n        {\n          room: ownedRoom,\n          role: "owner",\n        },\n        ...accessible,\n      ];\n    }\n\n    theme =\n      themeResult.data;', 'guarantee verified owner room appears as accessible')
replace_once('components/portal/portal-sidebar.tsx', '        supabase\n          .from("private_location_members")\n          .select("room_id")\n          .eq(\n            "character_id",\n            character.id,\n          )\n          .eq("status", "active")\n          .limit(1)\n          .maybeSingle(),', '        supabase\n          .from("private_location_members")\n          .select("room_id, role")\n          .eq(\n            "character_id",\n            character.id,\n          )\n          .eq("status", "active")\n          .eq("role", "member")\n          .limit(1)\n          .maybeSingle(),', 'sidebar counts only invitee membership')
replace_once('components/portal/portal-sidebar.tsx', '      setHasPrivateLocationAccess(\n        entitlementResult.data?.enabled === true ||\n        Boolean(membershipResult.data) ||\n        Boolean(invitationResult.data),\n      );', '      setHasPrivateLocationAccess(\n        entitlementResult.data?.enabled === true ||\n        Boolean(membershipResult.data),\n      );', 'pending invitation no longer exposes sidebar link')

print()
print('SUCCESS: repository-based Private Location fixes installed.')
print('Now run: npm run build')