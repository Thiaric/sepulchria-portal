import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ForumSectionRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
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
};

type ForumTopicRecord = {
  id: string;
  section_id: string;
  deleted_at: string | null;
};

type AssociationRecord = {
  id: string;
  name: string;
};

function getSectionTypeLabel(
  value: ForumSectionRecord["section_type"],
): string {
  switch (value) {
    case "ongame":
      return "Ongame";

    case "offgame":
      return "Offgame";

    case "organisation":
      return "Organisation";

    default:
      return value;
  }
}

function getVisibilityLabel(
  value: ForumSectionRecord["visibility"],
): string {
  switch (value) {
    case "public":
      return "Public";

    case "members":
      return "Members";

    case "staff":
      return "Staff";

    default:
      return value;
  }
}

export default async function ForumSectionsManagementPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirect=${encodeURIComponent(
        "/forum/manage/sections",
      )}`,
    );
  }

  const {
    data: staffResult,
    error: staffError,
  } = await supabase.rpc(
    "current_user_is_staff",
  );

  if (
    staffError ||
    staffResult !== true
  ) {
    redirect("/forum");
  }

  const [
    {
      data: sectionRecords,
      error: sectionsError,
    },
    {
      data: topicRecords,
      error: topicsError,
    },
    {
      data: associationRecords,
      error: associationsError,
    },
  ] = await Promise.all([
    supabase
      .from("forum_sections")
      .select(
        `
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
          sort_order
        `,
      )
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),

    supabase
      .from("forum_topics")
      .select(
        `
          id,
          section_id,
          deleted_at
        `,
      ),

    supabase
      .from("associations")
      .select(
        `
          id,
          name
        `,
      )
      .order("name", {
        ascending: true,
      }),
  ]);

  if (sectionsError) {
    throw new Error(
      `Unable to load forum sections: ${sectionsError.message}`,
    );
  }

  if (topicsError) {
    throw new Error(
      `Unable to load forum topics: ${topicsError.message}`,
    );
  }

  if (associationsError) {
    throw new Error(
      `Unable to load associations: ${associationsError.message}`,
    );
  }

  const sections =
    (sectionRecords ??
      []) as ForumSectionRecord[];

  const topics =
    (topicRecords ??
      []) as ForumTopicRecord[];

  const associations =
    (associationRecords ??
      []) as AssociationRecord[];

  const associationMap = new Map(
    associations.map((association) => [
      association.id,
      association.name,
    ]),
  );

  const parentSectionMap = new Map(
    sections.map((section) => [
      section.id,
      section.name,
    ]),
  );

  const activeSections =
    sections.filter(
      (section) => section.is_active,
    );

  const hiddenSections =
    sections.filter(
      (section) => !section.is_active,
    );

  const ongameSections =
    sections.filter(
      (section) =>
        section.section_type === "ongame",
    ).length;

  const offgameSections =
    sections.filter(
      (section) =>
        section.section_type === "offgame",
    ).length;

  const organisationSections =
    sections.filter(
      (section) =>
        section.section_type ===
        "organisation",
    ).length;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav
        aria-label="Forum breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-[#746653]"
      >
        <Link
          href="/forum"
          className="transition hover:text-[#c7a16d]"
        >
          Forum
        </Link>

        <span aria-hidden="true">
          /
        </span>

        <Link
          href="/forum/manage"
          className="transition hover:text-[#c7a16d]"
        >
          Staff management
        </Link>

        <span aria-hidden="true">
          /
        </span>

        <span className="text-[#a48c6c]">
          Sections
        </span>
      </nav>

      <header className="overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
        <div className="flex flex-col gap-5 border-b border-[#60482e]/35 bg-[#1a130e] px-5 py-7 sm:px-7 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[8px] uppercase tracking-[0.22em] text-amber-500">
              Forum structure
            </p>

            <h1 className="mt-3 font-serif text-3xl text-[#dec69d] sm:text-4xl">
              Forum Sections
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#817567]">
              Review every section,
              inspect its access level and
              open its configuration page.
            </p>
          </div>

          <Link
            href="/forum/manage/sections/new"
            className="shrink-0 border border-amber-800/70 bg-amber-950/25 px-5 py-3 text-center text-[8px] uppercase tracking-[0.17em] text-amber-300 transition hover:border-amber-600 hover:bg-amber-950/45"
          >
            Create section
          </Link>
        </div>

        <dl className="grid grid-cols-2 divide-x divide-y divide-[#60482e]/30 bg-[#100c09] sm:grid-cols-5 sm:divide-y-0">
          <Statistic
            label="Total"
            value={sections.length}
          />

          <Statistic
            label="Active"
            value={activeSections.length}
          />

          <Statistic
            label="Ongame"
            value={ongameSections}
          />

          <Statistic
            label="Offgame"
            value={offgameSections}
          />

          <Statistic
            label="Organisations"
            value={organisationSections}
          />
        </dl>
      </header>

      <section className="mt-7">
        <SectionGroup
          title="Active Sections"
          description="These sections are currently available according to their visibility rules."
          sections={activeSections}
          topics={topics}
          associationMap={associationMap}
          parentSectionMap={
            parentSectionMap
          }
          emptyMessage="No active sections are currently available."
        />
      </section>

      <section className="mt-9">
        <SectionGroup
          title="Hidden Sections"
          description="These sections remain stored but are not currently displayed to members."
          sections={hiddenSections}
          topics={topics}
          associationMap={associationMap}
          parentSectionMap={
            parentSectionMap
          }
          emptyMessage="No hidden sections."
        />
      </section>
    </main>
  );
}

function SectionGroup({
  title,
  description,
  sections,
  topics,
  associationMap,
  parentSectionMap,
  emptyMessage,
}: {
  title: string;
  description: string;
  sections: ForumSectionRecord[];
  topics: ForumTopicRecord[];
  associationMap: Map<string, string>;
  parentSectionMap: Map<string, string>;
  emptyMessage: string;
}) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl text-[#dec69d]">
            {title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#817567]">
            {description}
          </p>
        </div>

        <span className="border border-[#60482e]/40 bg-[#15100d] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[#8f795b]">
          {sections.length}{" "}
          {sections.length === 1
            ? "section"
            : "sections"}
        </span>
      </div>

      <div className="overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
        {sections.length > 0 ? (
          <div className="divide-y divide-[#60482e]/30">
            {sections.map((section) => {
              const activeTopicCount =
                topics.filter(
                  (topic) =>
                    topic.section_id ===
                      section.id &&
                    !topic.deleted_at,
                ).length;

              const deletedTopicCount =
                topics.filter(
                  (topic) =>
                    topic.section_id ===
                      section.id &&
                    Boolean(
                      topic.deleted_at,
                    ),
                ).length;

              const associationName =
                section.association_id
                  ? associationMap.get(
                      section.association_id,
                    ) ?? null
                  : null;

              const parentSectionName =
                section.parent_id
                  ? parentSectionMap.get(
                      section.parent_id,
                    ) ?? null
                  : null;

              return (
                <article
                  key={section.id}
                  className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif text-xl text-[#d7bf98]">
                        {section.name}
                      </h3>

                      <StatusBadge
                        active={
                          section.is_active
                        }
                      />

                      <Tag>
                        {getSectionTypeLabel(
                          section.section_type,
                        )}
                      </Tag>

                      <Tag>
                        {getVisibilityLabel(
                          section.visibility,
                        )}
                      </Tag>
                    </div>

                    <p className="mt-2 text-[8px] uppercase tracking-[0.15em] text-[#6e604d]">
                      /forum/{section.slug}
                    </p>

                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#817567]">
                      {section.description ||
                        "No description has been provided."}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[8px] uppercase tracking-[0.14em] text-[#6e604d]">
                      <span>
                        Order{" "}
                        {section.sort_order}
                      </span>

                      {associationName ? (
                        <span>
                          Organisation:{" "}
                          {associationName}
                        </span>
                      ) : null}

                      {parentSectionName ? (
                        <span>
                          Parent:{" "}
                          {parentSectionName}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-3">
                    <MiniStatistic
                      label="Active topics"
                      value={
                        activeTopicCount
                      }
                    />

                    <MiniStatistic
                      label="Deleted topics"
                      value={
                        deletedTopicCount
                      }
                    />
                  </dl>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {section.is_active ? (
                      <Link
                        href={`/forum/${encodeURIComponent(
                          section.slug,
                        )}`}
                        className="border border-[#60482e]/50 bg-[#110d0a] px-4 py-3 text-center text-[8px] uppercase tracking-[0.15em] text-[#927b5b] transition hover:border-[#876640] hover:text-[#d8b986]"
                      >
                        Open
                      </Link>
                    ) : null}

                    <Link
                      href={`/forum/manage/sections/${encodeURIComponent(
                        section.id,
                      )}`}
                      className="border border-[#745633]/65 bg-[#21170f] px-4 py-3 text-center text-[8px] uppercase tracking-[0.15em] text-[#c7a470] transition hover:border-[#a47a44] hover:bg-[#2c1d12] hover:text-[#ebca93]"
                    >
                      Edit
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="font-serif text-xl text-[#cdb590]">
              {emptyMessage}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function Statistic({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="px-4 py-4 text-center sm:px-5">
      <dt className="text-[7px] uppercase tracking-[0.17em] text-[#665946]">
        {label}
      </dt>

      <dd className="mt-2 font-serif text-lg text-[#bda17b]">
        {value}
      </dd>
    </div>
  );
}

function MiniStatistic({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="border border-[#60482e]/35 bg-[#100c09] px-3 py-3 text-center">
      <dt className="text-[7px] uppercase tracking-[0.14em] text-[#665946]">
        {label}
      </dt>

      <dd className="mt-2 font-serif text-lg text-[#bda17b]">
        {value}
      </dd>
    </div>
  );
}

function Tag({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="border border-[#60482e]/45 bg-[#100c09] px-2 py-1 text-[7px] uppercase tracking-[0.14em] text-[#8e7859]">
      {children}
    </span>
  );
}

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={
        active
          ? "border border-emerald-900/60 bg-emerald-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.14em] text-emerald-400"
          : "border border-red-950/60 bg-red-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.14em] text-red-400"
      }
    >
      {active
        ? "Active"
        : "Hidden"}
    </span>
  );
}