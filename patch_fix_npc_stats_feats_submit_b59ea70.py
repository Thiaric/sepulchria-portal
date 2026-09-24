#!/usr/bin/env python3
from pathlib import Path
import shutil
import subprocess

ROOT = Path.cwd()
BASE = "b59ea70"

FORM = ROOT / "components/admin/admin-character-edit-form.tsx"
ACTIONS = ROOT / "app/(portal)/admin/characters/actions.ts"
AGE = ROOT / "app/(portal)/admin/characters/age-actions.ts"

BACKUP = ROOT / ".patch_backups" / "fix_npc_stats_feats_submit_b59ea70"

INSERT_HANDLER_MARKER = '  async function handleSubmit(\n    event: FormEvent<HTMLFormElement>,\n  ) {\n'
HANDLER_GUARD = "  async function handleSubmit(\n    event: FormEvent<HTMLFormElement>,\n  ) {\n    /*\n     * NPC/system Characters must use the form's native React Server Action\n     * submission. The form contains buttons with their own formAction\n     * (direct NPC Feat assign/remove), and intercepting the submit here\n     * swallows those button-specific actions.\n     */\n    if (allowMissingAge) {\n      return;\n    }\n\n"

ACTIONS_IMPORT_ANCHOR = 'import { createClient } from "@/lib/supabase/server";\n'
ACTIONS_IMPORT_NEW = 'import { createClient } from "@/lib/supabase/server";\nimport { saveAdminCharacterAge } from "./age-actions";\n'
NPC_META_ANCHOR = '  /*\n   * INSTANT CHAT\n   * ------------\n'
NPC_META_BLOCK = '  /*\n   * NPC/system Characters do not use the client-side Age/Ancestry\n   * pre-submit pipeline. Save their Age + Ancestry Feats here, inside\n   * the same server-side administration flow as the rest of the sheet.\n   */\n  if (isSystemCharacter) {\n    const npcAgeAndFeatResult =\n      await saveAdminCharacterAge(\n        formData,\n      );\n\n    if (!npcAgeAndFeatResult.ok) {\n      throw new Error(\n        `Unable to save NPC Age / Ancestry Feats: ${npcAgeAndFeatResult.error}`,\n      );\n    }\n  }\n\n'

