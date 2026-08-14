import Link from "next/link";
import { CharacterOrderIdentity } from "@/components/characters/character-order-identity";


import { RichTextContent } from "@/components/editor/rich-text-content";
import DeletePostButton from "@/components/forum/delete-post-button";
import PostModerationPanel from "@/components/forum/post-moderation-panel";
import { richTextToPlainText } from "@/lib/rich-text";

export type ForumPostCharacter = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
  portrait_url: string | null;
  title: string | null;
  pronouns: string | null;
  association_name: string | null;
  association_icon_url: string | null;
  race_name: string | null;
  race_icon_url: string | null;
};

export type ForumPostImage = {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
};

export type ForumQuotedPost = {
  id: string;
  body: string;
  deleted_at: string | null;
  author_character: ForumPostCharacter | null;
  author_name: string;
  is_anonymous: boolean;
  anonymous_identity_visible: boolean;
};

export type ForumTopicPost = {
  id: string;
  topic_id: string;
  author_user_id: string | null;
  author_character_id: string | null;
  body: string;
  is_initial: boolean;
  is_anonymous: boolean;
  anonymous_identity_visible: boolean;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  moderation_reason: string | null;
  author_character: ForumPostCharacter | null;
  author_name: string;
  images: ForumPostImage[];
  quoted_post: ForumQuotedPost | null;
};

type TopicPostProps = {
  post: ForumTopicPost;
  sectionSlug: string;
  topicSlug: string;
  postNumber: number;
  canEdit: boolean;
  canDelete: boolean;
  canModerate: boolean;
  topicLocked: boolean;
};

function getCharacterName(
  character: ForumPostCharacter | null,
  fallbackName: string,
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

  return fallbackName || "Account";
}

function getCharacterInitials(
  character: ForumPostCharacter | null,
  fallbackName: string,
): string {
  const name = getCharacterName(
    character,
    fallbackName,
  );

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
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

function shortenText(
  value: string,
  maximumLength = 400,
): string {
  const normalized = value
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= maximumLength) {
    return normalized;
  }

  return `${normalized.slice(
    0,
    maximumLength - 3,
  )}...`;
}

function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

