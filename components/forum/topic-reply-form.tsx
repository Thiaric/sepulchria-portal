"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

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
  const normalized = value
    .replace(/\s+/g, " ")
    .trim();

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

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(
      null,
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

  useEffect(() => {
    if (quotedPost) {
      textareaRef.current?.focus();
    }
  }, [quotedPost]);

  function insertText(
    prefix: string,
    suffix = "",
  ) {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    const selectionStart =
      textarea.selectionStart;

    const selectionEnd =
      textarea.selectionEnd;

    const selectedText = body.slice(
      selectionStart,
      selectionEnd,
    );

    const insertedText =
      `${prefix}${selectedText}${suffix}`;

    const nextBody =
      body.slice(0, selectionStart) +
      insertedText +
      body.slice(selectionEnd);

    setBody(nextBody);

    requestAnimationFrame(() => {
      textarea.focus();

      const cursorPosition =
        selectionStart +
        prefix.length +
        selectedText.length;

      textarea.setSelectionRange(
        cursorPosition,
        cursorPosition,
      );
    });
  }

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
      <div className="border-b border-[#60482e]/35 px-5 py-4 sm:px-6">
        <p className="text-[8px] uppercase tracking-[0.24em] text-[#806a4d]">
          Join the conversation
        </p>

        <h2 className="mt-2 font-serif text-2xl text-[#dec69d]">
          Write a reply
        </h2>
      </div>

      <form
        action={formAction}
        className="space-y-6 p-5 sm:p-6"
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label
              htmlFor="forum-reply-body"
              className="block text-[9px] uppercase tracking-[0.18em] text-[#9f8765]"
            >
              Message
            </label>

            <span className="text-[9px] text-[#716453]">
              {body.length.toLocaleString(
                "en-GB",
              )}
              /
              {MAX_BODY_LENGTH.toLocaleString(
                "en-GB",
              )}
            </span>
          </div>

          <div className="mt-2 border border-[#60482e]/50 bg-[#0d0907]">
            <div className="flex flex-wrap gap-2 border-b border-[#60482e]/35 p-2">
              <EditorButton
                label="Bold"
                onClick={() =>
                  insertText("**", "**")
                }
                disabled={pending}
              />

              <EditorButton
                label="Italic"
                onClick={() =>
                  insertText("*", "*")
                }
                disabled={pending}
              />

              <EditorButton
                label="Quote"
                onClick={() =>
                  insertText("> ")
                }
                disabled={pending}
              />

              <EditorButton
                label="Link"
                onClick={() =>
                  insertText(
                    "[Link text](",
                    ")",
                  )
                }
                disabled={pending}
              />

              <EditorButton
                label="List"
                onClick={() =>
                  insertText("- ")
                }
                disabled={pending}
              />
            </div>

            <textarea
              ref={textareaRef}
              id="forum-reply-body"
              name="body"
              value={body}
              onChange={(event) =>
                setBody(
                  event.target.value.slice(
                    0,
                    MAX_BODY_LENGTH,
                  ),
                )
              }
              rows={14}
              maxLength={MAX_BODY_LENGTH}
              required
              disabled={pending}
              placeholder="Write your reply..."
              className="block w-full resize-y bg-transparent px-4 py-4 text-sm leading-7 text-[#d2c1a7] outline-none placeholder:text-[#5f5549] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <p className="mt-2 text-xs leading-5 text-[#776b5d]">
            Simple Markdown is supported:
            bold, italic, links, quotes
            and lists.
          </p>

          {state.fieldErrors?.body ? (
            <p className="mt-2 text-xs text-red-400">
              {state.fieldErrors.body}
            </p>
          ) : null}
        </div>

        <div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              value={newImageUrl}
              onChange={(event) => {
                setNewImageUrl(
                  event.target.value,
                );
                setImageError("");
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter"
                ) {
                  event.preventDefault();
                  addImage();
                }
              }}
              disabled={
                pending ||
                images.length >=
                  MAX_IMAGES
              }
              placeholder="https://example.com/image.jpg"
              className="min-w-0 flex-1 border border-[#60482e]/50 bg-[#0d0907] px-4 py-3 text-sm text-[#d8c4a4] outline-none transition placeholder:text-[#5f5549] focus:border-[#aa7f47] disabled:cursor-not-allowed disabled:opacity-60"
            />

            <button
              type="button"
              onClick={addImage}
              disabled={
                pending ||
                images.length >=
                  MAX_IMAGES
              }
              className="border border-[#80613b] bg-[#2c1e14] px-5 py-3 text-[9px] uppercase tracking-[0.17em] text-[#d8bd91] transition hover:border-[#a67c45] hover:bg-[#3a2819] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add image
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-4">
            <p className="text-xs text-[#776b5d]">
              Direct image links only.
            </p>

            <span className="text-[9px] text-[#716453]">
              {images.length}/
              {MAX_IMAGES}
            </span>
          </div>

          {imageError ? (
            <p className="mt-2 text-xs text-red-400">
              {imageError}
            </p>
          ) : null}

          {state.fieldErrors
            ?.imageUrls ? (
            <p className="mt-2 text-xs text-red-400">
              {
                state.fieldErrors
                  .imageUrls
              }
            </p>
          ) : null}

          {images.length > 0 ? (
            <div className="mt-4 space-y-2">
              {images.map(
                (imageUrl, index) => (
                  <div
                    key={imageUrl}
                    className="flex min-w-0 items-center gap-3 border border-[#60482e]/40 bg-[#0d0907] p-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#60482e]/40 bg-[#17100c] font-serif text-sm text-[#9a7950]">
                      {index + 1}
                    </div>

                    <a
                      href={imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 truncate text-xs text-[#aa9982] transition hover:text-[#d6b681]"
                    >
                      {imageUrl}
                    </a>

                    <button
                      type="button"
                      onClick={() =>
                        removeImage(
                          imageUrl,
                        )
                      }
                      disabled={pending}
                      className="shrink-0 border border-red-900/50 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-red-400 transition hover:bg-red-950/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ),
              )}
            </div>
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

function EditorButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border border-[#60482e]/45 bg-[#17100c] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[#9f8765] transition hover:border-[#8d6a40] hover:text-[#d8bd91] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}