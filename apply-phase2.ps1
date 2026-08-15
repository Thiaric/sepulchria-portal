$ErrorActionPreference = "Stop"

function Read-Utf8File([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Required file not found: $Path"
    }

    return [System.IO.File]::ReadAllText(
        (Resolve-Path -LiteralPath $Path),
        [System.Text.UTF8Encoding]::new($false)
    )
}

function Write-Utf8File([string]$Path, [string]$Content) {
    [System.IO.File]::WriteAllText(
        (Resolve-Path -LiteralPath $Path),
        $Content,
        [System.Text.UTF8Encoding]::new($false)
    )
}

function Replace-Exact(
    [string]$Content,
    [string]$Old,
    [string]$New,
    [string]$Label,
    [int]$ExpectedCount = 1
) {
    $count = ([regex]::Matches(
        $Content,
        [regex]::Escape($Old)
    )).Count

    if ($count -ne $ExpectedCount) {
        throw "${Label}: expected $ExpectedCount exact match(es), found $count. No changes were written."
    }

    return $Content.Replace($Old, $New)
}

$actionsPath = "app/(portal)/admin/races/actions.ts"
$pagePath = "app/(portal)/admin/races/page.tsx"
$characterPagePath = "app/(portal)/character/page.tsx"

# -------------------------------------------------------------------
# 1. app/(portal)/admin/races/actions.ts
# -------------------------------------------------------------------

$actions = Read-Utf8File $actionsPath

$old = @'
function getCheckbox(
  formData: FormData,
  fieldName: string,
): boolean {
'@

$new = @'
function getAttributeModifier(
  formData: FormData,
  fieldName: string,
  label: string,
): number {
  const value =
    formData.get(fieldName);

  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return 0;
  }

  const parsedValue =
    Number(value);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < -10 ||
    parsedValue > 10
  ) {
    throw new Error(
      `${label} modifier must be a whole number between -10 and 10.`,
    );
  }

  return parsedValue;
}

function getAttributeModifiers(
  formData: FormData,
) {
  return {
    muscles_modifier:
      getAttributeModifier(
        formData,
        "musclesModifier",
        "Muscles",
      ),
    reflexes_modifier:
      getAttributeModifier(
        formData,
        "reflexesModifier",
        "Reflexes",
      ),
    vigour_modifier:
      getAttributeModifier(
        formData,
        "vigourModifier",
        "Vigour",
      ),
    shrewd_modifier:
      getAttributeModifier(
        formData,
        "shrewdModifier",
        "Shrewd",
      ),
    brains_modifier:
      getAttributeModifier(
        formData,
        "brainsModifier",
        "Brains",
      ),
    presence_modifier:
      getAttributeModifier(
        formData,
        "presenceModifier",
        "Presence",
      ),
  };
}

