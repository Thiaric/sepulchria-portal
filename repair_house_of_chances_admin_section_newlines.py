from pathlib import Path

path = Path("lib/auth/admin-section-access.ts")

if not path.exists():
    raise SystemExit(f"Missing expected file: {path}")

text = path.read_text(encoding="utf-8")

# Repair accidental literal backslash-n sequences introduced by the previous patch.
text = text.replace(
    '  | "house_of_chances"\\n  | "world";',
    '  | "house_of_chances"\n  | "world";',
)

text = text.replace(
    '  house_of_chances: ["owner", "admin"],\\n  world: ["owner", "admin", "master"],',
    '  house_of_chances: ["owner", "admin"],\n  world: ["owner", "admin", "master"],',
)

# Safety checks.
if '  | "house_of_chances"\n  | "world";' not in text:
    raise SystemExit(
        'Could not confirm the repaired AdminSection union. '
        'Please do not edit the file manually.'
    )

if '  house_of_chances: ["owner", "admin"],\n  world: ["owner", "admin", "master"],' not in text:
    raise SystemExit(
        'Could not confirm the repaired ADMIN_SECTION_ROLES entry. '
        'Please do not edit the file manually.'
    )

path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("Repaired lib/auth/admin-section-access.ts")
print("Now run: npm run build")
