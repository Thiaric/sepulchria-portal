"use client";

import {
  type ComponentProps,
  type ReactNode,
  useActionState,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

type ServerAction = (
  formData: FormData,
) => Promise<unknown>;

type ActionState = {
  kind:
    | "idle"
    | "success"
    | "error";
  message: string;
  nonce: number;
};

type AdminActionFormProps =
  Omit<
    ComponentProps<"form">,
    "action" | "children"
  > & {
    action: ServerAction;
    children: ReactNode;
    confirmMessage?: string;
  };

const DATA_CHANGED_EVENT =
  "sepulchria:admin-data-changed";

function pendingLabel(
  text: string,
) {
  const value =
    text.trim().toLowerCase();

  if (
    value.includes("destroy") ||
    value.includes("archive")
  ) {
    return "Destroying...";
  }

  if (
    value.includes("delete") ||
    value.includes("remove")
  ) {
    return "Deleting...";
  }

  if (
    value.includes("create") ||
    value.includes("publish") ||
    value.includes("add")
  ) {
    return "Creating...";
  }

  if (
    value.includes("assign")
  ) {
    return "Assigning...";
  }

  if (
    value.includes("hide") ||
    value.includes("show") ||
    value.includes("toggle")
  ) {
    return "Updating...";
  }

  return "Saving...";
}

function successMessage(
  text: string,
) {
  const value =
    text.trim().toLowerCase();

  if (
    value.includes("destroy") ||
    value.includes("archive")
  ) {
    return "Destroyed successfully.";
  }

  if (
    value.includes("delete") ||
    value.includes("remove")
  ) {
    return "Deleted successfully.";
  }

  if (
    value.includes("create") ||
    value.includes("publish") ||
    value.includes("add")
  ) {
    return "Created successfully.";
  }

  if (
    value.includes("assign")
  ) {
    return "Assigned successfully.";
  }

  if (
    value.includes("hide") ||
    value.includes("show") ||
    value.includes("toggle")
  ) {
    return "Updated successfully.";
  }

  return "Saved successfully.";
}

function isRedirectError(
  error: unknown,
) {
  if (
    error &&
    typeof error === "object" &&
    "digest" in error &&
    typeof (
      error as {
        digest?: unknown;
      }
    ).digest === "string"
  ) {
    return (
      error as {
        digest: string;
      }
    ).digest.startsWith(
      "NEXT_REDIRECT",
    );
  }

  return (
    error instanceof Error &&
    error.message.includes(
      "NEXT_REDIRECT",
    )
  );
}

function getErrorMessage(
  error: unknown,
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return "Unable to complete this action.";
}

function addFeedback(
  button: HTMLButtonElement,
  kind: "success" | "error",
  message: string,
) {
  const parent =
    button.parentElement;

  if (!parent) {
    return;
  }

  parent
    .querySelectorAll(
      "[data-admin-action-feedback]",
    )
    .forEach(
      (node) => node.remove(),
    );

  const feedback =
    document.createElement("span");

  feedback.dataset.adminActionFeedback =
    "true";

  feedback.setAttribute(
    "role",
    kind === "error"
      ? "alert"
      : "status",
  );

  feedback.textContent =
    kind === "success"
      ? `✓ ${message}`
      : `✕ ${message}`;

  feedback.className =
    kind === "success"
      ? "mr-3 inline-flex min-h-9 flex-1 items-center justify-end text-right text-[10px] leading-5 text-[rgb(var(--sep-colour-9fd0a9))]"
      : "mr-3 inline-flex min-h-9 flex-1 items-center justify-end text-right text-[10px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]";

  parent.insertBefore(
    feedback,
    button,
  );

  window.setTimeout(
    () => feedback.remove(),
    kind === "success"
      ? 6000
      : 10000,
  );
}

export function AdminActionForm({
  action,
  children,
  onSubmit,
  confirmMessage,
  ...props
}: AdminActionFormProps) {
  const submitButtonRef =
    useRef<HTMLButtonElement | null>(
      null,
    );

  const originalTextRef =
    useRef("");

  const scrollRef =
    useRef<{
      x: number;
      y: number;
    } | null>(null);

  const [
    state,
    dispatch,
    pending,
  ] = useActionState<
    ActionState,
    FormData
  >(
    async (
      previous,
      formData,
    ) => {
      try {
        await action(formData);

        return {
          kind: "success",
          message:
            successMessage(
              originalTextRef.current ||
                "Save",
            ),
          nonce:
            previous.nonce + 1,
        };
      } catch (error) {
        if (
          isRedirectError(error)
        ) {
          throw error;
        }

        return {
          kind: "error",
          message:
            getErrorMessage(error),
          nonce:
            previous.nonce + 1,
        };
      }
    },
    {
      kind: "idle",
      message: "",
      nonce: 0,
    },
  );

  useEffect(() => {
    const button =
      submitButtonRef.current;

    if (!button) {
      return;
    }

    if (pending) {
      button.disabled = true;
      button.setAttribute(
        "aria-busy",
        "true",
      );
      button.classList.add(
        "cursor-wait",
        "opacity-60",
      );
      button.textContent =
        pendingLabel(
          originalTextRef.current ||
            "Save",
        );

      return;
    }

    button.disabled = false;
    button.removeAttribute(
      "aria-busy",
    );
    button.classList.remove(
      "cursor-wait",
      "opacity-60",
    );

    if (
      originalTextRef.current
    ) {
      button.textContent =
        originalTextRef.current;
    }
  }, [pending]);

  useLayoutEffect(() => {
    const saved =
      scrollRef.current;

    if (!saved) {
      return;
    }

    window.scrollTo({
      left: saved.x,
      top: saved.y,
      behavior: "instant",
    });
  }, [pending, state.nonce]);

  useEffect(() => {
    if (
      state.kind === "idle"
    ) {
      return;
    }

    const button =
      submitButtonRef.current;

    if (button) {
      addFeedback(
        button,
        state.kind,
        state.message,
      );
    }

    if (
      state.kind === "success"
    ) {
      window.dispatchEvent(
        new CustomEvent(
          DATA_CHANGED_EVENT,
        ),
      );
    }
  }, [
    state.kind,
    state.message,
    state.nonce,
  ]);

  return (
    <form
      {...props}
      action={dispatch}
      onSubmit={(event) => {
  if (
    confirmMessage &&
    !window.confirm(confirmMessage)
  ) {
    event.preventDefault();
    return;
  }

  scrollRef.current = {
          x: window.scrollX,
          y: window.scrollY,
        };

        const nativeEvent =
          event.nativeEvent as SubmitEvent;

        const submitter =
          nativeEvent.submitter;

          if (
            submitter instanceof HTMLButtonElement
          ) {
            const buttonConfirmMessage =
              submitter.dataset.confirmMessage;

            const submitterText =
              (submitter.textContent ?? "")
                .trim()
                .toLowerCase();

            const isDestructive =
              submitterText.includes("delete") ||
              submitterText.includes("remove") ||
              submitterText.includes("destroy");

            const message =
              buttonConfirmMessage ??
              (isDestructive
                ? "Are you sure you want to continue? This action may permanently delete data and cannot necessarily be undone."
                : null);

            if (
              message &&
              !window.confirm(message)
            ) {
              event.preventDefault();
              return;
            }
          }

        if (
          submitter instanceof
          HTMLButtonElement
        ) {
          submitButtonRef.current =
            submitter;

          originalTextRef.current =
            (
              submitter.textContent ??
              "Save"
            ).trim();

          submitter
            .parentElement
            ?.querySelectorAll(
              "[data-admin-action-feedback]",
            )
            .forEach(
              (node) =>
                node.remove(),
            );
        }

        onSubmit?.(event);
      }}
    >
      {children}
    </form>
  );
}
