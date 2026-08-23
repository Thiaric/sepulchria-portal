"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { CharacterAttributeAllocator } from "@/components/characters/character-attribute-allocator";

type CharacterData = Record<string, string | number | null | undefined>;

type CharacterOption = {
  id: string;
  name: string;
  slug: string;
  summary: string | null;
  icon_url: string | null;
  banner_url: string | null;
  colour: string | null;
};

type RaceOption = CharacterOption & {
  min_age: number | null;
  max_age: number | null;
  muscles_modifier: number | null;
  reflexes_modifier: number | null;
  vigour_modifier: number | null;
  shrewd_modifier: number | null;
  brains_modifier: number | null;
  presence_modifier: number | null;
};

type AncestryGiftOption = {
  id: string;
  name: string;
  description: string;
  raceIds: string[];
  choiceGroup: string | null;
};

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  character?: CharacterData;
  races: RaceOption[];
  ancestryGifts?: AncestryGiftOption[];
  submitLabel: string;
  mode: "create" | "update";
};

const steps = [
  ["Heritage", "Choose the Ancestry that shapes your character's heritage."],
  ["Identity", "Name, gender, pronouns, orientation and age."],
  ["Attributes", "Review the character's standard base attributes."],
  ["Appearance", "Portrait and physical description."],
  ["Story", "Personality, biography and public notes."],
  ["Review", "Review the character before saving."],
] as const;

