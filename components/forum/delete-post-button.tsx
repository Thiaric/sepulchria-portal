"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  deleteForumPostAction,
  type DeleteForumPostState,
} from "@/app/(portal)/forum/post-actions";

type DeletePostButtonProps = {
  postId: string;
  isInitialPost?: boolean;
  disabled?: boolean;
};

const initialState: DeleteForumPostState = {
  success: false,
  message: "",
};

export default function DeletePostButton({
  postId,
  isInitialPost = false,
  disabled = false,
}: DeletePostButtonProps) {
  const [isOpen, setIsOpen] =
    useState(false);

  const [state, formAction, pending] =
    useActionState(
      deleteForumPostAction,
      initialState,
    );

  const dialogRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape" &&
        !pending
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [isOpen, pending]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="border border-red-950/70 bg-red-950/10 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-red-400 transition hover:border-red-800 hover:bg-red-950/25 disabled:cursor-not-allowed disabled:opacity-45"
      >
        Delete
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !pending
            ) {
              setIsOpen(false);
            }
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-post-title-${postId}`}
            tabIndex={-1}
            className="w-full max-w-lg border border-red-950/70 bg-[#15100d] shadow-2xl outline-none"
          >
            <header className="border-b border-red-950/50 bg-red-950/10 px-5 py-5 sm:px-6">
              <p className="text-[8px] uppercase tracking-[0.22em] text-red-500">
                Permanent action
              </p>

              <h2
                id={`delete-post-title-${postId}`}
                className="mt-2 font-serif text-2xl text-[#dec6ae]"
              >
                {isInitialPost
                  ? "Delete this discussion?"
                  : "Delete this reply?"}
              </h2>
            </header>

            <div className="space-y-5 px-5 py-6 sm:px-6">
              <p className="text-sm leading-7 text-[#aa9b88]">
                {isInitialPost
                  ? "Deleting the opening post will remove the entire discussion and all of its replies from the forum."
                  : "The reply will remain in the discussion as a deleted-post marker, but its content will no longer be visible."}
              </p>

              {isInitialPost ? (
                <div className="border border-red-950/55 bg-red-950/10 px-4 py-4">
                  <p className="text-xs leading-6 text-red-300">
                    This affects every post
                    inside the topic. Continue
                    only when you are certain
                    that the whole discussion
                    should be removed.
                  </p>
                </div>
              ) : null}

              {state.message ? (
                <div className="border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                  {state.message}
                </div>
              ) : null}

              <form action={formAction}>
                <input
                  type="hidden"
                  name="postId"
                  value={postId}
                />

                <div className="flex flex-col-reverse gap-3 border-t border-[#60482e]/30 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setIsOpen(false)
                    }
                    disabled={pending}
                    className="border border-[#60482e]/55 bg-[#19120e] px-5 py-3 text-[9px] uppercase tracking-[0.17em] text-[#a58b68] transition hover:border-[#947047] hover:text-[#dec095] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={pending}
                    className="border border-red-800 bg-red-950/35 px-5 py-3 text-[9px] uppercase tracking-[0.17em] text-red-300 transition hover:border-red-600 hover:bg-red-950/60 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pending
                      ? "Deleting..."
                      : isInitialPost
                        ? "Delete discussion"
                        : "Delete reply"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}