from pathlib import Path

ROOT = Path.cwd()

def read(rel):
    path = ROOT / rel
    if not path.exists():
        raise SystemExit(
            f"ERROR: Could not find {rel}. Run this script from the repository root."
        )
    return path, path.read_text(encoding="utf-8")

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(
            f"ERROR: Could not find the expected code for: {label}\n"
            "Your pushed files may have changed. No further edits were made."
        )
    return text.replace(old, new, 1)

# 1) Shared resolver ---------------------------------------------------
helper_rel = "lib/characters/get-effective-character-attributes.ts"
helper_path = ROOT / helper_rel
if not helper_path.exists():
    raise SystemExit(f"ERROR: Could not find {helper_rel}.")

helper_content = r'''import "server-only";

import { createClient } from "@/lib/supabase/server";

export type CharacterAttributeValues = {
  muscles: number | null;
  reflexes: number | null;
  vigor: number | null;
  brains: number | null;
  shrewd: number | null;
  presence_score: number | null;
};

export type CharacterAttributeBreakdownEntry = {
  base: number | null;
  ancestry: number;
  order: number;
  effective: number | null;
};

export type CharacterAttributeBreakdown = {
  muscles: CharacterAttributeBreakdownEntry;
  reflexes: CharacterAttributeBreakdownEntry;
  vigor: CharacterAttributeBreakdownEntry;
  brains: CharacterAttributeBreakdownEntry;
  shrewd: CharacterAttributeBreakdownEntry;
  presence_score: CharacterAttributeBreakdownEntry;
};

type Relation<T> =
  | T
  | T[]
  | null;

type ModifierRow = {
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  shrewd_modifier: number;
  brains_modifier: number;
  presence_modifier: number;
};

function one<T>(
  value: Relation<T>,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function makeBreakdown(
  base: number | null,
  ancestry: number,
  order: number,
): CharacterAttributeBreakdownEntry {
  return {
    base,
    ancestry,
    order,
    effective:
      base === null
        ? null
        : base + ancestry + order,
  };
}

export async function getCharacterAttributeBreakdown(
  characterId: string,
  baseAttributes: CharacterAttributeValues,
): Promise<CharacterAttributeBreakdown> {
  const supabase =
    await createClient();

  const [
    {
      data: characterData,
      error: characterError,
    },
    {
      data: membershipData,
      error: membershipError,
    },
  ] = await Promise.all([
    supabase
      .from("characters")
      .select(`
        race:races!characters_race_id_fkey(
          muscles_modifier,
          reflexes_modifier,
          vigour_modifier,
          shrewd_modifier,
          brains_modifier,
          presence_modifier
        )
      `)
      .eq("id", characterId)
      .maybeSingle(),

    supabase
      .from("order_memberships")
      .select(`
        level:order_levels!order_memberships_order_level_id_fkey(
          muscles_modifier,
          reflexes_modifier,
          vigour_modifier,
          shrewd_modifier,
          brains_modifier,
          presence_modifier
        )
      `)
      .eq("character_id", characterId)
      .limit(1)
      .maybeSingle(),
  ]);

  if (characterError) {
    throw new Error(
      `Unable to load ancestry attribute modifiers: ${characterError.message}`,
    );
  }

  if (membershipError) {
    throw new Error(
      `Unable to load Order attribute modifiers: ${membershipError.message}`,
    );
  }

  const ancestry = one(
    (characterData?.race ?? null) as
      Relation<ModifierRow>,
  );

  const orderLevel = one(
    (membershipData?.level ?? null) as
      Relation<ModifierRow>,
  );

  return {
    muscles: makeBreakdown(
      baseAttributes.muscles,
      ancestry?.muscles_modifier ?? 0,
      orderLevel?.muscles_modifier ?? 0,
    ),
    reflexes: makeBreakdown(
      baseAttributes.reflexes,
      ancestry?.reflexes_modifier ?? 0,
      orderLevel?.reflexes_modifier ?? 0,
    ),
    vigor: makeBreakdown(
      baseAttributes.vigor,
      ancestry?.vigour_modifier ?? 0,
      orderLevel?.vigour_modifier ?? 0,
    ),
    brains: makeBreakdown(
      baseAttributes.brains,
      ancestry?.brains_modifier ?? 0,
      orderLevel?.brains_modifier ?? 0,
    ),
    shrewd: makeBreakdown(
      baseAttributes.shrewd,
      ancestry?.shrewd_modifier ?? 0,
      orderLevel?.shrewd_modifier ?? 0,
    ),
    presence_score: makeBreakdown(
      baseAttributes.presence_score,
      ancestry?.presence_modifier ?? 0,
      orderLevel?.presence_modifier ?? 0,
    ),
  };
}

export async function getEffectiveCharacterAttributes(
  characterId: string,
  baseAttributes: CharacterAttributeValues,
): Promise<CharacterAttributeValues> {
  const breakdown =
    await getCharacterAttributeBreakdown(
      characterId,
      baseAttributes,
    );

  return {
    muscles:
      breakdown.muscles.effective,
    reflexes:
      breakdown.reflexes.effective,
    vigor:
      breakdown.vigor.effective,
    brains:
      breakdown.brains.effective,
    shrewd:
      breakdown.shrewd.effective,
    presence_score:
      breakdown.presence_score.effective,
  };
}
'''
helper_path.write_text(helper_content, encoding="utf-8")

