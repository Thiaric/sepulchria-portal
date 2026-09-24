#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
from pathlib import Path

ROOT = Path.cwd()
BACKUP = ROOT / ".patch_backups" / "npc_system_character_admin_fix_31cd184"

FILES = [
    Path("app/(portal)/admin/characters/actions.ts"),
    Path("app/(portal)/admin/characters/[id]/page.tsx"),
]

def fail(msg: str):
    raise SystemExit(f"\nERROR: {msg}\n")

def load(rel: Path) -> str:
    p = ROOT / rel
    if not p.exists():
        fail(f"Missing file: {rel}")
    return p.read_text(encoding="utf-8")

def save(rel: Path, text: str):
    (ROOT / rel).write_text(text, encoding="utf-8")

def rep(text: str, old: str, new: str, label: str) -> str:
    n = text.count(old)
    if n != 1:
        fail(f"{label}: expected exactly 1 match, found {n}.")
    return text.replace(old, new, 1)

def backup():
    if BACKUP.exists():
        print(f"Backup already exists: {BACKUP}")
        return
    for rel in FILES:
        src = ROOT / rel
        if not src.exists():
            fail(f"Missing file: {rel}")
        dst = BACKUP / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
    print(f"Backup created: {BACKUP}")

def revert():
    if not BACKUP.exists():
        fail(f"No backup found at {BACKUP}")
    for rel in FILES:
        src = BACKUP / rel
        if src.exists():
            dst = ROOT / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            print(f"Restored {rel}")
    print("\nReverted. Nothing committed or pushed.")

def patch_actions():
    rel = Path("app/(portal)/admin/characters/actions.ts")
    s = load(rel)

    marker = '''  const raceId =
    readOptionalUuid(
      formData.get("raceId"),
    );
'''
    addition = '''  const admin =
    createPrivilegedClient();

  const {
    data: targetMeta,
    error: targetMetaError,
  } = await admin
    .from("characters")
    .select("is_system")
    .eq("id", characterId)
    .single();

  if (
    targetMetaError ||
    !targetMeta
  ) {
    throw new Error(
      `Unable to inspect character type: ${
        targetMetaError?.message ??
        "Character not found."
      }`,
    );
  }

  const isSystemCharacter =
    targetMeta.is_system === true;

'''
    if addition not in s:
        s = rep(s, marker, addition + marker, "insert system-character lookup")

    s = rep(
        s,
        '''  if (!firstName || !surname) {
    throw new Error(
      "First name and surname are required.",
    );
  }
''',
        '''  if (
    !firstName ||
    (
      !surname &&
      !isSystemCharacter
    )
  ) {
    throw new Error(
      isSystemCharacter
        ? "NPC name is required."
        : "First name and surname are required.",
    );
  }
''',
        "surname validation",
    )

    s = rep(
        s,
        '''  if (
    !gender ||
    ![
      "male",
      "female",
      "non_binary",
    ].includes(gender)
  ) {
    throw new Error(
      "A valid gender must be selected.",
    );
  }
''',
        '''  if (
    !isSystemCharacter &&
    (
      !gender ||
      ![
        "male",
        "female",
        "non_binary",
      ].includes(gender)
    )
  ) {
    throw new Error(
      "A valid gender must be selected.",
    );
  }

  if (
    isSystemCharacter &&
    gender &&
    ![
      "male",
      "female",
      "non_binary",
    ].includes(gender)
  ) {
    throw new Error(
      "Gender must be Male, Female or Non-binary when supplied.",
    );
  }
''',
        "gender validation",
    )

    s = rep(
        s,
        '''    if (!surname) {
      missingFields.push(
        "surname",
      );
    }
''',
        '''    if (
      !surname &&
      !isSystemCharacter
    ) {
      missingFields.push(
        "surname",
      );
    }
''',
        "approval surname requirement",
    )

    s = rep(
        s,
        '''      first_name: firstName,
      surname,
      pronouns,
      gender,
''',
        '''      first_name: firstName,
      surname:
        surname ??
        (
          isSystemCharacter
            ? ""
            : surname
        ),
      pronouns,
      gender,
''',
        "payload surname",
    )

    save(rel, s)

def patch_page():
    rel = Path("app/(portal)/admin/characters/[id]/page.tsx")
    s = load(rel)

    s = rep(
        s,
        '''  user_id: string;
  public_slug: string;
''',
        '''  user_id: string | null;
  is_system: boolean;
  public_slug: string;
''',
        "character row type",
    )

    s = rep(
        s,
        '''        id,
        user_id,
        public_slug,
''',
        '''        id,
        user_id,
        is_system,
        public_slug,
''',
        "character select is_system",
    )

    s = rep(
        s,
        '''                      name="surname"
                      required
                      maxLength={80}
''',
        '''                      name="surname"
                      required={!character.is_system}
                      maxLength={80}
''',
        "surname required flag",
    )

    s = rep(
        s,
        '''                      name="gender"
                      required
                      defaultValue={
''',
        '''                      name="gender"
                      required={!character.is_system}
                      defaultValue={
''',
        "gender required flag",
    )

    save(rel, s)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--revert", action="store_true")
    args = parser.parse_args()

    if args.revert:
        revert()
        return

    backup()
    patch_actions()
    patch_page()

    print("\nPATCH APPLIED LOCALLY ONLY.")
    print("Nothing was committed or pushed.")
    print("\nRestart Next.js:")
    print("npm run dev")
    print("\nRevert if needed:")
    print("python patch_npc_admin_system_fields.py --revert")

if __name__ == "__main__":
    main()
