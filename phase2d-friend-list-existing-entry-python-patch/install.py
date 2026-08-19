from pathlib import Path

ROOT = Path.cwd()

if not (ROOT / 'package.json').exists():
    raise SystemExit('ERROR: Run this patch from the root of sepulchria-portal.')

def replace_once(rel_path, old, new, label):
    path = ROOT / rel_path
    if not path.exists():
        raise SystemExit(f'ERROR: Missing file: {rel_path}')
    text = path.read_text(encoding='utf-8')
    if new in text:
        print(f'SKIP: {label} already installed')
        return
    if old not in text:
        raise SystemExit(f'ERROR: Expected code not found for {label} in {rel_path}. Do not edit manually; send me this exact error.')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')
    print(f'OK: {label}')

replace_once('app/(portal)/characters/[slug]/page.tsx', '  const canUseFriendList =\n    activeCharacter &&\n    activeCharacter.id !== character.id\n      ? await hasCharacterFeature(\n          activeCharacter.id,\n          "friend_list",\n        )\n      : false;', '  let canUseFriendList = false;\n  let isInFriendList = false;\n\n  if (\n    activeCharacter &&\n    activeCharacter.id !== character.id\n  ) {\n    canUseFriendList =\n      await hasCharacterFeature(\n        activeCharacter.id,\n        "friend_list",\n      );\n\n    if (canUseFriendList) {\n      const {\n        count: friendEntryCount,\n        error: friendEntryError,\n      } = await supabase\n        .from(\n          "character_friend_entries",\n        )\n        .select(\n          "id",\n          {\n            count: "exact",\n            head: true,\n          },\n        )\n        .eq(\n          "owner_character_id",\n          activeCharacter.id,\n        )\n        .eq(\n          "target_character_id",\n          character.id,\n        );\n\n      if (friendEntryError) {\n        throw new Error(\n          `Unable to check Friend List entry: ${friendEntryError.message}`,\n        );\n      }\n\n      isInFriendList =\n        (friendEntryCount ?? 0) > 0;\n    }\n  }', 'detect existing Friend List entry')
replace_once('app/(portal)/characters/[slug]/page.tsx', '        canUseFriendList={\n          canUseFriendList\n        }\n      />', '        canUseFriendList={\n          canUseFriendList\n        }\n        isInFriendList={\n          isInFriendList\n        }\n      />', 'pass existing Friend List state')
replace_once('components/characters/public-character-profile.tsx', '  canViewLastActivity: boolean;\n  canUseFriendList: boolean;\n};', '  canViewLastActivity: boolean;\n  canUseFriendList: boolean;\n  isInFriendList: boolean;\n};', 'Friend List existing-state prop type')
replace_once('components/characters/public-character-profile.tsx', '  canViewLastActivity,\n  canUseFriendList,\n}: PublicCharacterProfileProps) {', '  canViewLastActivity,\n  canUseFriendList,\n  isInFriendList,\n}: PublicCharacterProfileProps) {', 'Friend List existing-state prop receiver')
replace_once('components/characters/public-character-profile.tsx', '          {canUseFriendList ? (\n            <form\n              action={addFriendListEntry}\n              className="flex flex-wrap items-stretch"\n            >', '          {canUseFriendList &&\n          isInFriendList ? (\n            <Link\n              href="/friends"\n              className="inline-flex items-center gap-2 border border-[#668657] bg-[#172313] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[#b8d8a7] transition hover:bg-[#22321c]"\n            >\n              ✓ In Friend List\n            </Link>\n          ) : canUseFriendList ? (\n            <form\n              action={addFriendListEntry}\n              className="flex flex-wrap items-stretch"\n            >', 'hide Add controls when character already exists in Friend List')

print()
print('SUCCESS: Friend List existing-entry detection installed.')
print('Now run: npm run build')