import Image from "next/image";
import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import NewTopicForm from "@/components/forum/new-topic-form";
import { createClient } from "@/lib/supabase/server";

type ForumSectionQueryRow = {
  id: string;
  name: string;
  slug: string;
  section_type:
    | "ongame"
    | "offgame"
    | "organisation";
  visibility:
    | "public"
    | "members"
    | "staff";
  association_id: string | null;
  description: string;
  icon_url: string | null;
  banner_url: string | null;
  colour: string | null;
  is_active: boolean;
  sort_order: number;
  association:
    | {
        id: string;
        name: string;
        slug: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
      }[]
    | null;
};

type ForumSectionOption = {
  id: string;
  name: string;
  slug: string;
  section_type:
    | "ongame"
    | "offgame"
    | "organisation";
  visibility:
    | "public"
    | "members"
    | "staff";
  association_id: string | null;
};

type CharacterQueryRow = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
  portrait_url: string | null;
  association_id: string | null;
  status: string;
  association:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

type CharacterOption = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
  portrait_url: string | null;
  association_id: string | null;
  association_name: string | null;
};

type NewForumTopicPageProps = {
  params: Promise<{
    sectionSlug: string;
  }>;
};

function getSingleRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function isValidHexColour(
  value: string | null,
): boolean {
  return Boolean(
    value &&
      /^#[0-9a-f]{6}$/i.test(value),
  );
}

