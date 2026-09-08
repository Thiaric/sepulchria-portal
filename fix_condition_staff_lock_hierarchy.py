from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path.cwd()

FILES = [
    ROOT / "types" / "game.ts",
    ROOT / "app" / "(portal)" / "character" / "condition-actions.ts",
    ROOT / "components" / "characters" / "character-conditions-editor.tsx",
]

BACKUP = ROOT / ".conditions-lock-permissions-backup"

def fail(message: str) -> None:
    print(f"\nSTOPPED: {message}", file=sys.stderr)
    sys.exit(1)

for path in FILES:
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")

if BACKUP.exists():
    shutil.rmtree(BACKUP)

for path in FILES:
    dst = BACKUP / path.relative_to(ROOT)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dst)

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {count}.")
    return text.replace(old, new, 1)

try:
    # ------------------------------------------------------------
    # 1) Type now carries origin role + computed removability.
    # ------------------------------------------------------------
    types = FILES[0].read_text(encoding="utf-8")

    old = '''export type CharacterCondition = {
  id: string;
  character_id: string;
  label: string;
  created_at: string;
};'''

    new = '''export type CharacterCondition = {
  id: string;
  character_id: string;
  label: string;
  created_by_role:
    | "player"
    | "master"
    | "admin"
    | "owner";
  created_at: string;
  can_remove?: boolean;
};'''

    types = replace_once(
        types,
        old,
        new,
        "types/game.ts CharacterCondition",
    )

    FILES[0].write_text(types, encoding="utf-8")

    # ------------------------------------------------------------
    # 2) Server-side hierarchy enforcement.
    # ------------------------------------------------------------
    actions = FILES[1].read_text(encoding="utf-8")

    # Add permission helper after role helper.
    anchor = '''function isConditionStaffRole(
  role: string | null | undefined,
): role is
  | "owner"
  | "admin"
  | "master" {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "master"
  );
}
'''

    helper = anchor + '''
function canRemoveCondition(
  actorRole:
    | "player"
    | "master"
    | "admin"
    | "owner",
  conditionRole:
    | "player"
    | "master"
    | "admin"
    | "owner",
): boolean {
  if (
    conditionRole ===
    "player"
  ) {
    return true;
  }

  if (
    conditionRole ===
    "master"
  ) {
    return (
      actorRole ===
        "master" ||
      actorRole ===
        "admin" ||
      actorRole ===
        "owner"
    );
  }

  if (
    conditionRole ===
    "admin"
  ) {
    return (
      actorRole ===
        "admin" ||
      actorRole ===
        "owner"
    );
  }

  return (
    conditionRole ===
      "owner" &&
    actorRole ===
      "owner"
  );
}
'''

    actions = replace_once(
        actions,
        anchor,
        helper,
        "condition-actions.ts permission helper",
    )

    # Select created_by_role and decorate can_remove.
    actions = replace_once(
        actions,
        '''    .select(
      "id, character_id, label, created_at",
    )''',
        '''    .select(
      "id, character_id, label, created_by_role, created_at",
    )''',
        "condition-actions.ts read select",
    )

    old_return = '''  return (
    data ?? []
  ) as CharacterCondition[];
}'''

    new_return = '''  return (
    data ?? []
  ).map(
    (condition) => ({
      ...condition,
      can_remove:
        canRemoveCondition(
          context.createdByRole,
          condition.created_by_role,
        ),
    }),
  ) as CharacterCondition[];
}'''

    actions = replace_once(
        actions,
        old_return,
        new_return,
        "condition-actions.ts read mapping",
    )

    # Replace delete block with fetch + enforce + delete.
    old_delete = '''    const {
      error,
    } = await context.admin
      .from(
        "character_conditions",
      )
      .delete()
      .eq(
        "id",
        conditionId,
      )
      .eq(
        "character_id",
        context.characterId,
      );

    if (error) {
      throw new Error(
        `Unable to remove Condition: ${error.message}`,
      );
    }'''

    new_delete = '''    const {
      data: existingCondition,
      error: readError,
    } = await context.admin
      .from(
        "character_conditions",
      )
      .select(
        "id, created_by_role",
      )
      .eq(
        "id",
        conditionId,
      )
      .eq(
        "character_id",
        context.characterId,
      )
      .maybeSingle();

    if (
      readError ||
      !existingCondition
    ) {
      throw new Error(
        readError?.message ??
          "Condition not found.",
      );
    }

    if (
      !canRemoveCondition(
        context.createdByRole,
        existingCondition.created_by_role,
      )
    ) {
      throw new Error(
        existingCondition.created_by_role === "owner"
          ? "Only the Owner may remove this Condition."
          : existingCondition.created_by_role === "admin"
            ? "Only an Administrator or the Owner may remove this Condition."
            : "Only a Master, Administrator or the Owner may remove this Condition.",
      );
    }

    const {
      error,
    } = await context.admin
      .from(
        "character_conditions",
      )
      .delete()
      .eq(
        "id",
        conditionId,
      )
      .eq(
        "character_id",
        context.characterId,
      );

    if (error) {
      throw new Error(
        `Unable to remove Condition: ${error.message}`,
      );
    }'''

    actions = replace_once(
        actions,
        old_delete,
        new_delete,
        "condition-actions.ts delete enforcement",
    )

    FILES[1].write_text(actions, encoding="utf-8")

    # ------------------------------------------------------------
    # 3) UI: show X only when server says removable, otherwise lock.
    # ------------------------------------------------------------
    editor = FILES[2].read_text(encoding="utf-8")

    old_button = '''                <button
                  type="button"
                  disabled={pending}
                  aria-label={`Remove ${condition.label}`}
                  title={`Remove ${condition.label}`}
                  onClick={() =>
                    removeCondition(
                      condition.id,
                    )
                  }
                  className="text-[11px] leading-none text-[rgb(var(--sep-skin-c1))] transition hover:text-[rgb(var(--sep-skin-c2))] disabled:opacity-40"
                >
                  ×
                </button>'''

    new_button = '''                {condition.can_remove ? (
                  <button
                    type="button"
                    disabled={pending}
                    aria-label={`Remove ${condition.label}`}
                    title={`Remove ${condition.label}`}
                    onClick={() =>
                      removeCondition(
                        condition.id,
                      )
                    }
                    className="text-[11px] leading-none text-[rgb(var(--sep-skin-c1))] transition hover:text-[rgb(var(--sep-skin-c2))] disabled:opacity-40"
                  >
                    ×
                  </button>
                ) : (
                  <span
                    aria-label={`${condition.label} is staff-locked`}
                    title={
                      condition.created_by_role === "owner"
                        ? "Assigned by Owner"
                        : condition.created_by_role === "admin"
                          ? "Assigned by Admin"
                          : "Assigned by Master"
                    }
                    className="text-[10px] leading-none text-[rgb(var(--sep-colour-806b50))]"
                  >
                    🔒
                  </span>
                )}'''

    editor = replace_once(
        editor,
        old_button,
        new_button,
        "character-conditions-editor.tsx lock UI",
    )

    FILES[2].write_text(editor, encoding="utf-8")

    # ------------------------------------------------------------
    # Validate TS/TSX syntax.
    # ------------------------------------------------------------
    validator = r'''
const fs = require("fs");
const ts = require("typescript");

for (const file of process.argv.slice(1)) {
  const source = fs.readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;

  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    kind,
  );

  if (sf.parseDiagnostics.length) {
    console.error("Parse diagnostics for", file);
    console.error(sf.parseDiagnostics);
    process.exit(1);
  }
}
'''

    subprocess.run(
        ["node", "-e", validator, *[str(p) for p in FILES]],
        cwd=ROOT,
        check=True,
    )

except Exception as exc:
    for path in FILES:
        backup = BACKUP / path.relative_to(ROOT)
        if backup.exists():
            shutil.copy2(backup, path)

    fail(
        f"{exc}\n"
        "Original files were restored."
    )

print("\nCONDITION LOCK PERMISSIONS APPLIED")
print("")
print("Rules now enforced server-side:")
print("  Player-added  -> Player / Master / Admin / Owner may remove")
print("  Master-added  -> Master / Admin / Owner may remove")
print("  Admin-added   -> Admin / Owner may remove")
print("  Owner-added   -> Owner only may remove")
print("")
print("Player UI:")
print("  - removable own Conditions show ×")
print("  - staff-locked Conditions show 🔒")
print("")
print("NEXT:")
print("  npm run build")
