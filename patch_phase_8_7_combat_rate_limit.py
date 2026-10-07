from pathlib import Path

path = Path("app/(portal)/game/opposed-actions.ts")

text = path.read_text(encoding="utf-8")

# ------------------------------------------------------------
# Import existing rate limiter
# ------------------------------------------------------------

old_import = 'import { createClient } from "@/lib/supabase/server";'

new_import = '''import { createClient } from "@/lib/supabase/server";
import { consumeSecurityRateLimit } from "@/lib/security/rate-limit";'''

if new_import not in text:
    if old_import not in text:
        raise SystemExit("Could not find Supabase server import.")

    text = text.replace(
        old_import,
        new_import,
        1,
    )


# ------------------------------------------------------------
# Helper
# ------------------------------------------------------------

marker = 'function field(formData: FormData, name: string) {'

helper = '''async function enforceCombatRateLimit(
  characterId: string,
) {
  const result =
    await consumeSecurityRateLimit({
      scope: "combat_action_character",
      identifier:
        `character:${characterId}`,
      limit: 30,
      windowSeconds: 60,
    });

  if (!result.allowed) {
    throw new Error(
      "You are performing combat actions too quickly. Please wait a moment before trying again.",
    );
  }
}


function field(formData: FormData, name: string) {'''

if helper not in text:
    if marker not in text:
        raise SystemExit(
            "Could not find field() helper.",
        )

    text = text.replace(
        marker,
        helper,
        1,
    )


# ------------------------------------------------------------
# Add limiter immediately after actor resolution.
# Covers player Characters and NPC actors independently.
# ------------------------------------------------------------

function_names = [
    "startAttributeOpposedAction",
    "startUnarmedAttack",
    "startWeaponOpposedAttack",
    "counterOpposedAction",
]

for function_name in function_names:
    start = text.find(
        f"export async function {function_name}",
    )

    if start < 0:
        raise SystemExit(
            f"Could not find {function_name}."
        )

    next_export = text.find(
        "export async function ",
        start + 10,
    )

    end = (
        len(text)
        if next_export < 0
        else next_export
    )

    block = text[start:end]

    if "enforceCombatRateLimit(" in block:
        continue

    candidates = [
        "const { character } = await ownedCharacter(formData);",
        "const { supabase, character } = await ownedCharacter(formData);",
    ]

    found = None

    for candidate in candidates:
        if candidate in block:
            found = candidate
            break

    if found is None:
        raise SystemExit(
            f"Could not find ownedCharacter() call in {function_name}."
        )

    replacement = (
        found
        + '''

    await enforceCombatRateLimit(
      character.id,
    );'''
    )

    block = block.replace(
        found,
        replacement,
        1,
    )

    text = (
        text[:start]
        + block
        + text[end:]
    )


path.write_text(
    text,
    encoding="utf-8",
)

print(
    "Patched app/(portal)/game/opposed-actions.ts"
)
