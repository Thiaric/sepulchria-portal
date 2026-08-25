"use client";

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
