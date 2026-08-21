"use client";

import {
  useActionState,
  useEffect,
  useState,
} from "react";

import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { stripRichTextForPreview } from "@/lib/rich-text-shared";

import {
  createForumReplyAction,
  type CreateForumReplyState,
} from "@/app/(portal)/forum/actions";

type CharacterOption = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
  association_id: string | null;
  association_name: string | null;
};

type QuotedPostOption = {
  id: string;
  body: string;
  author_name: string;
};

type TopicReplyFormProps = {
  topicId: string;
  sectionSlug: string;
  topicSlug: string;
  characters: CharacterOption[];
  quotedPost?: QuotedPostOption | null;
  defaultCharacterId?: string | null;
};

const initialState: CreateForumReplyState = {
  success: false,
  message: "",
};

const MAX_BODY_LENGTH = 50000;
const MAX_IMAGES = 8;

function getCharacterName(
  character: CharacterOption,
): string {
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

function isValidHttpUrl(
  value: string,
): boolean {
  try {
    const parsedUrl = new URL(value);

    return (
      parsedUrl.protocol === "http:" ||
      parsedUrl.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function shortenQuote(value: string): string {
  const normalized =
    stripRichTextForPreview(value);

  if (normalized.length <= 280) {
    return normalized;
  }

  return `${normalized.slice(0, 277)}...`;
}

export default function TopicReplyForm({
  topicId,
  sectionSlug,
  topicSlug,
  characters,
  quotedPost = null,
  defaultCharacterId = null,
}: TopicReplyFormProps) {
  const [state, formAction, pending] =
    useActionState(
      createForumReplyAction,
      initialState,
    );

  const [
    selectedCharacterId,
    setSelectedCharacterId,
  ] = useState(
    defaultCharacterId &&
      characters.some(
        (character) =>
          character.id ===
          defaultCharacterId,
      )
      ? defaultCharacterId
      : characters[0]?.id ?? "",
  );

  const [isAnonymous, setIsAnonymous] =
    useState(false);

  const [body, setBody] = useState("");
  const [images, setImages] = useState<
    string[]
  >([]);

  const [newImageUrl, setNewImageUrl] =
    useState("");

  const [imageError, setImageError] =
    useState("");

  function addImage() {
    const imageUrl =
      newImageUrl.trim();

    setImageError("");

    if (!imageUrl) {
      setImageError(
        "Enter an image URL first.",
      );
      return;
    }

    if (!isValidHttpUrl(imageUrl)) {
      setImageError(
        "Use a valid HTTP or HTTPS image URL.",
      );
      return;
    }

    if (images.includes(imageUrl)) {
      setImageError(
        "This image has already been added.",
      );
      return;
    }

    if (images.length >= MAX_IMAGES) {
      setImageError(
        `You may attach a maximum of ${MAX_IMAGES} images.`,
      );
      return;
    }

    setImages((currentImages) => [
      ...currentImages,
      imageUrl,
    ]);

    setNewImageUrl("");
  }

  function removeImage(
    imageUrl: string,
  ) {
    setImages((currentImages) =>
      currentImages.filter(
        (currentImage) =>
          currentImage !== imageUrl,
      ),
    );

    setImageError("");
  }

  return (
    <section
      id="reply"
      className="scroll-mt-24 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]"
    >
      

      <form
        action={formAction}
        className="space-y-1 p-5 sm:p-6"
      >
        <input
          type="hidden"
          name="topicId"
          value={topicId}
        />

        <input
          type="hidden"
          name="sectionSlug"
          value={sectionSlug}
        />

        <input
          type="hidden"
          name="topicSlug"
          value={topicSlug}
        />

        <input
          type="hidden"
          name="quotedPostId"
          value={quotedPost?.id ?? ""}
        />

        <input
          type="hidden"
          name="imageUrls"
          value={JSON.stringify(images)}
        />

        {state.message ? (
          <div
            className={
              state.success
                ? "border border-emerald-900/60 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-300"
                : "border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300"
            }
          >
            {state.message}
          </div>
        ) : null}

        {quotedPost ? (
          <div className="border-l-2 border-[rgb(var(--sep-colour-8b6840))] bg-[rgb(var(--sep-colour-100c09))] px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-9b7b53))]">
                Replying to{" "}
                {quotedPost.author_name}
              </p>

              <a
                href={`#post-${quotedPost.id}`}
                className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-71624f))] transition hover:text-[rgb(var(--sep-colour-c9a674))]"
              >
                View original
              </a>
            </div>

            <p className="mt-3 text-xs italic leading-6 text-[rgb(var(--sep-colour-9f927f))]">
              {shortenQuote(
                quotedPost.body,
              )}
            </p>

            <a
              href={`/forum/${sectionSlug}/${topicSlug}#reply`}
              className="mt-3 inline-block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9c7650))] transition hover:text-[rgb(var(--sep-colour-dfb982))]"
            >
              Remove quote
            </a>
          </div>
        ) : null}

        <div>
          <label
            htmlFor="reply-character"
            className="block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8765))]"
          >
            Reply as
          </label>

          <select
            id="reply-character"
            name="characterId"
            required
            value={selectedCharacterId}
            onChange={(event) =>
              setSelectedCharacterId(
                event.target.value,
              )
            }
            disabled={pending}
            className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-4 py-3 text-sm text-[rgb(var(--sep-colour-d8c4a4))] outline-none transition focus:border-[rgb(var(--sep-colour-aa7f47))] disabled:cursor-not-allowed disabled:opacity-60"
          >
            

            {characters.map(
              (character) => (
                <option
                  key={character.id}
                  value={character.id}
                >
                  {getCharacterName(
                    character,
                  )}
                  {character.association_name
                    ? ` — ${character.association_name}`
                    : ""}
                </option>
              ),
            )}
          </select>

          {state.fieldErrors
            ?.characterId ? (
            <p className="mt-2 text-xs text-red-400">
              {
                state.fieldErrors
                  .characterId
              }
            </p>
          ) : null}
        </div>

        <div>
          <label className="flex cursor-pointer items-center gap-3 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-sm text-[rgb(var(--sep-colour-c8b79c))] transition hover:border-[rgb(var(--sep-colour-8b6840))]">
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
              className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))]"
            />

            <span>Anonymous</span>
          </label>

          {isAnonymous ? (
            <p className="mt-2 border-l-2 border-[rgb(var(--sep-colour-8b6840))] bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
              Your identity will be hidden
              from other players. You and
              staff will still be able to
              see which character posted it.
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="forum-reply-body"
            className="block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8765))]"
          >
            Message
          </label>

          <div className="mt-2">
            <RichTextEditor
              id="forum-reply-body"
              name="body"
              value={body}
              onChange={setBody}
              maxTextLength={MAX_BODY_LENGTH}
              minHeight={280}
              placeholder="Write your reply..."
              disabled={pending}
              variant="forum"
            />
          </div>

          {state.fieldErrors?.body ? (
            <p className="mt-2 text-xs text-red-400">
              {state.fieldErrors.body}
            </p>
          ) : null}
        </div>

        

        <div className="flex justify-end border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-5">
          <button
            type="submit"
            disabled={
              pending ||
              !selectedCharacterId ||
              !body.trim()
            }
            className="border border-[rgb(var(--sep-colour-a27b48))] bg-[rgb(var(--sep-colour-49311d))] px-6 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-f0d6aa))] transition hover:border-[rgb(var(--sep-colour-c49555))] hover:bg-[rgb(var(--sep-colour-5b3d22))] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending
              ? "Publishing..."
              : "Publish reply"}
          </button>
        </div>
      </form>
    </section>
  );
}