from pathlib import Path
import subprocess

EXPECTED_HEAD = "f94a0713b0663a1ef89723210c819dda8e29fc81"

ROOT = Path.cwd()
ACTIONS = ROOT / "app/(portal)/admin/items/actions.ts"
PAGE = ROOT / "app/(portal)/admin/items/page.tsx"

for path in (ACTIONS, PAGE):
    if not path.exists():
        raise SystemExit(f"Missing expected current-repository file: {path}")

def current_head():
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            text=True,
        ).strip()
    except Exception:
        return None

head = current_head()
if head and head != EXPECTED_HEAD:
    raise SystemExit(
        "\\nPATCH STOPPED SAFELY.\\n"
        f"This patch was built for HEAD {EXPECTED_HEAD}\\n"
        f"Your current HEAD is       {head}\\n"
        "No files were changed.\\n"
    )

def read(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig")

def write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")

def rep(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            "\\nPATCH STOPPED SAFELY.\\n"
            f"Patch point: {label}\\n"
            f"Expected exactly 1 match, found {count}.\\n"
            "No write has been performed for the current file.\\n"
        )
    return text.replace(old, new, 1)

# =====================================================================
# ADMIN ITEM ACTIONS
# =====================================================================
s = read(ACTIONS)

old = '''  let useBehaviour: string | null = null;
  let targetMode: string | null = null;
  let maxCharges: number | null = null;
  let cooldownMinutes: number | null = null;

  if (isUsable) {
    useBehaviour = requiredText(formData, "useBehaviour", "Use behaviour");
    targetMode = requiredText(formData, "targetMode", "Target mode");

    if (!USE_BEHAVIOURS.includes(useBehaviour as (typeof USE_BEHAVIOURS)[number])) {
      throw new Error("Invalid use behaviour.");
    }
    if (!TARGET_MODES.includes(targetMode as (typeof TARGET_MODES)[number])) {
      throw new Error("Invalid target mode.");
    }

    cooldownMinutes = integer(formData, "cooldownMinutes", null);
'''

new = '''  let useBehaviour: string | null = null;
  const targetMode = requiredText(formData, "targetMode", "Target mode");
  let maxCharges: number | null = null;
  let cooldownMinutes: number | null = null;

  if (!TARGET_MODES.includes(targetMode as (typeof TARGET_MODES)[number])) {
    throw new Error("Invalid target mode.");
  }

  if (isUsable) {
    useBehaviour = requiredText(formData, "useBehaviour", "Use behaviour");

    if (!USE_BEHAVIOURS.includes(useBehaviour as (typeof USE_BEHAVIOURS)[number])) {
      throw new Error("Invalid use behaviour.");
    }

    cooldownMinutes = integer(formData, "cooldownMinutes", null);
'''

s = rep(s, old, new, "Item target-mode validation")

anchor = '''  const referenceValue = integer(formData, "referenceValue", null);
  if (referenceValue !== null && referenceValue < 0) {
    throw new Error("Reference value cannot be negative.");
  }

  const supabase = await createClient();
'''

mechanics = '''  const referenceValue = integer(formData, "referenceValue", null);
  if (referenceValue !== null && referenceValue < 0) {
    throw new Error("Reference value cannot be negative.");
  }

  /*
   * SUCCESS / ATTACK MECHANICS
   *
   * No Success Die = automatic success.
   * With a die:
   * dX + optional effective Attribute >= Success Threshold.
   *
   * For weapons, the same Relevant Attribute is also added to damage.
   */
  let successDie: number | null = null;
  let successThreshold: number | null = null;
  let successAttribute: string | null = null;

  const rawSuccessDie = optionalText(formData, "successDie");

  if (rawSuccessDie) {
    const parsedSuccessDie = Number.parseInt(rawSuccessDie, 10);

    if (![4, 6, 8, 10, 12, 20, 100].includes(parsedSuccessDie)) {
      throw new Error("Invalid Success Die.");
    }

    successDie = parsedSuccessDie;
    successThreshold = integer(formData, "successThreshold", 0);

    if (successThreshold === null || successThreshold < 1) {
      throw new Error(
        "An Item Success Roll needs a threshold of at least 1.",
      );
    }

    const requestedSuccessAttribute =
      optionalText(formData, "successAttribute");

    if (
      requestedSuccessAttribute &&
      ![
        "muscles",
        "reflexes",
        "vigor",
        "brains",
        "shrewd",
        "presence_score",
      ].includes(requestedSuccessAttribute)
    ) {
      throw new Error("Invalid Success Attribute.");
    }

    successAttribute = requestedSuccessAttribute;
  }

  const damageDice = optionalText(formData, "damageDice");

  if (
    damageDice &&
    !/^[1-9][0-9]*d(4|6|8|10|12|20|100)$/.test(damageDice)
  ) {
    throw new Error(
      "Damage dice must use a format such as 1d4, 2d6 or 1d12.",
    );
  }

  if (damageDice) {
    const count = Number.parseInt(damageDice.split("d")[0] ?? "0", 10);

    if (count > 20) {
      throw new Error("An Item cannot roll more than 20 damage dice.");
    }
  }

  const damageType = damageDice
    ? optionalText(formData, "damageType") ?? "Damage"
    : null;

  const supabase = await createClient();
'''

s = rep(s, anchor, mechanics, "Item success/damage validation")

old_return = '''    target_mode: targetMode,
    cooldown_minutes: cooldownMinutes,
    container_capacity: containerCapacity,
'''

new_return = '''    target_mode: targetMode,
    cooldown_minutes: cooldownMinutes,
    success_die: successDie,
    success_threshold: successThreshold,
    success_attribute: successAttribute,
    damage_dice: damageDice,
    damage_type: damageType,
    container_capacity: containerCapacity,
'''

s = rep(s, old_return, new_return, "Item saved mechanics")

write(ACTIONS, s)

# =====================================================================
# ADMIN ITEM PAGE
# =====================================================================
s = read(PAGE)

old_type = '''  target_mode: "self" | "other" | "either" | null;
  cooldown_minutes: number | null;
  container_capacity: number | null;
'''

new_type = '''  target_mode: "self" | "other" | "either" | null;
  cooldown_minutes: number | null;
  success_die: number | null;
  success_threshold: number | null;
  success_attribute:
    | "muscles"
    | "reflexes"
    | "vigor"
    | "brains"
    | "shrewd"
    | "presence_score"
    | null;
  damage_dice: string | null;
  damage_type: string | null;
  container_capacity: number | null;
'''

s = rep(s, old_type, new_type, "Admin Item type mechanics")

old_select = '''        target_mode,
        cooldown_minutes,
        container_capacity,
'''

new_select = '''        target_mode,
        cooldown_minutes,
        success_die,
        success_threshold,
        success_attribute,
        damage_dice,
        damage_type,
        container_capacity,
'''

s = rep(s, old_select, new_select, "Admin Item query mechanics")

target_field = '''        <Field label="Target">
          <select
            name="targetMode"
            defaultValue={item?.target_mode ?? "self"}
            className={inputClass}
          >
            <option value="self">Self</option>
            <option value="other">Other</option>
            <option value="either">Either</option>
          </select>
        </Field>
'''

mechanical_fields = target_field + '''
        <Field label="Success Die">
          <select
            name="successDie"
            defaultValue={item?.success_die ?? ""}
            className={inputClass}
          >
            <option value="">Automatic success</option>
            <option value="4">d4</option>
            <option value="6">d6</option>
            <option value="8">d8</option>
            <option value="10">d10</option>
            <option value="12">d12</option>
            <option value="20">d20</option>
            <option value="100">d100</option>
          </select>
        </Field>

        <Field label="Success Threshold">
          <input
            type="number"
            min={1}
            step={1}
            name="successThreshold"
            defaultValue={item?.success_threshold ?? ""}
            placeholder="Required when a die is selected"
            className={inputClass}
          />
        </Field>

        <Field label="Relevant Attribute">
          <select
            name="successAttribute"
            defaultValue={item?.success_attribute ?? ""}
            className={inputClass}
          >
            <option value="">None - pure roll</option>
            <option value="muscles">Muscles</option>
            <option value="reflexes">Reflexes</option>
            <option value="vigor">Vigour</option>
            <option value="brains">Brains</option>
            <option value="shrewd">Shrewd</option>
            <option value="presence_score">Presence</option>
          </select>
        </Field>

        <Field label="Damage Dice">
          <input
            name="damageDice"
            defaultValue={item?.damage_dice ?? ""}
            placeholder="e.g. 1d4"
            className={inputClass}
          />
        </Field>

        <Field label="Damage Type">
          <input
            name="damageType"
            defaultValue={item?.damage_type ?? ""}
            placeholder="e.g. Piercing, Lightning"
            className={inputClass}
          />
        </Field>
'''

s = rep(s, target_field, mechanical_fields, "Admin Item mechanical fields")

old_help = '''      <p className="mt-3 text-[9px] leading-5 text-[#756958]">
        Irrelevant settings are automatically ignored: Maximum Stack unless
        Stackable is enabled, Use settings unless Usable is enabled, and
        Container capacity unless the core category is Container.
      </p>
'''

new_help = '''      <div className="mt-3 border border-[#59432c]/30 bg-[#100c09] px-3 py-2 text-[9px] leading-5 text-[#756958]">
        <p>
          <span className="text-[#a88b61]">Success:</span>{" "}
          no Success Die means automatic success. With a die, the Item succeeds
          when the die plus its optional Relevant Attribute meets or exceeds the
          threshold.
        </p>
        <p className="mt-1">
          <span className="text-[#a88b61]">Weapons:</span>{" "}
          the same Relevant Attribute is also added to weapon damage.
          Example: d20 + Reflexes vs 12, then 1d4 + Reflexes Piercing Damage.
        </p>
        <p className="mt-1">
          Irrelevant settings are automatically ignored: Maximum Stack unless
          Stackable is enabled, Use behaviour/charges/cooldown unless Usable is
          enabled, and Container capacity unless the core category is Container.
          Target and Success/Damage mechanics remain Item-level configuration.
        </p>
      </div>
'''

s = rep(s, old_help, new_help, "Admin Item mechanics help")

write(PAGE, s)

print("SUCCESS: Items A mechanical-definition patch applied.")
print("Changed:")
print(" - app/(portal)/admin/items/actions.ts")
print(" - app/(portal)/admin/items/page.tsx")
print("Now run: npm run build")
