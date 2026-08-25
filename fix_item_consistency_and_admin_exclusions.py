from pathlib import Path

ROOT = Path.cwd()

ACTIONS = ROOT / "app/(portal)/admin/items/actions.ts"
PAGE = ROOT / "app/(portal)/admin/items/page.tsx"
USE_ACTIONS = ROOT / "lib/items/use-actions.ts"
ADMIN_INV = ROOT / "lib/items/admin-inventory-actions.ts"
USE_LOGIC = ROOT / "components/admin/item-use-form-logic.tsx"
EFFECT_LOGIC = ROOT / "components/admin/item-effect-form-logic.tsx"

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were applied.")

for path in (ACTIONS, PAGE, USE_ACTIONS, ADMIN_INV):
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")

for path in (USE_LOGIC, EFFECT_LOGIC):
    if path.exists():
        fail(f"Refusing to overwrite existing file: {path.relative_to(ROOT)}")

actions = ACTIONS.read_text(encoding="utf-8")
page = PAGE.read_text(encoding="utf-8")
use_actions = USE_ACTIONS.read_text(encoding="utf-8")
admin_inv = ADMIN_INV.read_text(encoding="utf-8")

anchor = '''    if (useBehaviour === "limited_charges") {
      maxCharges = integer(formData, "maxCharges", null);
      if (maxCharges === null || maxCharges < 1) {
        throw new Error("Limited-charge items need at least 1 charge.");
      }
    }
  }
'''
replacement = '''    if (useBehaviour === "limited_charges") {
      if (stackable) {
        throw new Error(
          "Limited-charge Items cannot be Stackable because each copy needs its own charge state.",
        );
      }

      maxCharges = integer(formData, "maxCharges", null);
      if (maxCharges === null || maxCharges < 1) {
        throw new Error("Limited-charge items need at least 1 charge.");
      }
    }
  }
'''
if anchor not in actions:
    fail("Could not locate Limited Charges validation in admin/items/actions.ts.")
actions = actions.replace(anchor, replacement, 1)

anchor = '''  const damageDice = optionalText(formData, "damageDice");
'''
insert = '''  if (
    isUsable &&
    resolutionMode === "opposed" &&
    targetMode !== "other"
  ) {
    targetMode = "other";
  }

  const damageDice = optionalText(formData, "damageDice");
'''
if anchor not in actions:
    fail("Could not locate Item damage anchor.")
actions = actions.replace(anchor, insert, 1)

anchor = '''    const values = await itemValues(formData);
    const { error } = await supabase.from("items").update(values).eq("id", itemId);
'''
replacement = '''    const values = await itemValues(formData);

    if (values.stackable) {
      const {
        data: existingItem,
        error: existingItemError,
      } = await supabase
        .from("items")
        .select("is_equippable")
        .eq("id", itemId)
        .maybeSingle();

      if (existingItemError || !existingItem) {
        throw new Error(
          existingItemError?.message ?? "Unable to verify Item equipment state.",
        );
      }

      if (existingItem.is_equippable) {
        throw new Error(
          "Equippable Items cannot be Stackable. Disable Equippable first.",
        );
      }
    }

    const { error } = await supabase.from("items").update(values).eq("id", itemId);
'''
if anchor not in actions:
    fail("Could not locate updateItem values/write block.")
actions = actions.replace(anchor, replacement, 1)

import_anchor = 'import { AdminActionForm } from "@/components/admin/admin-action-form";\n'
import_replacement = (
    'import { AdminActionForm } from "@/components/admin/admin-action-form";\n'
    'import { ItemUseFormLogic } from "@/components/admin/item-use-form-logic";\n'
    'import { ItemEffectFormLogic } from "@/components/admin/item-effect-form-logic";\n'
)
if import_anchor not in page:
    fail("Could not locate AdminActionForm import in admin/items/page.tsx.")
page = page.replace(import_anchor, import_replacement, 1)

item_form_anchor = '''    <AdminActionForm action={action} className="mt-5">
      {item ? <input type="hidden" name="itemId" value={item.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
'''
item_form_replacement = '''    <AdminActionForm action={action} className="mt-5">
      {item ? <input type="hidden" name="itemId" value={item.id} /> : null}

      <ItemUseFormLogic />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
'''
if item_form_anchor not in page:
    fail("Could not locate ItemForm root.")
page = page.replace(item_form_anchor, item_form_replacement, 1)

