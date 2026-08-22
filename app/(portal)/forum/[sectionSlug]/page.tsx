import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ForumTopicFavouriteButton } from "@/components/forum/forum-topic-favourite-button";
import { createClient } from "@/lib/supabase/server";
import {
  canAccessOrderSection,
  canViewOrderTopic,
  getForumViewerContext,
} from "@/lib/forum/order-forum-access";

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
  order_id: string | null;
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

type ForumTopicQueryRow = {
  id: string;
  section_id: string;
  author_user_id: string | null;
  author_character_id: string | null;
  deleted_author_name: string | null;
  title: string;
  slug: string;
  is_pinned: boolean;
  is_locked: boolean;
  views_count: number;
  replies_count: number;
  last_post_at: string;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  visible_order_levels: number[] | null;
  author_character:
    | {
        id: string;
        display_name: string | null;
        first_name: string;
        surname: string | null;
        portrait_url: string | null;
      }
    | {
        id: string;
        display_name: string | null;
        first_name: string;
        surname: string | null;
        portrait_url: string | null;
      }[]
    | null;
};

type ForumTopic = {
  id: string;
  section_id: string;
  author_user_id: string | null;
  author_character_id: string | null;
  deleted_author_name: string | null;
  title: string;
  slug: string;
  is_pinned: boolean;
  is_locked: boolean;
  views_count: number;
  replies_count: number;
  last_post_at: string;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  visible_order_levels: number[] | null;
  is_anonymous: boolean;
  author_character: {
    id: string;
    display_name: string | null;
    first_name: string;
    surname: string | null;
    portrait_url: string | null;
  } | null;
};

type OpeningPostRecord = {
  topic_id: string;
  is_anonymous: boolean;
};

type ForumTopicRead = {
  topic_id: string;
  last_read_at: string;
};

