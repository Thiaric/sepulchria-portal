"use client";

import Link from "next/link";
import {
  useMemo,
  useRef,
  useState,
} from "react";

import { CharacterAttributeAllocator } from "@/components/characters/character-attribute-allocator";

type CharacterData = Record<
  string,
  string | null | undefined
>;

type CharacterOption = {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  icon_url: string | null;
  colour: string | null;
};

type CharacterFormProps = {
  action: (
    formData: FormData,
  ) => void | Promise<void>;
  character?: CharacterData;
  races: CharacterOption[];
  associations: CharacterOption[];
  submitLabel: string;
  mode: "create" | "update";
};

const steps = [
  {
    number: 1,
    label: "Identity",
    description:
      "Name, origins and personal details.",
  },
  {
    number: 2,
    label: "Heritage",
    description:
      "Ancestry, Association and social role.",
  },
  {
    number: 3,
    label: "Attributes",
    description:
      "Distribute the character's 20 attribute points.",
  },
  {
    number: 4,
    label: "Appearance",
    description:
      "Portrait and physical description.",
  },
  {
    number: 5,
    label: "Story",
    description:
      "Personality, biography and public notes.",
  },
  {
    number: 6,
    label: "Review",
    description:
      "Review the character before saving.",
  },
] as const;

export default function CharacterForm({
  action,
  character,
  races,
  associations,
  submitLabel,
  mode,
}: CharacterFormProps) {
  const formRef =
    useRef<HTMLFormElement>(null);

  const [currentStep, setCurrentStep] =
    useState(1);

  const [selectedRaceId, setSelectedRaceId] =
    useState(character?.race_id ?? "");

  const [
    selectedAssociationId,
    setSelectedAssociationId,
  ] = useState(
    character?.association_id ?? "",
  );

  const [validationError, setValidationError] =
    useState<string | null>(null);

  const selectedRace = useMemo(
    () =>
      races.find(
        (race) =>
          race.id === selectedRaceId,
      ) ?? null,
    [races, selectedRaceId],
  );

  const selectedAssociation = useMemo(
    () =>
      associations.find(
        (association) =>
          association.id ===
          selectedAssociationId,
      ) ?? null,
    [
      associations,
      selectedAssociationId,
    ],
  );

  function getValue(name: string) {
    const form = formRef.current;

    if (!form) {
      return "";
    }

    const field = form.elements.namedItem(
      name,
    );

    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement ||
      field instanceof HTMLSelectElement
    ) {
      return field.value.trim();
    }

    return "";
  }

  function validateStep(step: number) {
    if (step === 1) {
      if (
        !getValue("first_name") ||
        !getValue("surname")
      ) {
        setValidationError(
          "First name and surname are required.",
        );

        return false;
      }
    }

    if (step === 2 && mode === "create") {
  if (!selectedRaceId) {
    setValidationError(
      "Choose an ancestry before continuing.",
    );

    return false;
  }

  if (!selectedAssociationId) {
    setValidationError(
      "Choose an Association before continuing.",
    );

    return false;
  }
}

    if (step === 4) {
      if (!getValue("physical_description")) {
        setValidationError(
          "Physical description is required before continuing.",
        );
        return false;
      }
    }

    if (step === 5) {
      if (!getValue("personality")) {
        setValidationError(
          "Personality is required before continuing.",
        );
        return false;
      }

      if (!getValue("biography")) {
        setValidationError(
          "Biography is required before continuing.",
        );
        return false;
      }
    }

    if (step === 3 && mode === "create") {
      const attributeNames = [
        "muscles",
        "reflexes",
        "vigor",
        "brains",
        "shrewd",
        "presence_score",
      ];

      const attributeValues =
        attributeNames.map((name) =>
          Number(getValue(name)),
        );

      const attributesValid =
        attributeValues.every(
          (value) =>
            Number.isInteger(value) &&
            value >= 1 &&
            value <= 8,
        ) &&
        attributeValues.reduce(
          (total, value) =>
            total + value,
          0,
        ) === 20;

      if (!attributesValid) {
        setValidationError(
          "Distribute exactly 20 points across the six attributes. Every value must be between 1 and 8.",
        );

        return false;
      }
    }

    setValidationError(null);
    return true;
  }

  function goToNextStep() {
    if (!validateStep(currentStep)) {
      return;
    }

    setCurrentStep((step) =>
      Math.min(step + 1, steps.length),
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function goToPreviousStep() {
    setValidationError(null);

    setCurrentStep((step) =>
      Math.max(step - 1, 1),
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function goToStep(step: number) {
    if (step > currentStep) {
      for (
        let checkedStep = currentStep;
        checkedStep < step;
        checkedStep += 1
      ) {
        if (!validateStep(checkedStep)) {
          return;
        }
      }
    }

    setValidationError(null);
    setCurrentStep(step);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="overflow-hidden border border-[#6c5132]/50 bg-[#17110d]/95"
    >
      <input
        type="hidden"
        name="race_id"
        value={selectedRaceId}
      />

      <input
        type="hidden"
        name="association_id"
        value={selectedAssociationId}
      />

      <div className="border-b border-[#5d452d]/40 bg-[#110d0a] p-4 sm:p-6">
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {steps.map((step) => {
            const active =
              currentStep === step.number;

            const completed =
              currentStep > step.number;

            return (
              <button
                key={step.number}
                type="button"
                onClick={() =>
                  goToStep(step.number)
                }
                className={`group border px-3 py-3 text-left transition ${
                  active
                    ? "border-[#9a7543] bg-[#382819]"
                    : completed
                      ? "border-[#675033] bg-[#211810]"
                      : "border-[#4d3b29]/50 bg-[#130f0c] hover:border-[#6d5436]"
                }`}
              >
                <span
                  className={`block text-[9px] uppercase tracking-[0.24em] ${
                    active
                      ? "text-[#e0bd7e]"
                      : completed
                        ? "text-[#aa8757]"
                        : "text-[#63594d]"
                  }`}
                >
                  {completed
                    ? "Completed"
                    : `Step ${step.number}`}
                </span>

                <span
                  className={`mt-1 block font-serif text-sm ${
                    active
                      ? "text-[#f0d9ae]"
                      : "text-[#a99b87]"
                  }`}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6 sm:p-8 lg:p-10">
        <header className="mb-8 border-b border-[#5e4930]/35 pb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#987447]">
            Step {currentStep} of{" "}
            {steps.length}
          </p>

          <h2 className="mt-3 font-serif text-3xl text-[#ead5ad] sm:text-4xl">
            {
              steps[currentStep - 1]
                .label
            }
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#998c7a]">
            {
              steps[currentStep - 1]
                .description
            }
          </p>
        </header>

        {validationError ? (
          <div className="mb-7 border border-[#8c463d] bg-[#2a1513] p-4 text-sm text-[#e4b4aa]">
            {validationError}
          </div>
        ) : null}

        <section
          className={
            currentStep === 1
              ? "block"
              : "hidden"
          }
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              label="First name"
              name="first_name"
              required
              defaultValue={
                character?.first_name
              }
              autoComplete="given-name"
            />

            <TextField
              label="Surname"
              name="surname"
              required
              defaultValue={
                character?.surname
              }
              autoComplete="family-name"
            />

            <TextField
              label="Pronouns"
              name="pronouns"
              defaultValue={
                character?.pronouns
              }
              placeholder="They/them, she/her, he/him..."
            />

            <TextField
              label="Date of birth"
              name="date_of_birth"
              type="date"
              defaultValue={
                character?.date_of_birth
              }
            />

            <TextField
              label="Birthplace"
              name="birthplace"
              defaultValue={
                character?.birthplace
              }
              placeholder="City, settlement or region"
            />

            <TextField
              label="Origin"
              name="origin"
              defaultValue={
                character?.origin
              }
              placeholder="Homeland or cultural origin"
            />
          </div>
        </section>

        <section
          className={
            currentStep === 2
              ? "block"
              : "hidden"
          }
        >{mode === "create" ? (
  <>
          <SelectionSection
      title="Choose an ancestry"
      description="Ancestry represents your character's heritage and inherited traits."
      options={races}
      selectedId={selectedRaceId}
      onSelect={setSelectedRaceId}
      emptyMessage="No ancestries are currently available."
    />

    <div className="my-10 border-t border-[#5d452d]/40" />

          <SelectionSection
      title="Choose an Association"
      description="The Association represents your character's place within the living body of Sepulchria."
      options={associations}
      selectedId={selectedAssociationId}
      onSelect={setSelectedAssociationId}
      emptyMessage="No Associations are currently available."
    />
 </>
) : (
  <LockedHeritage
    race={selectedRace}
    association={selectedAssociation}
  />
)}


          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <TextField
              label="Occupation"
              name="occupation"
              defaultValue={
                character?.occupation
              }
              placeholder="Scholar, artisan, guard..."
            />

            <TextField
              label="Title"
              name="title"
              defaultValue={
                character?.title
              }
              placeholder="Optional public title"
            />
          </div>
        </section>

        <section
          className={
            currentStep === 4
              ? "block"
              : "hidden"
          }
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-7">
              <TextField
                label="Portrait URL"
                name="portrait_url"
                type="url"
                defaultValue={
                  character?.portrait_url
                }
                placeholder="https://..."
              />

              <TextAreaField
                label="Physical description"
                name="physical_description"
              required
                rows={14}
                maxLength={10000}
                defaultValue={
                  character?.physical_description
                }
                description="Describe appearance, build, distinguishing features, clothing and mannerisms."
              />
            </div>

            <PortraitPreview
              initialUrl={
                character?.portrait_url ??
                ""
              }
              formRef={formRef}
            />
          </div>
        </section>

        <section
          className={
            currentStep === 3
              ? "block"
              : "hidden"
          }
        >
          <CharacterAttributeAllocator
            locked={mode === "update"}
            initialValues={{
              muscles: character?.muscles,
              reflexes: character?.reflexes,
              vigor: character?.vigor,
              brains: character?.brains,
              shrewd: character?.shrewd,
              presence_score: character?.presence_score,
            }}
          />
        </section>

        <section
          className={
            currentStep === 5
              ? "block"
              : "hidden"
          }
        >
          <div className="space-y-7">
            <TextAreaField
              label="Personality"
              name="personality"
              required
              rows={9}
              maxLength={10000}
              defaultValue={
                character?.personality
              }
              description="Temperament, virtues, flaws, fears, ambitions and habits."
            />

            <TextAreaField
              label="Biography"
              name="biography"
              required
              rows={14}
              maxLength={20000}
              defaultValue={
                character?.biography
              }
              description="The public history of the character before entering the current chronicle."
            />

            <TextAreaField
              label="Public notes"
              name="public_notes"
              rows={7}
              maxLength={10000}
              defaultValue={
                character?.public_notes
              }
              description="Information other players may reasonably know."
            />
          </div>
        </section>

        <section
          className={
            currentStep === 6
              ? "block"
              : "hidden"
          }
        >
          <ReviewPanel
            formRef={formRef}
            selectedRace={selectedRace}
            selectedAssociation={
              selectedAssociation
            }
            mode={mode}
          />
        </section>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-[#5d452d]/40 bg-[#110d0a] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={goToPreviousStep}
              className="w-full border border-[#5f4a31] px-6 py-3 text-xs uppercase tracking-[0.22em] text-[#a99a84] transition hover:border-[#81633d] hover:bg-[#211810] hover:text-[#dfc79c] sm:w-auto"
            >
              ← Previous
            </button>
          ) : (
            <Link
              href={
                mode === "create"
                  ? "/"
                  : "/character"
              }
              className="block border border-[#5f4a31] px-6 py-3 text-center text-xs uppercase tracking-[0.22em] text-[#a99a84] transition hover:border-[#81633d] hover:bg-[#211810] hover:text-[#dfc79c]"
            >
              Cancel
            </Link>
          )}
        </div>

        {currentStep <
        steps.length ? (
          <button
            type="button"
            onClick={goToNextStep}
            className="border border-[#95703f] bg-[#3c2b1a] px-7 py-3 text-xs uppercase tracking-[0.25em] text-[#f0d39b] transition hover:bg-[#513923]"
          >
            Continue →
          </button>
        ) : (
          <button
            type="submit"
            className="border border-[#ae8247] bg-[#4a321d] px-8 py-3 text-xs uppercase tracking-[0.25em] text-[#f5dca9] transition hover:bg-[#634425]"
          >
            {submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}

function TextField({
  label,
  name,
  required = false,
  type = "text",
  defaultValue,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  defaultValue?: string | null;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] uppercase tracking-[0.25em] text-[#a38357]">
        {label}
        {required ? " *" : ""}
      </span>

      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full border border-[#654c31] bg-[#0f0c09] px-4 py-3 text-sm text-[#dfceb0] outline-none transition placeholder:text-[#554d43] focus:border-[#a17a45]"
      />
    </label>
  );
}

function TextAreaField({
  label,
  name,
  rows,
  maxLength,
  defaultValue,
  description,
  required = false,
}: {
  label: string;
  name: string;
  rows: number;
  maxLength: number;
  defaultValue?: string | null;
  description?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] uppercase tracking-[0.25em] text-[#a38357]">
        {label}
        {required ? " *" : ""}
      </span>

      {description ? (
        <span className="mb-3 block text-xs leading-6 text-[#807568]">
          {description}
        </span>
      ) : null}

      <textarea
        name={name}
        required={required}
        rows={rows}
        maxLength={maxLength}
        defaultValue={defaultValue ?? ""}
        className="w-full resize-y border border-[#654c31] bg-[#0f0c09] px-4 py-3 text-sm leading-7 text-[#dfceb0] outline-none transition placeholder:text-[#554d43] focus:border-[#a17a45]"
      />

      <span className="mt-2 block text-right text-[9px] uppercase tracking-[0.18em] text-[#61584d]">
        Maximum{" "}
        {maxLength.toLocaleString("en-GB")}{" "}
        characters
      </span>
    </label>
  );
}

function SelectionSection({
  title,
  description,
  options,
  selectedId,
  onSelect,
  emptyMessage,
}: {
  title: string;
  description: string;
  options: CharacterOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  emptyMessage: string;
}) {
  return (
    <div>
      <div className="mb-5">
        <h3 className="font-serif text-2xl text-[#dfc79c]">
          {title}
        </h3>

        <p className="mt-2 max-w-3xl text-sm leading-7 text-[#918473]">
          {description}
        </p>
      </div>

      {options.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {options.map((option) => {
  const selected =
    selectedId === option.id;

  const optionColour =
    option.colour ?? "#8d6d3e";

  return (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  onSelect(option.id)
                }
                aria-pressed={selected}
                className={`relative min-h-36 overflow-hidden border p-5 text-left transition ${
                  selected
                    ? "border-[#c19352] bg-[#332416] shadow-[0_0_24px_rgba(153,112,58,0.15)]"
                    : "border-[#5c462f]/65 bg-[#120e0b] hover:border-[#85643d] hover:bg-[#1d1510]"
                }`}
                style={{
  backgroundImage: `radial-gradient(circle at top right, ${optionColour}30, transparent 52%)`,
}}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border bg-black/20 font-serif text-lg"
                    style={{
  borderColor: `${optionColour}88`,
  color: optionColour,
}}
                  >
                    {option.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={option.icon_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      option.name
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="font-serif text-xl text-[#e0c99e]">
                      {option.name}
                    </p>

                    <p className="mt-2 line-clamp-3 text-xs leading-6 text-[#918473]">
                      {option.summary ||
                        "Codex information will be added soon."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[#5b452d]/35 pt-3">
                  <Link
                    href={
                      title
                        .toLowerCase()
                        .includes(
                          "association",
                        )
                        ? `/associations/${option.slug}`
                        : `/races/${option.slug}`
                    }
                    target="_blank"
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                    className="text-[9px] uppercase tracking-[0.2em] text-[#9f7b4b] transition hover:text-[#e2c18a]"
                  >
                    Read Codex ↗
                  </Link>

                  <span
                    className={`text-[9px] uppercase tracking-[0.2em] ${
                      selected
                        ? "text-[#e2be7b]"
                        : "text-[#5f564b]"
                    }`}
                  >
                    {selected
                      ? "Selected"
                      : "Choose"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="border border-dashed border-[#5c462f] bg-[#110d0a] p-6 text-sm text-[#887b69]">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}

function PortraitPreview({
  initialUrl,
  formRef,
}: {
  initialUrl: string;
  formRef: React.RefObject<HTMLFormElement | null>;
}) {
  const [url, setUrl] =
    useState(initialUrl);

  function refreshPreview() {
    const field =
      formRef.current?.elements.namedItem(
        "portrait_url",
      );

    if (field instanceof HTMLInputElement) {
      setUrl(field.value.trim());
    }
  }

  return (
    <aside className="border border-[#60482e]/50 bg-[#100c09] p-4">
      <p className="text-[9px] uppercase tracking-[0.24em] text-[#826b4d]">
        Portrait preview
      </p>

      <div className="mt-4 flex aspect-[3/4] items-center justify-center overflow-hidden border border-[#60482e]/50 bg-[#0a0807]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Character portrait preview"
            className="h-full w-full object-cover"
            onError={() => setUrl("")}
          />
        ) : (
          <span className="font-serif text-5xl text-[#4e463d]">
            ?
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={refreshPreview}
        className="mt-4 w-full border border-[#654c31] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[#bca27a] transition hover:bg-[#241a11]"
      >
        Refresh preview
      </button>
    </aside>
  );
}

function ReviewPanel({
  formRef,
  selectedRace,
  selectedAssociation,
  mode,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  selectedRace: CharacterOption | null;
  selectedAssociation: CharacterOption | null;
  mode: "create" | "update";
}) {
  function value(name: string) {
    const field =
      formRef.current?.elements.namedItem(
        name,
      );

    if (
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement
    ) {
      return (
        field.value.trim() ||
        "Not recorded"
      );
    }

    return "Not recorded";
  }

  const identity = [
    ["First name", value("first_name")],
    ["Surname", value("surname")],
    ["Pronouns", value("pronouns")],
    [
      "Date of birth",
      value("date_of_birth"),
    ],
    ["Birthplace", value("birthplace")],
    ["Origin", value("origin")],
  ];

  const heritage = [
    [
      "Ancestry",
      selectedRace?.name ??
        "Not selected",
    ],
    [
      "Association",
      selectedAssociation?.name ??
        "Not selected",
    ],
    ["Occupation", value("occupation")],
    ["Title", value("title")],
  ];

  const attributes = [
    ["Muscles", value("muscles")],
    ["Reflexes", value("reflexes")],
    ["Vigor", value("vigor")],
    ["Brains", value("brains")],
    ["Shrewd", value("shrewd")],
    ["Presence", value("presence_score")],
  ];

  return (
    <div className="space-y-7">
      <div className="border border-[#735735]/55 bg-[#21170f] p-5">
        <p className="text-[10px] uppercase tracking-[0.26em] text-[#ad8753]">
          Final review
        </p>

        <h3 className="mt-3 font-serif text-2xl text-[#e3cba2]">
          {mode === "create"
            ? "Ready to enter Sepulchria"
            : "Ready to save your changes"}
        </h3>

        <p className="mt-3 text-sm leading-7 text-[#998b78]">
          Check the information below.
          You may return to any previous step
          before saving.
        </p>
      </div>

      <ReviewSection
        title="Identity"
        items={identity}
      />

      <ReviewSection
        title="Heritage"
        items={heritage}
      />

      <ReviewSection
        title="Attributes"
        items={attributes}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <ReviewText
          title="Physical description"
          content={value(
            "physical_description",
          )}
        />

        <ReviewText
          title="Personality"
          content={value("personality")}
        />

        <ReviewText
          title="Biography"
          content={value("biography")}
        />

        <ReviewText
          title="Public notes"
          content={value("public_notes")}
        />
      </div>
    </div>
  );
}

function ReviewSection({
  title,
  items,
}: {
  title: string;
  items: string[][];
}) {
  return (
    <section className="border border-[#60482e]/45 bg-[#120e0b]">
      <h3 className="border-b border-[#60482e]/35 px-5 py-4 font-serif text-xl text-[#dfc79c]">
        {title}
      </h3>

      <div className="grid gap-px bg-[#4f3b28]/35 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div
            key={label}
            className="bg-[#15100d] p-4"
          >
            <p className="text-[9px] uppercase tracking-[0.22em] text-[#796448]">
              {label}
            </p>

            <p className="mt-2 break-words text-sm text-[#cab89b]">
              {value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReviewText({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <article className="border border-[#60482e]/45 bg-[#120e0b] p-5">
      <h3 className="font-serif text-xl text-[#dfc79c]">
        {title}
      </h3>

      <p className="mt-4 line-clamp-6 whitespace-pre-line break-words text-sm leading-7 text-[#9f9281]">
        {content}
      </p>
    </article>
  );
}

function LockedHeritage({
  race,
  association,
}: {
  race: CharacterOption | null;
  association: CharacterOption | null;
}) {
  return (
    <div>
      <div className="mb-6 border border-[#735735]/55 bg-[#21170f] p-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#ad8753]">
          Permanent character information
        </p>

        <p className="mt-3 text-sm leading-7 text-[#a0927f]">
          Ancestry and Association are chosen during character creation and cannot
          be changed from the character editor. Contact the staff if a
          correction is necessary.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <LockedHeritageCard
          label="Race"
          option={race}
          href={
            race
              ? `/races/${race.slug}`
              : "/races"
          }
        />

        <LockedHeritageCard
          label="Association"
          option={association}
          href={
            association
              ? `/associations/${association.slug}`
              : "/associations"
          }
        />
      </div>
    </div>
  );
}

function LockedHeritageCard({
  label,
  option,
  href,
}: {
  label: string;
  option: CharacterOption | null;
  href: string;
}) {
  const optionColour =
    option?.colour ?? "#8d6d3e";

  return (
    <article
      className="border border-[#60482e]/55 bg-[#120e0b] p-5"
      style={{
        backgroundImage: `radial-gradient(circle at top right, ${optionColour}25, transparent 55%)`,
      }}
    >
      <p className="text-[9px] uppercase tracking-[0.24em] text-[#806b50]">
        {label}
      </p>

      <div className="mt-4 flex items-center gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border bg-black/20 font-serif text-lg"
          style={{
            borderColor: `${optionColour}88`,
            color: optionColour,
          }}
        >
          {option?.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={option.icon_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            option?.name.charAt(0).toUpperCase() ?? "?"
          )}
        </div>

        <div className="min-w-0">
          <p className="font-serif text-xl text-[#e0c99e]">
            {option?.name ?? "Not assigned"}
          </p>

          <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-[#776b5c]">
            Locked
          </p>
        </div>
      </div>

      <Link
        href={href}
        target="_blank"
        className="mt-5 inline-flex text-[9px] uppercase tracking-[0.2em] text-[#9f7b4b] transition hover:text-[#e2c18a]"
      >
        Read Codex ↗
      </Link>
    </article>
  );
}