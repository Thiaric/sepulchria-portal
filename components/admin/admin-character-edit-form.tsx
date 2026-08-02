"use client";

import {
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

const ATTRIBUTE_NAMES = [
  "muscles",
  "reflexes",
  "vigor",
  "brains",
  "shrewd",
  "presence_score",
] as const;

type AdminCharacterEditFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  children: ReactNode;
};

export function AdminCharacterEditForm({
  action,
  className,
  children,
}: AdminCharacterEditFormProps) {
  const [attributeError, setAttributeError] =
    useState<string | null>(null);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    const formData = new FormData(
      event.currentTarget,
    );

    const rawValues = ATTRIBUTE_NAMES.map(
      (name) =>
        String(
          formData.get(name) ?? "",
        ).trim(),
    );

    /*
     * Legacy characters may keep every
     * attribute empty until staff assigns them.
     */
    if (
      rawValues.every(
        (value) => value === "",
      )
    ) {
      setAttributeError(null);
      return;
    }

    if (
      rawValues.some(
        (value) => value === "",
      )
    ) {
      event.preventDefault();

      setAttributeError(
        "Complete all six attributes, or leave all six empty for a legacy character.",
      );

      scrollToAttributes(
        event.currentTarget,
      );

      return;
    }

    const values =
      rawValues.map(Number);

    const valuesAreValid =
      values.every(
        (value) =>
          Number.isInteger(value) &&
          value >= 1 &&
          value <= 8,
      );

    if (!valuesAreValid) {
      event.preventDefault();

      setAttributeError(
        "Every attribute must be a whole number between 1 and 8.",
      );

      scrollToAttributes(
        event.currentTarget,
      );

      return;
    }

    const total = values.reduce(
      (sum, value) => sum + value,
      0,
    );

    if (total !== 20) {
      event.preventDefault();

      setAttributeError(
        `Character attributes currently total ${total}. They must total exactly 20 points.`,
      );

      scrollToAttributes(
        event.currentTarget,
      );

      return;
    }

    setAttributeError(null);
  }

  return (
    <form
      action={action}
      onSubmit={handleSubmit}
      className={className}
      noValidate
    >
      {attributeError ? (
        <div
          role="alert"
          className="mb-5 border border-[#8c463d] bg-[#2a1513] p-4 text-sm leading-6 text-[#e4b4aa]"
        >
          {attributeError}
        </div>
      ) : null}

      {children}
    </form>
  );
}

function scrollToAttributes(
  form: HTMLFormElement,
) {
  const firstAttribute =
    form.elements.namedItem(
      ATTRIBUTE_NAMES[0],
    );

  if (
    firstAttribute instanceof
    HTMLInputElement
  ) {
    firstAttribute.focus();

    firstAttribute.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
}
