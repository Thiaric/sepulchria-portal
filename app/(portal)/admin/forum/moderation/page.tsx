import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ModerationPageProps = {
  searchParams: Promise<{
    page?: string;
  }>;
};

type ModerationLogRecord = {
  id: string;
  moderator_user_id: string;
  topic_id: string | null;
  post_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

type ProfileRecord = {
  id: string;
  display_name: string | null;
  username: string | null;
};

type TopicRecord = {
  id: string;
  section_id: string;
  title: string;
  slug: string;
};

type SectionRecord = {
  id: string;
  name: string;
  slug: string;
};

const LOGS_PER_PAGE = 30;

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function formatDate(value: string): string {
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

function formatAction(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function getProfileName(
  profile: ProfileRecord | undefined,
): string {
  if (profile?.display_name?.trim()) {
    return profile.display_name.trim();
  }

  if (profile?.username?.trim()) {
    return profile.username.trim();
  }

  return "Staff member";
}

function getStringDetail(
  details: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = details?.[key];

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
}

export default async function ForumModerationPage({
  searchParams,
}: ModerationPageProps) {
  const { page: requestedPage } =
    await searchParams;

  const currentPage =
    parsePage(requestedPage);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirect=${encodeURIComponent(
        "/admin/admin/forum/moderation",
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

  const rangeStart =
    (currentPage - 1) *
    LOGS_PER_PAGE;

  const rangeEnd =
    rangeStart +
    LOGS_PER_PAGE -
    1;

  const {
    data: logRecords,
    error: logsError,
    count,
  } = await supabase
    .from("forum_moderation_log")
    .select(
      `
        id,
        moderator_user_id,
        topic_id,
        post_id,
        action,
        details,
        created_at
      `,
      {
        count: "exact",
      },
    )
    .order("created_at", {
      ascending: false,
    })
    .range(rangeStart, rangeEnd);

  if (logsError) {
    throw new Error(
      `Unable to load the moderation log: ${logsError.message}`,
    );
  }

  const logs =
    (logRecords ??
      []) as ModerationLogRecord[];

  const moderatorIds = Array.from(
    new Set(
      logs.map(
        (log) =>
          log.moderator_user_id,
      ),
    ),
  );

  const topicIds = Array.from(
    new Set(
      logs
        .map((log) => log.topic_id)
        .filter(
          (
            topicId,
          ): topicId is string =>
            Boolean(topicId),
        ),
    ),
  );

  const {
    data: profileRecords,
  } =
    moderatorIds.length > 0
      ? await supabase
          .from("profiles")
          .select(
            `
              id,
              display_name,
              username
            `,
          )
          .in("id", moderatorIds)
      : {
          data: [],
        };

  const {
    data: topicRecords,
  } =
    topicIds.length > 0
      ? await supabase
          .from("forum_topics")
          .select(
            `
              id,
              section_id,
              title,
              slug
            `,
          )
          .in("id", topicIds)
      : {
          data: [],
        };

  const profiles =
    (profileRecords ??
      []) as ProfileRecord[];

  const topics =
    (topicRecords ??
      []) as TopicRecord[];

  const sectionIds = Array.from(
    new Set(
      topics.map(
        (topic) => topic.section_id,
      ),
    ),
  );

  const {
    data: sectionRecords,
  } =
    sectionIds.length > 0
      ? await supabase
          .from("forum_sections")
          .select(
            `
              id,
              name,
              slug
            `,
          )
          .in("id", sectionIds)
      : {
          data: [],
        };

  const sections =
    (sectionRecords ??
      []) as SectionRecord[];

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.id,
      profile,
    ]),
  );

  const topicMap = new Map(
    topics.map((topic) => [
      topic.id,
      topic,
    ]),
  );

  const sectionMap = new Map(
    sections.map((section) => [
      section.id,
      section,
    ]),
  );

  const totalLogs = count ?? 0;

  const totalPages = Math.max(
    1,
    Math.ceil(
      totalLogs / LOGS_PER_PAGE,
    ),
  );

  const previousPage =
    currentPage > 1
      ? currentPage - 1
      : null;

  const nextPage =
    currentPage < totalPages
      ? currentPage + 1
      : null;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav
        aria-label="Forum breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-746653))]"
      >
        <Link
          href="/admin"
          className="transition hover:text-[rgb(var(--sep-colour-c7a16d))]"
        >
          Administration
        </Link>

        <span aria-hidden="true">
          /
        </span>

        <span className="text-[rgb(var(--sep-colour-a48c6c))]">
          Moderation log
        </span>
      </nav>

      <header className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
        <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-1a130e))] px-5 py-6 sm:px-7">
          <p className="text-[8px] uppercase tracking-[0.22em] text-amber-500">
            Staff area
          </p>

          <h1 className="mt-3 font-serif text-3xl text-[rgb(var(--sep-colour-dec69d))] sm:text-4xl">
            Moderation Log
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgb(var(--sep-colour-817567))]">
            A chronological record of
            staff actions performed
            across forum topics and
            posts.
          </p>
        </div>

        <dl className="grid grid-cols-2 divide-x divide-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-100c09))]">
          <Statistic
            label="Recorded actions"
            value={totalLogs}
          />

          <Statistic
            label="Page"
            value={`${currentPage} / ${totalPages}`}
          />
        </dl>
      </header>

      <section className="mt-6">
        {logs.length === 0 ? (
          <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-5 py-12 text-center">
            <p className="font-serif text-2xl text-[rgb(var(--sep-colour-cdb590))]">
              No moderation actions
            </p>

            <p className="mt-3 text-sm text-[rgb(var(--sep-colour-817567))]">
              The moderation log is
              currently empty.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => {
              const moderator =
                profileMap.get(
                  log.moderator_user_id,
                );

              const topic = log.topic_id
                ? topicMap.get(
                    log.topic_id,
                  )
                : undefined;

              const section = topic
                ? sectionMap.get(
                    topic.section_id,
                  )
                : undefined;

              const reason =
                getStringDetail(
                  log.details,
                  "reason",
                );

              const recordedTopicTitle =
                getStringDetail(
                  log.details,
                  "topic_title",
                );

              const recordedSectionName =
                getStringDetail(
                  log.details,
                  "section_name",
                );

              const topicTitle =
                topic?.title ??
                recordedTopicTitle ??
                "Unavailable discussion";

              const sectionName =
                section?.name ??
                recordedSectionName;

              const topicUrl =
                topic && section
                  ? `/forum/${encodeURIComponent(
                      section.slug,
                    )}/${encodeURIComponent(
                      topic.slug,
                    )}${
                      log.post_id
                        ? `#post-${encodeURIComponent(
                            log.post_id,
                          )}`
                        : ""
                    }`
                  : null;

              return (
                <article
                  key={log.id}
                  className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]"
                >
                  <header className="flex flex-col gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-19120e))] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="border border-amber-900/60 bg-amber-950/15 px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-amber-400">
                        {formatAction(
                          log.action,
                        )}
                      </span>

                      <span className="text-sm text-[rgb(var(--sep-colour-baa68a))]">
                        {getProfileName(
                          moderator,
                        )}
                      </span>
                    </div>

                    <time
                      dateTime={
                        log.created_at
                      }
                      className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-6f6251))]"
                    >
                      {formatDate(
                        log.created_at,
                      )}
                    </time>
                  </header>

                  <div className="space-y-4 px-5 py-5 sm:px-6">
                    <div>
                      <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-665947))]">
                        Discussion
                      </p>

                      {topicUrl ? (
                        <Link
                          href={topicUrl}
                          className="mt-2 inline-block font-serif text-xl text-[rgb(var(--sep-colour-d4bb94))] transition hover:text-[rgb(var(--sep-colour-f0d4a8))]"
                        >
                          {topicTitle}
                        </Link>
                      ) : (
                        <p className="mt-2 font-serif text-xl text-[rgb(var(--sep-colour-968572))]">
                          {topicTitle}
                        </p>
                      )}

                      {sectionName ? (
                        <p className="mt-2 text-xs text-[rgb(var(--sep-colour-786b5a))]">
                          {sectionName}
                        </p>
                      ) : null}
                    </div>

                    {reason ? (
                      <div className="border-l-2 border-[rgb(var(--sep-colour-755535))] bg-[rgb(var(--sep-colour-100c09))] px-4 py-3">
                        <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                          Moderation note
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--sep-colour-aa9a83))]">
                          {reason}
                        </p>
                      </div>
                    ) : null}

                    {log.post_id ? (
                      <p className="text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-625747))]">
                        Action applied to
                        an individual post
                      </p>
                    ) : (
                      <p className="text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-625747))]">
                        Action applied to
                        the entire topic
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {totalPages > 1 ? (
        <nav
          aria-label="Moderation log pagination"
          className="mt-7 flex items-center justify-between gap-4 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))] px-4 py-4"
        >
          {previousPage ? (
            <Link
              href={`/admin/admin/forum/moderation?page=${previousPage}`}
              className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-19120e))] px-4 py-3 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-a58b68))] transition hover:border-[rgb(var(--sep-colour-947047))] hover:text-[rgb(var(--sep-colour-dec095))]"
            >
              Previous
            </Link>
          ) : (
            <span className="border border-[rgb(var(--sep-colour-403426))]/40 px-4 py-3 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-4f463b))]">
              Previous
            </span>
          )}

          <span className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-756653))]">
            Page {currentPage} of{" "}
            {totalPages}
          </span>

          {nextPage ? (
            <Link
              href={`/admin/admin/forum/moderation?page=${nextPage}`}
              className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-19120e))] px-4 py-3 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-a58b68))] transition hover:border-[rgb(var(--sep-colour-947047))] hover:text-[rgb(var(--sep-colour-dec095))]"
            >
              Next
            </Link>
          ) : (
            <span className="border border-[rgb(var(--sep-colour-403426))]/40 px-4 py-3 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-4f463b))]">
              Next
            </span>
          )}
        </nav>
      ) : null}
    </main>
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
      <dt className="text-[7px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-665946))]">
        {label}
      </dt>

      <dd className="mt-2 font-serif text-lg text-[rgb(var(--sep-colour-bda17b))]">
        {value}
      </dd>
    </div>
  );
}