export default async function NewForumTopicPage({
  params,
}: NewForumTopicPageProps) {
  const { sectionSlug } = await params;

  const supabase = await createClient();

  const {
    data: authenticationData,
    error: authenticationError,
  } = await supabase.auth.getUser();

  if (
    authenticationError ||
    !authenticationData.user
  ) {
    redirect(
      `/login?next=${encodeURIComponent(
        `/forum/${sectionSlug}/new`,
      )}`,
    );
  }

  const userId =
    authenticationData.user.id;

  const {
    data: currentSectionData,
    error: currentSectionError,
  } = await supabase
    .from("forum_sections")
    .select(`
      id,
      name,
      slug,
      section_type,
      visibility,
      association_id,
      description,
      icon_url,
      banner_url,
      colour,
      is_active,
      sort_order,
      association:associations (
        id,
        name,
        slug
      )
    `)
    .eq("slug", sectionSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (currentSectionError) {
    throw new Error(
      `Unable to load the forum section: ${currentSectionError.message}`,
    );
  }

  if (!currentSectionData) {
    notFound();
  }

  const currentSectionRow =
    currentSectionData as unknown as ForumSectionQueryRow;

  const currentAssociation =
    getSingleRelation(
      currentSectionRow.association,
    );

  const [
    {
      data: availableSectionData,
      error: availableSectionError,
    },
    {
      data: characterData,
      error: characterError,
    },
  ] = await Promise.all([
    supabase
      .from("forum_sections")
      .select(`
        id,
        name,
        slug,
        section_type,
        visibility,
        association_id,
        is_active,
        sort_order
      `)
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("characters")
      .select(`
        id,
        display_name,
        first_name,
        surname,
        portrait_url,
        association_id,
        status,
        association:associations (
          id,
          name
        )
      `)
      .eq("user_id", userId)
      .eq("status", "approved")
      .order("display_name", {
        ascending: true,
      }),
  ]);

  if (availableSectionError) {
    throw new Error(
      `Unable to load available forum sections: ${availableSectionError.message}`,
    );
  }

  if (characterError) {
    throw new Error(
      `Unable to load your characters: ${characterError.message}`,
    );
  }

  const availableSections =
    (
      availableSectionData ??
      []
    ) as ForumSectionOption[];

  const currentSection:
    ForumSectionOption = {
    id: currentSectionRow.id,
    name: currentSectionRow.name,
    slug: currentSectionRow.slug,
    section_type:
      currentSectionRow.section_type,
    visibility:
      currentSectionRow.visibility,
    association_id:
      currentSectionRow.association_id,
  };

  const sectionExistsInOptions =
    availableSections.some(
      (section) =>
        section.id === currentSection.id,
    );

  const formSections =
    sectionExistsInOptions
      ? availableSections
      : [
          currentSection,
          ...availableSections,
        ];

  const characters = (
    (characterData ??
      []) as unknown as CharacterQueryRow[]
  ).map(
    (
      character,
    ): CharacterOption => {
      const association =
        getSingleRelation(
          character.association,
        );

      return {
        id: character.id,
        display_name:
          character.display_name,
        first_name:
          character.first_name,
        surname: character.surname,
        portrait_url:
          character.portrait_url,
        association_id:
          character.association_id,
        association_name:
          association?.name ?? null,
      };
    },
  );

  const sectionColour =
    isValidHexColour(
      currentSectionRow.colour,
    )
      ? currentSectionRow.colour!
      : "#8c704b";

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.17em] text-[#756751]">
          <Link
            href="/forum"
            className="transition hover:text-[#d5bd96]"
          >
            Forum
          </Link>

          <span>/</span>

          <Link
            href={`/forum/${currentSectionRow.slug}`}
            className="transition hover:text-[#d5bd96]"
          >
            {currentSectionRow.name}
          </Link>

          <span>/</span>

          <span className="text-[#a38b67]">
            New discussion
          </span>
        </nav>

        <header className="relative overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
          {currentSectionRow.banner_url ? (
            <div className="absolute inset-0">
              <Image
                src={
                  currentSectionRow.banner_url
                }
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover opacity-20"
                unoptimized
              />

              <div className="absolute inset-0 bg-gradient-to-r from-[#15100d] via-[#15100d]/92 to-[#15100d]/70" />

              <div className="absolute inset-0 bg-gradient-to-t from-[#15100d] via-transparent to-black/30" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(131,91,50,0.18),transparent_45%)]" />
          )}

          <div className="relative flex items-center gap-5 px-6 py-8 sm:px-8 sm:py-2">
            <div
              className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border bg-[#0c0907]"
              style={{
                borderColor:
                  `${sectionColour}99`,
              }}
            >
              {currentSectionRow.icon_url ? (
                <Image
                  src={
                    currentSectionRow.icon_url
                  }
                  alt=""
                  fill
                  sizes="64px"
                  className="object-contain p-2.5"
                  unoptimized
                />
              ) : (
                <span
                  className="font-serif text-3xl"
                  style={{
                    color: sectionColour,
                  }}
                >
                  {currentSectionRow.name
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[8px] uppercase tracking-[0.26em] text-[#8c704b]">
                {currentSectionRow.section_type ===
                "ongame"
                  ? "Ongame Forum"
                  : currentSectionRow.section_type ===
                      "offgame"
                    ? "Offgame Forum"
                    : "Organisation Forum"}
              </p>

              <h1 className="mt-1 font-serif text-3xl text-[#ead5ac] sm:text-3xl">
                New discussion
              </h1>

              <p className="mt-1 text-sm leading-6 text-[#9e907f]">
                Publishing in{" "}
                <span className="text-[#d0b68d]">
                  {
                    currentSectionRow.name
                  }
                </span>
                {currentAssociation
                  ? ` — ${currentAssociation.name}`
                  : ""}
              </p>
            </div>
          </div>
        </header>

        {characters.length === 0 ? (
          <div className="mt-6 border border-amber-900/50 bg-amber-950/15 px-5 py-4">
            <p className="font-serif text-lg text-amber-300">
              No approved characters
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-200/70">
              You need at least one approved
              character before you can publish
              in the forum. Account-only
              posting is not permitted.
            </p>
          </div>
        ) : null}

        {characters.length > 0 ? (
          <div className="mt-6">
            <NewTopicForm
              currentSection={
                currentSection
              }
              availableSections={
                formSections
              }
              characters={characters}
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}