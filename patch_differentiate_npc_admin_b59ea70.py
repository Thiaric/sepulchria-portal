#!/usr/bin/env python3
from pathlib import Path
import re, shutil, subprocess

ROOT = Path.cwd()
BASE = "b59ea70"
BACKUP = ROOT / ".patch_backups" / "differentiate_npc_admin_b59ea70"

PAGE = ROOT / "app/(portal)/admin/characters/[id]/page.tsx"
ACTIONS = ROOT / "app/(portal)/admin/characters/actions.ts"
AGE = ROOT / "app/(portal)/admin/characters/age-actions.ts"
FORM = ROOT / "components/admin/admin-character-edit-form.tsx"
CONDITIONS = ROOT / "app/(portal)/character/condition-actions.ts"

FILES = [PAGE, ACTIONS, AGE, FORM, CONDITIONS]
GET_CONTEXT = 'async function getContext(\n  requestedCharacterId: string,\n  scope: ConditionEditorScope,\n): Promise<ConditionContext> {\n  const supabase =\n    await createClient();\n\n  const {\n    data: { user },\n    error: userError,\n  } =\n    await supabase.auth.getUser();\n\n  if (userError || !user) {\n    throw new Error(\n      "Authentication required.",\n    );\n  }\n\n  const targetId =\n    requestedCharacterId.trim();\n\n  if (!targetId) {\n    throw new Error(\n      "Character not found.",\n    );\n  }\n\n  const admin =\n    privilegedClient();\n\n  if (scope === "admin") {\n    const staff =\n      await getStaffSession();\n\n    if (\n      !staff ||\n      !isConditionStaffRole(\n        staff.role,\n      )\n    ) {\n      throw new Error(\n        "Only the Owner, Administrators and Masters may manage Conditions here.",\n      );\n    }\n\n    const {\n      data: target,\n      error: targetError,\n    } = await admin\n      .from("characters")\n      .select(\n        "id, display_name, status, is_system",\n      )\n      .eq(\n        "id",\n        targetId,\n      )\n      .maybeSingle();\n\n    if (\n      targetError ||\n      !target\n    ) {\n      throw new Error(\n        targetError?.message ??\n          "Character or NPC not found.",\n      );\n    }\n\n    if (target.is_system) {\n      const {\n        data: npc,\n        error: npcError,\n      } = await admin\n        .from("npcs")\n        .select("id")\n        .eq(\n          "character_id",\n          target.id,\n        )\n        .maybeSingle();\n\n      if (\n        npcError ||\n        !npc\n      ) {\n        throw new Error(\n          npcError?.message ??\n            "NPC not found.",\n        );\n      }\n    }\n\n    return {\n      admin,\n      actorUserId:\n        user.id,\n      characterId:\n        target.id,\n      characterName:\n        target.display_name,\n      createdByRole:\n        staff.role,\n    };\n  }\n\n  const {\n    data: ownCharacter,\n    error: ownError,\n  } = await supabase\n    .from("characters")\n    .select(\n      "id, display_name, current_room_id, status, is_system",\n    )\n    .eq(\n      "user_id",\n      user.id,\n    )\n    .eq(\n      "is_system",\n      false,\n    )\n    .maybeSingle();\n\n  if (\n    ownError ||\n    !ownCharacter\n  ) {\n    throw new Error(\n      ownError?.message ??\n        "Your Character was not found.",\n    );\n  }\n\n  if (scope === "self") {\n    if (\n      targetId !==\n      ownCharacter.id\n    ) {\n      throw new Error(\n        "You can only manage your own Conditions.",\n      );\n    }\n\n    return {\n      admin,\n      actorUserId:\n        user.id,\n      characterId:\n        ownCharacter.id,\n      characterName:\n        ownCharacter\n          .display_name,\n      createdByRole:\n        "player",\n    };\n  }\n\n  const staff =\n    await getStaffSession();\n\n  if (\n    targetId ===\n    ownCharacter.id\n  ) {\n    return {\n      admin,\n      actorUserId:\n        user.id,\n      characterId:\n        ownCharacter.id,\n      characterName:\n        ownCharacter\n          .display_name,\n      createdByRole:\n        staff &&\n        isConditionStaffRole(\n          staff.role,\n        )\n          ? staff.role\n          : "player",\n    };\n  }\n\n  if (\n    !staff ||\n    !isConditionStaffRole(\n      staff.role,\n    )\n  ) {\n    throw new Error(\n      "You can only manage your own Conditions.",\n    );\n  }\n\n  if (\n    !ownCharacter\n      .current_room_id\n  ) {\n    throw new Error(\n      "You are not currently in a Location.",\n    );\n  }\n\n  const {\n    data: target,\n    error: targetError,\n  } = await admin\n    .from("characters")\n    .select(\n      "id, display_name, current_room_id, status, is_system",\n    )\n    .eq(\n      "id",\n      targetId,\n    )\n    .maybeSingle();\n\n  if (\n    targetError ||\n    !target ||\n    target.status !==\n      "approved"\n  ) {\n    throw new Error(\n      targetError?.message ??\n        "Character or NPC not found.",\n    );\n  }\n\n  if (target.is_system) {\n    const {\n      data: npc,\n      error: npcError,\n    } = await admin\n      .from("npcs")\n      .select(\n        "id, current_room_id, is_active, is_location_active",\n      )\n      .eq(\n        "character_id",\n        target.id,\n      )\n      .maybeSingle();\n\n    if (\n      npcError ||\n      !npc ||\n      npc.is_active !== true ||\n      npc.is_location_active !== true\n    ) {\n      throw new Error(\n        npcError?.message ??\n          "NPC not found or not active in Locations.",\n      );\n    }\n\n    if (\n      npc.current_room_id !==\n      ownCharacter\n        .current_room_id\n    ) {\n      throw new Error(\n        "That NPC is not in this Location.",\n      );\n    }\n  } else if (\n    target.current_room_id !==\n    ownCharacter\n      .current_room_id\n  ) {\n    throw new Error(\n      "That Character is not in this Location.",\n    );\n  }\n\n  return {\n    admin,\n    actorUserId:\n      user.id,\n    characterId:\n      target.id,\n    characterName:\n      target.display_name,\n    createdByRole:\n      staff.role,\n  };\n}\n\n'

