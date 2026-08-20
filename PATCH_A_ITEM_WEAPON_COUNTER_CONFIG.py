from pathlib import Path
import subprocess

EXPECTED_HEAD = "d4e60d765646f5767c2317e8c47bebbea69559ce"
ROOT = Path.cwd()

def read(rel: str) -> str:
    p = ROOT / rel
    if not p.exists():
        raise SystemExit(f"Missing expected file: {rel}")
    return p.read_text(encoding="utf-8-sig")

def write(rel: str, text: str) -> None:
    (ROOT / rel).write_text(text, encoding="utf-8", newline="\n")
    print(f"UPDATED: {rel}")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"STOPPED at {label}: expected exactly 1 match, found {count}. No guessing performed."
        )
    return text.replace(old, new, 1)

head = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
if head != EXPECTED_HEAD:
    raise SystemExit(
        f"STOPPED: expected HEAD {EXPECTED_HEAD}, current HEAD is {head}. No files changed."
    )

# ------------------------------------------------------------------
# 1) Admin save logic: Automatic / Fixed DC / Opposed + counters
# ------------------------------------------------------------------
rel = "app/(portal)/admin/items/actions.ts"
s = read(rel)

s = replace_once(
    s,
    'const TARGET_MODES = ["self", "other", "either"] as const;\n',
    '''const TARGET_MODES = ["self", "other", "either"] as const;\nconst RESOLUTION_MODES = ["automatic", "fixed", "opposed"] as const;\nconst COUNTER_OPTIONS = [\n  "dodge",\n  "defend",\n  "resist_vigour",\n  "resist_shrewd",\n  "resist_brains",\n  "resist_presence",\n] as const;\n''',
    "admin resolution constants",
)

old = '''  /*\n   * SUCCESS / ATTACK MECHANICS\n   *\n   * No Success Die = automatic success.\n   * With a die:\n   * dX + optional effective Attribute >= Success Threshold.\n   *\n   * For weapons, the same Relevant Attribute is also added to damage.\n   */\n  let successDie: number | null = null;\n  let successThreshold: number | null = null;\n  let successAttribute: string | null = null;\n\n  const rawSuccessDie = optionalText(formData, "successDie");\n\n  if (rawSuccessDie) {\n    const parsedSuccessDie = Number.parseInt(rawSuccessDie, 10);\n\n    if (![4, 6, 8, 10, 12, 20, 100].includes(parsedSuccessDie)) {\n      throw new Error("Invalid Success Die.");\n    }\n\n    successDie = parsedSuccessDie;\n    successThreshold = integer(formData, "successThreshold", 0);\n\n    if (successThreshold === null || successThreshold < 1) {\n      throw new Error(\n        "An Item Success Roll needs a threshold of at least 1.",\n      );\n    }\n\n    const requestedSuccessAttribute =\n      optionalText(formData, "successAttribute");\n\n    if (\n      requestedSuccessAttribute &&\n      ![\n        "muscles",\n        "reflexes",\n        "vigor",\n        "brains",\n        "shrewd",\n        "presence_score",\n      ].includes(requestedSuccessAttribute)\n    ) {\n      throw new Error("Invalid Success Attribute.");\n    }\n\n    successAttribute = requestedSuccessAttribute;\n  }\n'''