effect_form_anchor = '''      <input type="hidden" name="itemId" value={itemId} />
      {effect ? <input type="hidden" name="effectId" value={effect.id} /> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
'''
effect_form_replacement = '''      <input type="hidden" name="itemId" value={itemId} />
      {effect ? <input type="hidden" name="effectId" value={effect.id} /> : null}

      <ItemEffectFormLogic />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
'''
if effect_form_anchor not in page:
    fail("Could not locate EffectForm root.")
page = page.replace(effect_form_anchor, effect_form_replacement, 1)

page = page.replace(
    '<option value="instant">Instant</option>',
    '<option value="instant">Instantaneous</option>',
)
page = page.replace(
    '<option value="temporary">Temporary</option>',
    '<option value="temporary">Timed</option>',
)
page = page.replace(
    'Temporary/Passive effects.',
    'Timed/Passive effects.',
)

old_help = '''          Irrelevant settings are automatically ignored: Maximum Stack unless
          Stackable is enabled, Use behaviour/charges/cooldown unless Usable is
          enabled, and Container capacity unless the core category is Container.
          Target and Success/Damage mechanics remain Item-level configuration.
'''
new_help = '''          Usable controls the generic Use Item action only. An Item may be
          Equippable without being Usable, and equipped Weapons can still attack.
          Use behaviour, charges, cooldown and generic Use target apply only when
          Usable is enabled. Success/Damage fields remain Item-level mechanics
          because Weapons also use them for combat.
'''
if old_help not in page:
    fail("Could not locate Item mechanics help text.")
page = page.replace(old_help, new_help, 1)

item_type_anchor = '''  id: string;
  name: string;
  use_behaviour: "reusable" | "consumable" | "limited_charges" | null;
'''
item_type_replacement = '''  id: string;
  name: string;
  is_active: boolean;
  is_usable: boolean;
  use_behaviour: "reusable" | "consumable" | "limited_charges" | null;
'''
if item_type_anchor not in use_actions:
    fail("Could not locate ItemMechanics type.")
use_actions = use_actions.replace(item_type_anchor, item_type_replacement, 1)

select_anchor = '''    id,
    name,
    use_behaviour,
'''
select_replacement = '''    id,
    name,
    is_active,
    is_usable,
    use_behaviour,
'''
if select_anchor not in use_actions:
    fail("Could not locate standalone Item mechanics select.")
use_actions = use_actions.replace(select_anchor, select_replacement, 1)

load_anchor = '''    const record = await loadAttemptRecord(
      recordKind,
      recordId,
      character.id,
    );
'''
load_replacement = '''    const record = await loadAttemptRecord(
      recordKind,
      recordId,
      character.id,
    );

    if (!record.item.is_active) {
      throw new Error("This Item is inactive.");
    }

    if (!record.item.is_usable) {
      throw new Error(
        "This Item cannot be used through the Use Item action.",
      );
    }
'''
if load_anchor not in use_actions:
    fail("Could not locate useInventoryItem record load.")
use_actions = use_actions.replace(load_anchor, load_replacement, 1)

grant_anchor = '''    if (item.categorySlug === "container") {
      if (containerId) {
        throw new Error(
          "A Container cannot be granted inside another Container from this panel.",
        );
      }

      for (let index = 0; index < quantity; index += 1) {
        const { error } = await supabase
          .from("character_item_instances")
          .insert({
            item_id: itemId,
            owner_character_id: characterId,
            charges_remaining:
              item.use_behaviour === "limited_charges"
                ? item.max_charges
                : null,
            vault_status: "owned",
            acquisition_source: "staff",
            assigned_by: staff.userId,
          });

        if (error) throw new Error(error.message);
      }
    } else if (!item.stackable) {
'''
grant_replacement = '''    if (
      item.categorySlug === "container" ||
      item.use_behaviour === "limited_charges"
    ) {
      if (item.categorySlug === "container" && containerId) {
        throw new Error(
          "A Container cannot be granted inside another Container from this panel.",
        );
      }

      if (item.use_behaviour === "limited_charges" && containerId) {
        throw new Error(
          "Limited-charge Items must be granted as individual Items before being moved into Containers.",
        );
      }

      for (let index = 0; index < quantity; index += 1) {
        const { error } = await supabase
          .from("character_item_instances")
          .insert({
            item_id: itemId,
            owner_character_id: characterId,
            charges_remaining:
              item.use_behaviour === "limited_charges"
                ? item.max_charges
                : null,
            vault_status: "owned",
            acquisition_source: "staff",
            assigned_by: staff.userId,
          });

        if (error) throw new Error(error.message);
      }
    } else if (!item.stackable) {
'''
if grant_anchor not in admin_inv:
    fail("Could not locate standard staff grant branching.")
