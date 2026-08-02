import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 30;

type ForumManageTopicsPageProps = {
  searchParams: Promise<{
    page?: string | string[];
    status?: string | string[];
    section?: string | string[];
    search?: string | string[];
  }>;
};

type ForumSectionRecord = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type ForumTopicRecord = {
  id: string;
  section_id: string;
  author_user_id: string | null;
  title: string;
  slug: string;
  is_locked: boolean;
  is_pinned: boolean;
  replies_count: number | null;
  views_count: number | null;
  created_at: string;
  updated_at: string;
  last_post_at: string;
  deleted_at: string | null;
};

type CharacterRecord = {
  user_id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
};

type TopicStatus =
  | "all"
  | "active"
  | "locked"
  | "pinned"
  | "deleted";

function getSearchParamValue(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function parsePage(value: string): number {
  const page = Number.parseInt(value, 10);

  if (
    !Number.isInteger(page) ||
    page < 1
  ) {
    return 1;
  }

  return page;
}

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

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function getCharacterName(
  character: CharacterRecord | undefined,
): string {
  if (character?.display_name?.trim()) {
    return character.display_name.trim();
  }

  if (character) {
    const fullName = [
      character.first_name,
      character.surname,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (fullName) {
      return fullName;
    }
  }

  return "Unknown account";
}

function isTopicStatus(
  value: string,
): value is TopicStatus {
  return [
    "all",
    "active",
    "locked",
    "pinned",
    "deleted",
  ].includes(value);
}

function createTopicsUrl({
  page,
  status,
  section,
  search,
}: {
  page?: number;
  status: TopicStatus;
  section: string;
  search: string;
}): string {
  const params = new URLSearchParams();

  if (page && page > 1) {
    params.set("page", String(page));
  }

  if (status !== "all") {
    params.set("status", status);
  }

  if (section) {
    params.set("section", section);
  }

  if (search) {
    params.set("search", search);
  }

  const query = params.toString();

  return query
    ? `/admin/forum/topics?${query}`
    : "/admin/forum/topics";
}

export default async function ForumTopicsManagementPage({
  searchParams,
}: ForumManageTopicsPageProps) {
  const resolvedSearchParams =
    await searchParams;

  const requestedPage = parsePage(
    getSearchParamValue(
      resolvedSearchParams.page,
    ),
  );

  const requestedStatus =
    getSearchParamValue(
      resolvedSearchParams.status,
    );

  const status: TopicStatus =
    isTopicStatus(requestedStatus)
      ? requestedStatus
      : "all";

  const selectedSectionId =
    getSearchParamValue(
      resolvedSearchParams.section,
    );

  const search =
    getSearchParamValue(
      resolvedSearchParams.search,
    ).trim();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirect=${encodeURIComponent(
        "/admin/forum/topics",
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

  const {
    data: sectionRecords,
    error: sectionsError,
  } = await supabase
    .from("forum_sections")
    .select(
      `
        id,
        name,
        slug,
        is_active
      `,
    )
    .order("sort_order", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  if (sectionsError) {
    throw new Error(
      `Unable to load forum sections: ${sectionsError.message}`,
    );
  }

  const sections =
    (sectionRecords ??
      []) as ForumSectionRecord[];

  let topicQuery = supabase
    .from("forum_topics")
    .select(
      `
        id,
        section_id,
        author_user_id,
        title,
        slug,
        is_locked,
        is_pinned,
        replies_count,
        views_count,
        created_at,
        updated_at,
        last_post_at,
        deleted_at
      `,
      {
        count: "exact",
      },
    );

  if (selectedSectionId) {
    topicQuery = topicQuery.eq(
      "section_id",
      selectedSectionId,
    );
  }

  if (search) {
    topicQuery = topicQuery.ilike(
      "title",
      `%${search}%`,
    );
  }

  switch (status) {
    case "active":
      topicQuery =
        topicQuery.is(
          "deleted_at",
          null,
        );
      break;

    case "locked":
      topicQuery = topicQuery
        .is("deleted_at", null)
        .eq("is_locked", true);
      break;

    case "pinned":
      topicQuery = topicQuery
        .is("deleted_at", null)
        .eq("is_pinned", true);
      break;

    case "deleted":
      topicQuery =
        topicQuery.not(
          "deleted_at",
          "is",
          null,
        );
      break;

    case "all":
    default:
      break;
  }

  const rangeStart =
    (requestedPage - 1) * PAGE_SIZE;

  const rangeEnd =
    rangeStart + PAGE_SIZE - 1;

  const {
    data: topicRecords,
    error: topicsError,
    count: topicCount,
  } = await topicQuery
    .order("last_post_at", {
      ascending: false,
    })
    .range(
      rangeStart,
      rangeEnd,
    );

  if (topicsError) {
    throw new Error(
      `Unable to load forum topics: ${topicsError.message}`,
    );
  }

  const topics =
    (topicRecords ??
      []) as ForumTopicRecord[];

  const totalTopics =
    typeof topicCount === "number"
      ? topicCount
      : 0;

  const totalPages = Math.max(
    1,
    Math.ceil(
      totalTopics / PAGE_SIZE,
    ),
  );

  if (
    requestedPage > totalPages &&
    totalTopics > 0
  ) {
    redirect(
      createTopicsUrl({
        page: totalPages,
        status,
        section:
          selectedSectionId,
        search,
      }),
    );
  }

  const authorIds = Array.from(
    new Set(
      topics
        .map(
          (topic) =>
            topic.author_user_id,
        )
        .filter(
          (
            authorId,
          ): authorId is string =>
            Boolean(authorId),
        ),
    ),
  );

  const {
    data: characterRecords,
    error: charactersError,
  } =
    authorIds.length > 0
      ? await supabase
          .from("characters")
          .select(
            `
              user_id,
              display_name,
              first_name,
              surname
            `,
          )
          .in("user_id", authorIds)
      : {
          data: [],
          error: null,
        };

  if (charactersError) {
    throw new Error(
      `Unable to load topic authors: ${charactersError.message}`,
    );
  }

  const characters =
    (characterRecords ??
      []) as CharacterRecord[];

  const characterMap = new Map(
    characters.map((character) => [
      character.user_id,
      character,
    ]),
  );

  const sectionMap = new Map(
    sections.map((section) => [
      section.id,
      section,
    ]),
  );

  const activeTopicCount =
    topics.filter(
      (topic) =>
        !topic.deleted_at,
    ).length;

  const lockedTopicCount =
    topics.filter(
      (topic) =>
        !topic.deleted_at &&
        topic.is_locked,
    ).length;

  const pinnedTopicCount =
    topics.filter(
      (topic) =>
        !topic.deleted_at &&
        topic.is_pinned,
    ).length;

  const deletedTopicCount =
    topics.filter(
      (topic) =>
        Boolean(topic.deleted_at),
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
          href="/admin/forum"
          className="transition hover:text-[#c7a16d]"
        >
          Staff management
        </Link>

        <span aria-hidden="true">
          /
        </span>

        <span className="text-[#a48c6c]">
          Topics
        </span>
      </nav>

      <header className="overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
        <div className="border-b border-[#60482e]/35 bg-[#1a130e] px-5 py-7 sm:px-7">
          <p className="text-[8px] uppercase tracking-[0.22em] text-amber-500">
            Forum discussions
          </p>

          <h1 className="mt-3 font-serif text-3xl text-[#dec69d] sm:text-4xl">
            Forum Topics
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#817567]">
            Search and inspect active,
            locked, pinned and deleted
            discussions across every
            forum section.
          </p>
        </div>

        <dl className="grid grid-cols-2 divide-x divide-y divide-[#60482e]/30 bg-[#100c09] sm:grid-cols-5 sm:divide-y-0">
          <Statistic
            label="Results"
            value={totalTopics}
          />

          <Statistic
            label="Active on page"
            value={activeTopicCount}
          />

          <Statistic
            label="Locked on page"
            value={lockedTopicCount}
          />

          <Statistic
            label="Pinned on page"
            value={pinnedTopicCount}
          />

          <Statistic
            label="Deleted on page"
            value={deletedTopicCount}
          />
        </dl>
      </header>

      <section className="mt-6 border border-[#60482e]/45 bg-[#15100d]">
        <form
          method="get"
          className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(220px,1fr)_220px_180px_auto]"
        >
          <div>
            <label
              htmlFor="topic-search"
              className="block text-[8px] uppercase tracking-[0.16em] text-[#927b5b]"
            >
              Search title
            </label>

            <input
              id="topic-search"
              name="search"
              type="search"
              defaultValue={search}
              placeholder="Search discussions..."
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="topic-section"
              className="block text-[8px] uppercase tracking-[0.16em] text-[#927b5b]"
            >
              Section
            </label>

            <select
              id="topic-section"
              name="section"
              defaultValue={
                selectedSectionId
              }
              className={inputClassName}
            >
              <option value="">
                All sections
              </option>

              {sections.map(
                (section) => (
                  <option
                    key={section.id}
                    value={section.id}
                  >
                    {section.name}
                    {!section.is_active
                      ? " â€” Hidden"
                      : ""}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="topic-status"
              className="block text-[8px] uppercase tracking-[0.16em] text-[#927b5b]"
            >
              Status
            </label>

            <select
              id="topic-status"
              name="status"
              defaultValue={status}
              className={inputClassName}
            >
              <option value="all">
                All topics
              </option>

              <option value="active">
                Active
              </option>

              <option value="locked">
                Locked
              </option>

              <option value="pinned">
                Pinned
              </option>

              <option value="deleted">
                Deleted
              </option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 border border-amber-800/70 bg-amber-950/25 px-5 py-3 text-[8px] uppercase tracking-[0.17em] text-amber-300 transition hover:border-amber-600 hover:bg-amber-950/45"
            >
              Apply filters
            </button>

            <Link
              href="/admin/forum/topics"
              className="border border-[#60482e]/55 bg-[#100c09] px-4 py-3 text-center text-[8px] uppercase tracking-[0.15em] text-[#927b5b] transition hover:border-[#876640] hover:text-[#d8b986]"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="mt-6 overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
        {topics.length > 0 ? (
          <div className="divide-y divide-[#60482e]/30">
            {topics.map((topic) => {
              const section =
                sectionMap.get(
                  topic.section_id,
                );

              const authorName =
                topic.author_user_id
                  ? getCharacterName(
                      characterMap.get(
                        topic.author_user_id,
                      ),
                    )
                  : "Unknown account";

              const publicTopicUrl =
                section
                  ? `/forum/${encodeURIComponent(
                      section.slug,
                    )}/${encodeURIComponent(
                      topic.slug,
                    )}`
                  : null;

              return (
                <article
                  key={topic.id}
                  className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_200px_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words font-serif text-xl text-[#d7bf98]">
                        {topic.title}
                      </h2>

                      {topic.is_pinned &&
                      !topic.deleted_at ? (
                        <TopicBadge variant="pinned">
                          Pinned
                        </TopicBadge>
                      ) : null}

                      {topic.is_locked &&
                      !topic.deleted_at ? (
                        <TopicBadge variant="locked">
                          Locked
                        </TopicBadge>
                      ) : null}

                      {topic.deleted_at ? (
                        <TopicBadge variant="deleted">
                          Deleted
                        </TopicBadge>
                      ) : null}
                    </div>

                    <p className="mt-2 text-[8px] uppercase tracking-[0.15em] text-[#6e604d]">
                      {section?.name ??
                        "Unknown section"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#817567]">
                      <span>
                        Started by{" "}
                        {authorName}
                      </span>

                      <span>
                        Created{" "}
                        {formatDate(
                          topic.created_at,
                        )}
                      </span>

                      <span>
                        Last activity{" "}
                        {formatDate(
                          topic.last_post_at,
                        )}
                      </span>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-3">
                    <MiniStatistic
                      label="Replies"
                      value={normalizeCount(
                        topic.replies_count,
                      )}
                    />

                    <MiniStatistic
                      label="Views"
                      value={normalizeCount(
                        topic.views_count,
                      )}
                    />
                  </dl>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {publicTopicUrl &&
                    !topic.deleted_at ? (
                      <Link
                        href={
                          publicTopicUrl
                        }
                        className="border border-[#60482e]/50 bg-[#110d0a] px-4 py-3 text-center text-[8px] uppercase tracking-[0.15em] text-[#927b5b] transition hover:border-[#876640] hover:text-[#d8b986]"
                      >
                        Open
                      </Link>
                    ) : null}

                    {publicTopicUrl ? (
                      <Link
                        href={`${publicTopicUrl}#topic-moderation`}
                        className="border border-[#745633]/65 bg-[#21170f] px-4 py-3 text-center text-[8px] uppercase tracking-[0.15em] text-[#c7a470] transition hover:border-[#a47a44] hover:bg-[#2c1d12] hover:text-[#ebca93]"
                      >
                        Moderate
                      </Link>
                    ) : (
                      <span className="border border-red-950/50 bg-red-950/10 px-4 py-3 text-[8px] uppercase tracking-[0.15em] text-red-500">
                        Missing section
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <p className="font-serif text-xl text-[#cdb590]">
              No topics found
            </p>

            <p className="mt-3 text-sm text-[#817567]">
              No discussions match the
              selected filters.
            </p>
          </div>
        )}
      </section>

      {totalPages > 1 ? (
        <nav
          aria-label="Topic pagination"
          className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-[#60482e]/45 bg-[#15100d] px-5 py-4"
        >
          <p className="text-[8px] uppercase tracking-[0.15em] text-[#75644d]">
            Page {requestedPage} of{" "}
            {totalPages}
          </p>

          <div className="flex gap-2">
            {requestedPage > 1 ? (
              <Link
                href={createTopicsUrl({
                  page:
                    requestedPage - 1,
                  status,
                  section:
                    selectedSectionId,
                  search,
                })}
                className="border border-[#60482e]/55 bg-[#100c09] px-4 py-3 text-[8px] uppercase tracking-[0.15em] text-[#927b5b] transition hover:border-[#876640] hover:text-[#d8b986]"
              >
                Previous
              </Link>
            ) : null}

            {requestedPage <
            totalPages ? (
              <Link
                href={createTopicsUrl({
                  page:
                    requestedPage + 1,
                  status,
                  section:
                    selectedSectionId,
                  search,
                })}
                className="border border-[#745633]/65 bg-[#21170f] px-4 py-3 text-[8px] uppercase tracking-[0.15em] text-[#c7a470] transition hover:border-[#a47a44] hover:text-[#ebca93]"
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </main>
  );
}

const inputClassName =
  "mt-2 w-full border border-[#60482e]/55 bg-[#100c09] px-4 py-3 text-sm text-[#d5c2a4] outline-none transition placeholder:text-[#5f5447] focus:border-[#a47a44] focus:ring-1 focus:ring-[#a47a44]/40";

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

function TopicBadge({
  variant,
  children,
}: {
  variant:
    | "pinned"
    | "locked"
    | "deleted";
  children: React.ReactNode;
}) {
  const className =
    variant === "pinned"
      ? "border-amber-800/60 bg-amber-950/20 text-amber-400"
      : variant === "locked"
        ? "border-orange-900/60 bg-orange-950/20 text-orange-400"
        : "border-red-950/60 bg-red-950/20 text-red-400";

  return (
    <span
      className={`border px-2 py-1 text-[7px] uppercase tracking-[0.14em] ${className}`}
    >
      {children}
    </span>
  );
}

