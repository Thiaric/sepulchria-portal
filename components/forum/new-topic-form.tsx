"use client";

import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { stripRichTextForPreview } from "@/lib/rich-text-shared";
import { OrderLevelVisibilityFields } from "@/components/forum/order-level-visibility-fields";
import { SanctionRestrictionNotice, useSanctionCapability } from "@/components/sanctions/sanction-capability-ui";
import type { OrderLevel } from "@/lib/forum/order-levels";

import {
  useActionState,
  useMemo,
  useState,
} from "react";
import Link from "next/link";

import {
  createForumTopicAction,
  type CreateForumTopicState,
} from "@/app/(portal)/forum/actions";

type ForumSectionOption = {
  id: string;
  name: string;
  slug: string;
  section_type:
    | "ongame"
    | "offgame"
    | "organisation";
  visibility:
    | "public"
    | "members"
    | "staff";
  association_id: string | null;
  order_id: string | null;
};

type CharacterOption = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
  portrait_url: string | null;
  association_id: string | null;
  association_name: string | null;
};

type NewTopicFormProps = {
  currentSection: ForumSectionOption;
  availableSections: ForumSectionOption[];
  characters: CharacterOption[];
  viewerOrderLevel: OrderLevel | null;
  isStaff: boolean;
};

const initialState: CreateForumTopicState = {
  success: false,
  message: "",
};

const MAX_TITLE_LENGTH = 180;
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
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