def fail(message):
    raise SystemExit("\nERROR: " + message + "\n")

def read(path):
    if not path.exists():
        fail("Missing expected file: " + str(path))
    return path.read_text(encoding="utf-8-sig")

def rep(text, old, new, label, count=1):
    found = text.count(old)
    if found != count:
        fail(f"{label}: expected {count} match(es), found {found}. No files changed.")
    return text.replace(old, new, count)

def replace_function(text, start_marker, end_marker, replacement, label):
    start = text.find(start_marker)
    if start < 0:
        fail(label + ": start marker not found.")
    end = text.find(end_marker, start)
    if end < 0:
        fail(label + ": end marker not found.")
    return text[:start] + replacement + text[end:]

def patch_page(text):
    if 'import { createAdminClient } from "@/lib/supabase/admin";' not in text:
        text = rep(
            text,
            'import { createClient } from "@/lib/supabase/server";',
            'import { createClient } from "@/lib/supabase/server";\nimport { createAdminClient } from "@/lib/supabase/admin";',
            "admin client import",
        )

    if "  age: number | null;" not in text:
        text = rep(
            text,
            "  title: string | null;\n  race_id: string | null;",
            "  title: string | null;\n  age: number | null;\n  race_id: string | null;",
            "CharacterRow age type",
        )

    if "\n        age,\n        race_id," not in text:
        text = rep(
            text,
            "        title,\n        race_id,",
            "        title,\n        age,\n        race_id,",
            "character age select",
        )

    marker = "  const character =\n    characterResult.data as unknown as\n      CharacterRow;\n\n"
    if "const isNpc =" not in text:
        block = '''  const npcIdentityResult =
    await createAdminClient()
      .from("npcs")
      .select("id, character_id")
      .eq("character_id", id)
      .maybeSingle();

  if (npcIdentityResult.error) {
    throw new Error(
      `Unable to determine whether this record is an NPC: ${npcIdentityResult.error.message}`,
    );
  }

  const isNpc =
    Boolean(
      npcIdentityResult.data,
    );

'''
        text = rep(text, marker, marker + block, "actual NPC identity")

    count = text.count("character.is_system")
    if count not in (0, 7):
        fail(f"page NPC branching: expected 7 or 0 character.is_system occurrences, found {count}.")
    if count == 7:
        text = text.replace("character.is_system", "isNpc")

    old_href = "    href:\n      `/characters/${character.public_slug}?from=admin`,"
    new_href = "    href:\n      isNpc\n        ? `/npcs/${character.id}`\n        : `/characters/${character.public_slug}?from=admin`,"
    if old_href in text:
        text = rep(text, old_href, new_href, "NPC admin public sheet route")

    old_title = "    title: `${getDisplayName(character)}'s character sheet`,"
    new_title = "    title: isNpc\n      ? `${getDisplayName(character)}'s NPC sheet`\n      : `${getDisplayName(character)}'s character sheet`,"
    if old_title in text:
        text = rep(text, old_title, new_title, "NPC sheet modal title")

    if "Character administration" in text:
        text = text.replace(
            "Character administration",
            '{isNpc ? "NPC administration" : "Character administration"}',
            1,
        )

    return text

