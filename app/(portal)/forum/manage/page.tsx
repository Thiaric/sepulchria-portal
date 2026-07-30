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
  visibility:
    | "public"
    | "members"
    | "staff";
  is_active: boolean;
  sort_order: number;
};

type ForumTopicRecord = {
  id: string;
  section_id: string;
  title: string;
  slug: string;
  is_locked: boolean;
  is_pinned: boolean;
  replies_count: number | null;
  views_count: number | null;
  deleted_at: string | null;
  last_post_at: string;
};

function normalizeCount(
  value: number | null,
): number {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  return 0;
}

export default async function ForumManagePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirect=${encodeURIComponent(
        "/forum/manage",
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
          visibility,
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
          title,
          slug,
          is_locked,
          is_pinned,
          replies_count,
          views_count,
          deleted_at,
          last_post_at
        `,
      )
      .order("last_post_at", {
        ascending: false,
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

  const sections =
    (sectionRecords ??
      []) as ForumSectionRecord[];

  const topics =
    (topicRecords ??
      []) as ForumTopicRecord[];

  const activeSections =
    sections.filter(
      (section) =>
        section.is_active,
    ).length;

  const hiddenSections =
    sections.length -
    activeSections;

  const activeTopics =
    topics.filter(
      (topic) =>
        !topic.deleted_at,
    );

  const deletedTopics =
    topics.filter(
      (topic) =>
        Boolean(topic.deleted_at),
    ).length;

  const lockedTopics =
    activeTopics.filter(
      (topic) =>
        topic.is_locked,
    ).length;

  const pinnedTopics =
    activeTopics.filter(
      (topic) =>
        topic.is_pinned,
    ).length;

  const totalReplies =
    activeTopics.reduce(
      (total, topic) =>
        total +
        normalizeCount(
          topic.replies_count,
        ),
      0,
    );

  const totalViews =
    activeTopics.reduce(
      (total, topic) =>
        total +
        normalizeCount(
          topic.views_count,
        ),
      0,
    );

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

        <span className="text-[#a48c6c]">
          Staff management
        </span>
      </nav>

      <header className="overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
        <div className="border-b border-[#60482e]/35 bg-[#1a130e] px-5 py-7 sm:px-7">
          <p className="text-[8px] uppercase tracking-[0.22em] text-amber-500">
            Staff control panel
          </p>

          <h1 className="mt-3 font-serif text-3xl text-[#dec69d] sm:text-4xl">
            Forum Management
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#817567]">
            Manage forum sections,
            discussions, visibility and
            moderation tools from one
            place.
          </p>
        </div>

        <dl className="grid grid-cols-2 divide-x divide-y divide-[#60482e]/30 bg-[#100c09] sm:grid-cols-4 sm:divide-y-0">
          <Statistic
            label="Sections"
            value={sections.length}
          />

          <Statistic
            label="Active topics"
            value={activeTopics.length}
          />

          <Statistic
            label="Replies"
            value={totalReplies}
          />

          <Statistic
            label="Views"
            value={totalViews}
          />
        </dl>
      </header>

      <section className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <ManagementCard
          eyebrow="Structure"
          title="Forum Sections"
          description="Create, edit, order, hide or reactivate the sections displayed on the forum index."
          href="/forum/manage/sections"
          linkLabel="Manage sections"
          statistics={[
            `${activeSections} active`,
            `${hiddenSections} hidden`,
          ]}
        />

        <ManagementCard
          eyebrow="Discussions"
          title="Forum Topics"
          description="Review active and deleted discussions, inspect their status and open them for moderation."
          href="/forum/manage/topics"
          linkLabel="Manage topics"
          statistics={[
            `${activeTopics.length} active`,
            `${deletedTopics} deleted`,
          ]}
        />

        <ManagementCard
          eyebrow="Staff history"
          title="Moderation Log"
          description="Review the complete chronological history of forum moderation actions."
          href="/forum/moderation"
          linkLabel="Open moderation log"
          statistics={[
            `${lockedTopics} locked`,
            `${pinnedTopics} pinned`,
          ]}
        />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[8px] uppercase tracking-[0.22em] text-[#806a4d]">
              Current structure
            </p>

            <h2 className="mt-2 font-serif text-3xl text-[#dec69d]">
              Forum Sections
            </h2>
          </div>

          <Link
            href="/forum/manage/sections"
            className="border border-[#60482e]/55 bg-[#19120e] px-4 py-3 text-[8px] uppercase tracking-[0.16em] text-[#a58b68] transition hover:border-[#947047] hover:text-[#dec095]"
          >
            View all sections
          </Link>
        </div>

        <div className="overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
          {sections.length > 0 ? (
            <div className="divide-y divide-[#60482e]/30">
              {sections.map(
                (section) => {
                  const sectionTopics =
                    activeTopics.filter(
                      (topic) =>
                        topic.section_id ===
                        section.id,
                    );

                  return (
                    <article
                      key={section.id}
                      className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/forum/${encodeURIComponent(
                              section.slug,
                            )}`}
                            className="font-serif text-xl text-[#d7bf98] transition hover:text-[#f0d4a6]"
                          >
                            {section.name}
                          </Link>

                          <StatusBadge
                            active={
                              section.is_active
                            }
                          />

                          <span className="border border-[#60482e]/45 bg-[#100c09] px-2 py-1 text-[7px] uppercase tracking-[0.14em] text-[#8e7859]">
                            {
                              section.section_type
                            }
                          </span>

                          <span className="border border-[#60482e]/45 bg-[#100c09] px-2 py-1 text-[7px] uppercase tracking-[0.14em] text-[#8e7859]">
                            {
                              section.visibility
                            }
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#817567]">
                          {section.description ||
                            "No section description."}
                        </p>

                        <p className="mt-2 text-[8px] uppercase tracking-[0.14em] text-[#665947]">
                          {
                            sectionTopics.length
                          }{" "}
                          {sectionTopics.length ===
                          1
                            ? "active topic"
                            : "active topics"}
                        </p>
                      </div>

                      <Link
                        href={`/forum/manage/sections/${encodeURIComponent(
                          section.id,
                        )}`}
                        className="shrink-0 border border-[#60482e]/55 bg-[#19120e] px-4 py-3 text-center text-[8px] uppercase tracking-[0.16em] text-[#a58b68] transition hover:border-[#947047] hover:text-[#dec095]"
                      >
                        Edit section
                      </Link>
                    </article>
                  );
                },
              )}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="font-serif text-xl text-[#cdb590]">
                No forum sections
              </p>

              <p className="mt-3 text-sm text-[#817567]">
                No sections have been
                created yet.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ManagementCard({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
  statistics,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  statistics: string[];
}) {
  return (
    <article className="flex h-full flex-col border border-[#60482e]/45 bg-[#15100d]">
      <div className="flex-1 px-5 py-6 sm:px-6">
        <p className="text-[8px] uppercase tracking-[0.2em] text-amber-500">
          {eyebrow}
        </p>

        <h2 className="mt-3 font-serif text-2xl text-[#d8c09a]">
          {title}
        </h2>

        <p className="mt-3 text-sm leading-6 text-[#817567]">
          {description}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {statistics.map(
            (statistic) => (
              <span
                key={statistic}
                className="border border-[#60482e]/40 bg-[#100c09] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[#8f795b]"
              >
                {statistic}
              </span>
            ),
          )}
        </div>
      </div>

      <div className="border-t border-[#60482e]/30 bg-[#110d0a] px-5 py-4 sm:px-6">
        <Link
          href={href}
          className="block border border-[#745633]/65 bg-[#21170f] px-4 py-3 text-center text-[8px] uppercase tracking-[0.17em] text-[#c7a470] transition hover:border-[#a47a44] hover:bg-[#2c1d12] hover:text-[#ebca93]"
        >
          {linkLabel}
        </Link>
      </div>
    </article>
  );
}

function Statistic({
  label,
  value,
}: {
  label: string;
  value: string | number;
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