function getCheckbox(
  formData: FormData,
  fieldName: string,
): boolean {
'@

$actions = Replace-Exact $actions $old $new "Add ancestry modifier reader"

$old = @'
    const isSelectable = getCheckbox(
      formData,
      "isSelectable",
    );
'@

$new = @'
    const isSelectable = getCheckbox(
      formData,
      "isSelectable",
    );

    const attributeModifiers =
      getAttributeModifiers(
        formData,
      );
'@

$actions = Replace-Exact $actions $old $new "Read ancestry modifiers in create/update" 2

$old = @'
        is_active: isActive,
        is_selectable: isSelectable,
        updated_at:
'@

$new = @'
        is_active: isActive,
        is_selectable: isSelectable,
        ...attributeModifiers,
        updated_at:
'@

$actions = Replace-Exact $actions $old $new "Save ancestry modifiers on create"

$old = @'
          is_active: isActive,
          is_selectable: isSelectable,
          updated_at:
'@

$new = @'
          is_active: isActive,
          is_selectable: isSelectable,
          ...attributeModifiers,
          updated_at:
'@

$actions = Replace-Exact $actions $old $new "Save ancestry modifiers on update"

# -------------------------------------------------------------------
# 2. app/(portal)/admin/races/page.tsx
# -------------------------------------------------------------------

$page = Read-Utf8File $pagePath

$old = @'
  is_active: boolean;
  is_selectable: boolean;
  sort_order: number;
'@

$new = @'
  is_active: boolean;
  is_selectable: boolean;
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  shrewd_modifier: number;
  brains_modifier: number;
  presence_modifier: number;
  sort_order: number;
'@

$page = Replace-Exact $page $old $new "Extend ancestry row types" 2

$old = @'
      is_active,
      is_selectable,
      sort_order,
'@

$new = @'
      is_active,
      is_selectable,
      muscles_modifier,
      reflexes_modifier,
      vigour_modifier,
      shrewd_modifier,
      brains_modifier,
      presence_modifier,
      sort_order,
'@

$page = Replace-Exact $page $old $new "Load ancestry modifiers"

$old = @'
      is_active: race.is_active,
      is_selectable: race.is_selectable,
      sort_order: race.sort_order,
'@

$new = @'
      is_active: race.is_active,
      is_selectable: race.is_selectable,
      muscles_modifier:
        race.muscles_modifier,
      reflexes_modifier:
        race.reflexes_modifier,
      vigour_modifier:
        race.vigour_modifier,
      shrewd_modifier:
        race.shrewd_modifier,
      brains_modifier:
        race.brains_modifier,
      presence_modifier:
        race.presence_modifier,
      sort_order: race.sort_order,
'@

$page = Replace-Exact $page $old $new "Map ancestry modifiers"

$old = @'
              <AdminField label="Colour">
                <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-2">
                  <input
                    type="color"
                    defaultValue="#8c704b"
                    aria-label="Race colour picker"
                    className="h-[46px] w-full border border-[#60482e]/55 bg-[#100c09] p-1"
                  />

                  <input
                    type="text"
                    name="colour"
                    maxLength={32}
                    placeholder="#8c704b"
                    className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                  />
                </div>
              </AdminField>
'@

$new = @'
              <AdminField label="Colour">
                <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-2">
                  <input
                    type="color"
                    defaultValue="#8c704b"
                    aria-label="Race colour picker"
                    className="h-[46px] w-full border border-[#60482e]/55 bg-[#100c09] p-1"
                  />

                  <input
                    type="text"
                    name="colour"
                    maxLength={32}
                    placeholder="#8c704b"
                    className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                  />
                </div>
              </AdminField>

              <div className="md:col-span-2">
                <AttributeModifierFields />
              </div>
'@

$page = Replace-Exact $page $old $new "Add ancestry modifiers to create form"

$old = @'
                      <AdminField label="Colour">
                        <input
                          type="text"
                          name="colour"
                          maxLength={32}
                          defaultValue={
                            race.colour ?? ""
                          }
                          placeholder="#8c704b"
                          className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                        />
                      </AdminField>
'@

$new = @'
                      <AdminField label="Colour">
                        <input
                          type="text"
                          name="colour"
                          maxLength={32}
                          defaultValue={
                            race.colour ?? ""
                          }
                          placeholder="#8c704b"
                          className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                        />
                      </AdminField>

                      <div className="md:col-span-2">
                        <AttributeModifierFields
                          values={{
                            muscles:
                              race.muscles_modifier,
                            reflexes:
                              race.reflexes_modifier,
                            vigour:
                              race.vigour_modifier,
                            shrewd:
                              race.shrewd_modifier,
                            brains:
                              race.brains_modifier,
                            presence:
                              race.presence_modifier,
                          }}
                        />
                      </div>
'@

$page = Replace-Exact $page $old $new "Add ancestry modifiers to edit form"

$old = @'
function AdminField({
  label,
  children,
}: {
'@

$new = @'
const ATTRIBUTE_MODIFIER_FIELDS = [
  {
    key: "muscles",
    label: "Muscles",
  },
  {
    key: "reflexes",
    label: "Reflexes",
  },
  {
    key: "vigour",
    label: "Vigour",
  },
  {
    key: "shrewd",
    label: "Shrewd",
  },
  {
    key: "brains",
    label: "Brains",
  },
  {
    key: "presence",
    label: "Presence",
  },
] as const;

function AttributeModifierFields({
  values,
}: {
  values?: Partial<
    Record<
      (typeof ATTRIBUTE_MODIFIER_FIELDS)[number]["key"],
      number
    >
  >;
}) {
  return (
    <section className="border border-[#60482e]/45 bg-[#100c09] p-4">
      <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
        Attribute modifiers
      </p>

      <p className="mt-2 text-[11px] leading-5 text-[#8f8271]">
        These values are added to the character&apos;s base attributes. Order Level modifiers are applied separately.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ATTRIBUTE_MODIFIER_FIELDS.map(
          ({ key, label }) => (
            <label
              key={key}
              className="block"
            >
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.12em] text-[#776956]">
                {label}
              </span>

              <input
                type="number"
                name={`${key}Modifier`}
                min={-10}
                max={10}
                step={1}
                defaultValue={
                  values?.[key] ?? 0
                }
                className="w-full border border-[#60482e]/55 bg-[#15100d] px-2 py-2 text-center text-sm text-[#d7c4a5] outline-none focus:border-[#9b7446]"
              />
            </label>
          ),
        )}
      </div>

      <p className="mt-3 text-[9px] leading-5 text-[#756957]">
        Effective attribute = Base + Ancestry modifier + Order modifier.
      </p>
    </section>
  );
}

function AdminField({
  label,
  children,
}: {
'@

$page = Replace-Exact $page $old $new "Add ancestry modifier field component"

# -------------------------------------------------------------------
# 3. app/(portal)/character/page.tsx
#    The player's own character page must display EFFECTIVE values,
#    while /character/edit continues to show locked BASE values.
# -------------------------------------------------------------------

$characterPage = Read-Utf8File $characterPagePath

$old = @'
import { createClient } from "@/lib/supabase/server";
'@

$new = @'
import { getEffectiveCharacterAttributes } from "@/lib/characters/get-effective-character-attributes";
import { createClient } from "@/lib/supabase/server";
'@

$characterPage = Replace-Exact $characterPage $old $new "Import effective attribute helper"

$old = @'
  if (!character) {
    redirect("/character/create");
  }

  const notice = getPageNotice(params);
'@

$new = @'
  if (!character) {
    redirect("/character/create");
  }

  const effectiveAttributes =
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

  const characterWithEffectiveAttributes = {
    ...character,
    ...effectiveAttributes,
  };

  const notice = getPageNotice(params);
'@

$characterPage = Replace-Exact $characterPage $old $new "Calculate effective attributes on own character page"

$old = @'
        character as unknown as CharacterProfile
'@

$new = @'
        characterWithEffectiveAttributes as unknown as CharacterProfile
'@

$characterPage = Replace-Exact $characterPage $old $new "Display effective attributes on own character page"

# Only write after EVERY replacement has passed.
Write-Utf8File $actionsPath $actions
Write-Utf8File $pagePath $page
Write-Utf8File $characterPagePath $characterPage

Write-Host ""
Write-Host "SEPULCHRIA Phase 2 patches applied successfully." -ForegroundColor Green
Write-Host "Edited:"
Write-Host "  - $actionsPath"
Write-Host "  - $pagePath"
Write-Host "  - $characterPagePath"
Write-Host ""
Write-Host "Now copy the replacement/new files from the bundle, run the SQL migration, then run npm run build."
