from pathlib import Path
import re

ROOT = Path.cwd()
path = ROOT / "app/(portal)/store/page.tsx"

if not path.exists():
    raise SystemExit(f"Missing file: {path}")

text = path.read_text(encoding="utf-8")

def find_query_block(source: str, table: str):
    start_token = f'.from("{table}")'
    start = source.find(start_token)
    if start == -1:
        raise SystemExit(f'Could not find .from("{table}") in {path}')

    # Find the end of this Supabase chain inside Promise.all.
    candidates = [
        source.find("\n\n    supabase", start),
        source.find("\n\n    character", start),
        source.find("\n\n    productsResult", start),
    ]
    candidates = [x for x in candidates if x != -1]
    if not candidates:
        # fallback: first "),\n" after this chain
        end = source.find("),\n", start)
        if end == -1:
            raise SystemExit(f"Could not determine end of {table} query block.")
        end += 2
    else:
        end = min(candidates)

    return start, end, source[start:end]

# 1) store_products MUST NOT filter/select is_personal_selectable.
start, end, block = find_query_block(text, "store_products")
fixed = block

fixed = re.sub(
    r'\n\s*\.eq\(\s*"is_personal_selectable"\s*,\s*true\s*\)',
    '',
    fixed,
)

fixed = fixed.replace(", is_personal_selectable", "")
fixed = fixed.replace("is_personal_selectable, ", "")
fixed = fixed.replace("is_personal_selectable", "")

if fixed != block:
    text = text[:start] + fixed + text[end:]
    print("Removed is_personal_selectable from store_products query.")
else:
    print("store_products query had no is_personal_selectable reference.")

# 2) music_tracks SHOULD filter is_personal_selectable=true.
start, end, block = find_query_block(text, "music_tracks")
fixed = block

if 'is_personal_selectable' not in fixed:
    # Add the filter immediately after is_active=true if possible.
    target = '.eq("is_active", true)'
    if target in fixed:
        fixed = fixed.replace(
            target,
            target + '\n      .eq("is_personal_selectable", true)',
            1,
        )
    else:
        raise SystemExit(
            'music_tracks query found, but no .eq("is_active", true) anchor exists.'
        )

if fixed != block:
    text = text[:start] + fixed + text[end:]
    print("Ensured music_tracks filters is_personal_selectable=true.")
else:
    print("music_tracks query already has is_personal_selectable handling.")

path.write_text(text, encoding="utf-8")

print("DONE. Now run: npm run build")