def patch_actions(text):
    start = text.find("export async function updateCharacterAdministration(")
    end = text.find("export async function deleteCharacterAdministration(", start)
    if start < 0 or end < 0:
        fail("Unable to isolate updateCharacterAdministration.")

    before, body, after = text[:start], text[start:end], text[end:]

    if "const isNpcCharacter =" not in body:
        anchor = "  const isSystemCharacter =\n    targetMeta.is_system === true;\n\n"
        addition = '''  const {
    data: linkedNpc,
    error: linkedNpcError,
  } = await admin
    .from("npcs")
    .select("id")
    .eq(
      "character_id",
      characterId,
    )
    .maybeSingle();

  if (linkedNpcError) {
    throw new Error(
      `Unable to inspect NPC identity: ${linkedNpcError.message}`,
    );
  }

  const isNpcCharacter =
    isSystemCharacter &&
    Boolean(linkedNpc);

'''
        body = rep(body, anchor, anchor + addition, "linked NPC identity in main save")

    body = body.replace("!isSystemCharacter", "!isNpcCharacter")
    body = body.replace("isSystemCharacter\n            ? \"\"", "isNpcCharacter\n            ? \"\"")
    body = body.replace("if (isSystemCharacter) {\n    const npcAgeAndFeatResult", "if (isNpcCharacter) {\n    const npcAgeAndFeatResult")
    body = body.replace("if (isSystemCharacter) {\n    const npcDisplayName", "if (isNpcCharacter) {\n    const npcDisplayName")

    pattern = re.compile(
        r'''\n    const \{\s*error: displayNameSyncError,\s*\} = await admin\s*\.from\("characters"\)\s*\.update\(\{\s*display_name: npcDisplayName,\s*\}\)\s*\.eq\("id", characterId\)\s*\.eq\("is_system", true\);\s*if \(displayNameSyncError\) \{\s*throw new Error\(\s*`NPC Character saved, but its display name could not be synchronised: \$\{displayNameSyncError\.message\}`,\s*\);\s*\}\s*''',
        re.MULTILINE,
    )
    body = pattern.sub("", body, count=1)

    return before + body + after