export default function NewTopicForm({
  currentSection,
  availableSections,
  characters,
  viewerOrderLevel,
  isStaff,
}: NewTopicFormProps) {
  const [state, formAction, pending] =
    useActionState(
      createForumTopicAction,
      initialState,
    );

  const forumRestriction=useSanctionCapability("forum");

  const [selectedSectionId, setSelectedSectionId] =
    useState(currentSection.id);

  const [selectedCharacterId, setSelectedCharacterId] =
    useState(
      characters[0]?.id ?? "",
    );

  const [isAnonymous, setIsAnonymous] =
    useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const [images, setImages] = useState<
    string[]
  >([]);

  const [newImageUrl, setNewImageUrl] =
    useState("");

  const [imageError, setImageError] =
    useState("");

  const selectedSection = useMemo(
    () =>
      availableSections.find(
        (section) =>
          section.id === selectedSectionId,
      ) ?? currentSection,
    [
      availableSections,
      currentSection,
      selectedSectionId,
    ],
  );

  const compatibleCharacters =
    useMemo(() => {
      if (
        selectedSection.section_type !==
          "organisation" ||
        selectedSection.visibility !==
          "members" ||
        !selectedSection.association_id
      ) {
        return characters;
      }

      return characters.filter(
        (character) =>
          character.association_id ===
          selectedSection.association_id,
      );
    }, [characters, selectedSection]);

  function handleSectionChange(
    sectionId: string,
  ) {
    setSelectedSectionId(sectionId);

    const nextSection =
      availableSections.find(
        (section) =>
          section.id === sectionId,
      );

    if (
      nextSection?.section_type ===
        "organisation" &&
      nextSection.visibility ===
        "members" &&
      nextSection.association_id
    ) {
      const selectedCharacter =
        characters.find(
          (character) =>
            character.id ===
            selectedCharacterId,
        );

      if (
        selectedCharacter &&
        selectedCharacter.association_id !==
          nextSection.association_id
      ) {
        const firstCompatibleCharacter =
          characters.find(
            (character) =>
              character.association_id ===
              nextSection.association_id,
          );

        setSelectedCharacterId(
          firstCompatibleCharacter?.id ?? "",
        );
      }
    }
  }

  function addImage() {
    const trimmedUrl =
      newImageUrl.trim();

    setImageError("");

    if (!trimmedUrl) {
      setImageError(
        "Enter an image URL first.",
      );
      return;
    }

    if (!isValidHttpUrl(trimmedUrl)) {
      setImageError(
        "Use a valid HTTP or HTTPS image URL.",
      );
      return;
    }

    if (images.includes(trimmedUrl)) {
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
      trimmedUrl,
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

  function insertText(
    prefix: string,
    suffix = "",
  ) {
    const textarea =
      document.getElementById(
        "forum-topic-body",
      ) as HTMLTextAreaElement | null;

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

      const nextCursorPosition =
        selectionStart +
        prefix.length +
        selectedText.length;

      textarea.setSelectionRange(
        nextCursorPosition,
        nextCursorPosition,
      );
    });
  }

  if (forumRestriction.blocked) { return <SanctionRestrictionNotice message={forumRestriction.message} />; }

  return (
    <form
      action={formAction}
      className="space-y-6"
    >
      <input
        type="hidden"
        name="sectionSlug"
        value={currentSection.slug}
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

      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
        <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 px-5 py-4 sm:px-6">
          <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806a4d))]">
            Publication details
          </p>

          <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dec69d))]">
            Discussion settings
          </h2>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
          <div>
            <label
              htmlFor="sectionId"
              className="block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8765))]"
            >
              Forum section
            </label>

            <select
              id="sectionId"
              name="sectionId"
              value={selectedSectionId}
              onChange={(event) =>
                handleSectionChange(
                  event.target.value,
                )
              }
              disabled={pending}
              className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-4 py-3 text-sm text-[rgb(var(--sep-colour-d8c4a4))] outline-none transition focus:border-[rgb(var(--sep-colour-aa7f47))] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {availableSections.map(
                (section) => (
                  <option
                    key={section.id}
                    value={section.id}
                  >
                    {section.name}
                    {section.section_type ===
                    "organisation"
                      ? " — Organisation"
                      : ""}
                  </option>
                ),
              )}
            </select>

            {state.fieldErrors
              ?.sectionId ? (
              <p className="mt-2 text-xs text-red-400">
                {
                  state.fieldErrors
                    .sectionId
                }
              </p>
            ) : null}

            {selectedSection.visibility !==
            "public" ? (
              <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-827461))]">
                This is a{" "}
                {selectedSection.visibility ===
                "members"
                  ? "members-only"
                  : "staff-only"}{" "}
                section.
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="characterId"
              className="block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8765))]"
            >
              Publish as
            </label>

            <select
              id="characterId"
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
              {compatibleCharacters.map(
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

            {compatibleCharacters.length ===
              0 &&
            selectedSection.section_type ===
              "organisation" ? (
              <p className="mt-2 text-xs leading-5 text-amber-400">
                None of your approved
                characters belongs to this
                organisation.
              </p>
            ) : (
              <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-827461))]">
                Only approved characters are
                available.
              </p>
            )}
          </div>

          <div className="lg:col-span-2">
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
                see which character created
                the discussion.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {selectedSection.order_id ? (
        <OrderLevelVisibilityFields
          actorLevel={viewerOrderLevel}
          unrestricted={
            isStaff || viewerOrderLevel === 6
          }
        />
      ) : null}

      {state.fieldErrors
        ?.visibleOrderLevels ? (
        <p className="-mt-4 text-xs text-red-400">
          {
            state.fieldErrors
              .visibleOrderLevels
          }
        </p>
      ) : null}

      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]">
        <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 px-5 py-4 sm:px-6">
          <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806a4d))]">
            Opening message
          </p>

          <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dec69d))]">
            Begin the discussion
          </h2>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <div>
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="title"
                className="block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8765))]"
              >
                Title
              </label>

              <span className="text-[9px] text-[rgb(var(--sep-colour-716453))]">
                {title.length}/
                {MAX_TITLE_LENGTH}
              </span>
            </div>

            <input
              id="title"
              name="title"
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value.slice(
                    0,
                    MAX_TITLE_LENGTH,
                  ),
                )
              }
              maxLength={MAX_TITLE_LENGTH}
              required
              disabled={pending}
              placeholder="Enter the discussion title"
              className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-4 py-3 font-serif text-lg text-[rgb(var(--sep-colour-ead5ac))] outline-none transition placeholder:text-[rgb(var(--sep-colour-5f5549))] focus:border-[rgb(var(--sep-colour-aa7f47))] disabled:cursor-not-allowed disabled:opacity-60"
            />

            {state.fieldErrors?.title ? (
              <p className="mt-2 text-xs text-red-400">
                {state.fieldErrors.title}
              </p>
            ) : null}
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label
                htmlFor="forum-topic-body"
                className="block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8765))]"
              >
                Message
              </label>

              <span className="text-[9px] text-[rgb(var(--sep-colour-716453))]">
                {stripRichTextForPreview(
                  body,
                ).length.toLocaleString(
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
                id="forum-topic-body"
                name="body"
                value={body}
                onChange={setBody}
                maxTextLength={MAX_BODY_LENGTH}
                minHeight={360}
                placeholder="Write the opening message..."
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
        </div>
      </section>

      

      <div className="flex flex-col-reverse gap-3 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/forum/${currentSection.slug}`}
          className="border border-[rgb(var(--sep-colour-60482e))]/50 px-5 py-3 text-center text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9a876c))] transition hover:border-[rgb(var(--sep-colour-8a6943))] hover:text-[rgb(var(--sep-colour-d8bd91))]"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={
            pending ||
            !selectedCharacterId ||
            !title.trim() ||
            !body.trim()
          }
          className="border border-[rgb(var(--sep-colour-a27b48))] bg-[rgb(var(--sep-colour-49311d))] px-6 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-f0d6aa))] transition hover:border-[rgb(var(--sep-colour-c49555))] hover:bg-[rgb(var(--sep-colour-5b3d22))] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending
            ? "Publishing..."
            : "Publish discussion"}
        </button>
      </div>
    </form>
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