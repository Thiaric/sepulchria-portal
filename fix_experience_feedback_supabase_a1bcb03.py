from pathlib import Path

FILES = [
    Path('app/api/experience-feedback/status/route.ts'),
    Path('app/api/experience-feedback/prompt/route.ts'),
    Path('app/api/experience-feedback/complete/route.ts'),
]

old_import = 'import { createServerClient } from "@/lib/supabase/server";'
new_import = 'import { createClient } from "@/lib/supabase/server";'
old_call = 'await createServerClient()'
new_call = 'await createClient()'

contents = {}

for path in FILES:
    if not path.exists():
        raise SystemExit(f'Missing {path}. This fix expects the experience-feedback patch to already be installed.')

    text = path.read_text(encoding='utf-8')

    import_count = text.count(old_import)
    call_count = text.count(old_call)

    if import_count != 1:
        raise SystemExit(f'{path}: expected 1 createServerClient import, found {import_count}.')
    if call_count != 1:
        raise SystemExit(f'{path}: expected 1 createServerClient() call, found {call_count}.')

    text = text.replace(old_import, new_import, 1)
    text = text.replace(old_call, new_call, 1)
    contents[path] = text

# Write only after all three files validate.
for path, text in contents.items():
    path.write_text(text, encoding='utf-8')
    print('✓', path)

print('\nFixed experience-feedback Supabase server helper imports/calls.')
print('Now run: npm run build')
