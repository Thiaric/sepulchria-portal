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
};

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  character?: CharacterData;
  races: RaceOption[];
  submitLabel: string;
  mode: "create" | "update";
};

const steps = [
  ["Heritage", "Choose the Ancestry that shapes your character's heritage."],
  ["Identity", "Name, gender, pronouns, orientation and age."],
  ["Attributes", "Distribute the character's attribute points."],
  ["Appearance", "Portrait and physical description."],
  ["Story", "Personality, biography and public notes."],
  ["Review", "Review the character before saving."],
] as const;

export default function CharacterForm({
  action,
  character,
  races,
  submitLabel,
  mode,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(1);
  const [raceId, setRaceId] = useState(String(character?.race_id ?? ""));
  const [age, setAge] = useState(String(character?.age ?? ""));
  const [error, setError] = useState<string | null>(null);

  const race = useMemo(
    () => races.find((item) => item.id === raceId) ?? null,
    [races, raceId],
  );

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

    if (current === 3 && mode === "create") {
      const names = ["muscles", "reflexes", "vigor", "brains", "shrewd", "presence_score"];
      const values = names.map((name) => Number(value(name)));
      if (
        !values.every((item) => Number.isInteger(item) && item >= 1 && item <= 8) ||
        values.reduce((sum, item) => sum + item, 0) !== 20
      ) {
        message = "Distribute exactly 20 points across the six attributes.";
      }
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
      className="overflow-hidden border border-[#6c5132]/50 bg-[#17110d]/95"
    >
      <input type="hidden" name="race_id" value={raceId} />

      <div className="grid gap-2 border-b border-[#5d452d]/40 bg-[#110d0a] p-4 sm:grid-cols-3 xl:grid-cols-6">
        {steps.map(([label], index) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              if (index + 1 <= step || validate(step)) setStep(index + 1);
            }}
            className={`border px-3 py-3 text-left ${
              step === index + 1
                ? "border-[#9a7543] bg-[#382819] text-[#f0d9ae]"
                : "border-[#4d3b29]/50 bg-[#130f0c] text-[#a99b87]"
            }`}
          >
            <span className="block text-[9px] uppercase tracking-[0.24em] text-[#806b50]">
              Step {index + 1}
            </span>
            <span className="mt-1 block font-serif text-sm">{label}</span>
          </button>
        ))}
      </div>

      <div className="p-6 sm:p-8 lg:p-10">
        <header className="mb-8 border-b border-[#5e4930]/35 pb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#987447]">
            Step {step} of {steps.length}
          </p>
          <h2 className="mt-3 font-serif text-3xl text-[#ead5ad]">
            {steps[step - 1][0]}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#998c7a]">
            {steps[step - 1][1]}
          </p>
        </header>

        {error ? (
          <div className="mb-7 border border-[#8c463d] bg-[#2a1513] p-4 text-sm text-[#e4b4aa]">
            {error}
          </div>
        ) : null}

        <section className={step === 1 ? "block" : "hidden"}>
          {mode === "create" ? (
            <RaceSelection races={races} selectedId={raceId} onSelect={setRaceId} />
          ) : (
            <LockedRace race={race} />
          )}

          <div className="mt-6 border border-[#59432c]/40 bg-[#100c09] p-4">
            <p className="text-[9px] uppercase tracking-[0.22em] text-[#806b50]">
              Associations & Orders
            </p>
            <p className="mt-2 text-xs leading-6 text-[#8f8271]">
              Association and Order membership are not selected during character creation
              or editing. A character joins an Order through play; the Association is then
              inherited from that Order.
            </p>
          </div>
        </section>

        <section className={step === 2 ? "block" : "hidden"}>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="First name" name="first_name" required defaultValue={character?.first_name} />
            <Field label="Surname" name="surname" required defaultValue={character?.surname} />
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
              <span className="mt-2 block text-xs text-[#766b5d]">
                {race?.min_age === null || !race
                  ? "Choose a configured ancestry first."
                  : race.max_age === null
                    ? `${race.min_age}+ years`
                    : `${race.min_age}–${race.max_age} years`}
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
          </div>
        </section>

        <section className={step === 6 ? "block" : "hidden"}>
          <div className="border border-[#735735]/55 bg-[#21170f] p-5">
            <p className="text-[10px] uppercase tracking-[0.26em] text-[#ad8753]">
              Final review
            </p>
            <h3 className="mt-3 font-serif text-2xl text-[#e3cba2]">
              {mode === "create" ? "Ready to enter Sepulchria" : "Ready to save your changes"}
            </h3>
            <p className="mt-3 text-sm leading-7 text-[#998b78]">
              Ancestry: <span className="text-[#d6bd91]">{race?.name ?? "Not selected"}</span>.
              Association and Order membership will be managed through the Order system.
            </p>
          </div>
        </section>
      </div>

      <div className="flex justify-between gap-3 border-t border-[#5d452d]/40 bg-[#110d0a] p-6">
        {step > 1 ? (
          <button type="button" onClick={() => { setError(null); setStep(step - 1); }} className={secondaryButton}>
            ← Previous
          </button>
        ) : (
          <Link href={mode === "create" ? "/" : "/character"} className={secondaryButton}>
            Cancel
          </Link>
        )}

        {step < steps.length ? (
          <button type="button" onClick={next} className={primaryButton}>
            Continue →
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
  "w-full border border-[#654c31] bg-[#0f0c09] px-4 py-3 text-sm text-[#dfceb0] outline-none transition focus:border-[#a17a45]";
const primaryButton =
  "border border-[#ae8247] bg-[#4a321d] px-8 py-3 text-xs uppercase tracking-[0.25em] text-[#f5dca9] transition hover:bg-[#634425]";
const secondaryButton =
  "border border-[#5f4a31] px-6 py-3 text-xs uppercase tracking-[0.22em] text-[#a99a84] transition hover:bg-[#211810]";

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-2 block text-[11px] uppercase tracking-[0.25em] text-[#a38357]">{children}</span>;
}

function Field({
  label, name, required = false, type = "text", defaultValue,
}: {
  label: string; name: string; required?: boolean; type?: string;
  defaultValue?: string | number | null;
}) {
  return (
    <label>
      <Label>{label}{required ? " *" : ""}</Label>
      <input name={name} type={type} required={required} defaultValue={defaultValue ?? ""} className={inputClass} />
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
      <h3 className="font-serif text-2xl text-[#dfc79c]">Choose an ancestry</h3>
      <p className="mt-2 text-sm leading-7 text-[#918473]">
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
                selected ? "border-[#c19352] bg-[#332416]" : "border-[#5c462f]/65 bg-[#120e0b]"
              }`}
            >
              {race.banner_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={race.banner_url} alt="" className="aspect-[2/1] w-full object-cover" />
              ) : null}
              <div className="p-5">
                <p className="font-serif text-xl text-[#e0c99e]">{race.name}</p>
                <p className="mt-2 line-clamp-3 text-xs leading-6 text-[#918473]">
                  {race.summary || "Codex information will be added soon."}
                </p>
                <Link
                  href={`/races/${race.slug}`}
                  target="_blank"
                  onClick={(event) => event.stopPropagation()}
                  className="mt-4 inline-block text-[9px] uppercase tracking-[0.2em] text-[#9f7b4b]"
                >
                  Read More ↗
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
    <div className="border border-[#735735]/55 bg-[#21170f] p-5">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[#ad8753]">Permanent character information</p>
      <p className="mt-3 text-sm leading-7 text-[#a0927f]">
        Ancestry is fixed after character creation. Current ancestry:{" "}
        <span className="text-[#d8bf91]">{race?.name ?? "Not assigned"}</span>.
      </p>
    </div>
  );
}