export default function TopicPost({
  post,
  sectionSlug,
  topicSlug,
  postNumber,
  canEdit,
  canDelete,
  canModerate,
  topicLocked,
}: TopicPostProps) {
  const authorName =
    post.is_anonymous &&
    !post.anonymous_identity_visible
      ? "Anonymous"
      : getCharacterName(
          post.author_character,
          post.author_name,
        );

  const postUrl =
    `/forum/${encodeURIComponent(
      sectionSlug,
    )}/${encodeURIComponent(topicSlug)}`;

  const editUrl =
    `${postUrl}/posts/${encodeURIComponent(
      post.id,
    )}/edit`;

  const quoteUrl =
    `${postUrl}?quote=${encodeURIComponent(
      post.id,
    )}#reply`;

  const rapidReplyUrl =
    `${postUrl}?quickReply=${encodeURIComponent(
      post.id,
    )}`;

  const isDeleted = Boolean(
    post.deleted_at,
  );

  const showFooter =
    !isDeleted ||
    canModerate;

  return (
    <article
      id={`post-${post.id}`}
      className="scroll-mt-24 overflow-hidden border border-[#60482e]/45 bg-[#15100d]"
    >
      <div className="grid lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="border-b border-[#60482e]/35 bg-[#110d0a] p-5 lg:border-b-0 lg:border-r lg:p-6">
          <div className="flex items-start gap-4 lg:block">
            <div className="shrink-0">
              <CharacterPortrait
                character={post.author_character}
                fallbackName={post.author_name}
                anonymous={
                  post.is_anonymous &&
                  !post.anonymous_identity_visible
                }
              />

              <CharacterIdentityIcons
                character={post.author_character}
              />
            </div>

            <div className="min-w-0 flex-1 lg:mt-4">
              <h2
  className={`truncate font-serif text-xl ${
    post.is_anonymous &&
    post.anonymous_identity_visible
      ? "text-red-400"
      : "text-[#ddc59e]"
  }`}
>
  {authorName}
</h2>

              {post.is_anonymous ? (
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#f87171]">
                  {post.anonymous_identity_visible
                    ? "Anonymous"
                    : "Anonymous"}
                </p>
              ) : null}

              {post.author_character?.title ? (
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#9b7954]">
                  {post.author_character.title}
                </p>
              ) : !post.is_anonymous ? (
                <p className="mt-1 text-[8px] uppercase tracking-[0.16em] text-[#776754]">
                  Character
                </p>
              ) : null}
            </div>
          </div>

        </aside>

        <div className="min-w-0">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#60482e]/30 bg-[#19120e] px-5 py-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={`#post-${post.id}`}
                className="text-[8px] uppercase tracking-[0.16em] text-[#8f7859] transition hover:text-[#d0ad7a]"
              >
                Post #{postNumber}
              </a>

              {post.is_initial ? (
                <span className="border border-[#715433]/60 bg-[#2b1d12] px-2 py-1 text-[7px] uppercase tracking-[0.14em] text-[#c49c65]">
                  Opening post
                </span>
              ) : null}

              {isDeleted ? (
                <span className="border border-red-950/60 bg-red-950/20 px-2 py-1 text-[7px] uppercase tracking-[0.14em] text-red-400">
                  Deleted
                </span>
              ) : null}

              {post.edited_at &&
              !isDeleted ? (
                <span className="text-[8px] italic text-[#6d6255]">
                  Edited{" "}
                  {formatDate(
                    post.edited_at,
                  )}
                </span>
              ) : null}
            </div>

            <time
              dateTime={post.created_at}
              className="text-[8px] uppercase tracking-[0.13em] text-[#6f6251]"
            >
              {formatDate(post.created_at)}
            </time>
          </header>

          <div className="min-h-48 px-5 py-6 sm:px-7 sm:py-7">
            {isDeleted ? (
              <DeletedPostMessage
  isInitial={post.is_initial}
  moderationReason={
    post.moderation_reason
  }
/>
            ) : (
              <>
                {post.quoted_post ? (
                  <QuotedPost
                    post={post.quoted_post}
                  />
                ) : null}

                <RichTextContent
                  body={post.body}
                  className="text-sm leading-7 text-[#cbbba3] sm:text-[15px]"
                />

                {post.images.length > 0 ? (
                  <PostImages
                    images={post.images}
                  />
                ) : null}
              </>
            )}
          </div>

          {showFooter ? (
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#60482e]/30 bg-[#120e0b] px-5 py-3 sm:px-6">
              <div className="flex flex-wrap gap-2">
                {!isDeleted &&
                !topicLocked ? (
                  <>
                    <Link
                      href={rapidReplyUrl}
                      scroll={false}
                      className="border border-[#8d6a40] bg-[#2b1d12] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[#d8bd91] transition hover:border-[#ad824d] hover:bg-[#3a2819]"
                    >
                      Rapid reply
                    </Link>

                    <Link
                      href={quoteUrl}
                      className="border border-[#60482e]/50 bg-[#19120e] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[#a58b68] transition hover:border-[#947047] hover:text-[#dec095]"
                    >
                      Quote
                    </Link>
                  </>
                ) : null}

                {!isDeleted &&
                canEdit ? (
                  <Link
                    href={editUrl}
                    className="border border-[#60482e]/50 bg-[#19120e] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[#a58b68] transition hover:border-[#947047] hover:text-[#dec095]"
                  >
                    Edit
                  </Link>
                ) : null}

                {!isDeleted &&
                canDelete ? (
                  <DeletePostButton
                    postId={post.id}
                    isInitialPost={
                      post.is_initial
                    }
                    disabled={false}
                  />
                ) : null}
              </div>

              {canModerate ? (
                <PostModerationPanel
                  postId={post.id}
                  postNumber={postNumber}
                  authorName={authorName}
                  isDeleted={isDeleted}
                  isInitialPost={
                    post.is_initial
                  }
                />
              ) : null}
            </footer>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CharacterPortrait({
  character,
  fallbackName,
  anonymous = false,
}: {
  character: ForumPostCharacter | null;
  fallbackName: string;
  anonymous?: boolean;
}) {
  const initials = anonymous
    ? "?"
    : getCharacterInitials(
        character,
        fallbackName,
      );

  if (anonymous) {
    return (
      <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-[#6b5031]/55 bg-[#1b130e] font-serif text-3xl text-[#a98a61] lg:h-44 lg:w-full lg:text-5xl">
        ?
      </div>
    );
  }

  if (
    character?.portrait_url &&
    isSafeUrl(character.portrait_url)
  ) {
    return (
      <div className="h-20 w-20 shrink-0 overflow-hidden border border-[#6b5031]/55 bg-[#0b0806] lg:h-44 lg:w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={character.portrait_url}
          alt={getCharacterName(
            character,
            fallbackName,
          )}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-[#6b5031]/55 bg-[#1b130e] font-serif text-2xl text-[#a98a61] lg:h-44 lg:w-full lg:text-4xl">
      {initials}
    </div>
  );
}

function normaliseImageUrl(
  value: string | null,
): string | null {
  if (!value?.trim()) {
    return null;
  }

  const clean = value.trim();

  if (
    clean.startsWith("/") ||
    clean.startsWith("http://") ||
    clean.startsWith("https://")
  ) {
    return clean;
  }

  return `/${clean}`;
}

function CharacterIdentityIcons({
  character,
}: {
  character: ForumPostCharacter | null;
}) {
  if (!character) {
    return null;
  }

  const raceIcon =
    normaliseImageUrl(
      character.race_icon_url,
    );

  if (!raceIcon && !character.id) {
    return null;
  }

  return (
    <div className="mt-2 flex items-center justify-center gap-2 lg:mt-3">
      {raceIcon ? (
        <div
          className="flex h-8 w-8 items-center justify-center border border-[#60482e]/45 bg-[#0b0806] p-1"
          title={
            character.race_name ??
            "Ancestry"
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={raceIcon}
            alt={
              character.race_name ??
              "Ancestry"
            }
            className="h-full w-full object-contain"
          />
        </div>
      ) : null}

      <CharacterOrderIdentity
        characterId={character.id}
        variant="forum"
      />
    </div>
  );
}

function DeletedPostMessage({
  isInitial,
  moderationReason,
}: {
  isInitial: boolean;
  moderationReason:
    | string
    | null;
}) {
  return (
    <div className="flex min-h-36 items-center justify-center border border-dashed border-[#60482e]/35 bg-[#100c09] px-5 py-8 text-center">
      <div className="max-w-xl">
        <p className="text-[8px] uppercase tracking-[0.2em] text-[#a65d51]">
          Moderated content
        </p>

        <p className="mt-3 font-serif text-lg text-[#bba88a]">
          {isInitial
            ? "This opening post has been deleted."
            : "This post has been deleted by the moderation team."}
        </p>

        {moderationReason ? (
          <div className="mt-5 border border-[#654b32]/55 bg-[#17100c] px-4 py-3">
            <p className="text-[8px] uppercase tracking-[0.18em] text-[#8e714d]">
              Moderation reason
            </p>

            <p className="mt-2 text-sm leading-5 text-[#c8b79c]">
              {moderationReason}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function QuotedPost({
  post,
}: {
  post: ForumQuotedPost;
}) {
  const authorName =
    post.is_anonymous &&
    !post.anonymous_identity_visible
      ? "Anonymous"
      : getCharacterName(
          post.author_character,
          post.author_name,
        );

  return (
    <blockquote className="mb-6 border-l-2 border-[#8b6840] bg-[#100c09] px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[8px] uppercase tracking-[0.17em] text-[#9b7b53]">
          Originally posted by{" "}
          {authorName}
          {post.is_anonymous &&
          post.anonymous_identity_visible
            ? " · Anonymous"
            : ""}
        </p>

        <a
          href={`#post-${post.id}`}
          className="text-[8px] uppercase tracking-[0.14em] text-[#71624f] transition hover:text-[#c9a674]"
        >
          View post
        </a>
      </div>

      {post.deleted_at ? (
        <p className="mt-3 text-xs italic leading-6 text-[#756b60]">
          The quoted post has been
          deleted.
        </p>
      ) : (
        <p className="mt-3 whitespace-pre-wrap text-xs italic leading-6 text-[#9f927f]">
          {shortenText(
            richTextToPlainText(
              post.body,
            ),
          )}
        </p>
      )}
    </blockquote>
  );
}

function PostImages({
  images,
}: {
  images: ForumPostImage[];
}) {
  const validImages = [...images]
    .sort(
      (firstImage, secondImage) =>
        firstImage.sort_order -
        secondImage.sort_order,
    )
    .filter((image) =>
      isSafeUrl(image.image_url),
    );

  if (validImages.length === 0) {
    return null;
  }

  return (
    <div className="mt-7 grid gap-3 md:grid-cols-2">
      {validImages.map(
        (image, index) => (
          <a
            key={image.id}
            href={image.image_url}
            target="_blank"
            rel="noreferrer"
            className="group block overflow-hidden border border-[#60482e]/40 bg-[#0c0907]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.image_url}
              alt={
                image.alt_text ??
                `Attached image ${index + 1}`
              }
              className="max-h-[520px] w-full object-contain transition duration-300 group-hover:scale-[1.01]"
            />
          </a>
        ),
      )}
    </div>
  );
}