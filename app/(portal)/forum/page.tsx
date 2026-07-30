import Image from "next/image";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import ForumStaffTools from "@/components/forum/forum-staff-tools";

type ForumSection = {
  id: string;
  name: string;
  slug: string;
  description: string;
  section_type:
    | "ongame"
    | "offgame"
    | "organisation";
  association_id: string | null;
  parent_id: string | null;
  visibility:
    | "public"
    | "members"
    | "staff";
  icon_url: string | null;
  banner_url: string | null;
  colour: string | null;
  is_active: boolean;
  sort_order: number;
  association: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type ForumTopic = {
  id: string;
  section_id: string;
  title: string;
  slug: string;
  replies_count: number;
  last_post_at: string;
  deleted_at: string | null;
};

type SectionStatistics = {
  topics: number;
  replies: number;
  latestTopic: ForumTopic | null;
};

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getSectionStatistics(
  sectionId: string,
  topics: ForumTopic[],
): SectionStatistics {
  const sectionTopics = topics
    .filter(
      (topic) =>
        topic.section_id === sectionId &&
        topic.deleted_at === null,
    )
    .sort(
      (firstTopic, secondTopic) =>
        new Date(
          secondTopic.last_post_at,
        ).getTime() -
        new Date(
          firstTopic.last_post_at,
        ).getTime(),
    );

  return {
    topics: sectionTopics.length,
    replies: sectionTopics.reduce(
      (total, topic) =>
        total + topic.replies_count,
      0,
    ),
    latestTopic:
      sectionTopics[0] ?? null,
  };
}

export default async function ForumPage() {
  const supabase = await createClient();

  const [
    { data: sectionData, error: sectionError },
    { data: topicData, error: topicError },
  ] = await Promise.all([
    supabase
      .from("forum_sections")
      .select(`
        id,
        name,
        slug,
        description,
        section_type,
        association_id,
        parent_id,
        visibility,
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
      .eq("is_active", true)
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("forum_topics")
      .select(`
        id,
        section_id,
        title,
        slug,
        replies_count,
        last_post_at,
        deleted_at
      `)
      .is("deleted_at", null),
  ]);

  if (sectionError) {
    throw new Error(
      `Unable to load forum sections: ${sectionError.message}`,
    );
  }

  if (topicError) {
    throw new Error(
      `Unable to load forum discussions: ${topicError.message}`,
    );
  }

  const sections =
    (sectionData ?? []) as unknown as ForumSection[];

  const topics =
    (topicData ?? []) as ForumTopic[];

  const ongameSections = sections.filter(
    (section) =>
      section.section_type === "ongame",
  );

  const offgameSections = sections.filter(
    (section) =>
      section.section_type === "offgame",
  );

  const organisationSections =
    sections.filter(
      (section) =>
        section.section_type ===
        "organisation",
    );

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <header className="relative overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(131,91,50,0.18),transparent_45%)]" />

          <div className="relative px-6 py-10 sm:px-9 sm:py-12">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[#8c704b]">
              Sepulchria Community
            </p>

            <h1 className="mt-3 font-serif text-4xl text-[#ead5ac] sm:text-5xl">
              Forum
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#a99b89]">
              Chronicles, discussions,
              announcements and the private
              halls of Sepulchria&apos;s
              organisations.
            </p>
          </div>
        </header>

        <ForumStaffTools className="mt-6" />

        <div className="mt-7 space-y-8">
          <ForumCategory
            eyebrow="The World of Asteros"
            title="Ongame"
            description="In-character chronicles, events, letters and conversations belonging to the living world of the game."
            sections={ongameSections}
            topics={topics}
            emptyMessage="No Ongame sections are currently available."
          />

          <ForumCategory
            eyebrow="The Community"
            title="Offgame"
            description="Announcements, questions, introductions and conversations between members of the community."
            sections={offgameSections}
            topics={topics}
            emptyMessage="No Offgame sections are currently available."
          />

          <ForumCategory
            eyebrow="Orders and Powers"
            title="Organisations"
            description="Dedicated halls belonging to the associations of Sepulchria. Access may depend on character membership."
            sections={organisationSections}
            topics={topics}
            emptyMessage="No organisation forums have been created yet."
          />
        </div>
      </div>
    </main>
  );
}

function ForumCategory({
  eyebrow,
  title,
  description,
  sections,
  topics,
  emptyMessage,
}: {
  eyebrow: string;
  title: string;
  description: string;
  sections: ForumSection[];
  topics: ForumTopic[];
  emptyMessage: string;
}) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[8px] uppercase tracking-[0.26em] text-[#806a4d]">
            {eyebrow}
          </p>

          <h2 className="mt-2 font-serif text-3xl text-[#dec69d]">
            {title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#958878]">
            {description}
          </p>
        </div>

        <span className="border border-[#60482e]/40 bg-[#15100d] px-3 py-2 text-[9px] uppercase tracking-[0.17em] text-[#9c835f]">
          {sections.length}{" "}
          {sections.length === 1
            ? "section"
            : "sections"}
        </span>
      </div>

      <div className="overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
        {sections.length > 0 ? (
          <div className="divide-y divide-[#60482e]/30">
            {sections.map((section) => (
              <ForumSectionRow
                key={section.id}
                section={section}
                statistics={getSectionStatistics(
                  section.id,
                  topics,
                )}
              />
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <p className="font-serif text-lg text-[#aa9982]">
              {emptyMessage}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function ForumSectionRow({
  section,
  statistics,
}: {
  section: ForumSection;
  statistics: SectionStatistics;
}) {
  const sectionColour =
    section.colour &&
    /^#[0-9a-f]{6}$/i.test(section.colour)
      ? section.colour
      : "#8c704b";

  return (
    <article className="group relative overflow-hidden">
      {section.banner_url ? (
        <div className="absolute inset-0">
          <Image
            src={section.banner_url}
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-[0.08] transition duration-500 group-hover:opacity-[0.13]"
            unoptimized
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#15100d] via-[#15100d]/95 to-[#15100d]/80" />
        </div>
      ) : null}

      <div className="relative grid gap-5 px-5 py-5 md:grid-cols-[minmax(0,1fr)_130px_260px] md:items-center sm:px-6">
        <Link
          href={`/forum/${section.slug}`}
          className="flex min-w-0 items-center gap-4"
        >
          <div
            className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border bg-[#0d0907]"
            style={{
              borderColor: `${sectionColour}88`,
            }}
          >
            {section.icon_url ? (
              <Image
                src={section.icon_url}
                alt=""
                fill
                sizes="56px"
                className="object-contain p-2"
                unoptimized
              />
            ) : (
              <span
                className="font-serif text-2xl"
                style={{
                  color: sectionColour,
                }}
              >
                {section.name
                  .charAt(0)
                  .toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-serif text-xl text-[#d9c39d] transition group-hover:text-[#f0d8aa]">
                {section.name}
              </h3>

              {section.visibility !==
              "public" ? (
                <span className="border border-[#675036]/60 bg-black/15 px-2 py-1 text-[7px] uppercase tracking-[0.16em] text-[#9e8767]">
                  {section.visibility ===
                  "members"
                    ? "Members"
                    : "Staff"}
                </span>
              ) : null}
            </div>

            {section.association ? (
              <p className="mt-1 text-[8px] uppercase tracking-[0.18em] text-[#7e684c]">
                {
                  section.association
                    .name
                }
              </p>
            ) : null}

            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#968979]">
              {section.description ||
                "No description has been provided for this section."}
            </p>
          </div>
        </Link>

        <div className="grid grid-cols-2 gap-2 md:block md:text-center">
          <ForumStatistic
            value={statistics.topics}
            label="Topics"
          />

          <ForumStatistic
            value={statistics.replies}
            label="Replies"
          />
        </div>

        <div className="border-t border-[#60482e]/25 pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
          {statistics.latestTopic ? (
            <>
              <p className="text-[8px] uppercase tracking-[0.17em] text-[#75644d]">
                Latest discussion
              </p>

              <Link
                href={`/forum/${section.slug}/${statistics.latestTopic.slug}`}
                className="mt-2 block truncate font-serif text-base text-[#c9b28e] transition hover:text-[#efd6a8]"
              >
                {
                  statistics.latestTopic
                    .title
                }
              </Link>

              <p className="mt-1 text-[9px] text-[#776b5d]">
                {formatDate(
                  statistics.latestTopic
                    .last_post_at,
                )}
              </p>
            </>
          ) : (
            <>
              <p className="text-[8px] uppercase tracking-[0.17em] text-[#75644d]">
                Latest discussion
              </p>

              <p className="mt-2 text-sm text-[#6f6457]">
                No discussions yet.
              </p>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function ForumStatistic({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="inline-block min-w-[58px] px-2 py-1 text-center">
      <p className="font-serif text-lg text-[#c4a980]">
        {value}
      </p>

      <p className="mt-0.5 text-[7px] uppercase tracking-[0.14em] text-[#716453]">
        {label}
      </p>
    </div>
  );
}