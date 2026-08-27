"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createForumReplyAction,
  type CreateForumReplyState,
} from "@/app/(portal)/forum/actions";
import { createClient } from "@/lib/supabase/client";

type JumpEntry = {
  key: string;
  label: string;
  elementId?: string;
  href?: string;
};

const initialReplyState: CreateForumReplyState = {
  success: false,
  message: "",
};

function ContextHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="mb-4">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        {eyebrow}
      </p>
      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d6bd91))]">
        {title}
      </h2>
    </header>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      placeholder={placeholder}
      className="w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-6f6253))] focus:border-[rgb(var(--sep-colour-8a673f))]"
    />
  );
}

function JumpList({
  entries,
  emptyLabel,
  onJump,
}: {
  entries: JumpEntry[];
  emptyLabel: string;
  onJump: (entry: JumpEntry) => void;
}) {
  if (entries.length === 0) {
    return (
      <p className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))]/60 p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
      {entries.map((entry) => (
        <button
          key={entry.key}
          type="button"
          onClick={() => onJump(entry)}
          className="flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17100c))]"
        >
          <span className="min-w-0 truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))]">
            {entry.label}
          </span>
          <span className="shrink-0 text-[rgb(var(--sep-colour-725a3d))]">
            →
          </span>
        </button>
      ))}
    </div>
  );
}

function useDomJumpEntries(
  collect: () => JumpEntry[],
  deps: unknown[],
) {
  const [entries, setEntries] =
    useState<JumpEntry[]>([]);

  useEffect(() => {
    let frame = 0;

    const refresh = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setEntries(collect());
      });
    };

    refresh();

    const observer = new MutationObserver(refresh);
    const target =
      document.querySelector("main") ??
      document.body;

    observer.observe(target, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return entries;
}

function jumpToEntry(entry: JumpEntry) {
  let target: Element | null = null;

  if (entry.elementId) {
    target = document.getElementById(
      entry.elementId,
    );
  }

  if (!target && entry.href) {
    const anchors =
      Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
          "main a[href]",
        ),
      );

    target =
      anchors.find((anchor) => {
        const href =
          anchor.getAttribute("href");
        return href === entry.href;
      }) ?? null;
  }

  if (!target) {
    return;
  }

  target.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function ForumSectionsNavigatorContext() {
  const [search, setSearch] =
    useState("");

  const entries =
    useDomJumpEntries(
      () => {
        const seen = new Set<string>();
        const result: JumpEntry[] = [];

        const anchors =
          Array.from(
            document.querySelectorAll<HTMLAnchorElement>(
              'main a[href^="/forum/"]',
            ),
          );

        for (const anchor of anchors) {
          const href =
            anchor.getAttribute("href");

          if (
            !href ||
            href.includes("#") ||
            href.includes("?")
          ) {
            continue;
          }

          const parts =
            href
              .split("/")
              .filter(Boolean);

          if (
            parts.length !== 2 ||
            parts[0] !== "forum" ||
            parts[1] === "manage" ||
            parts[1] === "moderation"
          ) {
            continue;
          }

          if (seen.has(href)) {
            continue;
          }

          const heading =
            anchor.querySelector("h2");

          const label =
            heading?.textContent?.trim() ||
            anchor.textContent
              ?.replace(/\s+/g, " ")
              .trim();

          if (!label) {
            continue;
          }

          seen.add(href);
          result.push({
            key: href,
            label,
            href,
          });
        }

        return result;
      },
      [],
    );

  const filtered =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return entries;
      }

      return entries.filter((entry) =>
        entry.label
          .toLowerCase()
          .includes(query),
      );
    }, [entries, search]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ContextHeader
        eyebrow="Forum"
        title="Sections"
      />

      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search sections..."
      />

      <p className="my-3 text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-716350))]">
        Sections · {filtered.length}
      </p>

      <JumpList
        entries={filtered}
        emptyLabel="No sections match your search."
        onJump={jumpToEntry}
      />
    </div>
  );
}

