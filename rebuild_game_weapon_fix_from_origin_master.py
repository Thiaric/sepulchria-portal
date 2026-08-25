from pathlib import Path
import subprocess

ROOT = Path.cwd()
PATH = ROOT / "app/(portal)/game/page.tsx"
REPO_PATH = "app/(portal)/game/page.tsx"


def fail(message: str) -> None:
    raise SystemExit(
        f"ERROR: {message}\nNo changes were applied."
    )


if not (ROOT / ".git").exists():
    fail(
        "Run this script from the root of the sepulchria-portal Git repository."
    )

try:
    subprocess.run(
        ["git", "fetch", "origin", "master"],
        cwd=ROOT,
        check=True,
    )
except subprocess.CalledProcessError:
    fail("Could not fetch origin/master.")

try:
    clean = subprocess.check_output(
        [
            "git",
            "show",
            f"origin/master:{REPO_PATH}",
        ],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
    )
except subprocess.CalledProcessError:
    fail(
        f"Could not read {REPO_PATH} from origin/master."
    )


old_inventory_filter = '''  const usableRows =
    chatInventoryRows.filter((row) => row.is_usable);

  const usableItemIds = [
    ...new Set(usableRows.map((row) => row.item_id)),
  ];
'''

new_inventory_filter = '''  /*
   * Chat needs:
   * - ordinary usable Items; and
   * - equipped Main Hand / Off Hand Weapons.
   *
   * Weapons do not need the generic is_usable flag in order to attack.
   * The weapon resolver validates the equipped slot, Weapon category and
   * Opposed configuration separately.
   */
  const chatCandidateRows =
    chatInventoryRows.filter(
      (row) =>
        row.is_usable ||
        (
          row.is_equipped &&
          ["main_hand", "off_hand"].includes(
            String(
              row.equipped_slot ?? "",
            ),
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
'''

old_master_query_start = '''    usableItemIds.length
      ? supabase
          .from("items")
'''

new_master_query_start = '''    chatCandidateItemIds.length
      ? supabase
          .from("items")
'''

old_master_query_end = '''          .in("id", usableItemIds)
'''

new_master_query_end = '''          .in(
            "id",
            chatCandidateItemIds,
          )
'''

old_chat_items_start = '''  const chatItems = usableRows
    .map((row) => {
      const master = masterById.get(row.item_id);
      if (!master) return null;

      const sourceKey =
        row.record_kind === "unique"
          ? `unique:${row.record_id}`
          : `standard:${row.item_id}`;

      const categoryRelation = master.category ?? null;
      const category = Array.isArray(categoryRelation)
        ? categoryRelation[0] ?? null
        : categoryRelation;

      if (
        category?.slug === "weapon" &&
        (
          !row.is_equipped ||
          !["main_hand", "off_hand"].includes(
            String(row.equipped_slot ?? ""),
          )
        )
      ) {
        return null;
      }

      return {
'''

new_chat_items_start = '''  const chatItems = chatCandidateRows
    .map((row) => {
      const master = masterById.get(row.item_id);
      if (!master) return null;

      const sourceKey =
        row.record_kind === "unique"
          ? `unique:${row.record_id}`
          : `standard:${row.item_id}`;

      const categoryRelation =
        master.category ?? null;

      const category =
        Array.isArray(
          categoryRelation,
        )
          ? categoryRelation[0] ?? null
          : categoryRelation;

      const isEquippedHandWeapon =
        category?.slug === "weapon" &&
        row.is_equipped &&
        ["main_hand", "off_hand"].includes(
          String(
            row.equipped_slot ?? "",
          ),
        );

      if (
        !row.is_usable &&
        !isEquippedHandWeapon
      ) {
        return null;
      }

      if (
        category?.slug === "weapon" &&
        !isEquippedHandWeapon
      ) {
        return null;
      }

      return {
'''

checks = [
    (old_inventory_filter, "clean inventory filter"),
    (old_master_query_start, "clean Item master query condition"),
    (old_master_query_end, "clean Item master query .in()"),
    (old_chat_items_start, "clean chatItems mapping"),
]

for block, label in checks:
    if clean.count(block) != 1:
        fail(
            f"origin/master no longer contains the expected {label}. "
            "The repository has changed; no local file was touched."
        )

updated = clean
updated = updated.replace(
    old_inventory_filter,
    new_inventory_filter,
    1,
)
updated = updated.replace(
    old_master_query_start,
    new_master_query_start,
    1,
)
updated = updated.replace(
    old_master_query_end,
    new_master_query_end,
    1,
)
updated = updated.replace(
    old_chat_items_start,
    new_chat_items_start,
    1,
)

required = [
    "const chatCandidateRows =",
    "const chatCandidateItemIds =",
    "const isEquippedHandWeapon =",
    "!row.is_usable &&",
    "!isEquippedHandWeapon",
    'category?.slug === "weapon"',
]

for marker in required:
    if marker not in updated:
        fail(
            f"Final validation failed: missing {marker!r}"
        )

if "const usableRows =" in updated:
    fail("Old usableRows-only filter still exists.")

if "usableItemIds" in updated:
    fail("Old usableItemIds identifier still exists.")

if updated.count("const categoryRelation =") != 1:
    fail(
        "Unexpected categoryRelation declaration count in transformed file."
    )

if updated.count("const category =") != 1:
    fail(
        "Unexpected category declaration count in transformed file."
    )

PATH.write_text(
    updated,
    encoding="utf-8",
    newline="\n",
)

print("WROTE  app/(portal)/game/page.tsx")
print()
print("REBUILT FROM origin/master AND APPLIED WEAPON FIX")
print("- Previous malformed local game/page.tsx was not used.")
print("- Ordinary Items still require is_usable=true.")
print("- Equipped Main Hand / Off Hand Weapons do not require is_usable=true.")
print("- Exactly one categoryRelation/category declaration remains.")
print("- Server-side weapon validation is unchanged.")
print()
print("Next: npm run build")
