"use client";

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