# 2) /game/page.tsx ---------------------------------------------------
page_rel = "app/(portal)/game/page.tsx"
page_path, page = read(page_rel)

page = replace_once(
    page,
    'import { createClient } from "@/lib/supabase/server";\n',
    'import { createClient } from "@/lib/supabase/server";\n'
    'import { getCharacterAttributeBreakdown } from "@/lib/characters/get-effective-character-attributes";\n',
    "game page effective attribute import",
)

page = replace_once(
    page,
    '''  const room = rawRoom as RoomRelation;

  const roomArea =
''',
    '''  const room = rawRoom as RoomRelation;

  const attributeBreakdown =
    await getCharacterAttributeBreakdown(
      character.id,
      {
        muscles: character.muscles,
        reflexes: character.reflexes,
        vigor: character.vigor,
        brains: character.brains,
        shrewd: character.shrewd,
        presence_score:
          character.presence_score,
      },
    );

  const roomArea =
''',
    "game page attribute breakdown calculation",
)

page = replace_once(
    page,
    '''    <RoomChatForm
      attributes={{
        muscles: character.muscles,
        reflexes: character.reflexes,
        vigor: character.vigor,
        brains: character.brains,
        shrewd: character.shrewd,
        presence_score:
          character.presence_score,
      }}
      presentCharacters={
        presentCharacters
      }
''',
    '''    <RoomChatForm
      attributes={{
        muscles:
          attributeBreakdown.muscles.effective,
        reflexes:
          attributeBreakdown.reflexes.effective,
        vigor:
          attributeBreakdown.vigor.effective,
        brains:
          attributeBreakdown.brains.effective,
        shrewd:
          attributeBreakdown.shrewd.effective,
        presence_score:
          attributeBreakdown.presence_score.effective,
      }}
      attributeBreakdown={
        attributeBreakdown
      }
      presentCharacters={
        presentCharacters
      }
''',
    "RoomChatForm effective attributes",
)

page_path.write_text(page, encoding="utf-8")

# 3) RoomChatForm ------------------------------------------------------
form_rel = "app/(portal)/game/components/RoomChatForm.tsx"
form_path, form = read(form_rel)

form = replace_once(
    form,
    '''const ATTRIBUTE_LABELS: Record<
  CharacterAttributeKey,
  string
> = {
  muscles: "Muscles",
  reflexes: "Reflexes",
  vigor: "Vigor",
  brains: "Brains",
  shrewd: "Shrewd",
  presence_score: "Presence",
};
''',
    '''const ATTRIBUTE_LABELS: Record<
  CharacterAttributeKey,
  string
> = {
  muscles: "Muscles",
  reflexes: "Reflexes",
  vigor: "Vigour",
  brains: "Brains",
  shrewd: "Shrewd",
  presence_score: "Presence",
};

type AttributeBreakdownEntry = {
  base: number | null;
  ancestry: number;
  order: number;
  effective: number | null;
};

type AttributeBreakdown = Record<
  CharacterAttributeKey,
  AttributeBreakdownEntry
>;

function formatSigned(
  value: number,
): string {
  return value >= 0
    ? `+${value}`
    : String(value);
}
''',
    "chat breakdown types and Vigour spelling",
)

