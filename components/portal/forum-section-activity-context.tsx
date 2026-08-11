"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type SectionActivityEntry = {
  id: string;
  body: string;
  created_at: string;
  author_user_id: string | null;
  is_anonymous: boolean;
  topic:
    | {
        title: string;
        slug: string;
      }
    | {
        title: string;
        slug: string;
      }[]
    | null;
  author:
    | {
        display_name: string | null;
        first_name: string;
        surname: string | null;
      }
    | {
        display_name: string | null;
        first_name: string;
        surname: string | null;
      }[]
    | null;
};

function one<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function decodeHtmlEntities(
  value: string,
): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    ndash: "–",
    mdash: "—",
    hellip: "…",
    bull: "•",
  };

  return value.replace(
    /&(#x?[0-9a-f]+|[a-z]+);/gi,
    (match, entity: string) => {
      if (
        entity.startsWith("#x") ||
        entity.startsWith("#X")
      ) {
        const codePoint =
          Number.parseInt(
            entity.slice(2),
            16,
          );

        return Number.isFinite(
          codePoint,
        )
          ? String.fromCodePoint(
              codePoint,
            )
          : match;
      }

      if (entity.startsWith("#")) {
        const codePoint =
          Number.parseInt(
            entity.slice(1),
            10,
          );

        return Number.isFinite(
          codePoint,
        )
          ? String.fromCodePoint(
              codePoint,
            )
          : match;
      }

      return (
        named[
          entity.toLowerCase()
        ] ?? match
      );
    },
  );
}

function forumPreviewText(
  value: string,
  maximumLength: number,
): string {
  const normalized =
    decodeHtmlEntities(
      value
        .replace(
          /<(?:br|\/p|\/div|\/li|\/ul|\/ol|\/blockquote|\/h[1-6])\s*\/?>/gi,
          " ",
        )
        .replace(
          /<!--[\s\S]*?-->/g,
          " ",
        )
        .replace(
          /<[^>]*>/g,
          " ",
        )
        .replace(
          /[*_>#\[\]()]/g,
          "",
        ),
    )
      .replace(/\s+/g, " ")
      .trim();

  if (
    normalized.length <=
    maximumLength
  ) {
    return normalized;
  }

  return `${normalized
    .slice(
      0,
      maximumLength - 1,
    )
    .trimEnd()}…`;
}

function formatCompactDate(
  value: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
    },
  ).format(date);
}

