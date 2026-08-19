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
        raise SystemExit(f'ERROR: Expected code not found for {label} in {rel}. Send me this exact error.')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')
    print(f'OK: {label}')

replace_once('components/portal/portal-header.tsx', '            <ActiveCityCounter\n              initialCount={onlineCharacterCount}\n              isStaff={\n                staffSession !== null\n              }\n            />', '            <ActiveCityCounter\n              initialCount={onlineCharacterCount}\n              isStaff={\n                staffSession !== null\n              }\n              visiblePrivateRoomIds={\n                context.privateLocations.map(\n                  (location) =>\n                    location.roomId,\n                )\n              }\n            />', 'pass authorised Private Locations to People in Sepulchria')
replace_once('components/portal/active-city-counter.tsx', 'type ActiveCityCounterProps = {\n  initialCount: number;\n  isStaff: boolean;\n};', 'type ActiveCityCounterProps = {\n  initialCount: number;\n  isStaff: boolean;\n  visiblePrivateRoomIds: string[];\n};', 'People modal authorised-room prop type')
replace_once('components/portal/active-city-counter.tsx', 'export function ActiveCityCounter({\n  initialCount,\n  isStaff,\n}: ActiveCityCounterProps) {', 'export function ActiveCityCounter({\n  initialCount,\n  isStaff,\n  visiblePrivateRoomIds,\n}: ActiveCityCounterProps) {', 'People modal receives authorised rooms')
replace_once('components/portal/active-city-counter.tsx', '  const [\n    currentCharacterId,\n    setCurrentCharacterId,\n  ] = useState<string | null>(null);\n\n  const refreshPresence =', '  const [\n    currentCharacterId,\n    setCurrentCharacterId,\n  ] = useState<string | null>(null);\n\n  const visiblePrivateRoomIdSet =\n    useMemo(\n      () =>\n        new Set(\n          visiblePrivateRoomIds,\n        ),\n      [visiblePrivateRoomIds],\n    );\n\n  const refreshPresence =', 'People modal builds authorised Private Location set')
replace_once('components/portal/active-city-counter.tsx', '          const privateRoom =\n            roomArea?.slug ===\n            "private-locations";\n\n          const searchableText = [', '          const privateRoom =\n            roomArea?.slug ===\n            "private-locations";\n\n          const maySeePrivateRoom =\n            !privateRoom ||\n            isStaff ||\n            (\n              room !== null &&\n              visiblePrivateRoomIdSet.has(\n                room.id,\n              )\n            );\n\n          const searchableText = [', 'People modal calculates owner/invitee/staff visibility')
replace_once('components/portal/active-city-counter.tsx', '            privateRoom &&\n            !isStaff\n              ? null\n              : room?.name,', '            maySeePrivateRoom\n              ? room?.name\n              : null,', 'authorised owner/invitee can search Private Location name')
replace_once('components/portal/active-city-counter.tsx', '      presentCharacters,\n      searchQuery,\n      isStaff,\n    ]);', '      presentCharacters,\n      searchQuery,\n      isStaff,\n      visiblePrivateRoomIdSet,\n    ]);', 'People modal search visibility dependencies')
replace_once('components/portal/active-city-counter.tsx', '                    const privateRoom =\n                      roomArea?.slug ===\n                      "private-locations";\n\n                    const displayName =', '                    const privateRoom =\n                      roomArea?.slug ===\n                      "private-locations";\n\n                    const maySeePrivateRoom =\n                      !privateRoom ||\n                      isStaff ||\n                      (\n                        room !== null &&\n                        visiblePrivateRoomIdSet.has(\n                          room.id,\n                        )\n                      );\n\n                    const displayName =', 'People row calculates owner/invitee/staff visibility')
replace_once('components/portal/active-city-counter.tsx', '                              presence.room_id &&\n                              (\n                                !privateRoom ||\n                                isStaff\n                              ) ? (', '                              presence.room_id &&\n                              maySeePrivateRoom ? (', 'People modal restores Private Location name and Go for authorised characters')
replace_once('components/portal/live-dashboard-chronicle.tsx', '        if (\n          area?.slug ===\n            "private-locations" &&\n          !context.isStaff\n        ) {\n          continue;\n        }', '        if (\n          area?.slug ===\n            "private-locations" &&\n          !context.privateLocations.some(\n            (location) =>\n              location.roomId ===\n              room.id,\n          )\n        ) {\n          continue;\n        }', 'dashboard Private Location visibility uses authorised-room list')
replace_once('components/portal/live-dashboard-chronicle.tsx', '    }, [context.isStaff]);', '    }, [context.privateLocations]);', 'dashboard visibility tracks authorised Private Locations')

print()
print('SUCCESS: Owner/invitee Private Location visibility installed.')
print('Now run: npm run build')