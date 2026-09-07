from pathlib import Path
import re
import shutil

ROOT = Path.cwd()
FILES = [
    ROOT / 'components' / 'portal' / 'portal-sidebar.tsx',
    ROOT / 'components' / 'portal' / 'mobile-portal-navigation.tsx',
]

for path in FILES:
    if not path.exists():
        raise SystemExit(f'STOP: missing {path.relative_to(ROOT)}. No files changed.')

originals = {path: path.read_text(encoding='utf-8') for path in FILES}
updated = {}

for path, text in originals.items():
    text, n1 = re.subn(
        r'\bprivateEntitlementResult,\s*\n(\s*)privateMembershipResult,',
        r'privateOwnedRoomResult,\n\1privateMembershipResult,',
        text,
        count=1,
    )
    if n1 != 1:
        raise SystemExit(f'STOP: {path.name}: result slot not found. No files changed.')

    entitlement_query = re.compile(
        r'supabase\s*\.from\(\s*"character_feature_entitlements",\s*\)\s*\.select\("enabled"\)\s*\.eq\(\s*"character_id",\s*character\.id,\s*\)\s*\.eq\(\s*"feature_key",\s*"private_chat",\s*\)\s*\.maybeSingle\(\),',
        re.MULTILINE,
    )

    replacement_query = '''supabase
          .from(
            "private_location_rooms",
          )
          .select("room_id")
          .eq(
            "owner_character_id",
            character.id,
          )
          .limit(1)
          .maybeSingle(),'''

    text, n2 = entitlement_query.subn(replacement_query, text, count=1)
    if n2 != 1:
        raise SystemExit(f'STOP: {path.name}: private_chat query not found. No files changed.')

    access_pattern = re.compile(
        r'setHasPrivateLocationAccess\(\s*isStaff\s*\|\|\s*privateEntitlementResult\.data\s*\?\.enabled\s*===\s*true\s*\|\|\s*Boolean\(\s*privateMembershipResult\.data,\s*\),\s*\);',
        re.MULTILINE,
    )

    replacement_access = '''setHasPrivateLocationAccess(
        isStaff ||
          Boolean(
            privateOwnedRoomResult.data,
          ) ||
          Boolean(
            privateMembershipResult.data,
          ),
      );'''

    text, n3 = access_pattern.subn(replacement_access, text, count=1)
    if n3 != 1:
        raise SystemExit(f'STOP: {path.name}: access decision not found. No files changed.')

    updated[path] = text

for path, text in updated.items():
    backup = path.with_suffix(path.suffix + '.before_private_location_visibility_fix.bak')
    if not backup.exists():
        shutil.copy2(path, backup)
    path.write_text(text, encoding='utf-8')

print('DONE')
print('Desktop + mobile Private Location visibility now uses real ownership or active membership, with staff override.')
print('No DB writes. No GitHub push.')
print('Now run: npm run build')