export default function CharacterForm({
  action,
  character,
  races,
  ancestryGifts = [],
  submitLabel,
  mode,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(1);
  const [raceId, setRaceId] = useState(String(character?.race_id ?? ""));
  const [ancestryGiftIds, setAncestryGiftIds] = useState<string[]>([]);
  const [age, setAge] = useState(String(character?.age ?? ""));
  const [error, setError] = useState<string | null>(null);

  const race = useMemo(
    () => races.find((item) => item.id === raceId) ?? null,
    [races, raceId],
  );

  const eligibleAncestryGifts = useMemo(
    () =>
      ancestryGifts.filter((gift) =>
        gift.raceIds.includes(raceId),
      ),
    [ancestryGifts, raceId],
  );

  const selectedAncestryGifts = useMemo(
    () =>
      ancestryGifts.filter((gift) =>
        ancestryGiftIds.includes(gift.id),
      ),
    [ancestryGifts, ancestryGiftIds],
  );

  function selectRace(nextRaceId: string) {
    setRaceId(nextRaceId);
    setAncestryGiftIds([]);
  }

  function toggleAncestryGift(giftId: string) {
    const gift =
      eligibleAncestryGifts.find(
        (item) => item.id === giftId,
      );

    if (!gift) return;

    setAncestryGiftIds((current) => {
      if (gift.choiceGroup) {
        const groupIds =
          eligibleAncestryGifts
            .filter(
              (item) =>
                item.choiceGroup === gift.choiceGroup,
            )
            .map((item) => item.id);

        const wholeGroupSelected =
          groupIds.length > 0 &&
          groupIds.every((id) =>
            current.includes(id),
          );

        if (wholeGroupSelected) {
          return current.filter(
            (id) => !groupIds.includes(id),
          );
        }

        if (groupIds.length > 2) {
          return current;
        }

        return groupIds;
      }

      if (current.includes(giftId)) {
        return current.filter((id) => id !== giftId);
      }

      if (current.length >= 2) {
        return current;
      }

      return [...current, giftId];
    });
  }

  function value(name: string) {
    const field = formRef.current?.elements.namedItem(name);
    return field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement ||
      field instanceof HTMLSelectElement
      ? field.value.trim()
      : "";
  }

  function validateAge() {
    const numeric = Number(age);
    if (!race) return "Choose an ancestry before continuing.";
    if (race.min_age === null) return "This ancestry has no playable age range configured.";
    if (!Number.isInteger(numeric)) return "Choose a valid whole-number age.";
    if (numeric < race.min_age) return `${race.name} characters must be at least ${race.min_age} years old.`;
    if (race.max_age !== null && numeric > race.max_age)
      return `${race.name} characters may be no older than ${race.max_age} years.`;
    return null;
  }

  function validate(current: number) {
    let message: string | null = null;

    if (current === 1 && !raceId) message = "Choose an ancestry before continuing.";

    if (current === 2) {
      if (!value("first_name") || !value("surname"))
        message = "First name and surname are required.";
      else if (!["male", "female", "non_binary"].includes(value("gender")))
        message = "Choose a gender before continuing.";
      else message = validateAge();
    }


    if (current === 4 && !value("physical_description"))
      message = "Physical description is required before continuing.";

    if (current === 5 && (!value("personality") || !value("biography")))
      message = "Personality and biography are required before continuing.";

    setError(message);
    return !message;
  }

  function next() {
    if (validate(step)) setStep(Math.min(step + 1, steps.length));
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="overflow-hidden border border-[rgb(var(--sep-colour-6c5132))]/50 bg-[rgb(var(--sep-colour-17110d))]/95"
    >
      <input type="hidden" name="race_id" value={raceId} />

      {ancestryGiftIds.map((giftId) => (
        <input
          key={giftId}
          type="hidden"
          name="ancestryGiftIds"
          value={giftId}
        />
      ))}

      <div className="grid gap-2 border-b border-[rgb(var(--sep-colour-5d452d))]/40 bg-[rgb(var(--sep-colour-110d0a))] p-4 sm:grid-cols-3 xl:grid-cols-6">
        {steps.map(([label], index) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              if (index + 1 <= step || validate(step)) setStep(index + 1);
            }}
            className={`border px-3 py-3 text-left ${
              step === index + 1
                ? "border-[rgb(var(--sep-colour-9a7543))] bg-[rgb(var(--sep-colour-382819))] text-[rgb(var(--sep-colour-f0d9ae))]"
                : "border-[rgb(var(--sep-colour-4d3b29))]/50 bg-[rgb(var(--sep-colour-130f0c))] text-[rgb(var(--sep-colour-a99b87))]"
            }`}
          >
            <span className="block text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
              Step {index + 1}
            </span>
            <span className="mt-1 block font-serif text-sm">{label}</span>
          </button>
        ))}
      </div>

      <div className="p-6 sm:p-8 lg:p-10">
        <header className="mb-8 border-b border-[rgb(var(--sep-colour-5e4930))]/35 pb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[rgb(var(--sep-colour-987447))]">
            Step {step} of {steps.length}
          </p>
          <h2 className="mt-3 font-serif text-3xl text-[rgb(var(--sep-colour-ead5ad))]">
            {steps[step - 1][0]}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[rgb(var(--sep-colour-998c7a))]">
            {steps[step - 1][1]}
          </p>
        </header>

        {error ? (
          <div className="mb-7 border border-[rgb(var(--sep-colour-8c463d))] bg-[rgb(var(--sep-colour-2a1513))] p-4 text-sm text-[rgb(var(--sep-colour-e4b4aa))]">
            {error}
          </div>
        ) : null}

        <section className={step === 1 ? "block" : "hidden"}>
          {mode === "create" ? (
            <RaceSelection races={races} selectedId={raceId} onSelect={selectRace} />
          ) : (
            <LockedRace race={race} />
          )}

          {mode === "create" && race ? (
            <div className="mt-6 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
                    Ancestry Feats
                  </p>
                  <p className="mt-2 text-xs leading-6 text-[rgb(var(--sep-colour-8f8271))]">
                    Choose up to two Feats available to {race.name}.
                  </p>
                </div>
                <p className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                  {ancestryGiftIds.length} / 2 selected
                </p>
              </div>

              {eligibleAncestryGifts.length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {eligibleAncestryGifts.map((gift) => {
                    const selected = ancestryGiftIds.includes(gift.id);
                    const disabled = !selected && ancestryGiftIds.length >= 2;

                    return (
                      <button
                        key={gift.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleAncestryGift(gift.id)}
                        className={`border p-4 text-left transition ${
                          selected
                            ? "border-[rgb(var(--sep-colour-c19352))] bg-[rgb(var(--sep-colour-332416))]"
                            : "border-[rgb(var(--sep-colour-5c462f))]/65 bg-[rgb(var(--sep-colour-120e0b))] hover:border-[rgb(var(--sep-colour-8a683f))]"
                        } disabled:cursor-not-allowed disabled:opacity-35`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-serif text-base text-[rgb(var(--sep-colour-dfc79c))]">
                            {gift.name}
                          </span>
                          <span className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8e7656))]">
                            {selected ? "Selected" : "Choose"}
                          </span>
                        </div>

                        {gift.description ? (
                          <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-918473))]">
                            {gift.description}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-xs italic text-[rgb(var(--sep-colour-746958))]">
                  No active Ancestry Feats are currently available for {race.name}.
                </p>
              )}
            </div>
          ) : null}

          <div className="mt-6 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-4">
            <p className="text-[9px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
              Associations & Orders
            </p>
            <p className="mt-2 text-xs leading-6 text-[rgb(var(--sep-colour-8f8271))]">
              Association and Order membership are not selected during character creation
              or editing. A character joins an Order through play; the Association is then
              inherited from that Order.
            </p>
          </div>
        </section>

        <section className={step === 2 ? "block" : "hidden"}>
          <div className="grid gap-6 sm:grid-cols-2">
           <Field
  label="First name"
  name="first_name"
  required
  maxLength={15}
  defaultValue={character?.first_name}