type ForumSectionPageProps = {
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

function getCharacterName(
  character: ForumTopic["author_character"],
  deletedAuthorName?: string | null,
): string {
  if (!character) {
    return (
      deletedAuthorName?.trim() ||
      "Unknown author"
    );
  }

  if (character.display_name?.trim()) {
    return character.display_name.trim();
  }

  return [
    character.first_name,
    character.surname,
  ]
    .filter(Boolean)
    .join(" ");
}

function isValidHexColour(
  value: string | null,
): boolean {
  return Boolean(
    value &&
      /^#[0-9a-f]{6}$/i.test(value),
  );
}

export default async function ForumSectionPage({
  params,
}: ForumSectionPageProps) {
  const { sectionSlug } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: staffResult } = user
    ? await supabase.rpc(
        "current_user_is_staff",
      )
    : {
        data: false,
      };

  const isStaff =
    staffResult === true;

  const {
    data: sectionData,
    error: sectionError,
  } = await supabase
    .from("forum_sections")
    .select(`
      id,
      name,
      slug,
      description,
      section_type,
      association_id,
      order_id,
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
    .eq("slug", sectionSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (sectionError) {
    throw new Error(
      `Unable to load forum section: ${sectionError.message}`,
    );
  }

  if (!sectionData) {
    notFound();
  }

  const section = {
    ...(sectionData as unknown as ForumSection),
    association: getSingleRelation(
      (
        sectionData as unknown as ForumSection
      ).association,
    ),
  };

  const viewer =
    await getForumViewerContext(supabase);

  if (
    !canAccessOrderSection(
      viewer,
      section.order_id,
    )
  ) {
    notFound();
  }

  const [
    {
      data: childSectionData,
      error: childSectionError,
    },
    {
      data: topicData,
      error: topicError,
    },
    {
      data: readData,
      error: readError,
    },
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
        order_id,
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
      .eq("parent_id", section.id)
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
        author_user_id,
        author_character_id,
        deleted_author_name,
        title,
        slug,
        is_pinned,
        is_locked,
        views_count,
        replies_count,
        last_post_at,
        created_at,
        updated_at,
        edited_at,
        deleted_at,
        visible_order_levels,
        author_character:characters!forum_topics_author_character_id_fkey (
          id,
          display_name,
          first_name,
          surname,
          portrait_url
        )
      `)
      .eq("section_id", section.id)
      .is("deleted_at", null)
      .order("is_pinned", {
        ascending: false,
      })
      .order("last_post_at", {
        ascending: false,
      }),

    user
      ? supabase
          .from("forum_topic_reads")
          .select(`
            topic_id,
            last_read_at
          `)
          .eq("user_id", user.id)
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  if (childSectionError) {
    throw new Error(
      `Unable to load forum subsections: ${childSectionError.message}`,
    );
  }

  if (topicError) {
    throw new Error(
      `Unable to load forum discussions: ${topicError.message}`,
    );
  }

  if (readError) {
    throw new Error(
      `Unable to load forum read status: ${readError.message}`,
    );
  }

  const topicRows =
    (topicData ??
      []) as unknown as ForumTopicQueryRow[];

  const topicIds = topicRows.map(
    (topic) => topic.id,
  );

  const {
    data: openingPostData,
    error: openingPostError,
  } =
    topicIds.length > 0
      ? await supabase
          .from("forum_posts")
          .select(`
            topic_id,
            is_anonymous
          `)
          .in("topic_id", topicIds)
          .eq("is_initial", true)
          .is("deleted_at", null)
      : {
          data: [],
          error: null,
        };

  if (openingPostError) {
    throw new Error(
      `Unable to load discussion anonymity: ${openingPostError.message}`,
    );
  }

  const anonymousByTopic =
    new Map(
      (
        (openingPostData ??
          []) as OpeningPostRecord[]
      ).map((post) => [
        post.topic_id,
        post.is_anonymous,
      ]),
    );

  const childSections = (
    (childSectionData ??
      []) as unknown as ForumSection[]
  )
    .filter((childSection) =>
      canAccessOrderSection(
        viewer,
        childSection.order_id,
      ),
    )
    .map((childSection) => ({
      ...childSection,
      association: getSingleRelation(
        childSection.association,
      ),
    }));

  const topics = topicRows
    .filter((topic) =>
      !section.order_id ||
      canViewOrderTopic({
        viewer,
        orderId: section.order_id,
        visibleLevels:
          topic.visible_order_levels,
      }),
    )
    .map(
      (topic): ForumTopic => ({
        ...topic,
        is_anonymous:
          anonymousByTopic.get(topic.id) ??
          false,
        author_character:
          getSingleRelation(
            topic.author_character,
          ),
      }),
    );

  const reads =
    (readData ?? []) as ForumTopicRead[];

  const readMap = new Map(
    reads.map((read) => [
      read.topic_id,
      read.last_read_at,
    ]),
  );

  async function markSectionAsRead() {
    "use server";

    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { error } =
      await supabase.rpc(
        "mark_forum_section_read",
        {
          target_section_id:
            section.id,
        },
      );

    if (error) {
      throw new Error(
        error.message,
      );
    }

    revalidatePath("/forum");
    revalidatePath(
      `/forum/${section.slug}`,
      "layout",
    );
  }

  const isTopicUnread = (
    topic: ForumTopic,
  ): boolean => {
    if (!user) {
      return false;
    }

    const lastReadAt = readMap.get(
      topic.id,
    );

    if (!lastReadAt) {
      return true;
    }

    return (
      new Date(
        topic.last_post_at,
      ).getTime() >
      new Date(lastReadAt).getTime()
    );
  };

  const unreadTopics = user
    ? topics.filter((topic) =>
        isTopicUnread(topic),
      ).length
    : 0;

  const pinnedTopics = topics.filter(
    (topic) => topic.is_pinned,
  );

  const regularTopics = topics.filter(
    (topic) => !topic.is_pinned,
  );

  const totalReplies = topics.reduce(
    (total, topic) =>
      total + topic.replies_count,
    0,
  );

  const sectionColour =
    isValidHexColour(section.colour)
      ? section.colour!
      : "#8c704b";

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl">
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-756751))]">
          <Link
            href="/forum"
            className="transition hover:text-[rgb(var(--sep-colour-d5bd96))]"
          >
            Forum
          </Link>

          <span>/</span>

          <span className="text-[rgb(var(--sep-colour-a38b67))]">
            {section.name}
          </span>
        </nav>

        <header className="relative overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
          {section.banner_url ? (
            <div className="absolute inset-0">
              <Image
                src={section.banner_url}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover opacity-25"
                unoptimized
              />

              <div className="absolute inset-0 bg-gradient-to-r from-[rgb(var(--sep-colour-15100d))] via-[rgb(var(--sep-colour-15100d))]/90 to-[rgb(var(--sep-colour-15100d))]/60" />

              <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--sep-colour-15100d))] via-transparent to-black/30" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(var(--sep-rgb-131-91-50),0.18),transparent_45%)]" />
          )}

          <div className="relative flex flex-col gap-6 px-6 py-2 sm:px-9 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-5">
              <div
                className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border bg-[rgb(var(--sep-colour-0c0907))]"
                style={{
                  borderColor: `${sectionColour}99`,
                }}
              >
                {section.icon_url ? (
                  <Image
                    src={section.icon_url}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-contain p-3"
                    unoptimized
                  />
                ) : (
                  <span
                    className="font-serif text-4xl"
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
                <p className="text-[9px] uppercase tracking-[0.27em] text-[rgb(var(--sep-colour-8c704b))]">
                  {section.section_type ===
                  "ongame"
                    ? "Ongame Forum"
                    : section.section_type ===
                        "offgame"
                      ? "Offgame Forum"
                      : "Organisation Forum"}
                </p>

                <h1 className="mt-1 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))] sm:text-3xl">
                  {section.name}
                </h1>

                {section.association ? (
                  <p className="mt-2 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-9e815b))]">
                    {
                      section.association
                        .name
                    }
                  </p>
                ) : null}

                <p className="mt-2 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-aa9b88))]">
                  {section.description ||
                    "No description has been provided for this section."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {user &&
              unreadTopics > 0 ? (
                <form
                  action={
                    markSectionAsRead
                  }
                >
                  <button
                    type="submit"
                    className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-2c1e14))] px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-d8bd91))] transition hover:border-[rgb(var(--sep-colour-a67c45))] hover:bg-[rgb(var(--sep-colour-3a2819))]"
                  >
                    Mark section as read
                    <span className="ml-2 font-serif">
                      ({unreadTopics})
                    </span>
                  </button>
                </form>
              ) : null}

              <Link
                href={`/forum/${section.slug}/new`}
                className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-center text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
              >
                New discussion
              </Link>
            </div>
          </div>
        </header>

        <div className="mt-5 flex flex-wrap gap-2">
          <ForumCounter
            value={topics.length}
            label={
              topics.length === 1
                ? "Discussion"
                : "Discussions"
            }
          />

          <ForumCounter
            value={totalReplies}
            label={
              totalReplies === 1
                ? "Reply"
                : "Replies"
            }
          />

          {section.visibility !==
          "public" ? (
            <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3 text-[9px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-a99069))]">
              {section.visibility ===
              "members"
                ? "Members only"
                : "Staff only"}
            </span>
          ) : null}
        </div>

        {childSections.length > 0 ? (
          <section className="mt-7">
            <div className="mb-4">
              <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806a4d))]">
                Further halls
              </p>

              <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dec69d))]">
                Subsections
              </h2>
            </div>

            <div className="overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
              <div className="divide-y divide-[rgb(var(--sep-colour-60482e))]/30">
                {childSections.map(
                  (childSection) => (
                    <SubsectionRow
                      key={childSection.id}
                      section={
                        childSection
                      }
                    />
                  ),
                )}
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806a4d))]">
                Current conversations
              </p>
            </div>

            <Link
              href={`/forum/${section.slug}/new`}
              className="text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-aa8b60))] transition hover:text-[rgb(var(--sep-colour-efd6a8))]"
            >
              Create new discussion →
            </Link>
          </div>

          <div className="overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
            {topics.length > 0 ? (
              <>
                {pinnedTopics.length >
                0 ? (
                  <div>
                    <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-1c140e))] px-5 py-3">
                      <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-a78350))]">
                        Pinned discussions
                      </p>
                    </div>

                    <div className="divide-y divide-[rgb(var(--sep-colour-60482e))]/30">
                      {pinnedTopics.map(
                        (topic) => (
                          <TopicRow
                            key={
                              topic.id
                            }
                            topic={topic}
                            sectionSlug={
                              section.slug
                            }
                            isUnread={isTopicUnread(
                              topic,
                            )}
                            viewerUserId={
                              user?.id ??
                              null
                            }
                            isStaff={
                              isStaff
                            }
                          />
                        ),
                      )}
                    </div>
                  </div>
                ) : null}

                {regularTopics.length >
                0 ? (
                  <div>
                    {pinnedTopics.length >
                    0 ? (
                      <div className="border-y border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-120d0a))] px-5 py-3">
                        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-77654c))]">
                          Other discussions
                        </p>
                      </div>
                    ) : null}

                    <div className="divide-y divide-[rgb(var(--sep-colour-60482e))]/30">
                      {regularTopics.map(
                        (topic) => (
                          <TopicRow
                            key={
                              topic.id
                            }
                            topic={topic}
                            sectionSlug={
                              section.slug
                            }
                            isUnread={isTopicUnread(
                              topic,
                            )}
                            viewerUserId={
                              user?.id ??
                              null
                            }
                            isStaff={
                              isStaff
                            }
                          />
                        ),
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="px-6 py-14 text-center">
                <p className="font-serif text-xl text-[rgb(var(--sep-colour-b5a28a))]">
                  No discussions have
                  been opened yet.
                </p>

                <p className="mt-2 text-sm text-[rgb(var(--sep-colour-796e60))]">
                  Be the first to begin a
                  conversation in this
                  section.
                </p>

                <Link
                  href={`/forum/${section.slug}/new`}
                  className="mt-6 inline-block border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
                >
                  Create discussion
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function SubsectionRow({
  section,
}: {
  section: ForumSection;
}) {
  const colour = isValidHexColour(
    section.colour,
  )
    ? section.colour!
    : "#8c704b";

  return (
    <Link
      href={`/forum/${section.slug}`}
      className="group relative flex items-center gap-4 px-5 py-5 transition hover:bg-[rgb(var(--sep-colour-1b140f))]"
    >
      <div
        className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border bg-[rgb(var(--sep-colour-0c0907))]"
        style={{
          borderColor: `${colour}88`,
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
              color: colour,
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
          <h3 className="font-serif text-xl text-[rgb(var(--sep-colour-d5bf99))] transition group-hover:text-[rgb(var(--sep-colour-efd6a8))]">
            {section.name}
          </h3>

          {section.visibility !==
          "public" ? (
            <span className="border border-[rgb(var(--sep-colour-60482e))]/50 px-2 py-1 text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-8f795a))]">
              {section.visibility}
            </span>
          ) : null}
        </div>

        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[rgb(var(--sep-colour-948777))]">
          {section.description ||
            "No description has been provided."}
        </p>
      </div>

      <span className="ml-auto shrink-0 text-[rgb(var(--sep-colour-755f42))] transition group-hover:translate-x-1 group-hover:text-[rgb(var(--sep-colour-c7a675))]">
        →
      </span>
    </Link>
  );
}

function TopicRow({
  topic,
  sectionSlug,
  isUnread,
  viewerUserId,
  isStaff,
}: {
  topic: ForumTopic;
  sectionSlug: string;
  isUnread: boolean;
  viewerUserId: string | null;
  isStaff: boolean;
}) {
  const canRevealAnonymousIdentity =
    topic.is_anonymous &&
    (
      isStaff ||
      Boolean(
        viewerUserId &&
          topic.author_user_id ===
            viewerUserId,
      )
    );

  const hideAnonymousIdentity =
    topic.is_anonymous &&
    !canRevealAnonymousIdentity;

  const realCharacterName =
    getCharacterName(
      topic.author_character,
    );

  const characterName =
    hideAnonymousIdentity
      ? "Anonymous"
      : realCharacterName;

  return (
    <article
      className={`group relative grid gap-4 border transition md:grid-cols-[minmax(0,1fr)_110px_190px] md:items-center ${
        isUnread
          ? "border-[rgb(var(--sep-colour-a87532))] bg-[rgb(var(--sep-colour-1b130d))] px-5 py-5 shadow-[inset_0_0_0_1px_rgba(var(--sep-rgb-168-117-50),0.14),0_0_16px_rgba(var(--sep-rgb-168-117-50),0.07)] hover:bg-[rgb(var(--sep-colour-21170f))]"
          : "border-transparent px-5 py-5 hover:bg-[rgb(var(--sep-colour-19120e))]"
      } sm:px-6`}
    >
      <ForumTopicFavouriteButton
        topicId={topic.id}
        compact
        className="absolute right-3 top-3 z-20"
      />

      <Link
        href={`/forum/${sectionSlug}/${topic.slug}`}
        className="flex min-w-0 items-center gap-4"
      >
        <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0c0907))]">
          {!hideAnonymousIdentity &&
          topic.author_character
            ?.portrait_url ? (
            <Image
              src={
                topic.author_character
                  .portrait_url
              }
              alt=""
              fill
              sizes="48px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center font-serif text-lg text-[rgb(var(--sep-colour-795d3a))]">
              {hideAnonymousIdentity
                ? "?"
                : characterName
                    .charAt(0)
                    .toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {isUnread ? (
              <span className="border border-[rgb(var(--sep-colour-b9853e))]/70 bg-[rgb(var(--sep-colour-3d2914))] px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-f2ca82))]">
                New
              </span>
            ) : null}

            {topic.is_pinned ? (
              <span className="border border-amber-800/50 bg-amber-950/15 px-2 py-1 text-[7px] uppercase tracking-[0.15em] text-amber-500">
                Pinned
              </span>
            ) : null}

            {topic.is_locked ? (
              <span className="border border-stone-700/60 bg-black/15 px-2 py-1 text-[7px] uppercase tracking-[0.15em] text-stone-400">
                Closed
              </span>
            ) : null}
          </div>

          <h3 className="mt-2 truncate font-serif text-lg text-[rgb(var(--sep-colour-d5bf99))] transition group-hover:text-[rgb(var(--sep-colour-efd6a8))]">
            {topic.title}
          </h3>

          <p className="mt-1 text-[9px] text-[rgb(var(--sep-colour-796c5d))]">
            Started by{" "}
            <span
              className={
                canRevealAnonymousIdentity
                  ? "text-red-400"
                  : "text-[rgb(var(--sep-colour-9d896b))]"
              }
            >
              {characterName}
            </span>

            {canRevealAnonymousIdentity ? (
              <span className="ml-1 text-red-400">
                (Anonymous)
              </span>
            ) : null}

            {" · "}
            {formatDate(
              topic.created_at,
            )}
          </p>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-2 md:block md:text-center">
        <div className="inline-block min-w-[50px] px-2 text-center">
          <p className="font-serif text-lg text-[rgb(var(--sep-colour-c4a980))]">
            {topic.replies_count}
          </p>

          <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-716453))]">
            Replies
          </p>
        </div>

        <div className="inline-block min-w-[50px] px-2 text-center">
          <p className="font-serif text-lg text-[rgb(var(--sep-colour-c4a980))]">
            {topic.views_count}
          </p>

          <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-716453))]">
            Views
          </p>
        </div>
      </div>

      <div className="border-t border-[rgb(var(--sep-colour-60482e))]/25 pt-3 md:border-l md:border-t-0 md:pl-5 md:pt-0">
        <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-74624c))]">
          Last activity
        </p>

        <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-8e806e))]">
          {formatDate(
            topic.last_post_at,
          )}
        </p>
      </div>
    </article>
  );
}

function ForumCounter({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-4 py-3 text-[9px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-a99069))]">
      <span className="mr-2 font-serif text-base text-[rgb(var(--sep-colour-d1b78e))]">
        {value}
      </span>

      {label}
    </span>
  );
}