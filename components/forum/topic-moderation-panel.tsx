"use client";

import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  deleteTopicAction,
  moveTopicAction,
  toggleTopicLockAction,
  toggleTopicPinAction,
  type ForumModerationState,
} from "@/app/(portal)/forum/moderation-actions";

type ForumSectionOption = {
  id: string;
  name: string;
  slug: string;
};

type TopicModerationPanelProps = {
  topicId: string;
  topicTitle: string;
  currentSectionId: string;
  isLocked: boolean;
  isPinned: boolean;
  sections: ForumSectionOption[];
};

const initialState: ForumModerationState = {
  success: false,
  message: "",
};

export default function TopicModerationPanel({
  topicId,
  topicTitle,
  currentSectionId,
  isLocked,
  isPinned,
  sections,
}: TopicModerationPanelProps) {
  const [
    lockState,
    lockAction,
    lockPending,
  ] = useActionState(
    toggleTopicLockAction,
    initialState,
  );

  const [
    pinState,
    pinAction,
    pinPending,
  ] = useActionState(
    toggleTopicPinAction,
    initialState,
  );

  const [
    moveState,
    moveAction,
    movePending,
  ] = useActionState(
    moveTopicAction,
    initialState,
  );

  const [
    deleteState,
    deleteAction,
    deletePending,
  ] = useActionState(
    deleteTopicAction,
    initialState,
  );

  const [isOpen, setIsOpen] =
    useState(false);

  const [deleteOpen, setDeleteOpen] =
    useState(false);

    const [
  deleteReason,
  setDeleteReason,
] = useState("");

  const [destinationSectionId, setDestinationSectionId] =
    useState("");

  const availableSections =
    sections.filter(
      (section) =>
        section.id !== currentSectionId,
    );

  const anyPending =
    lockPending ||
    pinPending ||
    movePending ||
    deletePending;

  useEffect(() => {
    if (!isOpen && !deleteOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape" &&
        !anyPending
      ) {
        setIsOpen(false);
        setDeleteOpen(false);
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    isOpen,
    deleteOpen,
    anyPending,
  ]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-10 items-center justify-center whitespace-nowrap border border-amber-800/70 bg-[rgb(var(--sep-colour-17110d))] px-4 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-c8ae83))] transition hover:bg-[rgb(var(--sep-colour-21170f))] hover:text-[rgb(var(--sep-colour-ead4ad))]"
      >
        Moderate topic
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !anyPending
            ) {
              setIsOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="topic-moderation-title"
            className="max-h-full w-full max-w-2xl overflow-y-auto border border-[rgb(var(--sep-colour-765733))]/60 bg-[rgb(var(--sep-colour-15100d))] shadow-2xl"
          >
            <header className="flex items-start justify-between gap-5 border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-1a130e))] px-5 py-5 sm:px-6">
              <div>
                <p className="text-[8px] uppercase tracking-[0.22em] text-amber-500">
                  Staff controls
                </p>

                <h2
                  id="topic-moderation-title"
                  className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dec69d))]"
                >
                  Moderate discussion
                </h2>

                <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-887968))]">
                  {topicTitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsOpen(false)
                }
                disabled={anyPending}
                aria-label="Close moderation panel"
                className="border border-[rgb(var(--sep-colour-60482e))]/50 px-3 py-2 text-xs text-[rgb(var(--sep-colour-9f8765))] transition hover:border-[rgb(var(--sep-colour-967044))] hover:text-[rgb(var(--sep-colour-dec095))] disabled:opacity-50"
              >
                ×
              </button>
            </header>

            <div className="space-y-6 p-5 sm:p-6">
              <ModerationMessage
                state={lockState}
              />

              <ModerationMessage
                state={pinState}
              />

              <ModerationMessage
                state={moveState}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <form
                  action={lockAction}
                  className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] p-5"
                >
                  <input
                    type="hidden"
                    name="topicId"
                    value={topicId}
                  />

                  <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-917957))]">
                    Replies
                  </p>

                  <h3 className="mt-2 font-serif text-xl text-[rgb(var(--sep-colour-d5bd98))]">
                    {isLocked
                      ? "Unlock discussion"
                      : "Lock discussion"}
                  </h3>

                  <p className="mt-3 min-h-16 text-xs leading-6 text-[rgb(var(--sep-colour-7d7062))]">
                    {isLocked
                      ? "Allow regular members to publish replies and edit their posts again."
                      : "Prevent regular members from replying to or editing posts in this discussion."}
                  </p>

                  <button
                    type="submit"
                    disabled={anyPending}
                    className="mt-5 w-full border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-2c1e14))] px-4 py-3 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d8bd91))] transition hover:border-[rgb(var(--sep-colour-a67c45))] hover:bg-[rgb(var(--sep-colour-3a2819))] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {lockPending
                      ? "Updating..."
                      : isLocked
                        ? "Unlock topic"
                        : "Lock topic"}
                  </button>
                </form>

                <form
                  action={pinAction}
                  className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] p-5"
                >
                  <input
                    type="hidden"
                    name="topicId"
                    value={topicId}
                  />

                  <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-917957))]">
                    Visibility
                  </p>

                  <h3 className="mt-2 font-serif text-xl text-[rgb(var(--sep-colour-d5bd98))]">
                    {isPinned
                      ? "Unpin discussion"
                      : "Pin discussion"}
                  </h3>

                  <p className="mt-3 min-h-16 text-xs leading-6 text-[rgb(var(--sep-colour-7d7062))]">
                    {isPinned
                      ? "Return this discussion to the normal chronological topic order."
                      : "Keep this discussion above ordinary topics inside its current section."}
                  </p>

                  <button
                    type="submit"
                    disabled={anyPending}
                    className="mt-5 w-full border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-2c1e14))] px-4 py-3 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d8bd91))] transition hover:border-[rgb(var(--sep-colour-a67c45))] hover:bg-[rgb(var(--sep-colour-3a2819))] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pinPending
                      ? "Updating..."
                      : isPinned
                        ? "Unpin topic"
                        : "Pin topic"}
                  </button>
                </form>
              </div>

              <form
                action={moveAction}
                className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] p-5"
              >
                <input
                  type="hidden"
                  name="topicId"
                  value={topicId}
                />

                <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-917957))]">
                  Location
                </p>

                <h3 className="mt-2 font-serif text-xl text-[rgb(var(--sep-colour-d5bd98))]">
                  Move discussion
                </h3>

                <p className="mt-3 text-xs leading-6 text-[rgb(var(--sep-colour-7d7062))]">
                  Transfer the topic and all
                  of its replies to another
                  active forum section.
                </p>

                {availableSections.length >
                0 ? (
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <select
                      name="destinationSectionId"
                      value={
                        destinationSectionId
                      }
                      onChange={(event) =>
                        setDestinationSectionId(
                          event.target.value,
                        )
                      }
                      required
                      disabled={anyPending}
                      className="min-w-0 flex-1 border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-4 py-3 text-sm text-[rgb(var(--sep-colour-d2bea0))] outline-none focus:border-[rgb(var(--sep-colour-a47a44))] disabled:opacity-50"
                    >
                      <option value="">
                        Select destination
                      </option>

                      {availableSections.map(
                        (section) => (
                          <option
                            key={section.id}
                            value={section.id}
                          >
                            {section.name}
                          </option>
                        ),
                      )}
                    </select>

                    <button
                      type="submit"
                      disabled={
                        anyPending ||
                        !destinationSectionId
                      }
                      className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-2c1e14))] px-5 py-3 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d8bd91))] transition hover:border-[rgb(var(--sep-colour-a67c45))] hover:bg-[rgb(var(--sep-colour-3a2819))] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {movePending
                        ? "Moving..."
                        : "Move topic"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 border border-dashed border-[rgb(var(--sep-colour-60482e))]/35 px-4 py-4 text-xs text-[rgb(var(--sep-colour-716659))]">
                    No other active forum
                    sections are available.
                  </div>
                )}
              </form>

              <div className="border border-red-950/60 bg-red-950/10 p-5">
                <p className="text-[8px] uppercase tracking-[0.18em] text-red-500">
                  Destructive action
                </p>

                <h3 className="mt-2 font-serif text-xl text-red-200">
                  Delete discussion
                </h3>

                <p className="mt-3 text-xs leading-6 text-red-300/75">
                  Remove the topic and mark
                  all of its posts as deleted.
                  Members will no longer be
                  able to open it.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setDeleteOpen(true)
                  }
                  disabled={anyPending}
                  className="mt-5 border border-red-800 bg-red-950/35 px-5 py-3 text-[8px] uppercase tracking-[0.16em] text-red-300 transition hover:border-red-600 hover:bg-red-950/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete topic
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {deleteOpen ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 px-4 py-8 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !deletePending
            ) {
              setDeleteOpen(false);
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-topic-title"
            className="w-full max-w-lg border border-red-950/70 bg-[rgb(var(--sep-colour-15100d))] shadow-2xl"
          >
            <header className="border-b border-red-950/50 bg-red-950/10 px-5 py-5 sm:px-6">
              <p className="text-[8px] uppercase tracking-[0.22em] text-red-500">
                Permanent action
              </p>

              <h2
                id="delete-topic-title"
                className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-dec6ae))]"
              >
                Delete this discussion?
              </h2>
            </header>

            <div className="space-y-5 px-5 py-6 sm:px-6">
              <p className="text-sm leading-7 text-[rgb(var(--sep-colour-aa9b88))]">
                The discussion
                <strong className="text-[rgb(var(--sep-colour-dfc6a0))]">
                  {" "}
                  {topicTitle}
                </strong>{" "}
                and all of its replies will
                be removed from the forum.
              </p>

              <div className="border border-red-950/55 bg-red-950/10 px-4 py-4">
                <p className="text-xs leading-6 text-red-300">
                  This operation affects every
                  post in the topic and cannot
                  be undone from this panel.
                </p>
              </div>

              <ModerationMessage
  state={deleteState}
