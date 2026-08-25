import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import {
  canReadForumSection,
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
  staff_read_roles: string[] | null;
  staff_write_roles: string[] | null;
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
  visible_order_levels: number[] | null;
  deleted_at: string | null;
};

type ForumTopicRead = {
  topic_id: string;
  last_read_at: string;
};

type SectionStatistics = {
  topics: number;
  replies: number;
  unreadTopics: number;
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
  readMap: Map<string, string>,
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

  const unreadTopics =
    sectionTopics.filter((topic) => {
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
    }).length;

  return {
    topics: sectionTopics.length,
    replies: sectionTopics.reduce(
      (total, topic) =>
        total + topic.replies_count,
      0,
    ),
    unreadTopics,
    latestTopic:
      sectionTopics[0] ?? null,
  };
}

export default async function ForumPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const viewer =
    await getForumViewerContext(supabase);

  const [
    { data: sectionData, error: sectionError },
    { data: topicData, error: topicError },
    { data: readData, error: readError },
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
        staff_read_roles,
        staff_write_roles,
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
        visible_order_levels,
        deleted_at
      `)
      .is("deleted_at", null),

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

  if (readError) {
    throw new Error(
      `Unable to load forum read status: ${readError.message}`,
    );
  }

  const allSections =
    (sectionData ?? []) as unknown as ForumSection[];

  const sectionById = new Map(
    allSections.map((section) => [
      section.id,
      section,
    ]),
  );

  const sections = allSections.filter(
    (section) =>
      canReadForumSection(
        viewer,
        section,
      ),
  );

  const topics =
    ((topicData ?? []) as ForumTopic[]).filter(
      (topic) => {
        const section =
          sectionById.get(topic.section_id);

        if (!section) {
          return false;
        }

        if (
          !canReadForumSection(
            viewer,
            section,
          )
        ) {
          return false;
        }

        if (!section.order_id) {
          return true;
        }

        return canViewOrderTopic({
          viewer,
          orderId: section.order_id,
          visibleLevels:
            topic.visible_order_levels,
        });
      },
    );

  const reads =
    (readData ?? []) as ForumTopicRead[];

  const readMap = new Map(
    reads.map((read) => [
      read.topic_id,
      read.last_read_at,
    ]),
  );

  const totalUnreadTopics = user
    ? topics.filter((topic) => {
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
      }).length
    : 0;

  async function markAllTopicsAsRead() {
    "use server";

    const actionSupabase =
      await createClient();

    const {
      data: { user: actionUser },
    } =
      await actionSupabase.auth.getUser();

    if (!actionUser) {
      return;
    }

    const { error } =
      await actionSupabase.rpc(
        "mark_all_forum_topics_read",
      );

    if (error) {
      throw new Error(
        `Unable to mark forum topics as read: ${error.message}`,
      );
    }

    revalidatePath("/forum");
    revalidatePath("/forum", "layout");
  }

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
        {user && totalUnreadTopics > 0 ? (
          <div className="flex justify-end">
            <form action={markAllTopicsAsRead}>
              <button
                type="submit"
                className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))]"
              >
                Mark all as read
                <span className="ml-2 font-serif text-sm">
                  ({totalUnreadTopics})
                </span>
              </button>
            </form>
          </div>
        ) : null}

        <div className={`space-y-6 ${
          user && totalUnreadTopics > 0
            ? "mt-6"
            : ""
        }`}>
          <ForumCategoryCard
            eyebrow="The World of Aureth"
            title="Ongame"
            sections={ongameSections}
            topics={topics}
            readMap={readMap}
            showUnread={Boolean(user)}
            emptyMessage="No Ongame sections are currently available."
          />

          <ForumCategoryCard
            eyebrow="The Community"
            title="Offgame"
            sections={offgameSections}
            topics={topics}
            readMap={readMap}
            showUnread={Boolean(user)}
            emptyMessage="No Offgame sections are currently available."
          />

          <ForumCategoryCard
            eyebrow="To Organise the game"
            title="Organisation"
            sections={organisationSections}
            topics={topics}
            readMap={readMap}
            showUnread={Boolean(user)}
            emptyMessage="No organisation forums have been created yet."
          />
        </div>
      </div>
    </main>
  );
}

function ForumCategoryCard({
  eyebrow,
  title,
  sections,
  topics,
  readMap,
  showUnread,
  emptyMessage,
}: {
  eyebrow: string;
  title: string;
  sections: ForumSection[];
  topics: ForumTopic[];
  readMap: Map<string, string>;
  showUnread: boolean;
  emptyMessage: string;
}) {
  return (
    <section className="overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-15100d))] shadow-[0_14px_35px_rgba(var(--sep-rgb-0-0-0),0.18)]">
      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-1a130e))] px-5 py-5">
        <p className="text-[8px] uppercase tracking-[0.26em] text-[rgb(var(--sep-colour-806a4d))]">
          {eyebrow}
        </p>

        <div className="mt-2 flex items-center justify-between gap-4">
          <h1 className="font-serif text-3xl text-[rgb(var(--sep-colour-dec69d))]">
            {title}
          </h1>

          <span className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-1.5 text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-9c835f))]">
            {sections.length}{" "}
            {sections.length === 1
              ? "section"
              : "sections"}
          </span>
        </div>
      </header>

      {sections.length > 0 ? (
        <div className="divide-y divide-[rgb(var(--sep-colour-60482e))]/30">
          {sections.map((section) => (
            <CompactForumSection
              key={section.id}
              section={section}
              statistics={getSectionStatistics(
                section.id,
                topics,
                readMap,
              )}
              showUnread={showUnread}
            />
          ))}
        </div>
      ) : (
        <div className="px-5 py-10 text-center">
          <p className="font-serif text-lg text-[rgb(var(--sep-colour-aa9982))]">
            {emptyMessage}
          </p>
        </div>
      )}
    </section>
  );
}

function CompactForumSection({
  section,
  statistics,
  showUnread,
}: {
  section: ForumSection;
  statistics: SectionStatistics;
  showUnread: boolean;
}) {
  const sectionColour =
    section.colour &&
    /^#[0-9a-f]{6}$/i.test(section.colour)
      ? section.colour
      : "#8c704b";

  const hasUnreadTopics =
    showUnread &&
    statistics.unreadTopics > 0;

  return (
    <Link
      href={`/forum/${section.slug}`}
      className={`group relative block overflow-hidden px-5 py-5 transition sm:px-6 ${
        hasUnreadTopics
          ? "bg-[rgb(var(--sep-colour-1d140d))] shadow-[inset_3px_0_0_#a87532]"
          : "hover:bg-[rgb(var(--sep-colour-1a130e))]"
      }`}
    >
      {section.banner_url ? (
        <div className="absolute inset-0">
          <Image
            src={section.banner_url}
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-[0.055] transition duration-500 group-hover:opacity-[0.09]"
            unoptimized
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[rgb(var(--sep-colour-15100d))] via-[rgb(var(--sep-colour-15100d))]/96 to-[rgb(var(--sep-colour-15100d))]/84" />
        </div>
      ) : null}

      <div className="relative grid gap-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border bg-[rgb(var(--sep-colour-0d0907))]"
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

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-d9c39d))] transition group-hover:text-[rgb(var(--sep-colour-f0d8aa))]">
                {section.name}
              </h2>

              {hasUnreadTopics ? (
                <span className="rounded-full bg-[rgb(var(--sep-colour-7a291f))] px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-ffe1ac))]">
                  {statistics.unreadTopics} new
                </span>
              ) : null}

              {section.visibility !== "public" ? (
                <span className="border border-[rgb(var(--sep-colour-675036))]/60 bg-black/15 px-2 py-1 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9e8767))]">
                  {section.visibility ===
                  "members"
                    ? "Members"
                    : "Staff"}
                </span>
              ) : null}
            </div>

            {section.association ? (
              <p className="mt-1 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-7e684c))]">
                {section.association.name}
              </p>
            ) : null}

            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[rgb(var(--sep-colour-918474))]">
              {section.description ||
                "No description has been provided for this section."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px border border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-60482e))]/30 md:self-stretch">
          <div className="flex flex-col items-center justify-center bg-[rgb(var(--sep-colour-100c09))]/95 px-3 py-3 text-center">
            <span className="font-serif text-lg text-[rgb(var(--sep-colour-c6aa80))]">
              {statistics.topics}
            </span>

            <span className="mt-1 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-766654))]">
              Topics
            </span>
          </div>

          <div className="flex flex-col items-center justify-center bg-[rgb(var(--sep-colour-100c09))]/95 px-3 py-3 text-center">
            <span className="font-serif text-lg text-[rgb(var(--sep-colour-c6aa80))]">
              {statistics.replies}
            </span>

            <span className="mt-1 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-766654))]">
              Replies
            </span>
          </div>

          <div className="flex items-center justify-center bg-[rgb(var(--sep-colour-100c09))]/95 px-3 py-3 text-[rgb(var(--sep-colour-775f42))] transition group-hover:text-[rgb(var(--sep-colour-c7a675))]">
            <span
              aria-hidden="true"
              className="transition group-hover:translate-x-1"
            >
              →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

