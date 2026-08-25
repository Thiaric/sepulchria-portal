from pathlib import Path

ROOT = Path.cwd()

ACTIONS = ROOT / "app/(portal)/admin/gifts/actions.ts"
PAGE = ROOT / "app/(portal)/admin/gifts/page.tsx"
CATALOGUE = ROOT / "components/gifts/gifts-catalogue.tsx"
LOGIC = ROOT / "components/admin/gift-effect-form-logic.tsx"

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were applied.")

for path in (ACTIONS, PAGE, CATALOGUE):
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")

actions = ACTIONS.read_text(encoding="utf-8")
page = PAGE.read_text(encoding="utf-8")
catalogue = CATALOGUE.read_text(encoding="utf-8")

for marker in (
    'function giftValues(formData: FormData) {',
    'if (!["none", "passive", "temporary"].includes(effectMode)) {',
    'async function replaceEligibility(',
):
    if marker not in actions:
        fail(f"Unexpected admin/gifts/actions.ts state; missing {marker!r}")

for marker in (
    '<option value="none">None</option>',
    '<option value="passive">Passive</option>',
    '<option value="temporary">Temporary / activated</option>',
    'function GiftForm({',
    '<AdminActionForm action={action} className="mt-5">',
):
    if marker not in page:
        fail(f"Unexpected admin/gifts/page.tsx state; missing {marker!r}")

if 'function effectLabel(gift: GiftCard)' not in catalogue:
    fail("Unexpected components/gifts/gifts-catalogue.tsx state.")

if LOGIC.exists():
    fail("components/admin/gift-effect-form-logic.tsx already exists. Refusing to overwrite it.")

start = actions.index('function giftValues(formData: FormData) {')
end = actions.index('async function replaceEligibility(', start)

new_gift_values = '''function giftValues(formData: FormData) {
  const requestedEffectMode =
    requiredText(formData, "effectMode", "Effect mode");

  const effectMode =
    requestedEffectMode === "none"
      ? "temporary"
      : requestedEffectMode;

  if (!["passive", "temporary"].includes(effectMode)) {
    throw new Error("Invalid Feat effect mode.");
  }

  const isPassive =
    effectMode === "passive";

  let durationMinutes: number | null = null;
  let isInstantaneous = false;

  if (!isPassive) {
    const durationMode =
      requiredText(formData, "durationMode", "Duration");

    if (!["instantaneous", "minutes"].includes(durationMode)) {
      throw new Error("Invalid Feat duration.");
    }

    isInstantaneous =
      durationMode === "instantaneous";

    if (isInstantaneous) {
      durationMinutes = 0;
    } else {
      durationMinutes =
        integer(formData, "durationMinutes", 0);

      if (durationMinutes <= 0) {
        throw new Error(
          "Timed Activated Feats need a duration greater than 0 minutes.",
        );
      }
    }
  }

  const cooldownMinutes =
    isPassive
      ? 0
      : integer(formData, "cooldownMinutes", 0);

  if (cooldownMinutes < 0) {
    throw new Error("Feat cooldown cannot be negative.");
  }

  const healthDelta =
    isPassive
      ? 0
      : integer(formData, "healthDelta", 0);

  const requestedTargetMode =
    isPassive
      ? "self"
      : requiredText(formData, "targetMode", "Target mode");

  if (!["self", "other", "either"].includes(requestedTargetMode)) {
    throw new Error("Invalid Feat target mode.");
  }

  const targetMode =
    isPassive
      ? "self"
      : requestedTargetMode;

  const damageDice =
    isPassive
      ? null
      : optionalText(formData, "damageDice");

  if (
    damageDice &&
    !/^[1-9][0-9]*d(4|6|8|10|12|20|100)$/.test(damageDice)
  ) {
    throw new Error(
      "Damage dice must use a format such as 1d4, 2d6 or 1d12.",
    );
  }

  if (damageDice) {
    const count =
      Number.parseInt(damageDice.split("d")[0] ?? "0", 10);

    if (count > 20) {
      throw new Error(
        "A Feat cannot roll more than 20 damage dice.",
      );
    }
  }

  const damageType =
    damageDice
      ? optionalText(formData, "damageType") ?? "Damage"
      : null;

  const allowsPersistentModifiers =
    isPassive ||
    (!isPassive && !isInstantaneous);

  const maxHealthModifier =
    allowsPersistentModifiers
      ? integer(formData, "maxHealthModifier", 0)
      : 0;

  const musclesModifier =
    allowsPersistentModifiers
      ? attr(formData, "musclesModifier", "Muscles")
      : 0;

  const reflexesModifier =
    allowsPersistentModifiers
      ? attr(formData, "reflexesModifier", "Reflexes")
      : 0;

  const vigourModifier =
    allowsPersistentModifiers
      ? attr(formData, "vigourModifier", "Vigour")
      : 0;

  const shrewdModifier =
    allowsPersistentModifiers
      ? attr(formData, "shrewdModifier", "Shrewd")
      : 0;

  const brainsModifier =
    allowsPersistentModifiers
      ? attr(formData, "brainsModifier", "Brains")
      : 0;

  const presenceModifier =
    allowsPersistentModifiers
      ? attr(formData, "presenceModifier", "Presence")
      : 0;

  const warpingAffinityModifier =
    allowsPersistentModifiers
      ? Math.max(
          0,
          Math.min(
            8,
            integer(formData, "warpingAffinityModifier", 0),
          ),
        )
      : 0;

  const warpsPerDayModifier =
    allowsPersistentModifiers
      ? Math.max(
          0,
          Math.min(
            10,
            integer(formData, "warpsPerDayModifier", 0),
          ),
        )
      : 0;

  let successDie: number | null = null;
  let successThreshold: number | null = null;
  let successAttribute: string | null = null;

  if (!isPassive) {
    const rawSuccessDie =
      optionalText(formData, "successDie");

    if (rawSuccessDie) {
      const parsedSuccessDie =
        Number.parseInt(rawSuccessDie, 10);

      if (
        ![4, 6, 8, 10, 12, 20, 100].includes(
          parsedSuccessDie,
        )
      ) {
        throw new Error("Invalid Success Die.");
      }

      successDie =
        parsedSuccessDie;

      successThreshold =
        integer(formData, "successThreshold", 0);

      if (successThreshold < 1) {
        throw new Error(
          "A Success Roll needs a threshold of at least 1.",
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

      successAttribute =
        requestedSuccessAttribute;
    }
  }

  return {
    name: requiredText(formData, "name", "Gift name"),
    description: optionalText(formData, "description") ?? "",
    is_active: checkbox(formData, "isActive"),
    is_general: checkbox(formData, "isGeneral"),
    effect_mode: effectMode,
    target_mode: targetMode,
    duration_minutes: durationMinutes,
    cooldown_minutes: cooldownMinutes,
    health_delta: healthDelta,
    damage_dice: damageDice,
    damage_type: damageType,
    success_die: successDie,
    success_threshold: successThreshold,
    success_attribute: successAttribute,
    max_health_modifier: maxHealthModifier,
    muscles_modifier: musclesModifier,
    reflexes_modifier: reflexesModifier,
    vigour_modifier: vigourModifier,
    shrewd_modifier: shrewdModifier,
    brains_modifier: brainsModifier,
    presence_modifier: presenceModifier,
    warping_affinity_modifier: warpingAffinityModifier,
    warps_per_day_modifier: warpsPerDayModifier,
    sort_order: integer(formData, "sortOrder", 0),
  };
}

'''

