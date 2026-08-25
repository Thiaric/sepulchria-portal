from pathlib import Path

ROOT = Path.cwd()
PATH = ROOT / "app/(portal)/game/page.tsx"

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were applied.")

if not PATH.exists():
    fail("Missing app/(portal)/game/page.tsx")

text = PATH.read_text(encoding="utf-8")

old_rows = """  const usableRows =
    chatInventoryRows.filter((row) => row.is_usable);

  const usableItemIds = [
    ...new Set(usableRows.map((row) => row.item_id)),
  ];
"""

new_rows = """  const chatCandidateRows =
    chatInventoryRows.filter(
      (row) =>
        row.is_usable ||
        (
          row.is_equipped &&
          ["main_hand", "off_hand"].includes(
            String(row.equipped_slot ?? ""),
          )
        ),
    );

  const chatCandidateItemIds = [
    ...new Set(
      chatCandidateRows.map(
        (row) => row.item_id,
      ),
    ),
  ];
"""

old_ids = """    usableItemIds.length
      ? supabase
          .from("items")
"""
new_ids = """    chatCandidateItemIds.length
      ? supabase
          .from("items")
"""

old_in = """          .in("id", usableItemIds)
"""
new_in = """          .in(
            "id",
            chatCandidateItemIds,
          )
"""

old_map = """  const chatItems = usableRows
    .map((row) => {
      const master = masterById.get(row.item_id);
      if (!master) return null;

      const sourceKey =
"""
new_map = """  const chatItems = chatCandidateRows
    .map((row) => {
      const master = masterById.get(row.item_id);
      if (!master) return null;

      const categoryRelation =
        master.category ?? null;

      const category =
        Array.isArray(categoryRelation)
          ? categoryRelation[0] ?? null
          : categoryRelation;

      const isEquippedHandWeapon =
        category?.slug === "weapon" &&
        row.is_equipped &&
        ["main_hand", "off_hand"].includes(
          String(row.equipped_slot ?? ""),
        );

      if (
        !row.is_usable &&
        !isEquippedHandWeapon
      ) {
        return null;
      }

      const sourceKey =
"""

old_dup = """      const categoryRelation = master.category ?? null;
      const category = Array.isArray(categoryRelation)
        ? categoryRelation[0] ?? null
        : categoryRelation;

      if (
        category?.slug === "weapon" &&
"""
new_dup = """      if (
        category?.slug === "weapon" &&
"""

for old, new, label in [
    (old_rows, new_rows, "candidate rows"),
    (old_ids, new_ids, "candidate ids condition"),
    (old_in, new_in, "candidate ids query"),
    (old_map, new_map, "chat items mapping"),
    (old_dup, new_dup, "duplicate category block"),
]:
    if new in text:
        continue
    if text.count(old) != 1:
        fail(f"Could not find exact {label} block from commit 26d1bd72.")
    text = text.replace(old, new, 1)

for marker in [
    "const chatCandidateRows =",
    "const chatCandidateItemIds =",
    "const isEquippedHandWeapon =",
    "!isEquippedHandWeapon",
]:
    if marker not in text:
        fail(f"Validation failed: {marker}")

PATH.write_text(text, encoding="utf-8", newline="\n")

print("WROTE  app/(portal)/game/page.tsx")
print("SUCCESS: equipped hand Weapons no longer require is_usable=true to appear in ATK.")
print("Next: npm run build")