new = '''  /*\n   * RESOLUTION / SUCCESS MECHANICS\n   *\n   * automatic = no roll required.\n   * fixed     = die + optional Attribute vs Admin threshold.\n   * opposed   = die + optional Attribute vs the target's chosen Counter.\n   */\n  const resolutionMode =\n    requiredText(formData, "resolutionMode", "Resolution mode");\n\n  if (\n    !RESOLUTION_MODES.includes(\n      resolutionMode as (typeof RESOLUTION_MODES)[number],\n    )\n  ) {\n    throw new Error("Invalid Resolution Mode.");\n  }\n\n  const rawCounterOptions = formData\n    .getAll("counterOptions")\n    .filter((value): value is string => typeof value === "string");\n\n  const counterOptions = [\n    ...new Set(\n      rawCounterOptions.filter((value) =>\n        COUNTER_OPTIONS.includes(\n          value as (typeof COUNTER_OPTIONS)[number],\n        ),\n      ),\n    ),\n  ];\n\n  if (rawCounterOptions.length !== counterOptions.length) {\n    throw new Error("Invalid Counter option.");\n  }\n\n  let successDie: number | null = null;\n  let successThreshold: number | null = null;\n  let successAttribute: string | null = null;\n\n  if (resolutionMode !== "automatic") {\n    const rawSuccessDie = requiredText(\n      formData,\n      "successDie",\n      "Success Die",\n    );\n    const parsedSuccessDie = Number.parseInt(rawSuccessDie, 10);\n\n    if (![4, 6, 8, 10, 12, 20, 100].includes(parsedSuccessDie)) {\n      throw new Error("Invalid Success Die.");\n    }\n\n    successDie = parsedSuccessDie;\n\n    const requestedSuccessAttribute =\n      optionalText(formData, "successAttribute");\n\n    if (\n      requestedSuccessAttribute &&\n      ![\n        "muscles",\n        "reflexes",\n        "vigor",\n        "brains",\n        "shrewd",\n        "presence_score",\n      ].includes(requestedSuccessAttribute)\n    ) {\n      throw new Error("Invalid Success Attribute.");\n    }\n\n    successAttribute = requestedSuccessAttribute;\n\n    if (resolutionMode === "fixed") {\n      successThreshold = integer(formData, "successThreshold", 0);\n\n      if (successThreshold === null || successThreshold < 1) {\n        throw new Error(\n          "Fixed DC Items need a Success Threshold of at least 1.",\n        );\n      }\n    }\n\n    if (\n      resolutionMode === "opposed" &&\n      counterOptions.length === 0\n    ) {\n      throw new Error(\n        "Opposed Items need at least one allowed Counter.",\n      );\n    }\n  }\n'''

s = replace_once(s, old, new, "admin resolution validation")

s = replace_once(
    s,
    '''    success_attribute: successAttribute,\n    damage_dice: damageDice,\n''',
    '''    success_attribute: successAttribute,\n    resolution_mode: resolutionMode,\n    counter_options: counterOptions,\n    damage_dice: damageDice,\n''',
    "persist resolution fields",
)
write(rel, s)

# ------------------------------------------------------------------
# 2) Admin UI
# ------------------------------------------------------------------
rel = "app/(portal)/admin/items/page.tsx"
s = read(rel)

s = replace_once(
    s,
    '''  success_threshold: number | null;\n  success_attribute:\n''',
    '''  success_threshold: number | null;\n  resolution_mode: "automatic" | "fixed" | "opposed";\n  counter_options: string[];\n  success_attribute:\n''',
    "admin ItemRow resolution fields",
)

s = replace_once(
    s,
    '''        success_die,\n        success_threshold,\n        success_attribute,\n''',
    '''        success_die,\n        success_threshold,\n        resolution_mode,\n        counter_options,\n        success_attribute,\n''',
    "admin item query resolution fields",
)

s = replace_once(
    s,
    '''        <Field label="Success Die">\n          <select\n            name="successDie"\n            defaultValue={item?.success_die ?? ""}\n            className={inputClass}\n          >\n            <option value="">Automatic success</option>\n            <option value="4">d4</option>\n            <option value="6">d6</option>\n            <option value="8">d8</option>\n            <option value="10">d10</option>\n            <option value="12">d12</option>\n            <option value="20">d20</option>\n            <option value="100">d100</option>\n          </select>\n        </Field>\n\n        <Field label="Success Threshold">\n''',
    '''        <Field label="Resolution Mode">\n          <select\n            name="resolutionMode"\n            defaultValue={item?.resolution_mode ?? "automatic"}\n            className={inputClass}\n          >\n            <option value="automatic">Automatic</option>\n            <option value="fixed">Fixed DC</option>\n            <option value="opposed">Opposed Roll</option>\n          </select>\n        </Field>\n\n        <Field label="Success / Action Die">\n          <select\n            name="successDie"\n            defaultValue={item?.success_die ?? ""}\n            className={inputClass}\n          >\n            <option value="">None</option>\n            <option value="4">d4</option>\n            <option value="6">d6</option>\n            <option value="8">d8</option>\n            <option value="10">d10</option>\n            <option value="12">d12</option>\n            <option value="20">d20</option>\n            <option value="100">d100</option>\n          </select>\n        </Field>\n\n        <Field label="Fixed DC Threshold">\n''',
    "admin resolution mode UI",
)

