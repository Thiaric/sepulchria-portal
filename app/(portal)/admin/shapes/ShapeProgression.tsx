"use client";

import {
  useEffect,
  useRef,
} from "react";

export function ShapeProgression() {
  const anchorRef =
    useRef<HTMLSpanElement | null>(
      null,
    );

  useEffect(() => {
    const form =
      anchorRef.current?.closest(
        "form[data-shape-form]",
      ) as HTMLFormElement | null;

    if (!form) {
      return;
    }

    if (
      form.dataset
        .shapeProgressionReady ===
      "true"
    ) {
      return;
    }

    form.dataset
      .shapeProgressionReady =
      "true";

    const edit = Boolean(
      form.querySelector(
        'input[name="shape_id"]',
      ),
    );

    const resolution =
      form.querySelector(
        "[data-shape-resolution]",
      ) as HTMLSelectElement | null;

    const duration =
      form.querySelector(
        "[data-shape-duration]",
      ) as HTMLSelectElement | null;

    const instant =
      form.querySelector(
        "[data-shape-instant]",
      ) as HTMLInputElement | null;

    const durationUnit =
      form.querySelector(
        "[data-shape-duration-unit]",
      ) as HTMLInputElement | null;

    const amount =
      form.querySelector(
        'input[name="duration_amount"]',
      ) as HTMLInputElement | null;

    const altToggle =
      form.querySelector(
        "[data-alt-other-toggle]",
      ) as HTMLInputElement | null;

    const altProfile =
      form.querySelector(
        "[data-alt-other-profile]",
      ) as HTMLElement | null;

    const syncResolution = () => {
      const automatic =
        resolution?.value ===
        "automatic";

      form
        .querySelectorAll(
          'input[name="save_options"]',
        )
        .forEach((node) => {
          const input =
            node as HTMLInputElement;

          input.disabled =
            Boolean(automatic);

          if (automatic) {
            input.checked = false;
          }
        });

      const dc =
        form.querySelector(
          'select[name="dc_attribute"]',
        ) as
          | HTMLSelectElement
          | null;

      const onSave =
        form.querySelector(
          'select[name="save_success_damage"]',
        ) as
          | HTMLSelectElement
          | null;

      if (dc) {
        dc.disabled =
          Boolean(automatic);
      }

      if (onSave) {
        onSave.disabled =
          Boolean(automatic);
      }
    };

    const syncDuration = () => {
      if (
        !duration ||
        !instant ||
        !durationUnit
      ) {
        return;
      }

      const value =
        duration.value;

      instant.value =
        value ===
        "instantaneous"
          ? "true"
          : "false";

      if (
        value !==
        "instantaneous"
      ) {
        durationUnit.value =
          value;
      }

      if (amount) {
        amount.disabled =
          value ===
            "instantaneous" ||
          value ===
            "until_dispelled";

        amount
          .closest("label")
          ?.classList.toggle(
            "opacity-35",
            amount.disabled,
          );
      }
    };

    const syncAlternative = () => {
      if (altProfile) {
        altProfile.hidden =
          !altToggle?.checked;
      }
    };

    syncResolution();
    syncDuration();
    syncAlternative();

    resolution?.addEventListener(
      "change",
      syncResolution,
    );

    duration?.addEventListener(
      "change",
      syncDuration,
    );

    altToggle?.addEventListener(
      "change",
      syncAlternative,
    );

    const directChildren =
      Array.from(
        form.children,
      ).filter(
        (element) =>
          !(
            element instanceof
              HTMLElement &&
            element.dataset
              .shapeProgressionAnchor ===
              "true"
          ),
      ) as HTMLElement[];

    const identity =
      directChildren.find(
        (element) =>
          element.tagName ===
            "DIV" &&
          element.className.includes(
            "grid gap-3",
          ),
      );

    const sections =
      directChildren.filter(
        (element) =>
          element.tagName ===
            "SECTION" &&
          !element.querySelector(
            "[data-alt-other-toggle]",
          ),
      );

    const steps = [
      identity,
      ...sections,
    ].filter(
      Boolean,
    ) as HTMLElement[];

    const titles = [
      "Identity",
      "Casting & Resolution",
      "Targeting / Duration / Price",
      "Self Effect",
      "Other Effect",
      "Optional Attribute Prerequisites",
    ];

    const altSection =
      directChildren.find(
        (element) =>
          Boolean(
            element.querySelector(
              "[data-alt-other-toggle]",
            ),
          ),
      );

    if (
      altSection &&
      steps[4]
    ) {
      steps[4].appendChild(
        altSection,
      );
    }

    const headers:
      HTMLButtonElement[] = [];

    let unlocked =
      edit
        ? steps.length
        : 1;

    const saveButton =
      Array.from(
        form.querySelectorAll(
          "button",
        ),
      ).find(
        (button) =>
          button.type ===
          "submit",
      ) as
        | HTMLButtonElement
        | undefined;

    const setStepVisible = (
      step: HTMLElement,
      visible: boolean,
    ) => {
      step.hidden = !visible;
      step.style.display =
        visible ? "" : "none";
    };

    const openStep = (
      index: number,
    ) => {
      steps.forEach(
        (
          step,
          stepIndex,
        ) => {
          setStepVisible(
            step,
            stepIndex === index,
          );
        },
      );

      headers.forEach(
        (
          header,
          headerIndex,
        ) => {
          header.dataset.open =
            headerIndex ===
              index
              ? "true"
              : "false";

          header.classList.toggle(
            "bg-[rgb(var(--sep-colour-1c140e))]",
            headerIndex ===
              index,
          );
        },
      );
    };

    const refreshLocks = () => {
      headers.forEach(
        (
          header,
          index,
        ) => {
          const locked =
            index >=
            unlocked;

          header.disabled =
            locked;

          header.classList.toggle(
            "opacity-35",
            locked,
          );
        },
      );

      if (
        saveButton &&
        !edit
      ) {
        saveButton.hidden =
          unlocked <
          steps.length;
      }
    };

    steps.forEach(
      (
        step,
        index,
      ) => {
        const header =
          document.createElement(
            "button",
          );

        header.type =
          "button";

        header.dataset
          .shapeProgressionGenerated =
          "true";

        header.className =
          "mt-3 flex w-full items-center justify-between border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-left";

        const title =
          titles[index] ??
          `Step ${index + 1}`;

        header.innerHTML =
          `<span class="font-serif text-lg text-[rgb(var(--sep-colour-d8c29b))]">${index + 1}. ${title}</span>` +
          `<span class="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-8c704b))]">${edit ? "Open / Close" : "Progressive"}</span>`;

        step.before(
          header,
        );

        headers.push(
          header,
        );

        header.addEventListener(
          "click",
          () => {
            if (
              header.disabled
            ) {
              return;
            }

            const isOpen =
              !step.hidden &&
              step.style.display !==
                "none";

            if (!isOpen) {
              openStep(
                index,
              );
            } else {
              setStepVisible(
                step,
                false,
              );

              header.dataset.open =
                "false";

              header.classList.remove(
                "bg-[rgb(var(--sep-colour-1c140e))]",
              );
            }
          },
        );

        if (
          index <
          steps.length - 1
        ) {
          const next =
            document.createElement(
              "button",
            );

          next.type =
            "button";

          next.dataset
            .shapeProgressionGenerated =
            "true";

          next.textContent =
            "Continue";

          next.className =
            "mt-4 border border-[rgb(var(--sep-colour-7f633f))] bg-[rgb(var(--sep-colour-24180f))] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-e1c696))]";

          step.appendChild(
            next,
          );

          next.addEventListener(
            "click",
            () => {
              if (
                index === 0
              ) {
                const name =
                  form.querySelector(
                    'input[name="name"]',
                  ) as
                    | HTMLInputElement
                    | null;

                const description =
                  form.querySelector(
                    'textarea[name="description"]',
                  ) as
                    | HTMLTextAreaElement
                    | null;

                if (
                  !name?.value.trim() ||
                  !description
                    ?.value
                    .trim()
                ) {
                  name?.reportValidity();
                  description
                    ?.reportValidity();
                  return;
                }
              }

              unlocked =
                Math.max(
                  unlocked,
                  index + 2,
                );

              refreshLocks();

              openStep(
                index + 1,
              );
            },
          );
        }
      },
    );

    if (edit) {
      steps.forEach(
        (step) => {
          setStepVisible(
            step,
            false,
          );
        },
      );
    } else {
      openStep(0);
    }

    refreshLocks();

    return () => {
      resolution?.removeEventListener(
        "change",
        syncResolution,
      );

      duration?.removeEventListener(
        "change",
        syncDuration,
      );

      altToggle?.removeEventListener(
        "change",
        syncAlternative,
      );
    };
  }, []);

  return (
    <span
      ref={anchorRef}
      data-shape-progression-anchor="true"
      hidden
    />
  );
}