export function ForumTopicsNavigatorContext({
  sectionSlug,
}: {
  sectionSlug: string;
}) {
  const [search, setSearch] =
    useState("");

  const sectionHref =
    `/forum/${sectionSlug}/`;

  const entries =
    useDomJumpEntries(
      () => {
        const seen = new Set<string>();
        const result: JumpEntry[] = [];

        const anchors =
          Array.from(
            document.querySelectorAll<HTMLAnchorElement>(
              'main a[href^="/forum/"]',
            ),
          );

        for (const anchor of anchors) {
          const href =
            anchor.getAttribute("href");

          if (
            !href ||
            !href.startsWith(sectionHref) ||
            href.includes("#") ||
            href.includes("?")
          ) {
            continue;
          }

          const parts =
            href
              .split("/")
              .filter(Boolean);

          if (
            parts.length !== 3 ||
            parts[2] === "new"
          ) {
            continue;
          }

          if (seen.has(href)) {
            continue;
          }

          const heading =
            anchor.querySelector(
              "h2, h3",
            );

          const label =
            heading?.textContent?.trim() ||
            anchor.textContent
              ?.replace(/\s+/g, " ")
              .trim();

          if (!label) {
            continue;
          }

          seen.add(href);
          result.push({
            key: href,
            label,
            href,
          });
        }

        return result;
      },
      [sectionSlug],
    );

  const filtered =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return entries;
      }

      return entries.filter((entry) =>
        entry.label
          .toLowerCase()
          .includes(query),
      );
    }, [entries, search]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ContextHeader
        eyebrow="Forum section"
        title="Topics"
      />

      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search topics..."
      />

      <p className="my-3 text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-716350))]">
        Topics · {filtered.length}
      </p>

      <JumpList
        entries={filtered}
        emptyLabel="No topics match your search."
        onJump={jumpToEntry}
      />
    </div>
  );
}

type ReplyCharacter = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
};

