"use client";

import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { stripRichTextForPreview } from "@/lib/rich-text-shared";

import Link from "next/link";
import {
  useActionState,
  useRef,
  useState,
} from "react";

import {
  editForumPostAction,
  type EditForumPostState,
} from "@/app/(portal)/forum/post-actions";

type ExistingImage = {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
};

type EditPostFormProps = {
  postId: string;
  sectionSlug: string;
  topicSlug: string;
  initialBody: string;
  initialImages: ExistingImage[];
};

const initialState: EditForumPostState = {
  success: false,
  message: "",
};

const MAX_BODY_LENGTH = 50_000;
const MAX_IMAGES = 8;

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

export default function EditPostForm({
  postId,
  sectionSlug,
  topicSlug,
  initialBody,
  initialImages,
}: EditPostFormProps) {
  const [state, formAction, pending] =
    useActionState(
      editForumPostAction,
      initialState,
    );

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(
      null,
    );

  const [body, setBody] =
    useState(initialBody);

  const [images, setImages] = useState<
    string[]
  >(
    [...initialImages]
      .sort(
        (firstImage, secondImage) =>
          firstImage.sort_order -
          secondImage.sort_order,
      )
      .map((image) => image.image_url)
      .filter(isValidHttpUrl),
  );

  const [newImageUrl, setNewImageUrl] =
    useState("");

  const [imageError, setImageError] =
    useState("");

  const topicUrl =
    `/forum/${encodeURIComponent(
      sectionSlug,
    )}/${encodeURIComponent(
      topicSlug,
    )}`;

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
    <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-1a130e))] px-5 py-5 sm:px-7">
        <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806a4d))]">
          Edit post
        </p>

        
      </header>

      <form
        action={formAction}
        className="space-y-7 p-5 sm:p-7"
      >
        <input
          type="hidden"
          name="postId"
          value={postId}
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

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label
              htmlFor="edit-forum-post-body"
              className="block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8765))]"
            >
              Message
            </label>

            <span className="text-[9px] text-[rgb(var(--sep-colour-716453))]">
              {body.length.toLocaleString(
                "en-GB",
              )}
              /
              {MAX_BODY_LENGTH.toLocaleString(
                "en-GB",
              )}
            </span>
          </div>

          <div className="mt-2">
              <RichTextEditor
                id="edit-forum-post-body"
                name="body"
                value={body}
                onChange={setBody}
                maxTextLength={MAX_BODY_LENGTH}
                minHeight={320}
                placeholder="Edit your post..."
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

        

        <div className="flex flex-col-reverse justify-between gap-3 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-6 sm:flex-row sm:items-center">
          <Link
            href={`${topicUrl}#post-${postId}`}
            className="border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-19120e))] px-5 py-3 text-center text-[9px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-a58b68))] transition hover:border-[rgb(var(--sep-colour-947047))] hover:text-[rgb(var(--sep-colour-dec095))]"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={
              pending || !body.trim()
            }
            className="border border-[rgb(var(--sep-colour-a27b48))] bg-[rgb(var(--sep-colour-49311d))] px-6 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-f0d6aa))] transition hover:border-[rgb(var(--sep-colour-c49555))] hover:bg-[rgb(var(--sep-colour-5b3d22))] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending
              ? "Saving..."
              : "Save changes"}
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
      className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-17100c))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9f8765))] transition hover:border-[rgb(var(--sep-colour-8d6a40))] hover:text-[rgb(var(--sep-colour-d8bd91))] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}