admin_inv = admin_inv.replace(grant_anchor, grant_replacement, 1)

use_logic = '''"use client";

import {
  useEffect,
  useRef,
} from "react";

type Control =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

function control(
  form: HTMLFormElement,
  name: string,
): Control | null {
  const value =
    form.elements.namedItem(name);

  return value instanceof HTMLInputElement ||
    value instanceof HTMLSelectElement ||
    value instanceof HTMLTextAreaElement
    ? value
    : null;
}

function setDisabled(
  form: HTMLFormElement,
  name: string,
  disabled: boolean,
) {
  const element =
    control(form, name);

  if (!element) {
    return;
  }

  element.disabled =
    disabled;

  element
    .closest("label")
    ?.classList.toggle(
      "opacity-35",
      disabled,
    );
}

function setValue(
  form: HTMLFormElement,
  name: string,
  value: string,
) {
  const element =
    control(form, name);

  if (element) {
    element.value =
      value;
  }
}

export function ItemUseFormLogic() {
  const anchorRef =
    useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form =
      anchorRef.current?.closest("form");

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const usable =
      control(form, "isUsable");

    const behaviour =
      control(form, "useBehaviour");

    const resolution =
      control(form, "resolutionMode");

    const stackable =
      control(form, "stackable");

    if (
      !(usable instanceof HTMLInputElement) ||
      !(behaviour instanceof HTMLSelectElement) ||
      !(resolution instanceof HTMLSelectElement) ||
      !(stackable instanceof HTMLInputElement)
    ) {
      return;
    }

    const update = () => {
      const isUsable =
        usable.checked;

      const limitedCharges =
        isUsable &&
        behaviour.value ===
          "limited_charges";

      const opposedUse =
        isUsable &&
        resolution.value ===
          "opposed";

      setDisabled(
        form,
        "useBehaviour",
        !isUsable,
      );

      setDisabled(
        form,
        "targetMode",
        !isUsable,
      );

      setDisabled(
        form,
        "cooldownMinutes",
        !isUsable,
      );

      setDisabled(
        form,
        "maxCharges",
        !limitedCharges,
      );

      if (!isUsable) {
        setValue(
          form,
          "maxCharges",
          "",
        );

        setValue(
          form,
          "cooldownMinutes",
          "",
        );
      }

      if (!limitedCharges) {
        setValue(
          form,
          "maxCharges",
          "",
        );
      }

      if (limitedCharges) {
        stackable.checked =
          false;
      }

      if (opposedUse) {
        setValue(
          form,
          "targetMode",
          "other",
        );

        setDisabled(
          form,
          "targetMode",
          true,
        );
      }

      const automatic =
        resolution.value ===
          "automatic";

      const fixed =
        resolution.value ===
          "fixed";

      const opposed =
        resolution.value ===
          "opposed";

      setDisabled(
        form,
        "successDie",
        automatic,
      );

      setDisabled(
        form,
        "successThreshold",
        !fixed,
      );

      setDisabled(
        form,
        "successAttribute",
        automatic,
      );

      const counterInputs =
        form.querySelectorAll<HTMLInputElement>(
          'input[name="counterOptions"]',
        );

      for (const counter of counterInputs) {
        counter.disabled =
          !opposed;

        counter
          .closest("label")
          ?.classList.toggle(
            "opacity-35",
            !opposed,
          );

        if (!opposed) {
          counter.checked =
            false;
        }
      }

      if (automatic) {
        setValue(
          form,
          "successDie",
          "",
        );

        setValue(
          form,
          "successThreshold",
          "",
        );

        setValue(
          form,
          "successAttribute",
          "",
        );
      } else if (!fixed) {
        setValue(
          form,
          "successThreshold",
          "",
        );
      }
    };

    const watched: Control[] = [
      usable,
      behaviour,
      resolution,
      stackable,
    ];

    for (const element of watched) {
      element.addEventListener(
        "change",
        update,
      );
    }

    update();

    return () => {
      for (const element of watched) {
        element.removeEventListener(
          "change",
          update,
        );
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

effect_logic = '''"use client";

import {
  useEffect,
  useRef,
} from "react";

type Control =
  | HTMLInputElement
  | HTMLSelectElement;

function control(
  form: HTMLFormElement,
  name: string,
): Control | null {
  const value =
    form.elements.namedItem(name);

  return value instanceof HTMLInputElement ||
    value instanceof HTMLSelectElement
    ? value
    : null;
}

function setDisabled(
  form: HTMLFormElement,
  name: string,
  disabled: boolean,
) {
  const element =
    control(form, name);

  if (!element) {
    return;
  }

  element.disabled =
    disabled;

  element
    .closest("label")
    ?.classList.toggle(
      "opacity-35",
      disabled,
    );
}

