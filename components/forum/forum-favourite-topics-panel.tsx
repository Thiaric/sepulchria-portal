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

type FavouriteRow = {
  topic_id: string;
  created_at: string;
  topic:
    | {
        id: string;
        title: string;
        slug: string;
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
      }
    | {
        id: string;
        title: string;
        slug: string;
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
      }[]
    | null;
};

type FavouriteTopic = {
  id: string;
  title: string;
  slug: string;
  sectionName: string;
  sectionSlug: string;
  favouritedAt: string;
};

type CurrentTopic = {
  id: string;
  title: string;
  sectionSlug: string;
  topicSlug: string;
};

function one<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export function ForumFavouriteTopicsPanel() {
  const pathname = usePathname();

  const [favourites, setFavourites] =
    useState<FavouriteTopic[]>([]);
  const [currentTopic, setCurrentTopic] =
    useState<CurrentTopic | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const topicPath = useMemo(() => {
    const match = pathname.match(
      /^\/forum\/([^/]+)\/([^/]+)$/,
    );

    if (!match) {
      return null;
    }

    return {
      sectionSlug: decodeURIComponent(
        match[1],
      ),
      topicSlug: decodeURIComponent(
        match[2],
      ),
    };
  }, [pathname]);

  const load = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setFavourites([]);
      setCurrentTopic(null);
      setLoading(false);
      return;
    }

    const favouriteResult = await supabase
      .from("forum_topic_favourites")
      .select(`
        topic_id,
        created_at,
        topic:forum_topics!inner(
          id,
          title,
          slug,
          deleted_at,
          section:forum_sections!forum_topics_section_id_fkey(
            name,
            slug
          )
        )
      `)
      .eq("user_id", user.id)
      .is("topic.deleted_at", null)
      .order("created_at", {
        ascending: false,
      })
      .limit(12);

    if (favouriteResult.error) {
      setError(
        favouriteResult.error.message,
      );
      setLoading(false);
      return;
    }

    const mapped = (
      (favouriteResult.data ?? []) as unknown as FavouriteRow[]
    )
      .map((row) => {
        const topic = one(row.topic);

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
          sectionName: section.name,
          sectionSlug: section.slug,
          favouritedAt: row.created_at,
        };
      })
      .filter(
        (
          item,
        ): item is FavouriteTopic =>
          Boolean(item),
      );

    setFavourites(mapped);

    if (topicPath) {
      const currentResult = await supabase
        .from("forum_topics")
        .select(`
          id,
          title,
          slug,
          section:forum_sections!forum_topics_section_id_fkey(
            slug
          )
        `)
        .eq("slug", topicPath.topicSlug)
        .is("deleted_at", null)
        .maybeSingle();

      if (
        currentResult.error ||
        !currentResult.data
      ) {
        setCurrentTopic(null);
      } else {
        const section = one(
          currentResult.data.section as
            | { slug: string }
            | { slug: string }[]
            | null,
        );

        if (
          section?.slug ===
          topicPath.sectionSlug
        ) {
          setCurrentTopic({
            id: String(
              currentResult.data.id,
            ),
            title: String(
              currentResult.data.title,
            ),
            sectionSlug:
              topicPath.sectionSlug,
            topicSlug:
              topicPath.topicSlug,
          });
        } else {
          setCurrentTopic(null);
        }
      }
    } else {
      setCurrentTopic(null);
    }

    setError(null);
    setLoading(false);
  }, [topicPath]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const currentIsFavourite =
    currentTopic
      ? favourites.some(
          (item) =>
            item.id ===
            currentTopic.id,
        )
      : false;

  async function toggleCurrent() {
    if (
      !currentTopic ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setError(
          "You must be signed in.",
        );
        return;
      }

      if (currentIsFavourite) {
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
              currentTopic.id,
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
              topic_id:
                currentTopic.id,
            });

        if (error) {
          throw error;
        }
      }

      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update favourite.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border border-[#59432c]/40 bg-[#100c09] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[8px] uppercase tracking-[0.22em] text-[#876a46]">
            Forum
          </p>

          <h3 className="mt-1 font-serif text-base text-[#d6bd91]">
            Favourite Topics
          </h3>
        </div>

        <span className="flex h-7 min-w-7 items-center justify-center border border-[#59432c]/50 bg-[#0c0907] px-2 text-[10px] text-[#b2956f]">
          {favourites.length}
        </span>
      </div>

      {currentTopic ? (
        <button
          type="button"
          onClick={() =>
            void toggleCurrent()
          }
          disabled={saving}
          className="mt-3 flex w-full items-center justify-between gap-3 border border-[#765937]/55 bg-[#20160f] px-3 py-3 text-left transition hover:border-[#9a7445] hover:bg-[#2c1d13] disabled:opacity-60"
        >
          <span className="min-w-0">
            <span className="block text-[8px] uppercase tracking-[0.17em] text-[#8c7556]">
              Current topic
            </span>

            <span className="mt-1 block truncate font-serif text-sm text-[#d9c19a]">
              {currentTopic.title}
            </span>
          </span>

          <span
            className="shrink-0 text-lg text-[#d3a85f]"
            aria-hidden="true"
          >
            {currentIsFavourite
              ? "★"
              : "☆"}
          </span>
        </button>
      ) : null}

      {error ? (
        <p className="mt-3 border border-[#743d35] bg-[#2a1512] p-2 text-[10px] leading-4 text-[#d8a49a]">
          {error}
        </p>
      ) : null}

      <div className="mt-3 space-y-2">
        {loading ? (
          <>
            <div className="h-12 animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
            <div className="h-12 animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
            <div className="h-12 animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
          </>
        ) : favourites.length > 0 ? (
          favourites.map(
            (item) => (
              <Link
                key={item.id}
                href={`/forum/${encodeURIComponent(
                  item.sectionSlug,
                )}/${encodeURIComponent(
                  item.slug,
                )}`}
                className="block border border-[#59432c]/35 bg-[#0d0a08] px-3 py-2.5 transition hover:border-[#8d6a40] hover:bg-[#1a120d]"
              >
                <p className="truncate font-serif text-sm text-[#cfb78f]">
                  {item.title}
                </p>

                <p className="mt-1 truncate text-[8px] uppercase tracking-[0.13em] text-[#746653]">
                  {item.sectionName}
                </p>
              </Link>
            ),
          )
        ) : (
          <p className="border border-[#59432c]/30 bg-[#0d0a08] p-3 text-[10px] leading-5 text-[#817565]">
            No favourite topics yet.
            Open a topic and press ☆
            to save it here.
          </p>
        )}
      </div>
    </section>
  );
}
