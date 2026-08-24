

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { richTextToPlainText } from "@/lib/rich-text";
import { createClient } from "@/lib/supabase/server";

import {
  permanentlyDeleteForumReplyAction,
} from "../topics/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 30;

type ForumRepliesManagementPageProps = {
  searchParams: Promise<{
    page?: string | string[];
    status?: string | string[];
    search?: string | string[];
    success?: string | string[];
    error?: string | string[];
  }>;
};

type ReplyStatus =
  | "deleted"
  | "all";

type ForumPostRecord = {
  id: string;
  topic_id: string;
  author_user_id: string | null;
  author_character_id: string | null;
  body: string;
  created_at: string;
  deleted_at: string | null;
};

type ForumTopicRecord = {
  id: string;
  section_id: string;
  title: string;
  slug: string;
  deleted_at: string | null;
};

type ForumSectionRecord = {
  id: string;
  name: string;
  slug: string;
};

type CharacterRecord = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
};

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

function isReplyStatus(
  value: string,
): value is ReplyStatus {
  return ["deleted", "all"].includes(
    value,
  );
}

function createRepliesUrl({
  page,
  status,
  search,
}: {
  page?: number;
  status: ReplyStatus;
  search: string;
}): string {
  const params = new URLSearchParams();

  if (page && page > 1) {
    params.set("page", String(page));
  }

  if (status !== "deleted") {
    params.set("status", status);
  }

  if (search) {
    params.set("search", search);
  }

  const query = params.toString();

  return query
    ? `/admin/forum/replies?${query}`
    : "/admin/forum/replies";
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

function createExcerpt(
  value: string,
): string {
  const normalized =
    richTextToPlainText(value)
      .replace(/\s+/g, " ")
      .trim();

  if (!normalized) {
    return "This reply no longer contains visible text.";
  }

  if (normalized.length <= 260) {
    return normalized;
  }

  return `${normalized.slice(0, 257)}…`;
}

export default async function ForumRepliesManagementPage({
  searchParams,
}: ForumRepliesManagementPageProps) {
  const resolvedSearchParams =
    await searchParams;

  const staff = await requireAdminSection("forum");
  const canPurge =
    staff.role !== "master";

  const requestedPage = parsePage(
    getSearchParamValue(
      resolvedSearchParams.page,
    ),
  );

  const requestedStatus =
    getSearchParamValue(
      resolvedSearchParams.status,
    );

  const status: ReplyStatus =
    isReplyStatus(requestedStatus)
      ? requestedStatus
      : "deleted";

  const search = getSearchParamValue(
    resolvedSearchParams.search,
  ).trim();

  const successMessage =
    getSearchParamValue(
      resolvedSearchParams.success,
    );

  const errorMessage =
    getSearchParamValue(
      resolvedSearchParams.error,
    );

  const supabase = await createClient();

  let postQuery = supabase
    .from("forum_posts")
    .select(
      `
        id,
        topic_id,
        author_user_id,
        author_character_id,
        body,
        created_at,
        deleted_at
      `,
      {
        count: "exact",
      },
    )
    .eq("is_initial", false);

  if (status === "deleted") {
    postQuery = postQuery.not(
      "deleted_at",
      "is",
      null,
    );
  }

  if (search) {
    postQuery = postQuery.ilike(
      "body",
      `%${search}%`,
    );
  }

  const rangeStart =
    (requestedPage - 1) * PAGE_SIZE;

  const rangeEnd =
    rangeStart + PAGE_SIZE - 1;

  const {
    data: postRecords,
    error: postsError,
    count: postCount,
  } = await postQuery
    .order("deleted_at", {
      ascending: false,
      nullsFirst: false,
    })
    .order("created_at", {
      ascending: false,
    })
    .range(rangeStart, rangeEnd);

  if (postsError) {
    throw new Error(
      `Unable to load forum replies: ${postsError.message}`,
    );
  }

  const posts =
    (postRecords ??
      []) as ForumPostRecord[];

  const totalPosts =
    typeof postCount === "number"
      ? postCount
      : 0;

  const totalPages = Math.max(
    1,
    Math.ceil(totalPosts / PAGE_SIZE),
  );

  if (
    requestedPage > totalPages &&
    totalPosts > 0
  ) {
    redirect(
      createRepliesUrl({
        page: totalPages,
        status,
        search,
      }),
    );
  }

  const topicIds = Array.from(
    new Set(
      posts.map((post) => post.topic_id),
    ),
  );

  const characterIds = Array.from(
    new Set(
      posts
        .map(
          (post) =>
            post.author_character_id,
        )
        .filter(
          (
            characterId,
          ): characterId is string =>
            Boolean(characterId),
        ),
    ),
  );

  const [
    topicResult,
    characterResult,
  ] = await Promise.all([
    topicIds.length > 0
      ? supabase
          .from("forum_topics")
          .select(
            `
              id,
              section_id,
              title,
              slug,
              deleted_at
            `,
          )
          .in("id", topicIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),

    characterIds.length > 0
      ? supabase
          .from("characters")
          .select(
            `
              id,
              display_name,
              first_name,
              surname
            `,
          )
          .in("id", characterIds)
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  if (topicResult.error) {
    throw new Error(
      `Unable to load reply discussions: ${topicResult.error.message}`,
    );
  }

  if (characterResult.error) {
    throw new Error(
      `Unable to load reply authors: ${characterResult.error.message}`,
    );
  }

  const topics =
    (topicResult.data ??
      []) as ForumTopicRecord[];

  const characters =
    (characterResult.data ??
      []) as CharacterRecord[];

  const sectionIds = Array.from(
    new Set(
      topics.map(
        (topic) => topic.section_id,
      ),
    ),
  );

  const {
    data: sectionRecords,
    error: sectionsError,
  } =
    sectionIds.length > 0
      ? await supabase
          .from("forum_sections")
          .select("id, name, slug")
          .in("id", sectionIds)
      : {
          data: [],
          error: null,
        };

  if (sectionsError) {
    throw new Error(
      `Unable to load reply sections: ${sectionsError.message}`,
    );
  }

  const sections =
    (sectionRecords ??
      []) as ForumSectionRecord[];

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

  const characterMap = new Map(
    characters.map((character) => [
      character.id,
      character,
    ]),
  );

  const deletedOnPage = posts.filter(
    (post) => Boolean(post.deleted_at),
  ).length;

  const returnTo = createRepliesUrl({
    page: requestedPage,
    status,
    search,
  });

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

        <span aria-hidden="true">/</span>

        <Link
          href="/admin/forum"
          className="transition hover:text-[rgb(var(--sep-colour-c7a16d))]"
        >
          Forum
        </Link>

        <span aria-hidden="true">/</span>

        <span className="text-[rgb(var(--sep-colour-a48c6c))]">
          Replies
        </span>
      </nav>

      <header className="overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
        <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-1a130e))] px-5 py-7 sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[8px] uppercase tracking-[0.22em] text-amber-500">
                Forum recycle bin
              </p>

              <h1 className="mt-3 font-serif text-3xl text-[rgb(var(--sep-colour-dec69d))] sm:text-4xl">
                Forum Replies
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgb(var(--sep-colour-817567))]">
                Review individual replies, find
                soft-deleted records and permanently
                erase only the ones that no longer need
                to be retained.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                href="/admin/forum/topics?status=deleted"
                className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-927b5b))] transition hover:border-[rgb(var(--sep-colour-876640))] hover:text-[rgb(var(--sep-colour-d8b986))]"
              >
                Deleted topics
              </Link>

              <Link
                href="/admin/forum/moderation"
                className="border border-[rgb(var(--sep-colour-745633))]/65 bg-[rgb(var(--sep-colour-21170f))] px-4 py-3 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-c7a470))] transition hover:border-[rgb(var(--sep-colour-a47a44))] hover:bg-[rgb(var(--sep-colour-2c1d12))] hover:text-[rgb(var(--sep-colour-ebca93))]"
              >
                Moderation log
              </Link>
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 divide-x divide-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-100c09))] sm:grid-cols-3">
          <Statistic
            label="Results"
            value={totalPosts}
          />

          <Statistic
            label="Deleted on page"
            value={deletedOnPage}
          />

          <Statistic
            label="Page"
            value={requestedPage}
          />
        </dl>
      </header>

      {successMessage ? (
        <div className="mt-6 border border-emerald-900/60 bg-emerald-950/20 px-5 py-4 text-sm leading-6 text-emerald-300">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 border border-red-900/70 bg-red-950/20 px-5 py-4 text-sm leading-6 text-red-300">
          {errorMessage}
        </div>
      ) : null}

      {!canPurge ? (
        <div className="mt-6 border border-amber-900/60 bg-amber-950/15 px-5 py-4 text-sm leading-6 text-amber-300">
          Masters may inspect and moderate forum
          content, but permanent deletion is restricted
          to owners, administrators and moderators.
        </div>
      ) : null}

      <section className="mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
        <form
          method="get"
          className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(240px,1fr)_180px_auto]"
        >
          <div>
            <label
              htmlFor="reply-search"
              className="block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-927b5b))]"
            >
              Search reply text
            </label>

            <input
              id="reply-search"
              name="search"
              type="search"
              defaultValue={search}
              placeholder="Search deleted replies..."
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="reply-status"
              className="block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-927b5b))]"
            >
              Status
            </label>

            <select
              id="reply-status"
              name="status"
              defaultValue={status}
              className={inputClassName}
            >
              <option value="deleted">
                Deleted replies
              </option>

              <option value="all">
                All replies
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
              href="/admin/forum/replies"
              className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-center text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-927b5b))] transition hover:border-[rgb(var(--sep-colour-876640))] hover:text-[rgb(var(--sep-colour-d8b986))]"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="mt-6 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
        {posts.length > 0 ? (
          <div className="divide-y divide-[rgb(var(--sep-colour-60482e))]/30">
            {posts.map((post) => {
              const topic = topicMap.get(
                post.topic_id,
              );

              const section = topic
                ? sectionMap.get(
                    topic.section_id,
                  )
                : undefined;

              const character =
                post.author_character_id
                  ? characterMap.get(
                      post.author_character_id,
                    )
                  : undefined;

              const authorName =
                post.author_character_id
                  ? getCharacterName(character)
                  : post.author_user_id
                    ? "Account without character"
                    : "Deleted account";

              const publicTopicUrl =
                topic && section
                  ? `/forum/${encodeURIComponent(
                      section.slug,
                    )}/${encodeURIComponent(
                      topic.slug,
                    )}`
                  : null;

              return (
                <article
                  key={post.id}
                  className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_230px]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif text-lg text-[rgb(var(--sep-colour-d7bf98))]">
                        {topic?.title ??
                          "Missing discussion"}
                      </h2>

                      {post.deleted_at ? (
                        <span className="border border-red-950/60 bg-red-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.14em] text-red-400">
                          Deleted reply
                        </span>
                      ) : (
                        <span className="border border-emerald-950/60 bg-emerald-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.14em] text-emerald-400">
                          Active reply
                        </span>
                      )}

                      {topic?.deleted_at ? (
                        <span className="border border-orange-950/60 bg-orange-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.14em] text-orange-400">
                          Topic deleted
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-6e604d))]">
                      {section?.name ??
                        "Unknown section"}
                    </p>

                    <p className="mt-4 break-words border-l border-[rgb(var(--sep-colour-6e5132))]/55 pl-4 text-sm leading-6 text-[rgb(var(--sep-colour-a99a84))]">
                      {createExcerpt(post.body)}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[rgb(var(--sep-colour-817567))]">
                      <span>
                        By {authorName}
                      </span>

                      <span>
                        Posted {formatDate(
                          post.created_at,
                        )}
                      </span>

                      {post.deleted_at ? (
                        <span>
                          Deleted {formatDate(
                            post.deleted_at,
                          )}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col items-stretch gap-2 lg:items-end">
                    {publicTopicUrl &&
                    !topic?.deleted_at ? (
                      <Link
                        href={`${publicTopicUrl}#post-${post.id}`}
                        className="border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-110d0a))] px-4 py-3 text-center text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-927b5b))] transition hover:border-[rgb(var(--sep-colour-876640))] hover:text-[rgb(var(--sep-colour-d8b986))]"
                      >
                        Open discussion
                      </Link>
                    ) : null}

                    {post.deleted_at &&
                    canPurge ? (
                      <details className="w-full border border-red-950/60 bg-red-950/10 lg:max-w-[230px]">
                        <summary className="cursor-pointer list-none px-4 py-3 text-center text-[8px] uppercase tracking-[0.15em] text-red-400 transition hover:bg-red-950/20 hover:text-red-300">
                          Permanently delete
                        </summary>

                        <form
                          action={permanentlyDeleteForumReplyAction}
                          className="border-t border-red-950/50 p-4"
                        >
                          <input
                            type="hidden"
                            name="postId"
                            value={post.id}
                          />

                          <input
                            type="hidden"
                            name="returnTo"
                            value={returnTo}
                          />

                          <p className="text-[10px] leading-5 text-red-300/80">
                            This erases the reply and
                            its attached images. Quotes
                            pointing to it will be
                            cleared. This cannot be
                            undone.
                          </p>

                          <label className="mt-3 block text-[7px] uppercase tracking-[0.14em] text-red-400">
                            Type DELETE
                          </label>

                          <input
                            name="confirmation"
                            required
                            autoComplete="off"
                            className="mt-2 w-full border border-red-900/70 bg-[rgb(var(--sep-colour-100909))] px-3 py-2 text-xs text-red-200 outline-none focus:border-red-600"
                          />

                          <button
                            type="submit"
                            className="mt-3 w-full border border-red-800 bg-red-950/30 px-3 py-2.5 text-[8px] uppercase tracking-[0.14em] text-red-300 transition hover:border-red-600 hover:bg-red-950/55"
                          >
                            Erase reply forever
                          </button>
                        </form>
                      </details>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <p className="font-serif text-xl text-[rgb(var(--sep-colour-cdb590))]">
              No replies found
            </p>

            <p className="mt-3 text-sm text-[rgb(var(--sep-colour-817567))]">
              No forum replies match the
              selected filters.
            </p>
          </div>
        )}
      </section>

      {totalPages > 1 ? (
        <nav
          aria-label="Reply pagination"
          className="mt-6 flex flex-wrap items-center justify-between gap-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-5 py-4"
        >
          <p className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-75644d))]">
            Page {requestedPage} of {totalPages}
          </p>

          <div className="flex gap-2">
            {requestedPage > 1 ? (
              <Link
                href={createRepliesUrl({
                  page: requestedPage - 1,
                  status,
                  search,
                })}
                className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-927b5b))] transition hover:border-[rgb(var(--sep-colour-876640))] hover:text-[rgb(var(--sep-colour-d8b986))]"
              >
                Previous
              </Link>
            ) : null}

            {requestedPage < totalPages ? (
              <Link
                href={createRepliesUrl({
                  page: requestedPage + 1,
                  status,
                  search,
                })}
                className="border border-[rgb(var(--sep-colour-745633))]/65 bg-[rgb(var(--sep-colour-21170f))] px-4 py-3 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-c7a470))] transition hover:border-[rgb(var(--sep-colour-a47a44))] hover:bg-[rgb(var(--sep-colour-2c1d12))] hover:text-[rgb(var(--sep-colour-ebca93))]"
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
  "mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-sm text-[rgb(var(--sep-colour-d5c2a4))] outline-none transition placeholder:text-[rgb(var(--sep-colour-5f5447))] focus:border-[rgb(var(--sep-colour-a47a44))] focus:ring-1 focus:ring-[rgb(var(--sep-colour-a47a44))]/40";

function Statistic({
  label,
  value,
}: {
  label: string;
  value: number;
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
