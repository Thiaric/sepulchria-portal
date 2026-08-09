"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type ForumSidebarMenuProps = {
  unreadCount: number;
};

type TopicRelation = {
  id: string;
  title: string;
  slug: string;
  updated_at: string;
  deleted_at: string | null;
  section:
    | {
        name: string;
        slug: string;
      }
    | {
        name: string;
        slug: string;
      }[]
    | null;
};

type RecentTopic = {
  id: string;
  title: string;
  slug: string;
  sectionName: string;
  sectionSlug: string;
  updatedAt: string;
};

type FavouriteRow = {
  topic_id: string;
  created_at: string;
  topic:
    | TopicRelation
    | TopicRelation[]
    | null;
};

function one<T>(
  value: T | T[] | null,
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

export function ForumSidebarMenu({
  unreadCount,
}: ForumSidebarMenuProps) {
  const pathname = usePathname();

  const forumActive =
    pathname === "/forum" ||
    pathname.startsWith("/forum/");

  const [open, setOpen] =
    useState(forumActive);
  const [recentOpen, setRecentOpen] =
    useState(forumActive);
  const [
    favouritesOpen,
    setFavouritesOpen,
  ] = useState(forumActive);

  const [recent, setRecent] =
    useState<RecentTopic[]>([]);
  const [favourites, setFavourites] =
    useState<RecentTopic[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);
  const [savingId, setSavingId] =
    useState<string | null>(null);

  useEffect(() => {
    if (forumActive) {
      setOpen(true);
    }
  }, [forumActive]);

  const currentTopicPath =
    useMemo(() => {
      const match = pathname.match(
        /^\/forum\/([^/]+)\/([^/]+)$/,
      );

      if (!match) {
        return null;
      }

      return {
        sectionSlug:
          decodeURIComponent(match[1]),
        topicSlug:
          decodeURIComponent(match[2]),
      };
    }, [pathname]);

  const loadTopics =
    useCallback(async () => {
      const supabase = createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      const recentResult =
        await supabase
          .from("forum_topics")
          .select(`
            id,
            title,
            slug,
            updated_at,
            deleted_at,
            section:forum_sections!forum_topics_section_id_fkey(
              name,
              slug
            )
          `)
          .is("deleted_at", null)
          .order("updated_at", {
            ascending: false,
          })
          .limit(5);

      if (recentResult.error) {
        setError(
          recentResult.error.message,
        );
        setLoading(false);
        return;
      }

      const recentTopics = (
        (recentResult.data ??
          []) as unknown as TopicRelation[]
      )
        .map((topic) => {
          const section = one(
            topic.section,
          );

          if (!section) {
            return null;
          }

          return {
            id: topic.id,
            title: topic.title,
            slug: topic.slug,
            sectionName:
              section.name,
            sectionSlug:
              section.slug,
            updatedAt:
              topic.updated_at,
          };
        })
        .filter(
          (
            topic,
          ): topic is RecentTopic =>
            Boolean(topic),
        );

      setRecent(recentTopics);

      if (!user) {
        setFavourites([]);
        setError(null);
        setLoading(false);
        return;
      }

      const favouriteResult =
        await supabase
          .from(
            "forum_topic_favourites",
          )
          .select(`
            topic_id,
            created_at,
            topic:forum_topics!inner(
              id,
              title,
              slug,
              updated_at,
              deleted_at,
              section:forum_sections!forum_topics_section_id_fkey(
                name,
                slug
              )
            )
          `)
          .eq("user_id", user.id)
          .is(
            "topic.deleted_at",
            null,
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(10);

      if (favouriteResult.error) {
        setError(
          favouriteResult.error
            .message,
        );
        setLoading(false);
        return;
      }

      const favouriteTopics = (
        (favouriteResult.data ??
          []) as unknown as FavouriteRow[]
      )
        .map((row) => {
          const topic = one(
            row.topic,
          );

          if (!topic) {
            return null;
          }

          const section = one(
            topic.section,
          );

          if (!section) {
            return null;
          }

          return {
            id: topic.id,
            title: topic.title,
            slug: topic.slug,
            sectionName:
              section.name,
            sectionSlug:
              section.slug,
            updatedAt:
              topic.updated_at,
          };
        })
        .filter(
          (
            topic,
          ): topic is RecentTopic =>
            Boolean(topic),
        );

      setFavourites(
        favouriteTopics,
      );
      setError(null);
      setLoading(false);
    }, []);

  useEffect(() => {
    setLoading(true);
    void loadTopics();

    const supabase =
      createClient();

    const channel = supabase
      .channel(
        "left-forum-topic-menu",
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "forum_topics",
        },
        () => {
          void loadTopics();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "forum_topic_favourites",
        },
        () => {
          void loadTopics();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [loadTopics]);

  const favouriteIds = new Set(
    favourites.map(
      (topic) => topic.id,
    ),
  );

  async function toggleFavourite(
    topic: RecentTopic,
  ) {
    if (savingId) {
      return;
    }

    setSavingId(topic.id);
    setError(null);

    try {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "You must be signed in.",
        );
      }

      if (
        favouriteIds.has(topic.id)
      ) {
        const { error } =
          await supabase
            .from(
              "forum_topic_favourites",
            )
            .delete()
            .eq(
              "user_id",
              user.id,
            )
            .eq(
              "topic_id",
              topic.id,
            );

        if (error) {
          throw error;
        }
      } else {
        const { error } =
          await supabase
            .from(
              "forum_topic_favourites",
            )
            .insert({
              user_id: user.id,
              topic_id: topic.id,
            });

        if (error) {
          throw error;
        }
      }

      await loadTopics();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update favourite.",
      );
    } finally {
      setSavingId(null);
    }
  }

  const currentRecent =
    currentTopicPath
      ? recent.find(
          (topic) =>
            topic.slug ===
              currentTopicPath.topicSlug &&
            topic.sectionSlug ===
              currentTopicPath.sectionSlug,
        ) ?? null
      : null;

  return (
    <div className="min-w-0">
      <div
        className={`flex min-h-9 items-center border text-[11px] transition lg:text-xs ${
          forumActive
            ? "border-[#8d6d3e] bg-[#332719] text-[#efd9aa]"
            : unreadCount > 0
              ? "border-[#a87532] bg-[#24190f] text-[#efd9aa]"
              : "border-transparent text-[#b6a894] hover:border-[#5d4930] hover:bg-[#1d1712] hover:text-[#e8d8ba]"
        }`}
      >
        <Link
          href="/forum"
          className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2"
        >
          <span className="w-4 shrink-0 text-center text-[12px] text-[#b68b4f]">
            ☷
          </span>

          <span className="truncate">
            Forum
          </span>

          {unreadCount > 0 ? (
            <span
              title={`${unreadCount} unread forum topic${unreadCount === 1 ? "" : "s"}`}
              className="ml-auto inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full border border-[#d19a4c] bg-[#7a291f] px-1 text-[7px] font-bold leading-none text-[#ffe1ac]"
            >
              {unreadCount > 9
                ? "9+"
                : unreadCount}
            </span>
          ) : null}
        </Link>

        <button
          type="button"
          onClick={() =>
            setOpen((value) => !value)
          }
          aria-expanded={open}
          aria-label={
            open
              ? "Collapse Forum shortcuts"
              : "Expand Forum shortcuts"
          }
          className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center border-l border-[#6e5535]/30 text-sm text-[#b68b4f] transition hover:bg-[#4a3420]/45 hover:text-[#efd9aa]"
        >
          {open ? "−" : "+"}
        </button>
      </div>

      {open ? (
        <div className="ml-4 border-l border-[#5d4930]/40 pl-2 pt-1.5">
          {currentRecent ? (
            <div className="mb-1.5 flex items-center gap-1 border border-[#6a5033]/35 bg-[#18110d] px-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-[9px] text-[#9f8c71]">
                Current:{" "}
                {currentRecent.title}
              </span>

              <button
                type="button"
                onClick={() =>
                  void toggleFavourite(
                    currentRecent,
                  )
                }
                disabled={
                  savingId ===
                  currentRecent.id
                }
                title={
                  favouriteIds.has(
                    currentRecent.id,
                  )
                    ? "Remove from favourites"
                    : "Add to favourites"
                }
                className="shrink-0 text-sm text-[#d4a65d] hover:text-[#ffe0a1] disabled:opacity-40"
              >
                {favouriteIds.has(
                  currentRecent.id,
                )
                  ? "★"
                  : "☆"}
              </button>
            </div>
          ) : null}

          <ForumTopicGroup
            label="Recent Topics"
            count={recent.length}
            open={recentOpen}
            onToggle={() =>
              setRecentOpen(
                (value) => !value,
              )
            }
          >
            {loading ? (
              <LoadingRows count={3} />
            ) : (
              recent.map((topic) => (
                <TopicShortcut
                  key={topic.id}
                  topic={topic}
                  favourite={favouriteIds.has(
                    topic.id,
                  )}
                  saving={
                    savingId === topic.id
                  }
                  onToggleFavourite={() =>
                    void toggleFavourite(
                      topic,
                    )
                  }
                />
              ))
            )}
          </ForumTopicGroup>

          <ForumTopicGroup
            label="Favourite Topics"
            count={favourites.length}
            open={favouritesOpen}
            onToggle={() =>
              setFavouritesOpen(
                (value) => !value,
              )
            }
          >
            {loading ? (
              <LoadingRows count={2} />
            ) : favourites.length ? (
              favourites.map(
                (topic) => (
                  <TopicShortcut
                    key={topic.id}
                    topic={topic}
                    favourite
                    saving={
                      savingId ===
                      topic.id
                    }
                    onToggleFavourite={() =>
                      void toggleFavourite(
                        topic,
                      )
                    }
                  />
                ),
              )
            ) : (
              <p className="px-2 py-2 text-[9px] leading-4 text-[#6f6456]">
                No favourite topics.
                Use ☆ beside a recent
                topic to save it.
              </p>
            )}
          </ForumTopicGroup>

          {error ? (
            <p className="mt-1.5 border border-[#743d35]/60 bg-[#2a1512] px-2 py-1.5 text-[8px] leading-4 text-[#d8a49a]">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ForumTopicGroup({
  label,
  count,
  open,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[9px] uppercase tracking-[0.12em] text-[#8f795c] transition hover:bg-[#1b140f] hover:text-[#c8a36d]"
      >
        <span className="w-2 text-center text-[#aa824b]">
          {open ? "−" : "+"}
        </span>

        <span className="min-w-0 flex-1 truncate">
          {label}
        </span>

        <span className="text-[8px] text-[#665a4b]">
          {count}
        </span>
      </button>

      {open ? (
        <div className="space-y-0.5 pb-1">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function TopicShortcut({
  topic,
  favourite,
  saving,
  onToggleFavourite,
}: {
  topic: RecentTopic;
  favourite: boolean;
  saving: boolean;
  onToggleFavourite: () => void;
}) {
  return (
    <div className="group flex items-center gap-1 px-1">
      <Link
        href={`/forum/${encodeURIComponent(
          topic.sectionSlug,
        )}/${encodeURIComponent(
          topic.slug,
        )}`}
        title={`${topic.title} — ${topic.sectionName}`}
        className="min-w-0 flex-1 truncate border-l border-transparent px-2 py-1.5 text-[9px] text-[#958875] transition hover:border-[#8e683d] hover:bg-[#1b140f] hover:text-[#dbc39c]"
      >
        {topic.title}
      </Link>

      <button
        type="button"
        onClick={onToggleFavourite}
        disabled={saving}
        aria-label={
          favourite
            ? `Remove ${topic.title} from favourites`
            : `Add ${topic.title} to favourites`
        }
        title={
          favourite
            ? "Remove from favourites"
            : "Add to favourites"
        }
        className="flex h-6 w-6 shrink-0 items-center justify-center text-sm text-[#b4874c] opacity-75 transition hover:text-[#f0c982] hover:opacity-100 disabled:opacity-30"
      >
        {favourite ? "★" : "☆"}
      </button>
    </div>
  );
}

function LoadingRows({
  count,
}: {
  count: number;
}) {
  return (
    <>
      {Array.from({
        length: count,
      }).map((_, index) => (
        <div
          key={index}
          className="mx-2 h-6 animate-pulse bg-[#1b140f]"
        />
      ))}
    </>
  );
}