function characterName(
  character: ReplyCharacter,
) {
  return (
    character.display_name?.trim() ||
    [
      character.first_name,
      character.surname,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Unnamed character"
  );
}

export function ForumTopicNavigatorContext({
  sectionSlug,
  topicSlug,
}: {
  sectionSlug: string;
  topicSlug: string;
}) {
  const [
    state,
    action,
    pending,
  ] = useActionState(
    createForumReplyAction,
    initialReplyState,
  );

  const [topicId, setTopicId] =
    useState("");
  const [topicTitle, setTopicTitle] =
    useState("Discussion");
  const [topicLocked, setTopicLocked] =
    useState(false);
  const [
    characters,
    setCharacters,
  ] = useState<ReplyCharacter[]>([]);
  const [
    selectedCharacterId,
    setSelectedCharacterId,
  ] = useState("");
  const [body, setBody] =
    useState("");
  const [
    isAnonymous,
    setIsAnonymous,
  ] = useState(false);
  const [loading, setLoading] =
    useState(true);
  const [loadError, setLoadError] =
    useState<string | null>(null);
  const [search, setSearch] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);

      const supabase =
        createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const {
        data: section,
        error: sectionError,
      } = await supabase
        .from("forum_sections")
        .select("id, name")
        .eq("slug", sectionSlug)
        .maybeSingle();

      if (
        cancelled ||
        sectionError ||
        !section
      ) {
        if (!cancelled) {
          setLoadError(
            sectionError?.message ??
              "Forum section not found.",
          );
          setLoading(false);
        }
        return;
      }

      const {
        data: topic,
        error: topicError,
      } = await supabase
        .from("forum_topics")
        .select(
          "id, title, is_locked",
        )
        .eq(
          "section_id",
          section.id,
        )
        .eq("slug", topicSlug)
        .is("deleted_at", null)
        .maybeSingle();

      if (
        cancelled ||
        topicError ||
        !topic
      ) {
        if (!cancelled) {
          setLoadError(
            topicError?.message ??
              "Discussion not found.",
          );
          setLoading(false);
        }
        return;
      }

      let options: ReplyCharacter[] =
        [];

      if (user) {
        const {
          data: characterRows,
          error: characterError,
        } = await supabase
          .from("characters")
          .select(
            "id, display_name, first_name, surname",
          )
          .eq("user_id", user.id)
          .eq("status", "approved")
          .eq("is_system", false)
          .order("first_name");

        if (characterError) {
          if (!cancelled) {
            setLoadError(
              characterError.message,
            );
            setLoading(false);
          }
          return;
        }

        options =
          (characterRows ??
            []) as ReplyCharacter[];
      }

      if (cancelled) {
        return;
      }

      setTopicId(String(topic.id));
      setTopicTitle(
        String(topic.title),
      );
      setTopicLocked(
        topic.is_locked === true,
      );
      setCharacters(options);
      setSelectedCharacterId(
        options[0]?.id ?? "",
      );
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    sectionSlug,
    topicSlug,
  ]);

  useEffect(() => {
    if (state.success) {
      setBody("");
      setIsAnonymous(false);
    }
  }, [state.success]);

  const replies =
    useDomJumpEntries(
      () => {
        const articles =
          Array.from(
            document.querySelectorAll<HTMLElement>(
              'main article[id^="post-"]',
            ),
          );

        return articles.map(
          (article, index) => {
            const postNumberText =
              Array.from(
                article.querySelectorAll(
                  "a",
                ),
              )
                .map((anchor) =>
                  anchor.textContent?.trim(),
                )
                .find((text) =>
                  text?.startsWith(
                    "Post #",
                  ),
                );

            const author =
              article
                .querySelector("h2")
                ?.textContent?.replace(
                  /\s+/g,
                  " ",
                )
                .trim();

            const label =
              `${postNumberText ?? (index === 0 ? "Opening post" : `Reply #${index + 1}`)}${
                author
                  ? ` — ${author}`
                  : ""
              }`;

            return {
              key: article.id,
              label,
              elementId: article.id,
            };
          },
        );
      },
      [sectionSlug, topicSlug],
    );

  const filteredReplies =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return replies;
      }

      return replies.filter((entry) =>
        entry.label
          .toLowerCase()
          .includes(query),
      );
    }, [replies, search]);

  function jumpToMainReply() {
    const target =
      document.getElementById(
        "forum-reply-body",
      ) ??
      document.getElementById(
        "reply",
      );

    target?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    if (
      target instanceof
      HTMLElement
    ) {
      window.setTimeout(
        () => target.focus(),
        350,
      );
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ContextHeader
        eyebrow="Forum discussion"
        title={topicTitle}
      />

      <section className="shrink-0 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] p-3">
        <p className="mb-2 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9b7b53))]">
          Quick reply
        </p>

        {loading ? (
          <p className="text-[11px] text-[rgb(var(--sep-colour-8f8271))]">
            Loading reply form...
          </p>
        ) : loadError ? (
          <p className="text-[11px] leading-5 text-[rgb(var(--sep-colour-c58d82))]">
            {loadError}
          </p>
        ) : topicLocked ? (
          <p className="text-[11px] leading-5 text-[rgb(var(--sep-colour-9f927f))]">
            This discussion is locked.
          </p>
        ) : characters.length === 0 ? (
          <p className="text-[11px] leading-5 text-[rgb(var(--sep-colour-9f927f))]">
            No approved character is available to reply.
          </p>
        ) : (
          <form
            action={action}
            className="space-y-2"
          >
            <input type="hidden" name="topicId" value={topicId} />
            <input type="hidden" name="sectionSlug" value={sectionSlug} />
            <input type="hidden" name="topicSlug" value={topicSlug} />
            <input type="hidden" name="quotedPostId" value="" />
            <input type="hidden" name="imageUrls" value="[]" />

            <select
              name="characterId"
              value={
                selectedCharacterId
              }
              onChange={(event) =>
                setSelectedCharacterId(
                  event.target.value,
                )
              }
              disabled={pending}
              className="w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-0d0907))] px-2.5 py-2 text-[11px] text-[rgb(var(--sep-colour-d4bea0))] outline-none"
            >
              {characters.map(
                (character) => (
                  <option
                    key={character.id}
                    value={character.id}
                  >
                    {characterName(
                      character,
                    )}
                  </option>
                ),
              )}
            </select>

            <textarea
              name="body"
              value={body}
              onChange={(event) =>
                setBody(
                  event.target.value,
                )
              }
              rows={4}
              maxLength={50000}
              disabled={pending}
              placeholder="Write a quick reply..."
              className="w-full resize-y border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-xs leading-5 text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-6f6253))]"
            />

            <label className="flex items-center gap-2 text-[9px] text-[rgb(var(--sep-colour-9f927f))]">
              <input
                type="checkbox"
                name="isAnonymous"
                value="true"
                checked={isAnonymous}
                onChange={(event) =>
                  setIsAnonymous(
                    event.target.checked,
                  )
                }
                disabled={pending}
              />
              Anonymous
            </label>

            {state.message ? (
              <p
                className={`text-[10px] leading-4 ${
                  state.success
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {state.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={
                pending ||
                !topicId ||
                !selectedCharacterId ||
                !body.trim()
              }
              className="w-full border border-[rgb(var(--sep-colour-8d6a40))] bg-[rgb(var(--sep-colour-2b1d12))] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d8bd91))] transition hover:border-[rgb(var(--sep-colour-ad824d))] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending
                ? "Publishing..."
                : "Publish quick reply"}
            </button>
          </form>
        )}
      </section>

      <div className="my-3 h-px shrink-0 bg-[rgb(var(--sep-colour-59432c))]/35" />

      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search replies..."
      />

      <p className="my-3 shrink-0 text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-716350))]">
        Replies · {filteredReplies.length}
      </p>

      <JumpList
        entries={filteredReplies}
        emptyLabel="No replies match your search."
        onJump={jumpToEntry}
      />

      <button
        type="button"
        onClick={jumpToMainReply}
        className="mt-3 shrink-0 border border-[rgb(var(--sep-colour-8d6a40))] bg-[rgb(var(--sep-colour-2b1d12))] px-3 py-2.5 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d8bd91))] transition hover:border-[rgb(var(--sep-colour-ad824d))]"
      >
        Jump to main reply editor ↓
      </button>
    </div>
  );
}