function setValue(
  form: HTMLFormElement,
  name: string,
  value: string,
) {
  const element =
    control(form, name);

  if (element) {
    element.value =
      value;
  }
}

export function ItemEffectFormLogic() {
  const anchorRef =
    useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form =
      anchorRef.current?.closest("form");

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const trigger =
      control(form, "triggerType");

    const mode =
      control(form, "effectMode");

    if (
      !(trigger instanceof HTMLSelectElement) ||
      !(mode instanceof HTMLSelectElement)
    ) {
      return;
    }

    const persistent = [
      "musclesModifier",
      "reflexesModifier",
      "vigourModifier",
      "shrewdModifier",
      "brainsModifier",
      "presenceModifier",
      "maxHealthModifier",
      "warpingAffinityModifier",
      "warpsPerDayModifier",
    ];

    const update = () => {
      const use =
        trigger.value === "use";

      const instantaneous =
        use &&
        mode.value === "instant";

      const timed =
        use &&
        mode.value === "temporary";

      setDisabled(
        form,
        "effectMode",
        !use,
      );

      setDisabled(
        form,
        "durationMinutes",
        !timed,
      );

      if (!timed) {
        setValue(
          form,
          "durationMinutes",
          "",
        );
      }

      setDisabled(
        form,
        "healthDelta",
        !use,
      );

      if (!use) {
        setValue(
          form,
          "healthDelta",
          "0",
        );
      }

      for (const name of persistent) {
        setDisabled(
          form,
          name,
          instantaneous,
        );

        if (instantaneous) {
          setValue(
            form,
            name,
            "0",
          );
        }
      }
    };

    trigger.addEventListener(
      "change",
      update,
    );

    mode.addEventListener(
      "change",
      update,
    );

    update();

    return () => {
      trigger.removeEventListener(
        "change",
        update,
      );

      mode.removeEventListener(
        "change",
        update,
      );
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

checks = {
    ACTIONS: (
        actions,
        [
            "Limited-charge Items cannot be Stackable",
            'resolutionMode === "opposed"',
            "Equippable Items cannot be Stackable",
        ],
    ),
    PAGE: (
        page,
        [
            "ItemUseFormLogic",
            "ItemEffectFormLogic",
            "equipped Weapons can still attack",
            '>Instantaneous</option>',
            '>Timed</option>',
        ],
    ),
    USE_ACTIONS: (
        use_actions,
        [
            "is_active: boolean;",
            "is_usable: boolean;",
            "This Item cannot be used through the Use Item action.",
        ],
    ),
    ADMIN_INV: (
        admin_inv,
        [
            'item.use_behaviour === "limited_charges"',
            "Limited-charge Items must be granted as individual Items",
        ],
    ),
}

for path, (text, markers) in checks.items():
    for marker in markers:
        if marker not in text:
            fail(
                f"Validation failed for {path.relative_to(ROOT)}: "
                f"missing {marker!r}"
            )

ACTIONS.write_text(actions, encoding="utf-8", newline="\n")
PAGE.write_text(page, encoding="utf-8", newline="\n")
USE_ACTIONS.write_text(use_actions, encoding="utf-8", newline="\n")
ADMIN_INV.write_text(admin_inv, encoding="utf-8", newline="\n")
USE_LOGIC.write_text(use_logic, encoding="utf-8", newline="\n")
EFFECT_LOGIC.write_text(effect_logic, encoding="utf-8", newline="\n")

print("WROTE  ", ACTIONS.relative_to(ROOT))
print("WROTE  ", PAGE.relative_to(ROOT))
print("WROTE  ", USE_ACTIONS.relative_to(ROOT))
print("WROTE  ", ADMIN_INV.relative_to(ROOT))
print("CREATED", USE_LOGIC.relative_to(ROOT))
print("CREATED", EFFECT_LOGIC.relative_to(ROOT))
print()
print("ITEM CONSISTENCY PATCH APPLIED")
print()
print("- Equippable and Usable remain independent.")
print("- Non-usable equipped Weapons still keep combat mechanics.")
print("- Generic Usable fields dynamically enable/disable.")
print("- Opposed generic use forces Other target.")
print("- Limited Charges cannot be Stackable.")
print("- Equippable Items cannot later be made Stackable.")
print("- Limited-charge staff grants use individual instances.")
print("- Item effects exclude impossible fields dynamically.")
print("- Standalone Use Item rejects inactive/non-usable Items.")
print()
print("Run: npm run build")