AGE_STAFF_OLD = '    await requireStaffCapability(\n      "character_age_admin",\n    );\n'
AGE_STAFF_NEW = '    const staff =\n      await requireStaffCapability(\n        "character_age_admin",\n      );\n'
AGE_EXISTING_OLD = '    /*\n     * First load every Gift which belongs to\n     * this Ancestry\'s selectable pool.\n     */\n    const {\n      data:\n        eligibleAncestryRows,\n      error:\n        eligibleAncestryError,\n    } = await supabase\n      .from("gift_races")\n      .select(\n        "gift_id",\n      )\n      .eq(\n        "race_id",\n        raceId,\n      );\n\n    if (\n      eligibleAncestryError\n    ) {\n      return {\n        ok: false,\n        error:\n          eligibleAncestryError.message,\n      };\n    }\n\n    const eligibleAncestryGiftIds =\n      Array.from(\n        new Set(\n          (\n            eligibleAncestryRows ??\n            []\n          ).map(\n            (row) =>\n              row.gift_id,\n          ),\n        ),\n      );\n\n    /*\n     * Load the character\'s existing ownership\n     * of those feats, regardless of source.\n     */\n    const existingGiftResult =\n      eligibleAncestryGiftIds.length >\n      0\n        ? await supabase\n            .from(\n              "character_gifts",\n            )\n            .select(`\n              id,\n              gift_id,\n              acquisition_source\n            `)\n            .eq(\n              "character_id",\n              characterId,\n            )\n            .in(\n              "gift_id",\n              eligibleAncestryGiftIds,\n            )\n        : {\n            data: [],\n            error: null,\n          };\n'
AGE_EXISTING_NEW = '    /*\n     * Load every existing Feat ownership row for the Character.\n     *\n     * This is important when Ancestry changes: restricting this lookup\n     * to the NEW Ancestry would leave old Ancestry Feats behind.\n     *\n     * We only REMOVE rows whose acquisition_source is "ancestry";\n     * staff/general/other ownership remains untouched.\n     */\n    const existingGiftResult =\n      await supabase\n        .from(\n          "character_gifts",\n        )\n        .select(`\n          id,\n          gift_id,\n          acquisition_source\n        `)\n        .eq(\n          "character_id",\n          characterId,\n        );\n'
AGE_REMOVE_OLD = '    const assignmentsToRemove =\n      existingAssignments.filter(\n        (assignment) =>\n          !selectedGiftIdSet.has(\n            assignment.gift_id,\n          ),\n      );\n'
AGE_REMOVE_NEW = '    const assignmentsToRemove =\n      existingAssignments.filter(\n        (assignment) =>\n          assignment.acquisition_source ===\n            "ancestry" &&\n          !selectedGiftIdSet.has(\n            assignment.gift_id,\n          ),\n      );\n'
AGE_USER_OLD = '      const {\n        data: {\n          user,\n        },\n      } =\n        await supabase.auth\n          .getUser();\n\n'
AGE_USER_NEW = ''
AGE_ASSIGNED_OLD = '              assigned_by:\n                user?.id ??\n                null,\n'
AGE_ASSIGNED_NEW = '              assigned_by:\n                staff.userId,\n'
AGE_RETAIN_ANCHOR = '    /*\n     * Work out which selected feats already existed.\n     *\n     * Those rows stay untouched.\n     */\n'
AGE_RETAIN_BLOCK = '    /*\n     * If an Ancestry Feat remains selected while Ancestry changes,\n     * keep the ownership row but update its source Ancestry.\n     */\n    if (\n      selectedGiftIds.length >\n      0\n    ) {\n      const {\n        error:\n          sourceRaceUpdateError,\n      } = await supabase\n        .from(\n          "character_gifts",\n        )\n        .update({\n          source_race_id:\n            raceId,\n        })\n        .eq(\n          "character_id",\n          characterId,\n        )\n        .eq(\n          "acquisition_source",\n          "ancestry",\n        )\n        .in(\n          "gift_id",\n          selectedGiftIds,\n        );\n\n      if (\n        sourceRaceUpdateError\n      ) {\n        return {\n          ok: false,\n          error:\n            sourceRaceUpdateError.message,\n        };\n      }\n    }\n\n'


def fail(message):
    raise SystemExit(f"ERROR: {message}")


def read(path):
    if not path.exists():
        fail(f"missing {path}")
    return path.read_text(encoding="utf-8-sig")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail(
            f"{label}: expected exactly 1 match, found {count}. "
            "No files changed."
        )
    return text.replace(old, new, 1)


def dedupe_remove_npc_feat(text):
    marker = "export async function removeNpcFeatAdministration("
    starts = []
    pos = 0

    while True:
        idx = text.find(marker, pos)
        if idx < 0:
            break
        starts.append(idx)
        pos = idx + len(marker)

    if len(starts) == 1:
        return text

    if len(starts) != 2:
        fail(
            "removeNpcFeatAdministration: expected 1 or 2 declarations, "
            f"found {len(starts)}. No files changed."
        )

    first = starts[0]
    second = starts[1]

    # Compare the two declarations by taking the first declaration up to
    # the second, then the second declaration up to the next exported
    # function (or EOF). Whitespace around the boundary is ignored.
    first_block = text[first:second].rstrip()

    next_export = text.find(
        "\nexport async function ",
        second + len(marker),
    )

    if next_export < 0:
        second_block = text[second:].rstrip()
        tail_start = len(text)
    else:
        second_block = text[second:next_export].rstrip()
        tail_start = next_export

    if first_block != second_block:
        fail(
            "Two removeNpcFeatAdministration declarations exist but they "
            "are not identical; refusing to remove either automatically."
        )

    print(
        "Removing duplicate removeNpcFeatAdministration declaration."
    )

    return (
        text[:second]
        + text[tail_start:]
    )