s = replace_once(
    s,
    '''        <Field label="Damage Dice">\n''',
    '''        <div className="md:col-span-2 xl:col-span-4">\n          <p className="mb-2 text-[8px] uppercase tracking-[0.16em] text-[#806b50]">\n            Allowed Counters — Opposed Roll only\n          </p>\n          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">\n            {[\n              ["dodge", "Dodge — Reflexes"],\n              ["defend", "Defend — Vigour"],\n              ["resist_vigour", "Resist — Vigour"],\n              ["resist_shrewd", "Resist — Shrewd"],\n              ["resist_brains", "Resist — Brains"],\n              ["resist_presence", "Resist — Presence"],\n            ].map(([value, label]) => (\n              <label\n                key={value}\n                className="flex items-center gap-2 border border-[#59432c]/35 bg-[#15100d] px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[#aa9473]"\n              >\n                <input\n                  type="checkbox"\n                  name="counterOptions"\n                  value={value}\n                  defaultChecked={\n                    item?.counter_options?.includes(value) ?? false\n                  }\n                />\n                {label}\n              </label>\n            ))}\n          </div>\n        </div>\n\n        <Field label="Damage Dice">\n''',
    "admin counter checkboxes",
)

s = replace_once(
    s,
    '''          <span className="text-[#a88b61]">Success:</span>{" "}\n          no Success Die means automatic success. With a die, the Item succeeds\n          when the die plus its optional Relevant Attribute meets or exceeds the\n          threshold.\n        </p>\n        <p className="mt-1">\n          <span className="text-[#a88b61]">Weapons:</span>{" "}\n          the same Relevant Attribute is also added to weapon damage.\n          Example: d20 + Reflexes vs 12, then 1d4 + Reflexes Piercing Damage.\n''',
    '''          <span className="text-[#a88b61]">Resolution:</span>{" "}\n          Automatic applies directly; Fixed DC rolls the selected die plus its\n          optional Relevant Attribute against the configured threshold; Opposed\n          rolls against one Counter chosen by the targeted Character.\n        </p>\n        <p className="mt-1">\n          <span className="text-[#a88b61]">Opposed:</span>{" "}\n          choose one or more valid Counters. The defender wins ties. Weapons use\n          the same Relevant Attribute for their attack roll and damage unless a\n          later rule overrides it.\n''',
    "admin help text",
)
write(rel, s)

# ------------------------------------------------------------------
# 3) Game page: carry resolution mode and counters to RoomChatForm
# ------------------------------------------------------------------
rel = "app/(portal)/game/page.tsx"
s = read(rel)

s = replace_once(
    s,
    '''            success_die,\n            success_threshold,\n            success_attribute,\n''',
    '''            success_die,\n            success_threshold,\n            resolution_mode,\n            counter_options,\n            success_attribute,\n''',
    "game item select resolution fields",
)

s = replace_once(
    s,
    '''        successThreshold: master.success_threshold ?? null,\n        successAttribute: master.success_attribute ?? null,\n''',
    '''        successThreshold: master.success_threshold ?? null,\n        resolutionMode:\n          (master.resolution_mode ?? "automatic") as\n            | "automatic"\n            | "fixed"\n            | "opposed",\n        counterOptions:\n          Array.isArray(master.counter_options)\n            ? master.counter_options\n            : [],\n        successAttribute: master.success_attribute ?? null,\n''',
    "game item mapping resolution fields",
)
write(rel, s)

# ------------------------------------------------------------------
# 4) RoomChatForm: type + data-driven Weapon counter summary
# ------------------------------------------------------------------
rel = "app/(portal)/game/components/RoomChatForm.tsx"
s = read(rel)

