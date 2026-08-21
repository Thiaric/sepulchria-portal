"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  getAdminCharacterAgeConfig,
  saveAdminCharacterAge,
  type AdminAgeConfig,
} from "@/app/(portal)/admin/characters/age-actions";

const ATTRIBUTE_NAMES = [
  "muscles",
  "reflexes",
  "vigor",
  "brains",
  "shrewd",
  "presence_score",
] as const;

type AdminCharacterEditFormProps = {
  action: (
    formData: FormData,
  ) => void | Promise<void>;
  className?: string;
  children: ReactNode;
};

export function AdminCharacterEditForm({
  action,
  className,
  children,
}: AdminCharacterEditFormProps) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const allowOriginalSubmit =
    useRef(false);

  const [attributeError, setAttributeError] =
    useState<string | null>(null);

  const [ageError, setAgeError] =
    useState<string | null>(null);

  const [ageConfig, setAgeConfig] =
    useState<AdminAgeConfig | null>(
      null,
    );

  const [selectedRaceId, setSelectedRaceId] =
    useState("");

  const [age, setAge] =
    useState("");

  const [loadingAge, setLoadingAge] =
    useState(true);

  useEffect(() => {
    const form = formRef.current;

    if (!form) {
      return;
    }

    const staffSection =
      form.closest("section");

    const oldSplitLayout =
      staffSection?.parentElement;

    const contentParent =
      oldSplitLayout?.parentElement;

    if (
      !(staffSection instanceof HTMLElement) ||
      !(oldSplitLayout instanceof HTMLElement) ||
      !(contentParent instanceof HTMLElement)
    ) {
      return;
    }

    /*
     * The server page currently renders:
     *
     * [ Biography / Physical / Personality / Notes ]
     * [ Staff Controls ]
     *
     * as two side-by-side columns.
     *
     * Move the four read-only text cards OUT of that left
     * column and place them ABOVE Staff Controls as a 2x2 grid.
     */
    const leftColumn =
      oldSplitLayout.firstElementChild;

    const summaryGrid =
      document.createElement("div");

    summaryGrid.dataset
      .adminCharacterSummaryGrid = "true";

    summaryGrid.className =
      "mt-6 grid gap-6 md:grid-cols-2";

    if (
      leftColumn instanceof HTMLElement &&
      leftColumn !== staffSection
    ) {
      const summaryCards =
        Array.from(leftColumn.children);

      summaryCards.forEach((card) => {
        summaryGrid.appendChild(card);
      });

      leftColumn.remove();

      contentParent.insertBefore(
        summaryGrid,
        oldSplitLayout,
      );
    }

    /*
     * Staff Controls now occupies the FULL central content width.
     */
    oldSplitLayout.dataset
      .adminCharacterControlsRow = "true";

    staffSection.dataset
      .adminCharacterStaffSection = "true";

    /*
     * Reorganise the editable controls themselves.
     * Pair direct children wherever possible:
     *
     * Physical description | Personality
     * Biography            | Public notes
     * Health               | Attributes
     * Ancestry             | Association
     */
    const mainControlsGrid =
      Array.from(
        form.querySelectorAll(".space-y-5"),
      ).find(
        (element) =>
          element.querySelector(
            '[name="physicalDescription"]',
          ) &&
          element.querySelector(
            '[name="personality"]',
          ) &&
          element.querySelector(
            '[name="biography"]',
          ) &&
          element.querySelector(
            '[name="publicNotes"]',
          ),
      );

    if (
      mainControlsGrid instanceof HTMLElement
    ) {
      mainControlsGrid.dataset
        .adminEditableGrid = "true";

      /*
       * The first child is the compact identity fields block.
       * Let that span the full row and use 3 columns internally.
       */
      const identityBlock =
        mainControlsGrid.firstElementChild;

      if (
        identityBlock instanceof HTMLElement
      ) {
        identityBlock.dataset
          .adminFullRow = "true";

        identityBlock.dataset
          .adminIdentityGrid = "true";
      }

      /*
       * CharacterReviewFields is a larger compound control.
       * Make its root span both columns.
       */
      const statusInput =
        mainControlsGrid.querySelector(
          '[name="status"]',
        );

      if (statusInput) {
        let reviewRoot =
          statusInput.parentElement;

        while (
          reviewRoot &&
          reviewRoot.parentElement !==
            mainControlsGrid
        ) {
          reviewRoot =
            reviewRoot.parentElement;
        }

        if (
          reviewRoot instanceof HTMLElement
        ) {
          reviewRoot.dataset
            .adminFullRow = "true";
        }
      }
    }

    const attributeGrid =
      form.querySelector(
        ".mt-4.grid.grid-cols-2.gap-3",
      );

    if (
      attributeGrid instanceof HTMLElement
    ) {
      attributeGrid.dataset
        .adminAttributeGrid = "true";
    }

    return () => {
      /*
       * No reverse DOM move is needed during normal navigation because
       * Next unmounts the whole page. Avoid trying to restore detached
       * server-rendered nodes during teardown.
       */
    };
  }, []);

  useEffect(() => {
    const form = formRef.current;

    if (!form) {
      return;
    }

    const characterIdField =
      form.elements.namedItem(
        "characterId",
      );

    const raceField =
      form.elements.namedItem(
        "raceId",
      );

    const dobField =
      form.elements.namedItem(
        "dateOfBirth",
      );

    if (
      !(characterIdField instanceof
        HTMLInputElement)
    ) {
      setLoadingAge(false);
      return;
    }

    if (
      raceField instanceof
      HTMLSelectElement
    ) {
      setSelectedRaceId(
        raceField.value,
      );

      const handleRaceChange = () => {
        setSelectedRaceId(
          raceField.value,
        );
      };

      raceField.addEventListener(
        "change",
        handleRaceChange,
      );

      void getAdminCharacterAgeConfig(
        characterIdField.value,
      )
        .then((config) => {
          setAgeConfig(config);

          setAge(
            config.age === null
              ? ""
              : String(config.age),
          );
        })
        .catch((error) => {
          setAgeError(
            error instanceof Error
              ? error.message
              : "Unable to load age information.",
          );
        })
        .finally(() => {
          setLoadingAge(false);
        });

      /*
       * Remove the obsolete Date of Birth
       * control from the staff form.
       * It remains in the old source page
       * only for backwards compatibility,
       * but is disabled and not submitted.
       */
      if (
        dobField instanceof
        HTMLInputElement
      ) {
        dobField.disabled = true;

        const fieldWrapper =
          dobField.closest(".block");

        if (
          fieldWrapper instanceof
          HTMLElement
        ) {
          fieldWrapper.style.display =
            "none";
        }
      }

      return () => {
        raceField.removeEventListener(
          "change",
          handleRaceChange,
        );
      };
    }

    setLoadingAge(false);
  }, []);

  useEffect(() => {
    /*
     * Update the read-only summary at
     * the top of /admin/characters/[id].
     * This removes the final visible
     * "Date of birth" from the page.
     */
    const labels =
      document.querySelectorAll("p");

    labels.forEach((label) => {
      if (
        label.textContent?.trim() !==
        "Date of birth"
      ) {
        return;
      }

      const wrapper =
        label.parentElement;

      if (!wrapper) {
        return;
      }

      label.textContent = "Age";

      const value =
        wrapper.querySelector(
          "p.mt-2",
        );

      if (
        value instanceof
        HTMLElement
      ) {
        value.textContent =
          age.trim()
            ? `${age.trim()} years`
            : "Not provided";
      }
    });
  }, [age]);

  const selectedRace =
    ageConfig?.races.find(
      (race) =>
        race.id === selectedRaceId,
    ) ?? null;

  function validateAttributes(
    form: HTMLFormElement,
  ) {
    const formData =
      new FormData(form);

    const rawValues =
      ATTRIBUTE_NAMES.map((name) =>
        String(
          formData.get(name) ?? "",
        ).trim(),
      );

    if (
      rawValues.every(
        (value) => value === "",
      )
    ) {
      setAttributeError(null);
      return true;
    }

    if (
      rawValues.some(
        (value) => value === "",
      )
    ) {
      setAttributeError(
        "Complete all six attributes, or leave all six empty for a legacy character.",
      );

      scrollToAttributes(form);
      return false;
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
      setAttributeError(
        "Every attribute must be a whole number between 1 and 8.",
      );

      scrollToAttributes(form);
      return false;
    }


    setAttributeError(null);
    return true;
  }

  function validateAge() {
    if (!selectedRace) {
      setAgeError(
        "Choose an ancestry before saving.",
      );
      return false;
    }

    const numericAge =
      Number(age);

    if (
      !age.trim() ||
      !Number.isInteger(
        numericAge,
      )
    ) {
      setAgeError(
        "Age must be a whole number.",
      );
      return false;
    }

    if (
      selectedRace.min_age ===
      null
    ) {
      setAgeError(
        `The playable age range for ${selectedRace.name} is not configured.`,
      );
      return false;
    }

    if (
      numericAge <
      selectedRace.min_age
    ) {
      setAgeError(
        `${selectedRace.name} characters must be at least ${selectedRace.min_age} years old.`,
      );
      return false;
    }

    if (
      selectedRace.max_age !==
        null &&
      numericAge >
        selectedRace.max_age
    ) {
      setAgeError(
        `${selectedRace.name} characters may be no older than ${selectedRace.max_age} years.`,
      );
      return false;
    }

    setAgeError(null);
    return true;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    if (allowOriginalSubmit.current) {
      allowOriginalSubmit.current =
        false;
      return;
    }

    event.preventDefault();

    const form =
      event.currentTarget;

    if (!validateAttributes(form)) {
      return;
    }

    if (!validateAge()) {
      return;
    }

    const formData =
      new FormData(form);

    formData.set("age", age);

    const result =
      await saveAdminCharacterAge(
        formData,
      );

    if (!result.ok) {
      setAgeError(result.error);
      return;
    }

    /*
     * Age + ancestry have now passed
     * server-side validation and been
     * saved together. Let the existing
     * administration action perform all
     * its normal status/history/profile
     * work unchanged.
     */
    allowOriginalSubmit.current =
      true;

    form.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className={className}
      noValidate
    >
      {attributeError ? (
        <div
          role="alert"
          className="mb-5 border border-[rgb(var(--sep-colour-8c463d))] bg-[rgb(var(--sep-colour-2a1513))] p-4 text-sm leading-6 text-[rgb(var(--sep-colour-e4b4aa))]"
        >
          {attributeError}
        </div>
      ) : null}

      {ageError ? (
        <div
          role="alert"
          className="mb-5 border border-[rgb(var(--sep-colour-8c463d))] bg-[rgb(var(--sep-colour-2a1513))] p-4 text-sm leading-6 text-[rgb(var(--sep-colour-e4b4aa))]"
        >
          {ageError}
        </div>
      ) : null}

      <section className="mb-5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
          Age
        </p>

        <input
          type="number"
          name="age"
          value={age}
          onChange={(event) =>
            setAge(
              event.target.value,
            )
          }
          min={
            selectedRace?.min_age ??
            undefined
          }
          max={
            selectedRace?.max_age ??
            undefined
          }
          step={1}
          disabled={
            loadingAge ||
            !selectedRace ||
            selectedRace.min_age ===
              null
          }
          className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] disabled:cursor-not-allowed disabled:opacity-45"
        />

        <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          {loadingAge
            ? "Loading ancestry age rules..."
            : !selectedRace
              ? "Choose an ancestry below."
              : selectedRace.min_age ===
                  null
                ? "This ancestry has no configured playable age range."
                : selectedRace.max_age ===
                    null
                  ? `${selectedRace.name}: ${selectedRace.min_age}+ years`
                  : `${selectedRace.name}: ${selectedRace.min_age}â€“${selectedRace.max_age} years`}
        </p>

        
      </section>

      {children}

      <style jsx global>{`
        /*
         * Completely remove the old lower-page split.
         * This prevents Staff Controls from ever extending beneath
         * the portal's fixed/right context sidebar.
         */
        [data-admin-character-controls-row="true"] {
          display: block !important;
          width: 100% !important;
          grid-template-columns: none !important;
        }

        [data-admin-character-staff-section="true"] {
          width: 100% !important;
          max-width: 100% !important;
        }

        [data-admin-character-summary-grid="true"] {
          width: 100%;
          margin-top: 1.5rem;
        }

        @media (min-width: 768px) {
          [data-admin-character-summary-grid="true"] {
            display: grid !important;
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
            gap: 1.5rem !important;
          }

          [data-admin-character-summary-grid="true"]
            > * {
            margin-top: 0 !important;
            min-width: 0;
            height: 100%;
          }
        }

        @media (min-width: 1024px) {
          /*
           * The editable Staff Controls body itself becomes two columns.
           */
          [data-admin-editable-grid="true"] {
            display: grid !important;
            grid-template-columns:
              repeat(2, minmax(0, 1fr)) !important;
            gap: 1.25rem !important;
          }

          [data-admin-editable-grid="true"]
            > * {
            margin-top: 0 !important;
            min-width: 0;
          }

          [data-admin-editable-grid="true"]
            > [data-admin-full-row="true"] {
            grid-column: 1 / -1 !important;
          }

          /*
           * First name / surname / pronouns / etc. use the full row,
           * with three compact columns where space allows.
           */
          [data-admin-identity-grid="true"] {
            display: grid !important;
            grid-template-columns:
              repeat(3, minmax(0, 1fr)) !important;
            gap: 1rem !important;
          }

          /*
           * Six attributes become 3 x 2 instead of a long 2-column list.
           */
          [data-admin-attribute-grid="true"] {
            grid-template-columns:
              repeat(3, minmax(0, 1fr)) !important;
          }

          /*
           * Keep prose fields useful but compact.
           */
          [data-admin-editable-grid="true"]
            textarea[name="physicalDescription"],
          [data-admin-editable-grid="true"]
            textarea[name="personality"] {
            height: 150px !important;
            min-height: 150px !important;
          }

          [data-admin-editable-grid="true"]
            textarea[name="biography"],
          [data-admin-editable-grid="true"]
            textarea[name="publicNotes"] {
            height: 180px !important;
            min-height: 180px !important;
          }

          [data-admin-editable-grid="true"]
            textarea[name="staffNotes"] {
            height: 150px !important;
            min-height: 150px !important;
          }
        }
      `}</style>
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