actions = actions[:start] + new_gift_values + actions[end:]

old_import = 'import { AdminActionForm } from "@/components/admin/admin-action-form";\n'
new_import = (
    'import { AdminActionForm } from "@/components/admin/admin-action-form";\n'
    'import { GiftEffectFormLogic } from "@/components/admin/gift-effect-form-logic";\n'
)
if old_import not in page:
    fail("Could not locate AdminActionForm import.")
page = page.replace(old_import, new_import, 1)

old_summary_mode = '''                      {gift.effect_mode}
                      {gift.is_general ? " · General" : ""}
'''
new_summary_mode = '''                      {gift.effect_mode === "passive"
                        ? "Passive"
                        : "Activated"}
                      {gift.is_general ? " · General" : ""}
'''
if old_summary_mode not in page:
    fail("Could not locate Feat summary mode label.")
page = page.replace(old_summary_mode, new_summary_mode, 1)

old_recap_use = '''                      gift.effect_mode === "temporary"
                        ? "Activated"
                        : gift.effect_mode === "passive"
                          ? "Passive"
                          : "Standard"
'''
new_recap_use = '''                      gift.effect_mode === "passive"
                        ? "Passive"
                        : "Activated"
'''
if old_recap_use not in page:
    fail("Could not locate Use recap mode logic.")
page = page.replace(old_recap_use, new_recap_use, 1)

old_effect_select = '''        <Field label="Effect mode">
          <select
            name="effectMode"
            defaultValue={gift?.effect_mode ?? "none"}
            className={inputClass}
          >
            <option value="none">None</option>
            <option value="passive">Passive</option>
            <option value="temporary">Temporary / activated</option>
          </select>
        </Field>
'''
new_effect_select = '''        <Field label="Effect mode">
          <select
            name="effectMode"
            defaultValue={
              gift?.effect_mode === "passive"
                ? "passive"
                : "temporary"
            }
            className={inputClass}
          >
            <option value="passive">Passive</option>
            <option value="temporary">Activated</option>
          </select>
        </Field>
'''
if old_effect_select not in page:
    fail("Could not locate Effect mode selector.")
