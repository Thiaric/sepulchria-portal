import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";
import { CharacterReviewFields } from "@/components/admin/character-review-fields";
import { AdminCharacterEditForm } from "@/components/admin/admin-character-edit-form";

import {
  deleteCharacterAdministration,
  updateCharacterAdministration,
} from "../actions";

type CharacterStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

type CodexOption = {
  id: string;
  name: string;
};

type CodexRelation =
  | {
      id: string;
      name: string;
    }
  | {
      id: string;
      name: string;
    }[]
  | null;

type CharacterRow = {
  id: string;
  user_id: string;
  public_slug: string;
  first_name: string;
  surname: string;
  display_name: string | null;
  pronouns: string | null;
  gender: string | null;
  sexual_orientation: string | null;
  date_of_birth: string | null;
  birthplace: string | null;
  origin: string | null;
  biography: string | null;
  portrait_url: string | null;
  music_url: string | null;
  status: CharacterStatus;
  created_at: string;
  updated_at: string;
  current_room_id: string | null;
  physical_description: string | null;
  personality: string | null;
  public_notes: string | null;
  title: string | null;
  race_id: string | null;
  association_id: string | null;
  staff_notes: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  muscles: number | null;
  reflexes: number | null;
  vigor: number | null;
  brains: number | null;
  shrewd: number | null;
  presence_score: number | null;
  current_health: number | null;
  race: CodexRelation;
  association: CodexRelation;
};

type AdminCharacterPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function normaliseRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getDisplayName(
  character: CharacterRow,
): string {
  return (
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim() ||
    "Unnamed character"
  );
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatGender(
  value: string | null,
) {
  if (value === "male") {
    return "Male";
  }

  if (value === "female") {
    return "Female";
  }

  if (value === "non_binary") {
    return "Non-binary";
  }

  return null;
}

export default async function AdminCharacterPage({
  params,
}: AdminCharacterPageProps) {
  await requireStaff();

  const { id } = await params;
  const supabase = await createClient();

  const [
    characterResult,
    racesResult,
    associationsResult,
  ] = await Promise.all([
    supabase
      .from("characters")
      .select(`
        id,
        user_id,
        public_slug,
        first_name,
        surname,
        display_name,
        pronouns,
        gender,
        sexual_orientation,
        date_of_birth,
        birthplace,
        origin,
        biography,
        portrait_url,
        music_url,
        status,
        created_at,
        updated_at,
        current_room_id,
        physical_description,
        personality,
        public_notes,
        title,
        race_id,
        association_id,
        staff_notes,
        rejection_reason,
        approved_at,
        approved_by,
        muscles,
        reflexes,
        vigor,
        brains,
        shrewd,
        presence_score,
        current_health,

        race:races!characters_race_id_fkey(
          id,
          name
        ),

        association:associations!characters_association_id_fkey(
          id,
          name
        )
      `)
      .eq("id", id)
      .maybeSingle(),

    supabase
      .from("races")
      .select("id, name")
      .order("name"),

    supabase
      .from("associations")
      .select("id, name")
      .order("name"),
  ]);

  const firstError =
    characterResult.error ??
    racesResult.error ??
    associationsResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load character administration data: ${firstError.message}`,
    );
  }

  if (!characterResult.data) {
    notFound();
  }

  const character =
    characterResult.data as unknown as CharacterRow;

  const races =
    (racesResult.data ??
      []) as CodexOption[];

  const associations =
    (associationsResult.data ??
      []) as CodexOption[];

  const race =
    normaliseRelation(character.race);

  const association =
    normaliseRelation(
      character.association,
    );

  const displayName =
    getDisplayName(character);

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/admin/characters"
            className="text-[9px] uppercase tracking-[0.18em] text-[#9c805b] transition hover:text-[#e4c796]"
          >
            ← Character archive
          </Link>

          <Link
            href={`/characters/${character.public_slug}`}
            className="border border-[#60482e]/55 bg-[#15100d] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[#ac9879] transition hover:border-[#987344] hover:text-[#e7cca0]"
          >
            Open public profile
          </Link>
        </div>

        <section className="mt-6 overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
          <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="border-b border-[#60482e]/35 bg-[#0f0b09] p-6 lg:border-b-0 lg:border-r">
              <div className="relative mx-auto aspect-[3/4] w-full max-w-[210px] overflow-hidden border border-[#765937]/55 bg-[#090706]">
                {character.portrait_url ? (
                  <Image
                    src={character.portrait_url}
                    alt={`Portrait of ${displayName}`}
                    fill
                    sizes="210px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-serif text-5xl text-[#705334]">
                    {character.first_name
                      .charAt(0)
                      .toUpperCase()}
                    {character.surname
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>

              <div className="mt-5 text-center">
                <StatusBadge
                  status={character.status}
                />

                <p className="mt-4 text-[9px] uppercase tracking-[0.18em] text-[#756957]">
                  Created
                </p>

                <p className="mt-1 text-xs text-[#aa987d]">
                  {formatDate(
                    character.created_at,
                  )}
                </p>

                <p className="mt-4 text-[9px] uppercase tracking-[0.18em] text-[#756957]">
                  Last updated
                </p>

                <p className="mt-1 text-xs text-[#aa987d]">
                  {formatDate(
                    character.updated_at,
                  )}
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <p className="text-[9px] uppercase tracking-[0.28em] text-[#8c704b]">
                Character administration
              </p>

              <h2 className="mt-2 font-serif text-4xl text-[#ead5ac]">
                {displayName}
              </h2>

              <p className="mt-2 text-sm text-[#9f8968]">
                {race?.name ??
                  "No ancestry assigned"}
                {" · "}
                {association?.name ??
                  "No association assigned"}
              </p>

              <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                <ReadOnlyField
                  label="Legal name"
                  value={`${character.first_name} ${character.surname}`}
                />

                <ReadOnlyField
                  label="Display name"
                  value={
                    character.display_name
                  }
                />

                <ReadOnlyField
                  label="Pronouns"
                  value={character.pronouns}
                />

                <ReadOnlyField
  label="Gender"
  value={
    formatGender(
      character.gender,
    )
  }
/>

<ReadOnlyField
  label="Sexual orientation"
  value={
    character.sexual_orientation
  }
/>

                <ReadOnlyField
                  label="Date of birth"
                  value={
                    character.date_of_birth
                  }
                />

                <ReadOnlyField
                  label="Birthplace"
                  value={character.birthplace}
                />

                <ReadOnlyField
                  label="Origin"
                  value={character.origin}
                />

                <ReadOnlyField
                  label="Public slug"
                  value={character.public_slug}
                />

                <ReadOnlyField
                  label="Owner user ID"
                  value={character.user_id}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <CharacterTextSection
              title="Biography"
              content={character.biography}
            />

            <CharacterTextSection
              title="Physical description"
              content={
                character.physical_description
              }
            />

            <CharacterTextSection
              title="Personality"
              content={character.personality}
            />

            <CharacterTextSection
              title="Public notes"
              content={character.public_notes}
            />
          </div>

          <section className="h-fit border border-[#60482e]/45 bg-[#15100d] p-5 sm:p-6">
            <p className="text-[9px] uppercase tracking-[0.24em] text-[#8c704b]">
              Staff controls
            </p>

            <h3 className="mt-2 font-serif text-2xl text-[#dfc99f]">
              Review and classification
            </h3>

            <AdminCharacterEditForm
              action={
                updateCharacterAdministration
              }
              className="mt-6"
            >
              <input
                type="hidden"
                name="characterId"
                value={character.id}
              />

              <input
                type="hidden"
                name="returnTo"
                value={`/admin/characters/${character.id}`}
              />

              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <AdminField label="First name">
                    <input
                      type="text"
                      name="firstName"
                      required
                      maxLength={80}
                      defaultValue={character.first_name}
                      className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                    />
                  </AdminField>

                  <AdminField label="Surname">
                    <input
                      type="text"
                      name="surname"
                      required
                      maxLength={80}
                      defaultValue={character.surname}
                      className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                    />
                  </AdminField>

                  <AdminField label="Pronouns">
                    <input
                      type="text"
                      name="pronouns"
                      maxLength={80}
                      defaultValue={character.pronouns ?? ""}
                      className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                    />
                  </AdminField>

                  <AdminField label="Gender">
  <select
    name="gender"
    required
    defaultValue={
      character.gender ?? ""
    }
    className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
  >
    <option value="">
      Choose gender
    </option>

    <option value="male">
      Male
    </option>

    <option value="female">
      Female
    </option>

    <option value="non_binary">
      Non-binary
    </option>
  </select>
</AdminField>

<AdminField label="Sexual orientation">
  <input
    type="text"
    name="sexualOrientation"
    maxLength={120}
    defaultValue={
      character.sexual_orientation ??
      ""
    }
    placeholder="Optional"
    className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
  />
</AdminField>

                  <AdminField label="Date of birth">
                    <input
                      type="date"
                      name="dateOfBirth"
                      defaultValue={character.date_of_birth ?? ""}
                      className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                    />
                  </AdminField>

                  <AdminField label="Birthplace">
                    <input
                      type="text"
                      name="birthplace"
                      maxLength={160}
                      defaultValue={character.birthplace ?? ""}
                      className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                    />
                  </AdminField>

                  <AdminField label="Origin">
                    <input
                      type="text"
                      name="origin"
                      maxLength={160}
                      defaultValue={character.origin ?? ""}
                      className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                    />
                  </AdminField>

                  

                  <AdminField label="Portrait URL">
                    <input
                      type="url"
                      name="portraitUrl"
                      maxLength={1000}
                      defaultValue={character.portrait_url ?? ""}
                      className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                    />
                  </AdminField>

                  <AdminField label="Character music URL">
                    <input
                      type="url"
                      name="musicUrl"
                      maxLength={2000}
                      defaultValue={character.music_url ?? ""}
                      placeholder="https://.../theme.mp3"
                      className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                    />
                  </AdminField>
                </div>

                <AdminField label="Physical description">
                  <textarea
                    name="physicalDescription"
                    rows={7}
                    maxLength={10000}
                    defaultValue={character.physical_description ?? ""}
                    className="w-full resize-y border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm leading-6 text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                  />
                </AdminField>

                <AdminField label="Personality">
                  <textarea
                    name="personality"
                    rows={7}
                    maxLength={10000}
                    defaultValue={character.personality ?? ""}
                    className="w-full resize-y border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm leading-6 text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                  />
                </AdminField>

                <AdminField label="Biography">
                  <textarea
                    name="biography"
                    rows={10}
                    maxLength={20000}
                    defaultValue={character.biography ?? ""}
                    className="w-full resize-y border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm leading-6 text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                  />
                </AdminField>

                <AdminField label="Public notes">
                  <textarea
                    name="publicNotes"
                    rows={6}
                    maxLength={10000}
                    defaultValue={character.public_notes ?? ""}
                    className="w-full resize-y border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm leading-6 text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                  />
                </AdminField>

                <div className="border border-[#60482e]/45 bg-[#100c09] p-4">
                  <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
                    Character Health
                  </p>

                  <p className="mt-2 text-xs leading-5 text-[#8f8271]">
                    Maximum Health is always Vigor × 10. Current Health cannot be higher than that maximum.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[8px] uppercase tracking-[0.16em] text-[#806b50]">
                        Current Health
                      </span>

                      <input
                        type="number"
                        name="currentHealth"
                        min={0}
                        step={1}
                        defaultValue={
                          character.current_health === null
                            ? ""
                            : character.current_health
                        }
                        className="mt-2 w-full border border-[#60482e]/55 bg-[#0d0907] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                      />
                    </label>

                    <div>
                      <span className="text-[8px] uppercase tracking-[0.16em] text-[#806b50]">
                        Maximum Health
                      </span>

                      <div className="mt-2 border border-[#60482e]/45 bg-[#0d0907] px-3 py-3 text-sm text-[#bfae92]">
                        {character.vigor === null
                          ? "Not available"
                          : character.vigor * 10}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-[#60482e]/45 bg-[#100c09] p-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
                        Character attributes
                      </p>
                      <p className="mt-2 text-xs leading-5 text-[#8f8271]">
                        Leave all six empty for a legacy unassigned record, or enter values from 1 to 8 totalling exactly 20.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {[
                      ["muscles", "Muscles", character.muscles],
                      ["reflexes", "Reflexes", character.reflexes],
                      ["vigor", "Vigor", character.vigor],
                      ["brains", "Brains", character.brains],
                      ["shrewd", "Shrewd", character.shrewd],
                      ["presence_score", "Presence", character.presence_score],
                    ].map(([name, label, value]) => (
                      <label key={String(name)} className="block">
                        <span className="text-[8px] uppercase tracking-[0.16em] text-[#806b50]">
                          {String(label)}
                        </span>
                        <input
                          type="number"
                          name={String(name)}
                          min={1}
                          max={8}
                          step={1}
                          defaultValue={
                            value === null ? "" : Number(value)
                          }
                          className="mt-2 w-full border border-[#60482e]/55 bg-[#0d0907] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <AdminField label="Ancestry">
                  <select
                    name="raceId"
                    defaultValue={
                      character.race_id ?? ""
                    }
                    className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                  >
                    <option value="">
                      No ancestry assigned
                    </option>

                    {races.map((option) => (
                      <option
                        key={option.id}
                        value={option.id}
                      >
                        {option.name}
                      </option>
                    ))}
                  </select>
                </AdminField>

                <AdminField label="Association">
                  <select
                    name="associationId"
                    defaultValue={
                      character.association_id ??
                      ""
                    }
                    className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none focus:border-[#a17a49]"
                  >
                    <option value="">
                      No association assigned
                    </option>

                    {associations.map(
                      (option) => (
                        <option
                          key={option.id}
                          value={option.id}
                        >
                          {option.name}
                        </option>
                      ),
                    )}
                  </select>
                </AdminField>

                <CharacterReviewFields
                  initialStatus={
                    character.status
                  }
                  initialRejectionReason={
                    character.rejection_reason
                  }
                />

                <AdminField label="Public title">
                  <input
                    type="text"
                    name="title"
                    defaultValue={
                      character.title ?? ""
                    }
                    maxLength={120}
                    placeholder="Optional public title"
                    className="w-full border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                  />
                </AdminField>

                <AdminField label="Private staff notes">
                  <textarea
                    name="staffNotes"
                    defaultValue={
                      character.staff_notes ??
                      ""
                    }
                    maxLength={10000}
                    rows={7}
                    placeholder="These notes are visible only to staff."
                    className="w-full resize-y border border-[#60482e]/55 bg-[#100c09] px-3 py-3 text-sm leading-6 text-[#d7c4a5] outline-none placeholder:text-[#625747] focus:border-[#a17a49]"
                  />
                </AdminField>
              </div>

              {character.approved_at ? (
                <div className="mt-5 border border-[#315742]/55 bg-[#102019] p-4">
                  <p className="text-[8px] uppercase tracking-[0.18em] text-[#6fa381]">
                    Approval record
                  </p>

                  <p className="mt-2 text-xs leading-5 text-[#a8c2ae]">
                    Approved{" "}
                    {formatDate(
                      character.approved_at,
                    )}
                  </p>

                  {character.approved_by ? (
                    <p className="mt-1 break-all text-[9px] text-[#718d79]">
                      Staff ID:{" "}
                      {character.approved_by}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <button
                type="submit"
                className="mt-6 w-full border border-[#987344] bg-[#3b2919] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f]"
              >
                Save character record
              </button>
            </AdminCharacterEditForm>

            <div className="mt-8 border-t border-[#6f302b]/45 pt-6">
              <div className="border border-[#843a32]/60 bg-[#26110f]/65 p-4">
                <p className="text-[8px] uppercase tracking-[0.22em] text-[#c06d62]">
                  Danger zone
                </p>

                <h4 className="mt-2 font-serif text-xl text-[#e1aaa2]">
                  Permanently delete character
                </h4>

                <p className="mt-3 text-xs leading-5 text-[#a98782]">
                  This removes the character
                  sheet permanently but leaves
                  the user account intact. The
                  player will then be able to
                  create a new character.
                </p>

                <p className="mt-3 text-xs leading-5 text-[#a98782]">
                  Type{" "}
                  <strong className="text-[#e1aaa2]">
                    {getDisplayName(character)}
                  </strong>{" "}
                  to confirm.
                </p>

                <form
                  action={
                    deleteCharacterAdministration
                  }
                  className="mt-4"
                >
                  <input
                    type="hidden"
                    name="characterId"
                    value={character.id}
                  />

                  <input
                    type="text"
                    name="confirmation"
                    autoComplete="off"
                    required
                    placeholder={
                      getDisplayName(character)
                    }
                    className="w-full border border-[#71352f] bg-[#100807] px-3 py-3 text-sm text-[#dfbbb5] outline-none placeholder:text-[#684b47] focus:border-[#bd6458]"
                  />

                  <button
                    type="submit"
                    className="mt-3 w-full border border-[#a44c42] bg-[#481d19] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[#f1beb6] transition hover:border-[#d66b5f] hover:bg-[#622720]"
                  >
                    Delete character permanently
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function AdminField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <div className="mb-2 block text-[8px] uppercase tracking-[0.22em] text-[#806b50]">
        {label}
      </div>

      {children}
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-[0.2em] text-[#806b50]">
        {label}
      </p>

      <p className="mt-2 break-words text-sm text-[#c9b99e]">
        {value?.trim() || "Not provided"}
      </p>
    </div>
  );
}

function CharacterTextSection({
  title,
  content,
}: {
  title: string;
  content: string | null;
}) {
  return (
    <section className="border border-[#60482e]/45 bg-[#15100d] p-5 sm:p-6">
      <h3 className="font-serif text-2xl text-[#dfc99f]">
        {title}
      </h3>

      {content?.trim() ? (
        <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#b8aa96]">
          {content}
        </div>
      ) : (
        <p className="mt-4 text-sm italic text-[#756957]">
          No information was provided.
        </p>
      )}
    </section>
  );
}

function StatusBadge({
  status,
}: {
  status: CharacterStatus;
}) {
  const classes = {
    draft:
      "border-stone-600/60 text-stone-400",
    submitted:
      "border-amber-700/60 text-amber-500",
    approved:
      "border-emerald-800/60 text-emerald-500",
    rejected:
      "border-red-800/60 text-red-500",
  };

  return (
    <span
      className={`inline-block border bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] ${classes[status]}`}
    >
      {status}
    </span>
  );
}