/>

<Field
  label="Surname"
  name="surname"
  required
  maxLength={15}
  defaultValue={character?.surname}
/>
            <Field label="Pronouns" name="pronouns" defaultValue={character?.pronouns} />
            <label>
              <Label>Gender *</Label>
              <select
                name="gender"
                required
                defaultValue={String(character?.gender ?? "")}
                className={inputClass}
              >
                <option value="">Choose gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non_binary">Non-binary</option>
              </select>
            </label>
            <Field
              label="Sexual orientation"
              name="sexual_orientation"
              defaultValue={character?.sexual_orientation}
            />
            <label>
              <Label>Age *</Label>
              <input
                name="age"
                type="number"
                required
                value={age}
                min={race?.min_age ?? undefined}
                max={race?.max_age ?? undefined}
                disabled={!race || race.min_age === null}
                onChange={(event) => setAge(event.target.value)}
                className={inputClass}
              />
              <span className="mt-2 block text-xs text-[rgb(var(--sep-colour-766b5d))]">
                {race?.min_age === null || !race
                  ? "Choose a configured ancestry first."
                  : race.max_age === null
                    ? `${race.min_age}+ years`
                    : `${race.min_age}\u2013${race.max_age} years`}
              </span>
            </label>
          </div>
        </section>

        <section className={step === 3 ? "block" : "hidden"}>
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
            ancestryModifiers={{
              muscles: race?.muscles_modifier ?? 0,
              reflexes: race?.reflexes_modifier ?? 0,
              vigor: race?.vigour_modifier ?? 0,
              brains: race?.brains_modifier ?? 0,
              shrewd: race?.shrewd_modifier ?? 0,
              presence_score: race?.presence_modifier ?? 0,
            }}
          />
        </section>

        <section className={step === 4 ? "block" : "hidden"}>
          <div className="space-y-6">
            <Field label="Portrait URL" name="portrait_url" type="url" defaultValue={character?.portrait_url} />
            <Field label="Character music URL" name="music_url" type="url" defaultValue={character?.music_url} />
            <Area label="Physical description" name="physical_description" required rows={14} maxLength={10000} defaultValue={character?.physical_description} />
          </div>
        </section>

        <section className={step === 5 ? "block" : "hidden"}>
          <div className="space-y-6">
            <Area label="Personality" name="personality" required rows={9} maxLength={10000} defaultValue={character?.personality} />
            <Area label="Biography" name="biography" required rows={14} maxLength={20000} defaultValue={character?.biography} />
            <Area label="Public notes" name="public_notes" rows={7} maxLength={10000} defaultValue={character?.public_notes} />

            {mode === "update" ? (
              <>
                <Area
                  label="Relationships"
                  name="relationships"
                  rows={9}
                  maxLength={10000}
                  defaultValue={character?.relationships}
                />

                <Area
                  label="Offgame"
                  name="offgame"
                  rows={7}
                  maxLength={10000}
                  defaultValue={character?.offgame}
                />
              </>
            ) : null}
          </div>
        </section>

        <section className={step === 6 ? "block" : "hidden"}>
          <div className="border border-[rgb(var(--sep-colour-735735))]/55 bg-[rgb(var(--sep-colour-21170f))] p-5">
            <p className="text-[10px] uppercase tracking-[0.26em] text-[rgb(var(--sep-colour-ad8753))]">
              Final review
            </p>
            <h3 className="mt-3 font-serif text-2xl text-[rgb(var(--sep-colour-e3cba2))]">
              {mode === "create" ? "Ready to enter Sepulchria" : "Ready to save your changes"}
            </h3>
            <p className="mt-3 text-sm leading-7 text-[rgb(var(--sep-colour-998b78))]">
              Ancestry: <span className="text-[rgb(var(--sep-colour-d6bd91))]">{race?.name ?? "Not selected"}</span>.
              {mode === "create" ? (
                <>
                  {" "}Ancestry Feats:{" "}
                  <span className="text-[rgb(var(--sep-colour-d6bd91))]">
                    {selectedAncestryGifts.length
                      ? selectedAncestryGifts.map((gift) => gift.name).join(", ")
                      : "None selected"}
                  </span>.
                </>
              ) : null}
              {" "}Association and Order membership will be managed through the Order system.
            </p>
          </div>
        </section>
      </div>

      <div className="flex justify-between gap-3 border-t border-[rgb(var(--sep-colour-5d452d))]/40 bg-[rgb(var(--sep-colour-110d0a))] p-6">
        {step > 1 ? (
          <button type="button" onClick={() => { setError(null); setStep(step - 1); }} className={secondaryButton}>
            &larr; Previous
          </button>
        ) : (
          <Link href={mode === "create" ? "/" : "/character"} className={secondaryButton}>
            Cancel
          </Link>
        )}

        {step < steps.length ? (
          <button type="button" onClick={next} className={primaryButton}>
            Continue &rarr;
          </button>
        ) : (
          <button type="submit" className={primaryButton}>
            {submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}

const inputClass =
  "w-full border border-[rgb(var(--sep-colour-654c31))] bg-[rgb(var(--sep-colour-0f0c09))] px-4 py-3 text-sm text-[rgb(var(--sep-colour-dfceb0))] outline-none transition focus:border-[rgb(var(--sep-colour-a17a45))]";
const primaryButton =
  "border border-[rgb(var(--sep-colour-ae8247))] bg-[rgb(var(--sep-colour-4a321d))] px-8 py-3 text-xs uppercase tracking-[0.25em] text-[rgb(var(--sep-colour-f5dca9))] transition hover:bg-[rgb(var(--sep-colour-634425))]";
const secondaryButton =
  "border border-[rgb(var(--sep-colour-5f4a31))] px-6 py-3 text-xs uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-a99a84))] transition hover:bg-[rgb(var(--sep-colour-211810))]";

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-2 block text-[11px] uppercase tracking-[0.25em] text-[rgb(var(--sep-colour-a38357))]">{children}</span>;
}

function Field({
  label,
  name,
  required = false,
  type = "text",
  maxLength,
  defaultValue,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  maxLength?: number;
  defaultValue?: string | number | null;
}) {
  return (
    <label>
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>

      <input
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        defaultValue={defaultValue ?? ""}
        className={inputClass}
      />
    </label>
  );
}

function Area({
  label, name, required = false, rows, maxLength, defaultValue,
}: {
  label: string; name: string; required?: boolean; rows: number; maxLength: number;
  defaultValue?: string | number | null;
}) {
  return (
    <label className="block">
      <Label>{label}{required ? " *" : ""}</Label>
      <textarea name={name} required={required} rows={rows} maxLength={maxLength} defaultValue={defaultValue ?? ""} className={`${inputClass} resize-y leading-7`} />
    </label>
  );
}

function RaceSelection({
  races, selectedId, onSelect,
}: {
  races: RaceOption[]; selectedId: string; onSelect: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="font-serif text-2xl text-[rgb(var(--sep-colour-dfc79c))]">Choose an ancestry</h3>
      <p className="mt-2 text-sm leading-7 text-[rgb(var(--sep-colour-918473))]">
        Ancestry represents inherited heritage and determines the playable age range.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {races.map((race) => {
          const selected = race.id === selectedId;
          return (
            <button
              key={race.id}
              type="button"
              onClick={() => onSelect(race.id)}
              className={`overflow-hidden border text-left ${
                selected ? "border-[rgb(var(--sep-colour-c19352))] bg-[rgb(var(--sep-colour-332416))]" : "border-[rgb(var(--sep-colour-5c462f))]/65 bg-[rgb(var(--sep-colour-120e0b))]"
              }`}
            >
              {race.banner_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={race.banner_url} alt="" className="aspect-[2/1] w-full object-cover" />
              ) : null}
              <div className="p-5">
                <p className="font-serif text-xl text-[rgb(var(--sep-colour-e0c99e))]">{race.name}</p>
                <p className="mt-2 line-clamp-3 text-xs leading-6 text-[rgb(var(--sep-colour-918473))]">
                  {race.summary || "Codex information will be added soon."}
                </p>
                <Link
                  href={`/ancestries/${race.slug}`}
                  target="_blank"
                  onClick={(event) => event.stopPropagation()}
                  className="mt-4 inline-block text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-9f7b4b))]"
                >
                  Read More →
                </Link>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LockedRace({ race }: { race: RaceOption | null }) {
  return (
    <div className="border border-[rgb(var(--sep-colour-735735))]/55 bg-[rgb(var(--sep-colour-21170f))] p-5">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[rgb(var(--sep-colour-ad8753))]">Permanent character information</p>
      <p className="mt-3 text-sm leading-7 text-[rgb(var(--sep-colour-a0927f))]">
        Ancestry is fixed after character creation. Current ancestry:{" "}
        <span className="text-[rgb(var(--sep-colour-d8bf91))]">{race?.name ?? "Not assigned"}</span>.
      </p>
    </div>
  );
}