page = page.replace(old_effect_select, new_effect_select, 1)

old_duration_default = '''            defaultValue={
              gift?.effect_mode === "temporary" &&
              gift.duration_minutes === 0
                ? "instantaneous"
                : "minutes"
            }
'''
new_duration_default = '''            defaultValue={
              !gift ||
              gift.effect_mode === "none" ||
              (
                gift.effect_mode === "temporary" &&
                gift.duration_minutes === 0
              )
                ? "instantaneous"
                : "minutes"
            }
'''
if old_duration_default not in page:
    fail("Could not locate duration default logic.")
page = page.replace(old_duration_default, new_duration_default, 1)

old_form_start = '''    <AdminActionForm action={action} className="mt-5">
      {gift ? <input type="hidden" name="giftId" value={gift.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
'''
new_form_start = '''    <AdminActionForm action={action} className="mt-5">
      {gift ? <input type="hidden" name="giftId" value={gift.id} /> : null}

      <GiftEffectFormLogic />

      <div className="grid gap-4 md:grid-cols-2">
'''
if old_form_start not in page:
    fail("Could not locate GiftForm start.")
page = page.replace(old_form_start, new_form_start, 1)

old_rules = '''          <strong className="text-[rgb(var(--sep-colour-c7ad83))]">Effect rules:</strong>{" "}
          Instant Health / Damage applies whenever a non-passive Feat is used.
          Attribute and Maximum Health modifiers are persistent for Passive Feats
          and last for the configured duration on Temporary Feats. Warping bonuses
          follow the same Passive/Temporary lifecycle. Passive Feats are always self-only.
'''
new_rules = '''          <strong className="text-[rgb(var(--sep-colour-c7ad83))]">Effect rules:</strong>{" "}
          Passive Feats are always Self-only and always active while owned. They may
          provide persistent Attribute, Maximum Health or Warping modifiers. Activated
          Feats may be Instantaneous or Timed. Instantaneous Feats may mechanically
          change Current Health or deal Damage; other narrative effects belong in the
          description. Timed Activated Feats may also apply persistent modifiers for
          their duration. Cooldown and Success Roll settings apply only to Activated Feats.
'''
if old_rules not in page:
    fail("Could not locate existing Effect rules help text.")
page = page.replace(old_rules, new_rules, 1)

old_effect_label = '''function effectLabel(gift: GiftCard) {
  if (gift.effectMode === "passive") return "Passive";
  if (gift.effectMode === "temporary") {
    return gift.durationMinutes
      ? `${gift.durationMinutes} min`
      : "Temporary";
  }
  return "Standard";
}
'''
new_effect_label = '''function effectLabel(gift: GiftCard) {
  if (gift.effectMode === "passive") return "Passive";
  return "Activated";
}
'''
if old_effect_label not in catalogue:
    fail("Could not locate player-facing effectLabel.")
catalogue = catalogue.replace(old_effect_label, new_effect_label, 1)

old_duration_label = '''function durationLabel(gift: GiftCard) {
  if (gift.effectMode === "passive") return "Permanent while owned";
  if (gift.effectMode !== "temporary") return "Instant use";
  if (gift.durationMinutes === 0) return "Instantaneous";
  return gift.durationMinutes ? `${gift.durationMinutes} min` : "Not set";
}
'''
new_duration_label = '''function durationLabel(gift: GiftCard) {
  if (gift.effectMode === "passive") return "Permanent while owned";
  if (gift.effectMode === "none") return "Instantaneous";
  if (gift.durationMinutes === 0) return "Instantaneous";
  return gift.durationMinutes ? `${gift.durationMinutes} min` : "Not set";
}
'''
if old_duration_label not in catalogue:
    fail("Could not locate player-facing durationLabel.")
catalogue = catalogue.replace(old_duration_label, new_duration_label, 1)