def patch_age(text):
    old = '''    const {
      data: targetCharacter,
      error: targetCharacterError,
    } = await supabase
      .from("characters")
      .select("is_system")
      .eq("id", characterId)
      .maybeSingle();

    if (
      targetCharacterError ||
      !targetCharacter
    ) {
      return {
        ok: false,
        error:
          targetCharacterError?.message ??
          "Character not found.",
      };
    }

    const isSystemCharacter =
      targetCharacter.is_system === true;
'''
    if old in text:
        new = '''    const [
      targetCharacterResult,
      npcIdentityResult,
    ] = await Promise.all([
      supabase
        .from("characters")
        .select("is_system")
        .eq("id", characterId)
        .maybeSingle(),

      supabase
        .from("npcs")
        .select("id")
        .eq(
          "character_id",
          characterId,
        )
        .maybeSingle(),
    ]);

    const targetCharacter =
      targetCharacterResult.data;

    if (
      targetCharacterResult.error ||
      !targetCharacter
    ) {
      return {
        ok: false,
        error:
          targetCharacterResult.error?.message ??
          "Character not found.",
      };
    }

    if (npcIdentityResult.error) {
      return {
        ok: false,
        error:
          `Unable to inspect NPC identity: ${npcIdentityResult.error.message}`,
      };
    }

    const isNpcCharacter =
      targetCharacter.is_system === true &&
      Boolean(
        npcIdentityResult.data,
      );
'''
        text = rep(text, old, new, "age action NPC identity")

    text = text.replace("!isSystemCharacter", "!isNpcCharacter")

    if '    await requireStaffCapability(\n      "character_age_admin",\n    );' in text:
        text = rep(
            text,
            '    await requireStaffCapability(\n      "character_age_admin",\n    );',
            '    const staff =\n      await requireStaffCapability(\n        "character_age_admin",\n      );',
            "capture staff in age action",
        )

    auth_lookup = '''      const {
        data: {
          user,
        },
      } =
        await supabase.auth
          .getUser();

'''
    if auth_lookup in text:
        text = text.replace(auth_lookup, "", 1)

    text = text.replace(
        "              assigned_by:\n                user?.id ??\n                null,",
        "              assigned_by:\n                staff.userId,",
    )

    return text

def patch_form(text):
    old_disabled = '''          disabled={
            loadingAge ||
            !selectedRace ||
            (
              selectedRace.min_age ===
                null &&
              !allowMissingAge
            )
          }'''
    new_disabled = '''          disabled={
            !allowMissingAge &&
            (
              loadingAge ||
              !selectedRace ||
              selectedRace.min_age ===
                null
            )
          }'''
    if old_disabled in text:
        text = rep(text, old_disabled, new_disabled, "NPC age input unlock")
    else:
        older = '''          disabled={
            loadingAge ||
            !selectedRace ||
            selectedRace.min_age ===
              null
          }'''
        if older in text:
            text = rep(text, older, new_disabled, "NPC age input unlock legacy form")

    marker = "  async function handleSubmit(\n    event: FormEvent<HTMLFormElement>,\n  ) {\n"
    guard = '''  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    /*
     * NPCs use native React Server Action submission so button-specific
     * formAction handlers and the main Save action are not swallowed by
     * the Character-only Age pre-submit pipeline.
     */
    if (allowMissingAge) {
      return;
    }

'''
    if "NPCs use native React Server Action submission" not in text:
        text = rep(text, marker, guard, "NPC native server-action submit")

    return text

def patch_conditions(text):
    return replace_function(
        text,
        "async function getContext(",
        "async function readConditions(",
        GET_CONTEXT,
        "Condition target context",
    )

def backup():
    if BACKUP.exists():
        print("Backup already exists:", BACKUP)
        return
    for source in FILES:
        rel = source.relative_to(ROOT)
        dest = BACKUP / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, dest)
    print("Backup created:", BACKUP)

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

    print("Current HEAD:", head)
    if head != BASE:
        print(f"WARNING: built from {BASE}; current HEAD is {head}. Exact source structures are still validated.")

    transformed = {
        PAGE: patch_page(read(PAGE)),
        ACTIONS: patch_actions(read(ACTIONS)),
        AGE: patch_age(read(AGE)),
        FORM: patch_form(read(FORM)),
        CONDITIONS: patch_conditions(read(CONDITIONS)),
    }

    backup()

    for path, content in transformed.items():
        path.write_text(content, encoding="utf-8")
        print("Patched:", path.relative_to(ROOT))

    print("")
    print("NPC distinction now means: characters.is_system = true AND linked npcs.character_id row exists.")
    print("Other system records are not treated as NPCs.")
    print("")
    print("Fixed generated display_name, NPC Conditions, NPC Age lock, NPC-specific page branching, and NPC submit handling.")
    print("No SQL changes required.")
    print("Nothing committed or pushed.")
    print("Now run: npm run build")

if __name__ == "__main__":
    main()