s = replace_once(
    s,
    '''  successThreshold?: number | null;\n  successAttribute?: CharacterAttributeKey | null;\n''',
    '''  successThreshold?: number | null;\n  resolutionMode?: "automatic" | "fixed" | "opposed";\n  counterOptions?: string[];\n  successAttribute?: CharacterAttributeKey | null;\n''',
    "ChatItem resolution fields",
)

s = replace_once(
    s,
    '''                  Counter: Dodge / Defend\n''',
    '''                  Counter:{" "}\n                  {selectedWeapon.counterOptions?.length\n                    ? selectedWeapon.counterOptions\n                        .map((counter) => {\n                          const labels: Record<string, string> = {\n                            dodge: "Dodge",\n                            defend: "Defend",\n                            resist_vigour: "Resist Vigour",\n                            resist_shrewd: "Resist Shrewd",\n                            resist_brains: "Resist Brains",\n                            resist_presence: "Resist Presence",\n                          };\n                          return labels[counter] ?? counter;\n                        })\n                        .join(" / ")\n                    : "None configured"}\n''',
    "Weapon counter summary",
)
write(rel, s)

# ------------------------------------------------------------------
# 5) Weapon runtime: stop hard-coding Dodge/Defend
# ------------------------------------------------------------------
rel = "app/(portal)/game/opposed-actions.ts"
s = read(rel)

s = replace_once(
    s,
    '''        "id, name, success_die, success_attribute, damage_dice, damage_type, category:item_categories(slug)",\n''',
    '''        "id, name, resolution_mode, counter_options, success_die, success_attribute, damage_dice, damage_type, category:item_categories(slug)",\n''',
    "Weapon resolution select",
)

s = replace_once(
    s,
    '''    const die = Number(item.success_die ?? 20);\n    const attribute = (\n      item.success_attribute ?? "muscles"\n    ) as CharacterAttributeKey;\n''',
    '''    if (item.resolution_mode !== "opposed") {\n      return {\n        ok: false,\n        message:\n          "This Weapon is not configured for Opposed resolution.",\n      };\n    }\n\n    const configuredCounters = (\n      Array.isArray(item.counter_options)\n        ? item.counter_options\n        : []\n    ).filter(\n      (counter): counter is CounterKind =>\n        counter in COUNTERS,\n    );\n\n    if (!configuredCounters.length) {\n      return {\n        ok: false,\n        message:\n          "This Weapon has no configured Counter options.",\n      };\n    }\n\n    const die = Number(item.success_die ?? 20);\n    const attribute = (\n      item.success_attribute ?? "muscles"\n    ) as CharacterAttributeKey;\n''',
    "Weapon resolution validation",
)

# Replace only Weapon occurrence, not Unarmed. It appears after source item fields.
weapon_anchor = '''      itemId: item.id,\n      recordKind,\n      recordId,\n      damageDice: item.damage_dice,\n      damageType: item.damage_type,\n      damageAttribute: attribute,\n'''
idx = s.find(weapon_anchor)
if idx == -1:
    raise SystemExit("STOPPED: Weapon pending action anchor not found.")
pre = s[:idx]
post = s[idx:]
old_counters = '      allowedCounters: ["dodge", "defend"],\n'
if old_counters not in pre[-1200:]:
    raise SystemExit("STOPPED: Weapon hard-coded counter list not found near pending action.")
cut = pre.rfind(old_counters)
pre = pre[:cut] + '      allowedCounters: configuredCounters,\n' + pre[cut + len(old_counters):]
s = pre + post

s = replace_once(
    s,
    '''      `◆ attacks ${target.display_name} with "${item.name}" · d${die} -> ${rolled} + ${ATTRIBUTE_LABELS[attribute]} (${modifier >= 0 ? "+" : ""}${modifier}) = ${total} · Awaiting Dodge or Defend`,\n''',
    '''      `◆ attacks ${target.display_name} with "${item.name}" · d${die} -> ${rolled} + ${ATTRIBUTE_LABELS[attribute]} (${modifier >= 0 ? "+" : ""}${modifier}) = ${total} · Awaiting ${configuredCounters.map((counter) => COUNTERS[counter].label).join(" or ")}`,\n''',
    "Weapon counter message",
)
write(rel, s)

print("\nPHASE A COMPLETE")
print("Run: npm run build")