logic = '''"use client";

import {
  useEffect,
  useRef,
} from "react";

type FeatControl =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

function namedControl(
  form: HTMLFormElement,
  name: string,
): FeatControl | null {
  const element =
    form.elements.namedItem(name);

  return element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
    ? element
    : null;
}

function setControlDisabled(
  form: HTMLFormElement,
  name: string,
  disabled: boolean,
) {
  const control =
    namedControl(form, name);

  if (!control) {
    return;
  }

  control.disabled =
    disabled;

  const field =
    control.closest("label");

  if (field) {
    field.classList.toggle(
      "opacity-35",
      disabled,
    );

    field.classList.toggle(
      "cursor-not-allowed",
      disabled,
    );
  }
}

function setValue(
  form: HTMLFormElement,
  name: string,
  value: string,
) {
  const control =
    namedControl(form, name);

  if (control) {
    control.value =
      value;
  }
}

export function GiftEffectFormLogic() {
  const anchorRef =
    useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form =
      anchorRef.current?.closest("form");

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const effectMode =
      namedControl(form, "effectMode");

    const durationMode =
      namedControl(form, "durationMode");

    const successDie =
      namedControl(form, "successDie");

    const damageDice =
      namedControl(form, "damageDice");

    if (
      !(effectMode instanceof HTMLSelectElement) ||
      !(durationMode instanceof HTMLSelectElement)
    ) {
      return;
    }

    const persistentModifierNames = [
      "maxHealthModifier",
      "musclesModifier",
      "reflexesModifier",
      "vigourModifier",
      "shrewdModifier",
      "brainsModifier",
      "presenceModifier",
      "warpingAffinityModifier",
      "warpsPerDayModifier",
    ];

    const update = () => {
      const passive =
        effectMode.value === "passive";

      const activated =
        !passive;

      const instantaneous =
        activated &&
        durationMode.value === "instantaneous";

      const timed =
        activated &&
        durationMode.value === "minutes";

      if (passive) {
        setValue(form, "targetMode", "self");
        setValue(form, "healthDelta", "0");
        setValue(form, "damageDice", "");
        setValue(form, "damageType", "");
        setValue(form, "successDie", "");
        setValue(form, "successThreshold", "");
        setValue(form, "successAttribute", "");
        setValue(form, "cooldownMinutes", "0");
        setValue(form, "durationMinutes", "");
      }

      setControlDisabled(form, "targetMode", passive);
      setControlDisabled(form, "durationMode", passive);
      setControlDisabled(form, "cooldownMinutes", passive);
      setControlDisabled(form, "healthDelta", passive);
      setControlDisabled(form, "successDie", passive);
      setControlDisabled(form, "damageDice", passive);

      if (!timed) {
        setValue(form, "durationMinutes", "");
      }

      setControlDisabled(
        form,
        "durationMinutes",
        !timed,
      );

      if (instantaneous) {
        for (const name of persistentModifierNames) {
          setValue(form, name, "0");
        }
      }

      for (const name of persistentModifierNames) {
        setControlDisabled(
          form,
          name,
          instantaneous,
        );
      }

      const hasSuccessDie =
        activated &&
        Boolean(successDie?.value);

      if (!hasSuccessDie) {
        setValue(form, "successThreshold", "");
        setValue(form, "successAttribute", "");
      }

      setControlDisabled(
        form,
        "successThreshold",
        !hasSuccessDie,
      );

      setControlDisabled(
        form,
        "successAttribute",
        !hasSuccessDie,
      );

      const hasDamage =
        activated &&
        Boolean(damageDice?.value.trim());

      if (!hasDamage) {
        setValue(form, "damageType", "");
      }

      setControlDisabled(
        form,
        "damageType",
        !hasDamage,
      );
    };

    const watched = [
      effectMode,
      durationMode,
      successDie,
      damageDice,
    ].filter(
      (control): control is FeatControl =>
        Boolean(control),
    );

    for (const control of watched) {
      control.addEventListener("change", update);
      control.addEventListener("input", update);
    }

    update();

    return () => {
      for (const control of watched) {
        control.removeEventListener("change", update);
        control.removeEventListener("input", update);
      }
    };
  }, []);

  return (
    <span
      ref={anchorRef}
      className="hidden"
      aria-hidden="true"
    />
  );
}
'''

for path, text, markers in (
    (
        ACTIONS,
        actions,
        (
            'requestedEffectMode === "none"',
            'const allowsPersistentModifiers =',
            'effect_mode: effectMode',
        ),
    ),
    (
        PAGE,
        page,
        (
            'GiftEffectFormLogic',
            '<option value="temporary">Activated</option>',
            'Instantaneous Feats may mechanically',
        ),
    ),
    (
        CATALOGUE,
        catalogue,
        (
            'return "Activated";',
            'if (gift.effectMode === "none") return "Instantaneous";',
        ),
    ),
):
    for marker in markers:
        if marker not in text:
            fail(
                f"Final validation failed for {path.relative_to(ROOT)}: "
                f"missing {marker!r}"
            )

ACTIONS.write_text(actions, encoding="utf-8", newline="\n")
PAGE.write_text(page, encoding="utf-8", newline="\n")
CATALOGUE.write_text(catalogue, encoding="utf-8", newline="\n")
LOGIC.write_text(logic, encoding="utf-8", newline="\n")

print("WROTE ", ACTIONS.relative_to(ROOT))
print("WROTE ", PAGE.relative_to(ROOT))
print("WROTE ", CATALOGUE.relative_to(ROOT))
print("CREATED", LOGIC.relative_to(ROOT))
print()
print("Feat mode/exclusion patch applied.")
print("Run: npm run build")
