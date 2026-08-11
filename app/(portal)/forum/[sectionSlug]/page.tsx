import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ForumTopicFavouriteButton } from "@/components/forum/forum-topic-favourite-button";
import { createClient } from "@/lib/supabase/server";

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
  author_character: {
    id: string;
    display_name: string | null;
    first_name: string;
    surname: string | null;
    portrait_url: string | null;
  } | null;
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
): string {
  if (!character) {
    return "Unknown author";
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

  const childSections = (
    (childSectionData ??
      []) as unknown as ForumSection[]
  ).map((childSection) => ({
    ...childSection,
    association: getSingleRelation(
      childSection.association,
    ),
  }));

  const topics = (
    (topicData ??
      []) as unknown as ForumTopicQueryRow[]
  ).map(
    (topic): ForumTopic => ({
      ...topic,
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
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-[0.17em] text-[#756751]">
          <Link
            href="/forum"
            className="transition hover:text-[#d5bd96]"
          >
            Forum
          </Link>

          <span>/</span>

          <span className="text-[#a38b67]">
            {section.name}
          </span>
        </nav>

        <header className="relative overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
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

              <div className="absolute inset-0 bg-gradient-to-r from-[#15100d] via-[#15100d]/90 to-[#15100d]/60" />

              <div className="absolute inset-0 bg-gradient-to-t from-[#15100d] via-transparent to-black/30" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(131,91,50,0.18),transparent_45%)]" />
          )}

          <div className="relative flex flex-col gap-6 px-6 py-2 sm:px-9 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-5">
              <div
                className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border bg-[#0c0907]"
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
                <p className="text-[9px] uppercase tracking-[0.27em] text-[#8c704b]">
                  {section.section_type ===
                  "ongame"
                    ? "Ongame Forum"
                    : section.section_type ===
                        "offgame"
                      ? "Offgame Forum"
                      : "Organisation Forum"}
                </p>

                <h1 className="mt-1 font-serif text-4xl text-[#ead5ac] sm:text-3xl">
                  {section.name}
                </h1>

                {section.association ? (
                  <p className="mt-2 text-[9px] uppercase tracking-[0.2em] text-[#9e815b]">
                    {
                      section.association
                        .name
                    }
                  </p>
                ) : null}

                <p className="mt-2 max-w-3xl text-sm leading-7 text-[#aa9b88]">
                  {section.description ||
                    "No description has been provided for this section."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
  {user && unreadTopics > 0 ? (
    <form action={markSectionAsRead}>
      <button
        type="submit"
        className="border border-[#80613b] bg-[#2c1e14] px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-[#d8bd91] transition hover:border-[#a67c45] hover:bg-[#3a2819]"
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
    className="border border-[#987344] bg-[#3b2919] px-5 py-3 text-center text-[9px] uppercase tracking-[0.2em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f]"
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
            <span className="border border-[#60482e]/45 bg-[#15100d] px-4 py-3 text-[9px] uppercase tracking-[0.17em] text-[#a99069]">
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
              <p className="text-[8px] uppercase tracking-[0.24em] text-[#806a4d]">
                Further halls
              </p>

              <h2 className="mt-2 font-serif text-2xl text-[#dec69d]">
                Subsections
              </h2>
            </div>

            <div className="overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
              <div className="divide-y divide-[#60482e]/30">
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
              <p className="text-[8px] uppercase tracking-[0.24em] text-[#806a4d]">
                Current conversations
              </p>

              
            </div>

            <Link
              href={`/forum/${section.slug}/new`}
              className="text-[9px] uppercase tracking-[0.18em] text-[#aa8b60] transition hover:text-[#efd6a8]"
            >
              Create new discussion →
            </Link>
          </div>

          <div className="overflow-hidden border border-[#60482e]/45 bg-[#15100d]">
            {topics.length > 0 ? (
              <>
                {pinnedTopics.length >
                0 ? (
                  <div>
                    <div className="border-b border-[#60482e]/35 bg-[#1c140e] px-5 py-3">
                      <p className="text-[8px] uppercase tracking-[0.22em] text-[#a78350]">
                        Pinned discussions
                      </p>
                    </div>

                    <div className="divide-y divide-[#60482e]/30">
                      {pinnedTopics.map(
                        (topic) => (
                          <TopicRow
                            key={
                              topic.id
                            }
                            topic={
                              topic
                            }
                            sectionSlug={
                              section.slug
                            }
                            isUnread={
                              isTopicUnread(
                                topic,
                              )
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
                      <div className="border-y border-[#60482e]/35 bg-[#120d0a] px-5 py-3">
                        <p className="text-[8px] uppercase tracking-[0.22em] text-[#77654c]">
                          Other discussions
                        </p>
                      </div>
                    ) : null}

                    <div className="divide-y divide-[#60482e]/30">
                      {regularTopics.map(
                        (topic) => (
                          <TopicRow
                            key={
                              topic.id
                            }
                            topic={
                              topic
                            }
                            sectionSlug={
                              section.slug
                            }
                            isUnread={
                              isTopicUnread(
                                topic,
                              )
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
                <p className="font-serif text-xl text-[#b5a28a]">
                  No discussions have
                  been opened yet.
                </p>

                <p className="mt-2 text-sm text-[#796e60]">
                  Be the first to begin a
                  conversation in this
                  section.
                </p>

                <Link
                  href={`/forum/${section.slug}/new`}
                  className="mt-6 inline-block border border-[#987344] bg-[#3b2919] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[#efd6a8] transition hover:border-[#b98c50] hover:bg-[#50371f]"
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
      className="group relative flex items-center gap-4 px-5 py-5 transition hover:bg-[#1b140f]"
    >
      <div
        className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border bg-[#0c0907]"
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
          <h3 className="font-serif text-xl text-[#d5bf99] transition group-hover:text-[#efd6a8]">
            {section.name}
          </h3>

          {section.visibility !==
          "public" ? (
            <span className="border border-[#60482e]/50 px-2 py-1 text-[7px] uppercase tracking-[0.15em] text-[#8f795a]">
              {section.visibility}
            </span>
          ) : null}
        </div>

        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#948777]">
          {section.description ||
            "No description has been provided."}
        </p>
      </div>

      <span className="ml-auto shrink-0 text-[#755f42] transition group-hover:translate-x-1 group-hover:text-[#c7a675]">
        →
      </span>
    </Link>
  );
}

function TopicRow({
  topic,
  sectionSlug,
  isUnread,
}: {
  topic: ForumTopic;
  sectionSlug: string;
  isUnread: boolean;
}) {
  const characterName =
    getCharacterName(
      topic.author_character,
    );

  return (
    <article
      className={`group relative grid gap-4 border transition md:grid-cols-[minmax(0,1fr)_110px_190px] md:items-center ${
        isUnread
          ? "border-[#a87532] bg-[#1b130d] px-5 py-5 shadow-[inset_0_0_0_1px_rgba(168,117,50,0.14),0_0_16px_rgba(168,117,50,0.07)] hover:bg-[#21170f]"
          : "border-transparent px-5 py-5 hover:bg-[#19120e]"
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
        <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-[#60482e]/50 bg-[#0c0907]">
          {topic.author_character
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
            <div className="flex h-full items-center justify-center font-serif text-lg text-[#795d3a]">
              {characterName
                .charAt(0)
                .toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {isUnread ? (
              <span className="border border-[#b9853e]/70 bg-[#3d2914] px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.16em] text-[#f2ca82]">
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

          <h3 className="mt-2 truncate font-serif text-lg text-[#d5bf99] transition group-hover:text-[#efd6a8]">
            {topic.title}
          </h3>

          <p className="mt-1 text-[9px] text-[#796c5d]">
            Started by{" "}
            <span className="text-[#9d896b]">
              {characterName}
            </span>
            {" · "}
            {formatDate(
              topic.created_at,
            )}
          </p>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-2 md:block md:text-center">
        <div className="inline-block min-w-[50px] px-2 text-center">
          <p className="font-serif text-lg text-[#c4a980]">
            {topic.replies_count}
          </p>

          <p className="text-[7px] uppercase tracking-[0.14em] text-[#716453]">
            Replies
          </p>
        </div>

        <div className="inline-block min-w-[50px] px-2 text-center">
          <p className="font-serif text-lg text-[#c4a980]">
            {topic.views_count}
          </p>

          <p className="text-[7px] uppercase tracking-[0.14em] text-[#716453]">
            Views
          </p>
        </div>
      </div>

      <div className="border-t border-[#60482e]/25 pt-3 md:border-l md:border-t-0 md:pl-5 md:pt-0">
        <p className="text-[8px] uppercase tracking-[0.16em] text-[#74624c]">
          Last activity
        </p>

        <p className="mt-2 text-[10px] leading-5 text-[#8e806e]">
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
    <span className="border border-[#60482e]/45 bg-[#15100d] px-4 py-3 text-[9px] uppercase tracking-[0.17em] text-[#a99069]">
      <span className="mr-2 font-serif text-base text-[#d1b78e]">
        {value}
      </span>

      {label}
    </span>
  );
}