/>

<div>
  <label
    htmlFor="topic-delete-reason"
    className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-917957))]"
  >
    Moderation reason
  </label>

  <textarea
    id="topic-delete-reason"
    value={deleteReason}
    onChange={(event) =>
      setDeleteReason(
        event.target.value,
      )
    }
    maxLength={1000}
    rows={4}
    disabled={deletePending}
    placeholder="Reason for removing this discussion..."
    className="mt-3 w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-4 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d2bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-5f5548))] focus:border-[rgb(var(--sep-colour-a47a44))] disabled:opacity-50"
  />

  <p className="mt-2 text-right text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-665947))]">
    {deleteReason.length}/1000
  </p>
</div>

<form action={deleteAction}>
  <input
    type="hidden"
    name="reason"
    value={deleteReason}
  />
                <input
                  type="hidden"
                  name="topicId"
                  value={topicId}
                />

                <div className="flex flex-col-reverse gap-3 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteOpen(false)
                    }
                    disabled={deletePending}
                    className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-19120e))] px-5 py-3 text-[9px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-a58b68))] transition hover:border-[rgb(var(--sep-colour-947047))] hover:text-[rgb(var(--sep-colour-dec095))] disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={deletePending}
                    className="border border-red-800 bg-red-950/35 px-5 py-3 text-[9px] uppercase tracking-[0.17em] text-red-300 transition hover:border-red-600 hover:bg-red-950/60 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletePending
                      ? "Deleting..."
                      : "Delete discussion"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function ModerationMessage({
  state,
}: {
  state: ForumModerationState;
}) {
  if (!state.message) {
    return null;
  }

  return (
    <div
      className={
        state.success
          ? "border border-emerald-900/60 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-300"
          : "border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300"
      }
    >
      {state.message}
    </div>
  );
}