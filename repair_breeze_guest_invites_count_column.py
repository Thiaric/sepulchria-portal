from pathlib import Path

path = Path.cwd() / "app/(portal)/game/breeze-lodgings-actions.ts"

if not path.exists():
    raise SystemExit(f"ERROR: Missing expected file: {path}")

text = path.read_text(encoding="utf-8")
old = '      admin\n        .from("breeze_lodging_guests")\n        .select("id", {\n          count: "exact",\n          head: true,\n        })\n        .eq("rental_id", rental.id)\n        .eq("status", "active"),\n'
new = '      admin\n        .from("breeze_lodging_guests")\n        .select("character_id", {\n          count: "exact",\n          head: true,\n        })\n        .eq("rental_id", rental.id)\n        .eq("status", "active"),\n'

count = text.count(old)
if count != 1:
    raise SystemExit(
        f"ERROR: Expected exactly 1 Breeze guest count query, found {count}. No files were written."
    )

text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("Fixed Breeze Lodgings active guest count query.")
print("Changed selected column: id -> character_id")
print("Guest-limit logic is otherwise unchanged.")
print("Next: npm run build")
