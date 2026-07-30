"use client";

import {
  useActionState,
  useEffect,
  useState,
} from "react";

import {
  moderateDeletePostAction,
  restorePostAction,
  type PostModerationState,
} from "@/app/(portal)/forum/post-moderation-actions";

type PostModerationPanelProps = {
  postId: string;
  postNumber: number;
  authorName: string;
  isDeleted: boolean;
  isInitialPost: boolean;
};

const initialState: PostModerationState = {
  success: false,
  message: "",
};

export default function PostModerationPanel({
  postId,
  postNumber,
  authorName,
  isDeleted,
  isInitialPost,
}: PostModerationPanelProps) {
  const [
    deleteState,
    deleteAction,
    deletePending,
  ] = useActionState(
    moderateDeletePostAction,
    initialState,
  );

  const [
    restoreState,
    restoreAction,
    restorePending,
  ] = useActionState(
    restorePostAction,
    initialState,
  );

  const [isOpen, setIsOpen] =
    useState(false);

  const [reason, setReason] =
    useState("");

  const anyPending =
    deletePending || restorePending;

  useEffect(() => {
    if (!isOpen) {
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
  }, [isOpen, anyPending]);

  useEffect(() => {
    if (
      deleteState.success ||
      restoreState.success
    ) {
      setReason("");
    }
  }, [
    deleteState.success,
    restoreState.success,
  ]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="border border-amber-900/60 bg-amber-950/10 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-amber-400 transition hover:border-amber-700 hover:bg-amber-950/25"
      >
        Moderate
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 px-4 py-8 backdrop-blur-sm"
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
            aria-labelledby="post-moderation-title"
            className="max-h-full w-full max-w-xl overflow-y-auto border border-[#765733]/60 bg-[#15100d] shadow-2xl"
          >
            <header className="flex items-start justify-between gap-5 border-b border-[#60482e]/35 bg-[#1a130e] px-5 py-5 sm:px-6">
              <div>
                <p className="text-[8px] uppercase tracking-[0.22em] text-amber-500">
                  Staff controls
                </p>

                <h2
                  id="post-moderation-title"
                  className="mt-2 font-serif text-2xl text-[#dec69d]"
                >
                  Moderate post #{postNumber}
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#887968]">
                  Posted by {authorName}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsOpen(false)
                }
                disabled={anyPending}
                aria-label="Close post moderation panel"
                className="border border-[#60482e]/50 px-3 py-2 text-xs text-[#9f8765] transition hover:border-[#967044] hover:text-[#dec095] disabled:opacity-50"
              >
                ×
              </button>
            </header>

            <div className="space-y-5 p-5 sm:p-6">
              <ModerationMessage
                state={deleteState}
              />

              <ModerationMessage
                state={restoreState}
              />

              {isInitialPost ? (
                <div className="border border-amber-900/55 bg-amber-950/10 px-4 py-4">
                  <p className="text-[8px] uppercase tracking-[0.18em] text-amber-500">
                    Opening post
                  </p>

                  <p className="mt-3 text-sm leading-6 text-[#a8957d]">
                    The opening post cannot
                    be deleted separately.
                    Use the topic moderation
                    panel to remove the entire
                    discussion.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor={`moderation-reason-${postId}`}
                      className="text-[8px] uppercase tracking-[0.18em] text-[#917957]"
                    >
                      Moderation note
                    </label>

                    <textarea
                      id={`moderation-reason-${postId}`}
                      value={reason}
                      onChange={(event) =>
                        setReason(
                          event.target.value,
                        )
                      }
                      maxLength={1000}
                      rows={5}
                      disabled={anyPending}
                      placeholder="Optional reason for this moderation action..."
                      className="mt-3 w-full resize-y border border-[#60482e]/50 bg-[#0d0907] px-4 py-3 text-sm leading-6 text-[#d2bea0] outline-none placeholder:text-[#5f5548] focus:border-[#a47a44] disabled:opacity-50"
                    />

                    <div className="mt-2 text-right text-[8px] uppercase tracking-[0.14em] text-[#665947]">
                      {reason.length}/1000
                    </div>
                  </div>

                  {isDeleted ? (
                    <form
                      action={restoreAction}
                      className="border border-emerald-950/65 bg-emerald-950/10 p-5"
                    >
                      <input
                        type="hidden"
                        name="postId"
                        value={postId}
                      />

                      <input
                        type="hidden"
                        name="reason"
                        value={reason}
                      />

                      <p className="text-[8px] uppercase tracking-[0.18em] text-emerald-500">
                        Restore content
                      </p>

                      <h3 className="mt-2 font-serif text-xl text-emerald-200">
                        Restore this post
                      </h3>

                      <p className="mt-3 text-xs leading-6 text-emerald-200/70">
                        Make the post visible
                        again and return its
                        original content to the
                        discussion.
                      </p>

                      <button
                        type="submit"
                        disabled={anyPending}
                        className="mt-5 w-full border border-emerald-800 bg-emerald-950/35 px-5 py-3 text-[8px] uppercase tracking-[0.16em] text-emerald-300 transition hover:border-emerald-600 hover:bg-emerald-950/55 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {restorePending
                          ? "Restoring..."
                          : "Restore post"}
                      </button>
                    </form>
                  ) : (
                    <form
                      action={deleteAction}
                      className="border border-red-950/65 bg-red-950/10 p-5"
                    >
                      <input
                        type="hidden"
                        name="postId"
                        value={postId}
                      />

                      <input
                        type="hidden"
                        name="reason"
                        value={reason}
                      />

                      <p className="text-[8px] uppercase tracking-[0.18em] text-red-500">
                        Remove content
                      </p>

                      <h3 className="mt-2 font-serif text-xl text-red-200">
                        Delete this post
                      </h3>

                      <p className="mt-3 text-xs leading-6 text-red-300/75">
                        Hide the post from
                        members while keeping
                        its place in the
                        discussion and storing
                        the moderation action
                        in the log.
                      </p>

                      <button
                        type="submit"
                        disabled={anyPending}
                        className="mt-5 w-full border border-red-800 bg-red-950/35 px-5 py-3 text-[8px] uppercase tracking-[0.16em] text-red-300 transition hover:border-red-600 hover:bg-red-950/60 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletePending
                          ? "Deleting..."
                          : "Delete post"}
                      </button>
                    </form>
                  )}
                </>
              )}

              <div className="flex justify-end border-t border-[#60482e]/30 pt-5">
                <button
                  type="button"
                  onClick={() =>
                    setIsOpen(false)
                  }
                  disabled={anyPending}
                  className="border border-[#60482e]/55 bg-[#19120e] px-5 py-3 text-[9px] uppercase tracking-[0.17em] text-[#a58b68] transition hover:border-[#947047] hover:text-[#dec095] disabled:opacity-50"
                >
                  Close
                </button>
              </div>
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
  state: PostModerationState;
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