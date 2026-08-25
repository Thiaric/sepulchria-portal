"use client";

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
