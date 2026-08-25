from pathlib import Path

ROOT = Path.cwd()
PATH = ROOT / "app/(portal)/game/page.tsx"

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were applied.")

if not PATH.exists():
    fail("Missing app/(portal)/game/page.tsx")

text = PATH.read_text(encoding="utf-8")

duplicate_block = """      const categoryRelation = master.category ?? null;
      const category = Array.isArray(categoryRelation)
        ? categoryRelation[0] ?? null
        : categoryRelation;

"""

# The previous patch intentionally inserted an earlier categoryRelation/category
# block. After that patch, there must be exactly two declarations of
# categoryRelation and category in this mapper.
if text.count("const categoryRelation") != 2:
    fail(
        "Expected exactly two categoryRelation declarations from the previous weapon patch."
    )

if text.count("const category =") != 2:
    fail(
        "Expected exactly two category declarations from the previous weapon patch."
    )

# Remove only the later/original duplicate. The first inserted declaration
# is required by isEquippedHandWeapon.
first = text.find("const categoryRelation")
second = text.find("const categoryRelation", first + 1)

if second == -1:
    fail("Could not locate the duplicate categoryRelation block.")

segment = text[second:second + len(duplicate_block) + 50]

if duplicate_block.strip() not in segment:
    fail(
        "The second categoryRelation block does not match the expected previous-patch state."
    )

text = text[:second] + text[second:].replace(duplicate_block, "", 1)

if text.count("const categoryRelation") != 1:
    fail("Duplicate categoryRelation declaration still exists after correction.")

if text.count("const category =") != 1:
    fail("Duplicate category declaration still exists after correction.")

for marker in [
    "const chatCandidateRows =",
    "const chatCandidateItemIds =",
    "const isEquippedHandWeapon =",
    '!row.is_usable &&',
    '!isEquippedHandWeapon',
]:
    if marker not in text:
        fail(f"Weapon fix validation failed: missing {marker!r}")

PATH.write_text(text, encoding="utf-8", newline="\n")

print("WROTE  app/(portal)/game/page.tsx")
print()
print("CORRECTIVE WEAPON PATCH APPLIED")
print("- Removed only the duplicate categoryRelation/category declarations.")
print("- Kept the equipped weapon candidate logic from the previous patch.")
print("- No other files changed.")
print()
print("Next: npm run build")