form = replace_once(
    form,
    '''export default function RoomChatForm({
  attributes,
  presentCharacters,
  canUseFate,
}: {
  attributes: CharacterAttributes;
  presentCharacters: PresentRoomCharacter[];
  canUseFate: boolean;
}) {
''',
    '''export default function RoomChatForm({
  attributes,
  attributeBreakdown,
  presentCharacters,
  canUseFate,
}: {
  attributes: CharacterAttributes;
  attributeBreakdown: AttributeBreakdown;
  presentCharacters: PresentRoomCharacter[];
  canUseFate: boolean;
}) {
''',
    "RoomChatForm breakdown prop",
)

form = replace_once(
    form,
    '''            Number.isInteger(score) &&
            Number(score) >= 1 &&
            Number(score) <= 8,
''',
    '''            Number.isInteger(score) &&
            Number(score) >= 1,
''',
    "effective attribute validation",
)

form = replace_once(
    form,
    '''                    const score =
                      attributes[
                        option.attribute
                      ];

                    return (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label} (
                        {
                          ATTRIBUTE_LABELS[
                            option.attribute
                          ]
                        }{" "}
                        +{score ?? "—"})
                      </option>
                    );
''',
    '''                    const score =
                      attributes[
                        option.attribute
                      ];

                    const breakdown =
                      attributeBreakdown[
                        option.attribute
                      ];

                    const effectiveLabel =
                      score === null
                        ? "—"
                        : formatSigned(score);

                    return (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label} — {
                          ATTRIBUTE_LABELS[
                            option.attribute
                          ]
                        }: {breakdown.base ?? "—"} Base{" "}
                        {formatSigned(
                          breakdown.ancestry,
                        )} Ancestry{" "}
                        {formatSigned(
                          breakdown.order,
                        )} Order ={" "}
                        {effectiveLabel}
                      </option>
                    );
''',
    "chat check dropdown breakdown",
)

form_path.write_text(form, encoding="utf-8")

# 4) actions.ts --------------------------------------------------------
actions_rel = "app/(portal)/game/actions.ts"
actions_path, actions = read(actions_rel)

actions = replace_once(
    actions,
    'import { createClient } from "@/lib/supabase/server";\n',
    'import { createClient } from "@/lib/supabase/server";\n'
    'import { getEffectiveCharacterAttributes } from "@/lib/characters/get-effective-character-attributes";\n',
    "server action effective attribute import",
)

actions = replace_once(
    actions,
    '''    const attributeValue =
      character[definition.attribute];

    if (
      attributeValue === null ||
      !Number.isInteger(attributeValue) ||
      attributeValue < 1 ||
      attributeValue > 8
    ) {
''',
    '''    const effectiveAttributes =
      await getEffectiveCharacterAttributes(
        character.id,
        {
          muscles: character.muscles,
          reflexes: character.reflexes,
          vigor: character.vigor,
          brains: character.brains,
          shrewd: character.shrewd,
          presence_score:
            character.presence_score,
        },
      );

    const attributeValue =
      effectiveAttributes[
        definition.attribute
      ];

    if (
      attributeValue === null ||
      !Number.isInteger(attributeValue) ||
      attributeValue < 1
    ) {
''',
    "server-side effective attribute check",
)

actions = replace_once(
    actions,
    '      vigor: "Vigor",\n',
    '      vigor: "Vigour",\n',
    "server-side Vigour spelling",
)

actions_path.write_text(actions, encoding="utf-8")

print("SUCCESS")
print("Updated:")
print(f"  - {helper_rel}")
print(f"  - {page_rel}")
print(f"  - {form_rel}")
print(f"  - {actions_rel}")
print()
print("Now run: npm run build")