export function ForumSectionActivityContext({
  sectionSlug,
}: {
  sectionSlug: string;
}) {
  const [entries, setEntries] =
    useState<SectionActivityEntry[]>(
      [],
    );

  const [sectionName, setSectionName] =
    useState("Forum section");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [
    viewerUserId,
    setViewerUserId,
  ] = useState<string | null>(null);

  const [isStaff, setIsStaff] =
    useState(false);

  const scrollContainerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const loadActivity =
    useCallback(async () => {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      setViewerUserId(
        user?.id ?? null,
      );

      if (user) {
        const {
          data: staffResult,
        } = await supabase.rpc(
          "current_user_is_staff",
        );

        setIsStaff(
          staffResult === true,
        );
      } else {
        setIsStaff(false);
      }

      const {
        data: section,
        error: sectionError,
      } = await supabase
        .from("forum_sections")
        .select("id, name")
        .eq("slug", sectionSlug)
        .maybeSingle();

      if (
        sectionError ||
        !section
      ) {
        setError(
          sectionError?.message ??
            "Section not found.",
        );
        setLoading(false);
        return;
      }

      setSectionName(
        section.name,
      );

      const {
        data,
        error: postsError,
      } = await supabase
        .from("forum_posts")
        .select(`
          id,
          body,
          created_at,
          author_user_id,
          is_anonymous,
          topic:forum_topics!inner(
            title,
            slug,
            section_id,
            deleted_at
          ),
          author:characters!forum_posts_author_character_id_fkey(
            display_name,
            first_name,
            surname
          )
        `)
        .eq(
          "topic.section_id",
          section.id,
        )
        .is(
          "topic.deleted_at",
          null,
        )
        .is("deleted_at", null)
        .order("created_at", {
          ascending: false,
        })
        .limit(12);

      if (postsError) {
        setError(
          postsError.message,
        );
        setLoading(false);
        return;
      }

      const latestEntries =
        (
          (data ??
            []) as unknown as SectionActivityEntry[]
        ).slice();

      latestEntries.sort(
        (first, second) =>
          new Date(
            first.created_at,
          ).getTime() -
          new Date(
            second.created_at,
          ).getTime(),
      );

      setEntries(
        latestEntries,
      );

      setError(null);
      setLoading(false);
    }, [sectionSlug]);

  useEffect(() => {
    setLoading(true);
    void loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const container =
      scrollContainerRef.current;

    if (!container) {
      return;
    }

    const frame =
      window.requestAnimationFrame(
        () => {
          container.scrollTop =
            container.scrollHeight;
        },
      );

    return () => {
      window.cancelAnimationFrame(
        frame,
      );
    };
  }, [
    loading,
    entries.length,
  ]);

  useEffect(() => {
    const supabase =
      createClient();

    const channel = supabase
      .channel(
        `forum-section-clean-context:${sectionSlug}`,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "forum_posts",
        },
        () => {
          void loadActivity();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    loadActivity,
    sectionSlug,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-5">
        <p className="text-[9px] uppercase tracking-[0.3em] text-[#876a46]">
          Forum activity
        </p>

        <h2 className="mt-2 font-serif text-2xl text-[#d6bd91]">
          {sectionName}
        </h2>
      </header>

      <p className="mb-4 text-xs leading-6 text-[#938673]">
        The latest posts published in
        this section.
      </p>

      {error ? (
        <p className="border border-[#743d35] bg-[#2a1512] p-3 text-[11px] leading-5 text-[#d8a49a]">
          Latest activity could not be
          loaded.
        </p>
      ) : null}

      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1"
      >
        {loading ? (
          <div className="space-y-2">
            <div className="h-24 animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
            <div className="h-24 animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
            <div className="h-24 animate-pulse border border-[#59432c]/30 bg-[#19120d]" />
          </div>
        ) : (
          entries.map((entry) => {
            const topic = one(
              entry.topic,
            );

            const author = one(
              entry.author,
            );

            if (!topic) {
              return null;
            }

            const canRevealAnonymousIdentity =
              entry.is_anonymous &&
              (
                isStaff ||
                Boolean(
                  viewerUserId &&
                    entry.author_user_id ===
                      viewerUserId,
                )
              );

            const hideAnonymousIdentity =
              entry.is_anonymous &&
              !canRevealAnonymousIdentity;

            const realAuthorName =
              author?.display_name?.trim() ||
              [
                author?.first_name,
                author?.surname,
              ]
                .filter(Boolean)
                .join(" ")
                .trim() ||
              "Unknown character";

            const authorName =
              hideAnonymousIdentity
                ? "Anonymous"
                : realAuthorName;

            return (
              <Link
                key={entry.id}
                href={`/forum/${encodeURIComponent(
                  sectionSlug,
                )}/${encodeURIComponent(
                  topic.slug,
                )}#post-${entry.id}`}
                className="block border border-[#59432c]/40 bg-[#100c09] p-3 transition hover:border-[#8d6a40] hover:bg-[#1a120d]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={`truncate font-serif text-sm ${
                        canRevealAnonymousIdentity
                          ? "text-red-400"
                          : "text-[#d6bd91]"
                      }`}
                    >
                      {authorName}
                    </p>

                    {canRevealAnonymousIdentity ? (
                      <p className="mt-0.5 text-[7px] uppercase tracking-[0.13em] text-red-400">
                        Anonymous
                      </p>
                    ) : null}
                  </div>

                  <time className="shrink-0 text-[7px] uppercase tracking-[0.12em] text-[#665b4e]">
                    {formatCompactDate(
                      entry.created_at,
                    )}
                  </time>
                </div>

                <p className="mt-1 truncate text-[8px] uppercase tracking-[0.14em] text-[#8b704d]">
                  {topic.title}
                </p>

                <p className="mt-2 line-clamp-3 text-[11px] leading-5 text-[#918473]">
                  {forumPreviewText(
                    entry.body,
                    150,
                  )}
                </p>
              </Link>
            );
          })
        )}

        {!loading &&
        !error &&
        entries.length === 0 ? (
          <p className="border border-[#59432c]/30 bg-[#100c09]/60 p-3 text-[11px] leading-5 text-[#8f8271]">
            No posts have been published
            in this section yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}