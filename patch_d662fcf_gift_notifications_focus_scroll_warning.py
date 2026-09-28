
from pathlib import Path
import sys

BELL = Path("components/notifications/notification-bell.tsx")
BROWSER = Path("components/characters/character-inventory-browser.tsx")
USE_ACTIONS = Path("lib/items/use-actions.ts")


def fail(message: str) -> int:
    print(f"ERROR: {message}")
    print("No file was changed.")
    return 1


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: expected exactly 1 match, found {count}."
        )
    return source.replace(old, new, 1)


def main() -> int:
    for path in (BELL, BROWSER, USE_ACTIONS):
        if not path.exists():
            return fail(
                f"Missing {path}. Run this from the sepulchria-portal root."
            )

    bell_original = BELL.read_text(encoding="utf-8")
    browser_original = BROWSER.read_text(encoding="utf-8")
    actions_original = USE_ACTIONS.read_text(encoding="utf-8")

    bell = bell_original
    browser = browser_original
    actions = actions_original

    try:
        bell = replace_once(
            bell,
            '        "item_trade",\n        "private_location_invite",',
            '        "item_trade",\n        "item_gift",\n        "remnant_gift",\n        "private_location_invite",',
            "gift notification realtime sources",
        )

        browser = replace_once(
            browser,
            '''  useEffect(() => {
  if (filtersActive) {
    setCollapsed(
      new Set<string>(),
    );
    return;
  }

  const next =
    new Set<string>(
      rows.map(
        (row) =>
          row.category_name,
      ),
    );''',
            '''  useEffect(() => {
  if (filtersActive) {
    setCollapsed(
      new Set<string>(),
    );
    return;
  }

  /*
   * A notification link may ask us to focus a received Item.
   * The focus effect above opens that Item's category. Do not
   * immediately close it again with the normal default collapse.
   */
  if (focusItemId) {
    return;
  }

  const next =
    new Set<string>(
      rows.map(
        (row) =>
          row.category_name,
      ),
    );''',
            "preserve focused Item category",
        )

        browser = replace_once(
            browser,
            '''  filtersActive,
  rows,
]);''',
            '''  filtersActive,
  rows,
  focusItemId,
]);''',
            "focus dependency for collapse reset",
        )

        browser = replace_once(
            browser,
            'import { useInventoryItem } from "@/lib/items/use-actions";',
            '''import {
  getShapeScrollLearningWarning,
  useInventoryItem,
} from "@/lib/items/use-actions";''',
            "Scroll warning action import",
        )

        browser = replace_once(
            browser,
            '''  const run = () => {
    const data = new FormData();

    data.set(
      "recordKind",
      row.record_kind,
    );
    data.set(
      "recordId",
      row.record_id,
    );

    // Inventory use is deliberately self-only.
    setMessage(null);

    startTransition(async () => {
      const result =
        await useInventoryItem(data);

      setSuccess(result.ok);
      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  };''',
            '''  const run = () => {
    const data = new FormData();

    data.set(
      "recordKind",
      row.record_kind,
    );
    data.set(
      "recordId",
      row.record_id,
    );

    // Inventory use is deliberately self-only.
    setMessage(null);

    startTransition(async () => {
      if (row.teaches_shape) {
        const warning =
          await getShapeScrollLearningWarning(
            data,
          );

        if (
          warning.requiresConfirmation &&
          !window.confirm(
            warning.message,
          )
        ) {
          return;
        }
      }

      const result =
        await useInventoryItem(data);

      setSuccess(result.ok);
      setMessage(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  };''',
            "Scroll confirmation before use",
        )

        warning_action = '''export async function getShapeScrollLearningWarning(
  formData: FormData,
): Promise<{
  requiresConfirmation: boolean;
  message: string;
}> {
  const recordKind =
    text(formData, "recordKind");
  const recordId =
    text(formData, "recordId");

  if (
    !["standard", "unique"].includes(
      recordKind,
    ) ||
    !recordId
  ) {
    return {
      requiresConfirmation: false,
      message: "",
    };
  }

  const {
    character,
  } = await getOwnedCharacter();

  const record =
    await loadAttemptRecord(
      recordKind,
      recordId,
      character.id,
    );

  if (
    !record.item.teaches_shape_id
  ) {
    return {
      requiresConfirmation: false,
      message: "",
    };
  }

  const admin =
    createPrivilegedClient();

  const {
    data: knownShape,
    error: knownShapeError,
  } = await admin
    .from("character_shapes")
    .select("id")
    .eq(
      "character_id",
      character.id,
    )
    .eq(
      "shape_id",
      record.item.teaches_shape_id,
    )
    .limit(1)
    .maybeSingle();

  if (knownShapeError) {
    throw new Error(
      knownShapeError.message,
    );
  }

  if (knownShape) {
    return {
      requiresConfirmation: false,
      message: "",
    };
  }

  const {
    data: shape,
    error: shapeError,
  } = await admin
    .from("shapes")
    .select(
      "id,name,level,is_active,is_feat_backing",
    )
    .eq(
      "id",
      record.item.teaches_shape_id,
    )
    .maybeSingle();

  if (
    shapeError ||
    !shape ||
    shape.is_active !== true ||
    shape.is_feat_backing === true
  ) {
    return {
      requiresConfirmation: false,
      message: "",
    };
  }

  const effectiveWarping =
    await getEffectiveCharacterWarping(
      character.id,
    );

  const shapeLevel =
    Number(shape.level ?? 1);
  const affinity =
    Number(
      effectiveWarping.affinity ?? 1,
    );

  if (
    shapeLevel <= affinity
  ) {
    return {
      requiresConfirmation: false,
      message: "",
    };
  }

  const dc =
    10 + shapeLevel;

  return {
    requiresConfirmation: true,
    message:
      `Warning: "${shape.name}" is a Level ${shapeLevel} Shape, ` +
      `but your Warping Affinity is ${affinity}.\\n\\n` +
      `Learning it requires a d20 + Brains roll against DC ${dc}. ` +
      `If the roll fails, this Scroll will be destroyed and the Shape will NOT be learned.\\n\\n` +
      `Do you want to use the Scroll anyway?`,
  };
}

'''

        actions = replace_once(
            actions,
            '''export async function useInventoryItem(
  formData: FormData,
): Promise<UseInventoryItemResult> {''',
            warning_action + '''export async function useInventoryItem(
  formData: FormData,
): Promise<UseInventoryItemResult> {''',
            "Scroll warning server action",
        )

    except RuntimeError as exc:
        return fail(str(exc))

    backups = [
        (BELL, bell_original, ".before-gift-realtime-fix"),
        (BROWSER, browser_original, ".before-gift-focus-scroll-warning"),
        (USE_ACTIONS, actions_original, ".before-scroll-affinity-warning"),
    ]

    for path, original, suffix in backups:
        backup = path.with_suffix(
            path.suffix + suffix
        )
        if not backup.exists():
            backup.write_text(
                original,
                encoding="utf-8",
            )

    BELL.write_text(
        bell,
        encoding="utf-8",
    )
    BROWSER.write_text(
        browser,
        encoding="utf-8",
    )
    USE_ACTIONS.write_text(
        actions,
        encoding="utf-8",
    )

    print("Patch applied for d662fcf.")
    print()
    print("1) Gift notifications")
    print("   - item_gift and remnant_gift now use the Bell's existing realtime refresh path")
    print()
    print("2) Received Item focus")
    print("   - focused category is no longer re-collapsed immediately")
    print("   - existing scroll-to/highlight logic can now run")
    print()
    print("3) Shape Scroll warning")
    print("   - warns before use when Shape level exceeds effective Affinity")
    print("   - shows required d20 + Brains roll and DC")
    print("   - explains the Scroll can be destroyed without learning the Shape")
    print("   - Cancel leaves the Scroll untouched")
    print()
    print("Run:")
    print("  npm run build")
    return 0


if __name__ == "__main__":
    sys.exit(main())
