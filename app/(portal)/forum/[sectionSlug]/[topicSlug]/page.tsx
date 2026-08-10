import Link from "next/link";
import { notFound } from "next/navigation";
import { ForumTopicFlagButton } from "@/components/forum/forum-topic-flag-button";
import { ForumTopicFavouriteButton } from "@/components/forum/forum-topic-favourite-button";
import TopicModerationPanel from "@/components/forum/topic-moderation-panel";
import TopicPost, {
  type ForumPostCharacter,
  type ForumPostImage,
  type ForumQuotedPost,
  type ForumTopicPost,
} from "@/components/forum/topic-post";
import TopicReplyForm from "@/components/forum/topic-reply-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TopicPageProps = {
  params: Promise<{
    sectionSlug: string;
    topicSlug: string;
  }>;

  searchParams: Promise<{
    quote?: string;
  }>;
};

type ForumSectionRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
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
  views_count: number | null;
  replies_count: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type ForumPostRecord = {
  id: string;
  topic_id: string;
  author_user_id: string | null;
  author_character_id: string | null;
  quoted_post_id: string | null;
  body: string;
  is_initial: boolean;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

type CharacterRecord = {
  id: string;
  user_id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
  portrait_url: string | null;
  title: string | null;
  pronouns: string | null;
  faction: string | null;
  status: string;
};

type AssociationRecord = {
  id: string;
  name: string;
  slug: string | null;
};

type CharacterAssociationRecord = {
  character_id: string;
  association_id: string;
};

type ForumPostImageRecord = {
  id: string;
  post_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number | null;
};

type ProfileRecord = {
  id: string;
  display_name: string | null;
  username: string | null;
};

type ReplyCharacterOption = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
  association_id: string | null;
  association_name: string | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeSortOrder(
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

function getCharacterName(
  character: CharacterRecord,
): string {
  if (character.display_name?.trim()) {
    return character.display_name.trim();
  }

  const completeName = [
    character.first_name,
    character.surname,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return completeName || "Unnamed character";
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

  return "Account";
}

export default async function TopicPage({
  params,
  searchParams,
}: TopicPageProps) {
  const {
    sectionSlug,
    topicSlug,
  } = await params;

  const {
    quote: requestedQuoteId,
  } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const {
    data: section,
    error: sectionError,
  } = await supabase
    .from("forum_sections")
    .select(
      `
        id,
        name,
        slug,
        description,
        is_active
      `,
    )
    .eq("slug", sectionSlug)
    .maybeSingle<ForumSectionRecord>();

  if (
    sectionError ||
    !section ||
    !section.is_active
  ) {
    notFound();
  }

  const {
    data: topic,
    error: topicError,
  } = await supabase
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
        views_count,
        replies_count,
        created_at,
        updated_at,
        deleted_at
      `,
    )
    .eq("section_id", section.id)
    .eq("slug", topicSlug)
    .maybeSingle<ForumTopicRecord>();

  if (
    topicError ||
    !topic ||
    topic.deleted_at
  ) {
    notFound();
  }

  const {
    data: staffResult,
  } = user
    ? await supabase.rpc(
        "current_user_is_staff",
      )
    : {
        data: false,
      };

  const isStaff =
    staffResult === true;

    if (user) {
  const { error: markReadError } =
    await supabase.rpc(
      "mark_forum_topic_read",
      {
        target_topic_id: topic.id,
      },
    );

  if (markReadError) {
    console.error(
      "Unable to mark forum topic as read:",
      markReadError.message,
    );
  }
}

  const {
    data: postRecords,
    error: postsError,
  } = await supabase
    .from("forum_posts")
    .select(
      `
        id,
        topic_id,
        author_user_id,
        author_character_id,
        quoted_post_id,
        body,
        is_initial,
        created_at,
        updated_at,
        edited_at,
        deleted_at
      `,
    )
    .eq("topic_id", topic.id)
    .order("created_at", {
      ascending: true,
    });

  if (postsError) {
    throw new Error(
      `Unable to load forum posts: ${postsError.message}`,
    );
  }

  const posts =
    (postRecords ??
      []) as ForumPostRecord[];

  if (posts.length === 0) {
    notFound();
  }

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

  const quotedPostIds = Array.from(
    new Set(
      posts
        .map(
          (post) =>
            post.quoted_post_id,
        )
        .filter(
          (
            postId,
          ): postId is string =>
            Boolean(postId),
        ),
    ),
  );

  const userIds = Array.from(
    new Set(
      posts
        .map(
          (post) =>
            post.author_user_id,
        )
        .filter(
          (
            userId,
          ): userId is string =>
            Boolean(userId),
        ),
    ),
  );

  const {
    data: characterRecords,
    error: charactersError,
  } =
    characterIds.length > 0
      ? await supabase
          .from("characters")
          .select(
            `
              id,
              user_id,
              display_name,
              first_name,
              surname,
              portrait_url,
              title,
              pronouns,
              faction,
              status
            `,
          )
          .in("id", characterIds)
      : {
          data: [],
          error: null,
        };

  if (charactersError) {
    throw new Error(
      `Unable to load post characters: ${charactersError.message}`,
    );
  }

  const characters =
    (characterRecords ??
      []) as CharacterRecord[];

  const {
    data: quotedPostRecords,
    error: quotedPostsError,
  } =
    quotedPostIds.length > 0
      ? await supabase
          .from("forum_posts")
          .select(
            `
              id,
              topic_id,
              author_user_id,
              author_character_id,
              quoted_post_id,
              body,
              is_initial,
              created_at,
              updated_at,
              edited_at,
              deleted_at
            `,
          )
          .in("id", quotedPostIds)
      : {
          data: [],
          error: null,
        };

  if (quotedPostsError) {
    throw new Error(
      `Unable to load quoted posts: ${quotedPostsError.message}`,
    );
  }

  const quotedPosts =
    (quotedPostRecords ??
      []) as ForumPostRecord[];

  const quotedCharacterIds =
    Array.from(
      new Set(
        quotedPosts
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

  const missingQuotedCharacterIds =
    quotedCharacterIds.filter(
      (characterId) =>
        !characterIds.includes(
          characterId,
        ),
    );

  let allCharacters = characters;

  if (
    missingQuotedCharacterIds.length >
    0
  ) {
    const {
      data: extraCharacterRecords,
      error: extraCharactersError,
    } = await supabase
      .from("characters")
      .select(
        `
          id,
          user_id,
          display_name,
          first_name,
          surname,
          portrait_url,
          title,
          pronouns,
          faction,
          status
        `,
      )
      .in(
        "id",
        missingQuotedCharacterIds,
      );

    if (extraCharactersError) {
      throw new Error(
        `Unable to load quoted-post characters: ${extraCharactersError.message}`,
      );
    }

    allCharacters = [
      ...characters,
      ...((extraCharacterRecords ??
        []) as CharacterRecord[]),
    ];
  }

  const quotedUserIds = quotedPosts
    .map(
      (post) =>
        post.author_user_id,
    )
    .filter(
      (
        userId,
      ): userId is string =>
        Boolean(userId),
    );

  const allUserIds = Array.from(
    new Set([
      ...userIds,
      ...quotedUserIds,
    ]),
  );

  const {
    data: profileRecords,
  } =
    allUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select(
            `
              id,
              display_name,
              username
            `,
          )
          .in("id", allUserIds)
      : {
          data: [],
        };

  const profiles =
    (profileRecords ??
      []) as ProfileRecord[];

  const postIds = posts.map(
    (post) => post.id,
  );

  const {
    data: imageRecords,
    error: imagesError,
  } =
    postIds.length > 0
      ? await supabase
          .from(
            "forum_post_images",
          )
          .select(
            `
              id,
              post_id,
              image_url,
              alt_text,
              sort_order
            `,
          )
          .in("post_id", postIds)
          .order("sort_order", {
            ascending: true,
          })
      : {
          data: [],
          error: null,
        };

  if (imagesError) {
    throw new Error(
      `Unable to load post images: ${imagesError.message}`,
    );
  }

  const images =
    (imageRecords ??
      []) as ForumPostImageRecord[];

  const {
    data:
      characterAssociationRecords,
  } =
    allCharacters.length > 0
      ? await supabase
          .from(
            "character_associations",
          )
          .select(
            `
              character_id,
              association_id
            `,
          )
          .in(
            "character_id",
            allCharacters.map(
              (character) =>
                character.id,
            ),
          )
      : {
          data: [],
        };

  const characterAssociations =
    (characterAssociationRecords ??
      []) as CharacterAssociationRecord[];

  const associationIds =
    Array.from(
      new Set(
        characterAssociations.map(
          (membership) =>
            membership.association_id,
        ),
      ),
    );

  const {
    data: associationRecords,
  } =
    associationIds.length > 0
      ? await supabase
          .from("associations")
          .select(
            `
              id,
              name,
              slug
            `,
          )
          .in("id", associationIds)
      : {
          data: [],
        };

  const associations =
    (associationRecords ??
      []) as AssociationRecord[];

  const characterMap = new Map(
    allCharacters.map(
      (character) => [
        character.id,
        character,
      ],
    ),
  );

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.id,
      profile,
    ]),
  );

  const associationMap = new Map(
    associations.map(
      (association) => [
        association.id,
        association,
      ],
    ),
  );

  const characterAssociationNameMap =
    new Map<string, string>();

  for (
    const membership
    of characterAssociations
  ) {
    if (
      characterAssociationNameMap.has(
        membership.character_id,
      )
    ) {
      continue;
    }

    const association =
      associationMap.get(
        membership.association_id,
      );

    if (association) {
      characterAssociationNameMap.set(
        membership.character_id,
        association.name,
      );
    }
  }

  function mapCharacter(
    characterId: string | null,
  ): ForumPostCharacter | null {
    if (!characterId) {
      return null;
    }

    const character =
      characterMap.get(characterId);

    if (!character) {
      return null;
    }

    return {
      id: character.id,
      display_name:
        character.display_name,
      first_name:
        character.first_name,
      surname: character.surname,
      portrait_url:
        character.portrait_url,
      title: character.title,
      pronouns:
        character.pronouns,
      association_name:
        characterAssociationNameMap.get(
          character.id,
        ) ?? null,
      race_name:
        character.faction,
    };
  }

  function getPostAuthorName(
    post: ForumPostRecord,
  ): string {
    if (
      post.author_character_id
    ) {
      const character =
        characterMap.get(
          post.author_character_id,
        );

      if (character) {
        return getCharacterName(
          character,
        );
      }
    }

    if (post.author_user_id) {
      return getProfileName(
        profileMap.get(
          post.author_user_id,
        ),
      );
    }

    return "Account";
  }

  const quotedPostMap = new Map<
    string,
    ForumQuotedPost
  >(
    quotedPosts.map((post) => [
      post.id,
      {
        id: post.id,
        body: post.body,
        deleted_at:
          post.deleted_at,
        author_character:
          mapCharacter(
            post.author_character_id,
          ),
        author_name:
          getPostAuthorName(post),
      },
    ]),
  );

  const mappedPosts: ForumTopicPost[] =
    posts.map((post) => {
      const postImages: ForumPostImage[] =
        images
          .filter(
            (image) =>
              image.post_id === post.id,
          )
          .map((image) => ({
            id: image.id,
            image_url:
              image.image_url,
            alt_text:
              image.alt_text,
            sort_order:
              normalizeSortOrder(
                image.sort_order,
              ),
          }));

      return {
        id: post.id,
        topic_id:
          post.topic_id,
        author_user_id:
          post.author_user_id,
        author_character_id:
          post.author_character_id,
        body: post.body,
        is_initial:
          post.is_initial,
        created_at:
          post.created_at,
        updated_at:
          post.updated_at,
        edited_at:
          post.edited_at,
        deleted_at:
          post.deleted_at,
        author_character:
          mapCharacter(
            post.author_character_id,
          ),
        author_name:
          getPostAuthorName(post),
        images: postImages,
        quoted_post:
          post.quoted_post_id
            ? quotedPostMap.get(
                post.quoted_post_id,
              ) ?? null
            : null,
      };
    });

  let replyCharacters: ReplyCharacterOption[] =
    [];

  if (user) {
    const {
      data:
        currentUserCharacterRecords,
      error:
        currentUserCharactersError,
    } = await supabase
      .from("characters")
      .select(
        `
          id,
          user_id,
          display_name,
          first_name,
          surname,
          portrait_url,
          title,
          pronouns,
          faction,
          status
        `,
      )
      .eq("user_id", user.id)
      .eq("status", "approved")
      .order("first_name", {
        ascending: true,
      });

    if (
      currentUserCharactersError
    ) {
      throw new Error(
        `Unable to load your characters: ${currentUserCharactersError.message}`,
      );
    }

    replyCharacters = (
  (currentUserCharacterRecords ??
    []) as CharacterRecord[]
).map((character) => ({
  id: character.id,
  display_name:
    character.display_name,
  first_name:
    character.first_name,
  surname:
    character.surname,
  association_id: null,
  association_name: null,
}));
  }

  let quotePreview:
  | {
      id: string;
      author_name: string;
      body: string;
    }
  | null = null;

  if (
    requestedQuoteId &&
    isUuid(requestedQuoteId)
  ) {
    const selectedQuote =
      mappedPosts.find(
        (post) =>
          post.id ===
          requestedQuoteId,
      );

    if (
      selectedQuote &&
      !selectedQuote.deleted_at
    ) {
      quotePreview = {
  id: selectedQuote.id,
  author_name:
    selectedQuote
      .author_character
      ?.display_name ||
    selectedQuote.author_name,
  body: selectedQuote.body,
};
    }
  }

  const {
    data: availableSectionRecords,
  } = isStaff
    ? await supabase
        .from("forum_sections")
        .select(
          `
            id,
            name,
            slug
          `,
        )
        .eq("is_active", true)
        .order("name", {
          ascending: true,
        })
    : {
        data: [],
      };

  const moderationSections = (
    availableSectionRecords ?? []
  ) as Array<{
    id: string;
    name: string;
    slug: string;
  }>;

  await supabase
    .from("forum_topics")
    .update({
      views_count:
        normalizeCount(
          topic.views_count,
        ) + 1,
    })
    .eq("id", topic.id);

  const currentViews =
    normalizeCount(
      topic.views_count,
    ) + 1;

  const visibleReplyCount =
    mappedPosts.filter(
      (post) =>
        !post.is_initial &&
        !post.deleted_at,
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
          href={`/forum/${encodeURIComponent(
            section.slug,
          )}`}
          className="transition hover:text-[#c7a16d]"
        >
          {section.name}
        </Link>

        <span aria-hidden="true">
          /
        </span>

        <span className="text-[#a48c6c]">
          {topic.title}
        </span>
      </nav>

      <header className="border border-[#60482e]/45 bg-[#15100d]">
        <div className="flex flex-col gap-5 border-b border-[#60482e]/35 bg-[#1a130e] px-5 py-6 sm:px-7 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {topic.is_pinned ? (
                <span className="border border-amber-800/60 bg-amber-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.15em] text-amber-400">
                  Pinned
                </span>
              ) : null}

              {topic.is_locked ? (
                <span className="border border-red-900/60 bg-red-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.15em] text-red-400">
                  Locked
                </span>
              ) : null}
            </div>

            <h1 className="mt-3 break-words font-serif text-3xl text-[#dec69d] sm:text-4xl">
              {topic.title}
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#817567]">
              {section.name}
            </p>
          </div>
<div className="flex flex-wrap items-center justify-end gap-2">
                    <ForumTopicFavouriteButton
            topicId={topic.id}
          />

          {user ? (
  <ForumTopicFlagButton
  topicId={topic.id}
  topicTitle={topic.title}
  sectionId={section.id}
  sectionSlug={section.slug}
  topicSlug={topic.slug}
/>
) : null}


          {isStaff ? (
            <TopicModerationPanel
              topicId={topic.id}
              topicTitle={
                topic.title
              }
              currentSectionId={
                section.id
              }
              isLocked={
                topic.is_locked
              }
              isPinned={
                topic.is_pinned
              }
              sections={
                moderationSections
              }
            />
          ) : null}
        </div></div>

        <dl className="grid grid-cols-2 divide-x divide-[#60482e]/30 bg-[#100c09] sm:grid-cols-4">
          <TopicStatistic
            label="Posts"
            value={mappedPosts.length}
          />

          <TopicStatistic
            label="Replies"
            value={visibleReplyCount}
          />

          <TopicStatistic
            label="Views"
            value={currentViews}
          />

          <TopicStatistic
            label="Status"
            value={
              topic.is_locked
                ? "Locked"
                : "Open"
            }
          />
        </dl>
      </header>

      <section className="mt-6 space-y-5">
        {mappedPosts.map(
          (post, index) => {
            const ownsPost =
              Boolean(user) &&
              post.author_user_id ===
                user?.id;

            const canEdit =
              !post.deleted_at &&
              (isStaff ||
                (ownsPost &&
                  !topic.is_locked));

            const canDelete =
              !post.deleted_at &&
              (isStaff ||
                (ownsPost &&
                  !topic.is_locked));

            return (
              <TopicPost
                key={post.id}
                post={post}
                sectionSlug={
                  section.slug
                }
                topicSlug={
                  topic.slug
                }
                postNumber={
                  index + 1
                }
                canEdit={canEdit}
                canDelete={
                  canDelete
                }
                canModerate={
                  isStaff
                }
                topicLocked={
                  topic.is_locked &&
                  !isStaff
                }
              />
            );
          },
        )}
      </section>

      <section
        id="reply"
        className="mt-7 scroll-mt-24"
      >
        {topic.is_locked &&
        !isStaff ? (
          <div className="border border-red-950/60 bg-red-950/10 px-5 py-6 text-center">
            <p className="text-[8px] uppercase tracking-[0.2em] text-red-500">
              Discussion locked
            </p>

            <p className="mt-3 font-serif text-xl text-[#c9b39a]">
              New replies are not
              currently permitted.
            </p>
          </div>
        ) : !user ? (
          <div className="border border-[#60482e]/45 bg-[#15100d] px-5 py-7 text-center">
            <p className="font-serif text-xl text-[#cdb590]">
              Sign in to reply
            </p>

            <p className="mt-2 text-sm text-[#817567]">
              You must be signed in
              before joining this
              discussion.
            </p>

            <Link
              href={`/login?redirect=${encodeURIComponent(
                `/forum/${section.slug}/${topic.slug}#reply`,
              )}`}
              className="mt-5 inline-block border border-[#80613b] bg-[#2c1e14] px-5 py-3 text-[9px] uppercase tracking-[0.17em] text-[#d8bd91] transition hover:border-[#a67c45] hover:bg-[#3a2819]"
            >
              Sign in
            </Link>
          </div>
        ) : replyCharacters.length ===
          0 ? (
          <div className="border border-[#60482e]/45 bg-[#15100d] px-5 py-7 text-center">
            <p className="font-serif text-xl text-[#cdb590]">
              No approved character
            </p>

            <p className="mt-2 text-sm leading-6 text-[#817567]">
              You need at least one
              approved character before
              posting in the forum.
            </p>
          </div>
        ) : (
          <TopicReplyForm
            topicId={topic.id}
            sectionSlug={
              section.slug
            }
            topicSlug={topic.slug}
            characters={
              replyCharacters
            }
            quotedPost={
              quotePreview
            }
          />
        )}
      </section>
    </main>
  );
}

function TopicStatistic({
  label,
  value,
}: {
  label: string;
  value: string | number;
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