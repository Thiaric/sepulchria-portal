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
    defaultCharacterId ??
      (characters.length === 1
        ? characters[0].id
        : ""),
  );

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
      className="scroll-mt-24 border border-[#60482e]/45 bg-[#15100d]"
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
          <div className="border-l-2 border-[#8b6840] bg-[#100c09] px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[8px] uppercase tracking-[0.17em] text-[#9b7b53]">
                Replying to{" "}
                {quotedPost.author_name}
              </p>

              <a
                href={`#post-${quotedPost.id}`}
                className="text-[8px] uppercase tracking-[0.14em] text-[#71624f] transition hover:text-[#c9a674]"
              >
                View original
              </a>
            </div>

            <p className="mt-3 text-xs italic leading-6 text-[#9f927f]">
              {shortenQuote(
                quotedPost.body,
              )}
            </p>

            <a
              href={`/forum/${sectionSlug}/${topicSlug}#reply`}
              className="mt-3 inline-block text-[8px] uppercase tracking-[0.14em] text-[#9c7650] transition hover:text-[#dfb982]"
            >
              Remove quote
            </a>
          </div>
        ) : null}

        <div>
          <label
            htmlFor="reply-character"
            className="block text-[9px] uppercase tracking-[0.18em] text-[#9f8765]"
          >
            Reply as
          </label>

          <select
            id="reply-character"
            name="characterId"
            value={selectedCharacterId}
            onChange={(event) =>
              setSelectedCharacterId(
                event.target.value,
              )
            }
            disabled={pending}
            className="mt-2 w-full border border-[#60482e]/50 bg-[#0d0907] px-4 py-3 text-sm text-[#d8c4a4] outline-none transition focus:border-[#aa7f47] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              Account only
            </option>

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
          <label
            htmlFor="forum-reply-body"
            className="block text-[9px] uppercase tracking-[0.18em] text-[#9f8765]"
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

        

        <div className="flex justify-end border-t border-[#60482e]/30 pt-5">
          <button
            type="submit"
            disabled={
              pending || !body.trim()
            }
            className="border border-[#a27b48] bg-[#49311d] px-6 py-3 text-[9px] uppercase tracking-[0.2em] text-[#f0d6aa] transition hover:border-[#c49555] hover:bg-[#5b3d22] disabled:cursor-not-allowed disabled:opacity-50"
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