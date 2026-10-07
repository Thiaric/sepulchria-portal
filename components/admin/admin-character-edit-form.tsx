"use client";

import {
  createContext,
  useContext,
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
import {
  AURETH_MONTHS,
  REAL_MONTHS,
} from "@/lib/world/calendar";

const ATTRIBUTE_NAMES = [
  "muscles",
  "reflexes",
  "vigor",
  "brains",
  "shrewd",
  "presence_score",
] as const;

type AdminCharacterSaveState = {
  isSaving: boolean;
  error: string | null;
};

const AdminCharacterSaveContext =
  createContext<AdminCharacterSaveState>({
    isSaving: false,
    error: null,
  });

export function AdminCharacterSaveButton() {
  const {
    isSaving,
    error,
  } = useContext(
    AdminCharacterSaveContext,
  );

  return (
    <div className="mt-6">
      <button
        type="submit"
        data-admin-character-main-save="true"
        disabled={isSaving}
        className="w-full border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] disabled:cursor-not-allowed disabled:opacity-60 admin_characters_id_page_button_save_character_record"
      >
        {isSaving
          ? "Saving..."
          : "Save character record"}
      </button>

      {error ? (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-3 border border-[rgb(var(--sep-colour-8c463d))] bg-[rgb(var(--sep-colour-2a1513))] p-4 text-sm leading-6 text-[rgb(var(--sep-colour-e4b4aa))]"
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}

type AdminCharacterEditFormProps = {
  action: (
    formData: FormData,
  ) => void | Promise<void>;
  className?: string;
  children: ReactNode;
  allowMissingAge?: boolean;
};

export function AdminCharacterEditForm({
  action,
  className,
  children,
  allowMissingAge = false,
}: AdminCharacterEditFormProps) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const [attributeError, setAttributeError] =
    useState<string | null>(null);

  const [ageError, setAgeError] =
    useState<string | null>(null);

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const [isSaving, setIsSaving] =
    useState(false);

  const [ageConfig, setAgeConfig] =
    useState<AdminAgeConfig | null>(
      null,
    );

  const [selectedRaceId, setSelectedRaceId] =
    useState("");

  const [age, setAge] =
    useState("");

  const [
    birthdayMonth,
    setBirthdayMonth,
  ] = useState("");

  const [
    birthdayDay,
    setBirthdayDay,
  ] = useState("");

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

          setBirthdayMonth(
            config.birthdayMonth === null
              ? ""
              : String(config.birthdayMonth),
          );

          setBirthdayDay(
            config.birthdayDay === null
              ? ""
              : String(config.birthdayDay),
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

    if (
      allowMissingAge &&
      !age.trim()
    ) {
      setAgeError(null);
      return true;
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
      null &&
      !allowMissingAge
    ) {
      setAgeError(
        `The playable age range for ${selectedRace.name} is not configured.`,
      );
      return false;
    }

    if (
      selectedRace.min_age !==
        null &&
      numericAge <
        selectedRace.min_age
    ) {
      setAgeError(
        `${selectedRace.name} characters must be at least ${selectedRace.min_age} years old.`,
      );
      return false;
    }

    /*
     * max_age is a creation limit only.
     */
    if (
      !birthdayMonth ||
      !birthdayDay
    ) {
      setAgeError(
        "Choose the Character's Aureth birth month and day.",
      );
      return false;
    }

    setAgeError(null);
    return true;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    const nativeEvent =
      event.nativeEvent as SubmitEvent;

    const submitter =
      nativeEvent.submitter;

    const isMainSave =
      submitter instanceof HTMLButtonElement &&
      submitter.dataset.adminCharacterMainSave ===
        "true";

    if (!isMainSave) {
      return;
    }

    event.preventDefault();

    if (isSaving) {
      return;
    }

    const form =
      event.currentTarget;

    setSubmitError(null);
    setAttributeError(null);
    setAgeError(null);
    setIsSaving(true);

    if (!allowMissingAge) {
      if (!validateAttributes(form)) {
        setIsSaving(false);
        return;
      }

      if (!validateAge()) {
        setIsSaving(false);
        return;
      }
    }

    const formData =
      new FormData(form);

    if (!allowMissingAge) {
      formData.set(
        "age",
        age,
      );

      const result =
        await saveAdminCharacterAge(
          formData,
        );

      if (!result.ok) {
        setAgeError(
          result.error,
        );
        setIsSaving(false);
        return;
      }
    }

    try {
      await action(
        formData,
      );

      setIsSaving(false);
    } catch (error) {
      const digest =
        error &&
        typeof error === "object" &&
        "digest" in error
          ? String(
              (
                error as {
                  digest?: unknown;
                }
              ).digest ?? "",
            )
          : "";

      if (
        digest.startsWith(
          "NEXT_REDIRECT",
        )
      ) {
        /*
         * updateCharacterAdministration redirects back to the same admin
         * Character page after a successful save. Because this client
         * component can survive that same-route refresh, leaving
         * isSaving=true here makes the Save button stay permanently
         * disabled even though the save succeeded.
         */
        setIsSaving(false);
        throw error;
      }

      setSubmitError(
        error instanceof Error
          ? error.message
          : "The character record could not be saved.",
      );

      setIsSaving(false);
    }
  }

  const visibleError =
    submitError ??
    ageError ??
    attributeError;

  return (
    <AdminCharacterSaveContext.Provider
      value={{
        isSaving,
        error: visibleError,
      }}
    >
    <form
      ref={formRef}
      action={action}
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className={[((className)), "components_admin_admin_character_edit_form_form_action"].filter(Boolean).join(" ")}
      noValidate
    >
      {!allowMissingAge ? (
      <section className="mb-5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4 components_admin_admin_character_edit_form_section_section">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))] components_admin_admin_character_edit_form_p_text">
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
          step={1}
          disabled={
            !allowMissingAge &&
            (
              loadingAge ||
              !selectedRace ||
              selectedRace.min_age ===
                null
            )
          }
          className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))] disabled:cursor-not-allowed disabled:opacity-45 components_admin_admin_character_edit_form_input_age"
        />

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
              Aureth birth month
            </span>
            <select
              name="birthdayMonth"
              value={birthdayMonth}
              onChange={(event) =>
                setBirthdayMonth(
                  event.target.value,
                )
              }
              required
              className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
            >
              <option value="">
                Choose month
              </option>
              {AURETH_MONTHS.map(
                (monthName, index) => (
                  <option
                    key={monthName}
                    value={index + 1}
                  >
                    {monthName} [{REAL_MONTHS[index]}]
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span className="block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
              Birth day
            </span>
            <select
              name="birthdayDay"
              value={birthdayDay}
              onChange={(event) =>
                setBirthdayDay(
                  event.target.value,
                )
              }
              required
              className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
            >
              <option value="">
                Choose day
              </option>
              {Array.from(
                {
                  length: 31,
                },
                (_, index) =>
                  index + 1,
              ).map(
                (day) => (
                  <option
                    key={day}
                    value={day}
                  >
                    {day}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))] components_admin_admin_character_edit_form_p_text_2">
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
                  : `${selectedRace.name}: starting range ${selectedRace.min_age} - ${selectedRace.max_age} years; established Characters may age beyond it`}
        </p>

        
      </section>

      ) : null}
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
    </AdminCharacterSaveContext.Provider>
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
