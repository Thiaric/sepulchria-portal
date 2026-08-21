import Image from "next/image";
import Link from "next/link";

import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/supabase/server";

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

type CharacterStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected";

type CharacterRow = {
  id: string;
  public_slug: string;
  first_name: string;
  surname: string;
  display_name: string | null;
  portrait_url: string | null;
  title: string | null;
  status: CharacterStatus;
  race_id: string | null;
  association_id: string | null;
  created_at: string;
  updated_at: string;
  race: CodexRelation;
  association: CodexRelation;
};

type AdminCharactersPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    race?: string;
    association?: string;
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

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function AdminCharactersPage({
  searchParams,
}: AdminCharactersPageProps) {
  await requireStaff();

  const params =
    (await searchParams) ?? {};

  const searchQuery =
    params.q?.trim().toLowerCase() ?? "";

  const statusFilter =
    params.status?.trim() ?? "";

  const raceFilter =
    params.race?.trim() ?? "";

  const associationFilter =
    params.association?.trim() ?? "";

  const supabase = await createClient();

  const [
    charactersResult,
    racesResult,
    associationsResult,
  ] = await Promise.all([
    supabase
      .from("characters")
      .select(`
        id,
        public_slug,
        first_name,
        surname,
        display_name,
        portrait_url,
        title,
        status,
        race_id,
        association_id,
        created_at,
        updated_at,

        race:races!characters_race_id_fkey(
          id,
          name
        ),

        association:associations!characters_association_id_fkey(
          id,
          name
        )
      `)
      .order("updated_at", {
        ascending: false,
      }),

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
    charactersResult.error ??
    racesResult.error ??
    associationsResult.error;

  if (firstError) {
    throw new Error(
      `Unable to load administration data: ${firstError.message}`,
    );
  }

  const characters =
    (charactersResult.data ??
      []) as unknown as CharacterRow[];

  const races =
    (racesResult.data ??
      []) as CodexOption[];

  const associations =
    (associationsResult.data ??
      []) as CodexOption[];

  const filteredCharacters =
    characters.filter((character) => {
      const displayName =
        getDisplayName(character);

      const searchableText = [
        displayName,
        character.first_name,
        character.surname,
        character.title,
        character.public_slug,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !searchQuery ||
        searchableText.includes(searchQuery);

      const matchesStatus =
        !statusFilter ||
        character.status === statusFilter;

      const matchesRace =
        !raceFilter ||
        character.race_id === raceFilter;

      const matchesAssociation =
        !associationFilter ||
        character.association_id ===
          associationFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRace &&
        matchesAssociation
      );
    }).sort((a, b) => {
      if (
        a.status === "submitted" &&
        b.status !== "submitted"
      ) {
        return -1;
      }

      if (
        a.status !== "submitted" &&
        b.status === "submitted"
      ) {
        return 1;
      }

      return (
        new Date(b.updated_at).getTime() -
        new Date(a.updated_at).getTime()
      );
    });

  const submittedCount =
    characters.filter(
      (character) =>
        character.status === "submitted",
    ).length;

  const filtersAreActive = Boolean(
    searchQuery ||
      statusFilter ||
      raceFilter ||
      associationFilter,
  );

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
              Administration
            </p>

            <h2 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">
              Character Management
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]">
              Search the character archive,
              review submitted sheets and open
              the complete staff record of each
              character.
            </p>
          </div>

          <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a99069))]">
            {filteredCharacters.length} of{" "}
            {characters.length} characters
          </span>
        </div>

        {submittedCount > 0 ? (
          <section className="mt-8 flex flex-wrap items-center justify-between gap-4 border border-[rgb(var(--sep-colour-a87532))]/75 bg-[rgb(var(--sep-colour-24190f))] px-5 py-4 shadow-[0_0_18px_rgba(var(--sep-rgb-168-117-50),0.12)]">
            <div>
              <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-c28b45))]">
                Staff attention required
              </p>
              <p className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-efd4a2))]">
                {submittedCount} character{submittedCount === 1 ? "" : "s"} awaiting review
              </p>
            </div>

            <Link
              href="/admin/characters?status=submitted"
              className="border border-[rgb(var(--sep-colour-b1844b))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-f1d6a5))] transition hover:border-[rgb(var(--sep-colour-d09c56))] hover:bg-[rgb(var(--sep-colour-50371f))]"
            >
              Review submitted
            </Link>
          </section>
        ) : null}

        <form
          method="get"
          className="mt-8 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FilterField label="Search">
              <input
                type="search"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Name, title or slug"
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]"
              />
            </FilterField>

            <FilterField label="Status">
              <select
                name="status"
                defaultValue={statusFilter}
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
              >
                <option value="">
                  All statuses
                </option>

                <option value="draft">
                  Draft
                </option>

                <option value="submitted">
                  Submitted
                </option>

                <option value="approved">
                  Approved
                </option>

                <option value="rejected">
                  Rejected
                </option>
              </select>
            </FilterField>

            <FilterField label="Ancestry">
              <select
                name="race"
                defaultValue={raceFilter}
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
              >
                <option value="">
                  All Ancestries
                </option>

                {races.map((race) => (
                  <option
                    key={race.id}
                    value={race.id}
                  >
                    {race.name}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Association">
              <select
                name="association"
                defaultValue={
                  associationFilter
                }
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
              >
                <option value="">
                  All associations
                </option>

                {associations.map(
                  (association) => (
                    <option
                      key={association.id}
                      value={association.id}
                    >
                      {association.name}
                    </option>
                  ),
                )}
              </select>
            </FilterField>
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-3">
            {filtersAreActive ? (
              <Link
                href="/admin/characters"
                className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-aa9678))] transition hover:border-[rgb(var(--sep-colour-987344))] hover:text-[rgb(var(--sep-colour-e7cca0))]"
              >
                Clear filters
              </Link>
            ) : null}

            <button
              type="submit"
              className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
            >
              Apply filters
            </button>
          </div>
        </form>

        <div className="mt-6 space-y-4">
          {filteredCharacters.map(
            (character) => {
              const displayName =
                getDisplayName(character);

              const race =
                normaliseRelation(
                  character.race,
                );

              const association =
                normaliseRelation(
                  character.association,
                );

              return (
                <section
                  key={character.id}
                  className={`overflow-hidden border bg-[rgb(var(--sep-colour-15100d))] ${
                    character.status === "submitted"
                      ? "border-[rgb(var(--sep-colour-b17a35))] shadow-[0_0_20px_rgba(var(--sep-rgb-177-122-53),0.18)]"
                      : "border-[rgb(var(--sep-colour-60482e))]/45"
                  }`}
                >
                  <div className="grid lg:grid-cols-[110px_minmax(0,1fr)_210px]">
                    <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-0f0b09))] p-4 lg:border-b-0 lg:border-r">
                      <div className="relative mx-auto aspect-[3/4] w-[78px] overflow-hidden border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-090706))]">
                        {character.portrait_url ? (
                          <Image
                            src={
                              character.portrait_url
                            }
                            alt={`Portrait of ${displayName}`}
                            fill
                            sizes="78px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center font-serif text-2xl text-[rgb(var(--sep-colour-705334))]">
                            {character.first_name
                              .charAt(0)
                              .toUpperCase()}
                            {character.surname
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="font-serif text-2xl text-[rgb(var(--sep-colour-e3cda5))]">
                              {displayName}
                            </h3>

                            {character.status === "submitted" ? (
                              <span className="animate-pulse border border-[rgb(var(--sep-colour-b17a35))]/80 bg-[rgb(var(--sep-colour-3a2512))] px-2 py-1 text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-f0c77f))]">
                                Awaiting review
                              </span>
                            ) : null}
                          </div>

                          {character.title ? (
                            <p className="mt-1 text-xs italic text-[rgb(var(--sep-colour-9f8968))]">
                              {character.title}
                            </p>
                          ) : null}
                        </div>

                        <StatusBadge
                          status={
                            character.status
                          }
                        />
                      </div>

                      <div className="mt-5 grid gap-4 sm:grid-cols-3">
                        <CharacterDetail
                          label="Ancestry"
                          value={
                            race?.name ??
                            "Not assigned"
                          }
                        />

                        <CharacterDetail
                          label="Association"
                          value={
                            association?.name ??
                            "Not assigned"
                          }
                        />

                        <CharacterDetail
                          label="Last updated"
                          value={formatDate(
                            character.updated_at,
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col justify-center gap-3 border-t border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] p-5 lg:border-l lg:border-t-0">
                      <Link
                        href={`/admin/characters/${character.id}`}
                        className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-3 text-center text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
                      >
                        Manage character
                      </Link>

                      <Link
                        href={`/characters/${character.public_slug}`}
                        className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3 text-center text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-ac9879))] transition hover:border-[rgb(var(--sep-colour-987344))] hover:text-[rgb(var(--sep-colour-e7cca0))]"
                      >
                        Public profile
                      </Link>
                    </div>
                  </div>
                </section>
              );
            },
          )}

          {filteredCharacters.length === 0 ? (
            <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-10 text-center">
              <p className="font-serif text-xl text-[rgb(var(--sep-colour-b9a88f))]">
                No characters match the selected
                filters.
              </p>

              {filtersAreActive ? (
                <Link
                  href="/admin/characters"
                  className="mt-4 inline-block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-b29266))] hover:text-[rgb(var(--sep-colour-ead0a3))]"
                >
                  Clear filters →
                </Link>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">
        {label}
      </span>

      {children}
    </label>
  );
}

function CharacterDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
        {label}
      </p>

      <p className="mt-2 text-sm text-[rgb(var(--sep-colour-c9b99e))]">
        {value}
      </p>
    </div>
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
      className={`border bg-black/20 px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] ${classes[status]}`}
    >
      {status}
    </span>
  );
}