def patch_form(text):
    if (
        "NPC/system Characters must use the form's native React Server Action"
        in text
    ):
        return text

    count = text.count(INSERT_HANDLER_MARKER)
    if count != 1:
        fail(
            f"submit handler: expected exactly 1 match, found {count}. "
            "No files changed."
        )

    return text.replace(
        INSERT_HANDLER_MARKER,
        HANDLER_GUARD,
        1,
    )


def patch_actions(text):
    if (
        'import { saveAdminCharacterAge } from "./age-actions";'
        not in text
    ):
        text = replace_once(
            text,
            ACTIONS_IMPORT_ANCHOR,
            ACTIONS_IMPORT_NEW,
            "saveAdminCharacterAge import",
        )

    if (
        "const npcAgeAndFeatResult ="
        not in text
    ):
        text = replace_once(
            text,
            NPC_META_ANCHOR,
            NPC_META_BLOCK
            + NPC_META_ANCHOR,
            "NPC age/ancestry-feat server save",
        )

    text = dedupe_remove_npc_feat(text)
    return text


def patch_age(text):
    text = replace_once(
        text,
        AGE_STAFF_OLD,
        AGE_STAFF_NEW,
        "capture staff session in age action",
    )

    text = replace_once(
        text,
        AGE_EXISTING_OLD,
        AGE_EXISTING_NEW,
        "load all existing Feat ownership rows",
    )

    text = replace_once(
        text,
        AGE_REMOVE_OLD,
        AGE_REMOVE_NEW,
        "only remove ancestry-owned Feats",
    )

    if AGE_USER_OLD in text:
        text = replace_once(
            text,
            AGE_USER_OLD,
            AGE_USER_NEW,
            "remove service-role auth lookup",
        )

    text = replace_once(
        text,
        AGE_ASSIGNED_OLD,
        AGE_ASSIGNED_NEW,
        "record assigning staff user",
    )

    if (
        "If an Ancestry Feat remains selected while Ancestry changes"
        not in text
    ):
        text = replace_once(
            text,
            AGE_RETAIN_ANCHOR,
            AGE_RETAIN_BLOCK
            + AGE_RETAIN_ANCHOR,
            "update retained Ancestry Feat source race",
        )

    return text


def backup():
    if BACKUP.exists():
        print(f"Backup already exists: {BACKUP}")
        return

    for source in [FORM, ACTIONS, AGE]:
        relative = source.relative_to(ROOT)
        dest = BACKUP / relative
        dest.parent.mkdir(
            parents=True,
            exist_ok=True,
        )
        shutil.copy2(source, dest)

    print(f"Backup created: {BACKUP}")


def main():
    try:
        head = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        head = "unknown"

    print(f"Current HEAD: {head}")
    if head != BASE:
        print(
            f"WARNING: built against {BASE}; current HEAD is {head}. "
            "The patch will still validate exact source blocks before writing."
        )

    # Transform everything in memory first.
    form_new = patch_form(read(FORM))
    actions_new = patch_actions(read(ACTIONS))
    age_new = patch_age(read(AGE))

    # Only now write files.
    backup()

    FORM.write_text(
        form_new,
        encoding="utf-8",
    )
    ACTIONS.write_text(
        actions_new,
        encoding="utf-8",
    )
    AGE.write_text(
        age_new,
        encoding="utf-8",
    )

    print(f"Patched: {FORM.relative_to(ROOT)}")
    print(f"Patched: {ACTIONS.relative_to(ROOT)}")
    print(f"Patched: {AGE.relative_to(ROOT)}")
    print("")
    print("What changed:")
    print("- NPC Stats & Feats no longer use the client pre-submit interception.")
    print("- Button-specific formAction now works for direct NPC Feat assign/remove.")
    print("- Main NPC save uses updateCharacterAdministration normally.")
    print("- NPC Age + Ancestry Feats are saved server-side from that main action.")
    print("- Old Ancestry Feats are removed correctly when Ancestry changes.")
    print("- Staff/general Feats are not accidentally removed.")
    print("- Duplicate removeNpcFeatAdministration is removed if present.")
    print("")
    print("No SQL changes required.")
    print("Nothing committed or pushed.")
    print("Now run: npm run build")


if __name__ == "__main__":
    main()
