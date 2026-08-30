"use client";

import {
  type ComponentProps,
  type ReactNode,
  useActionState,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type ServerAction = (
  formData: FormData,
) => Promise<unknown>;

type InlineResult = {
  kind: "idle" | "success" | "error";
  message: string;
  nonce: number;
};

type Props = Omit<
  ComponentProps<"form">,
  "action" | "children"
> & {
  action: ServerAction;
  children: ReactNode;
  successMessage?: string;
};

function resultMessage(
  value: unknown,
  fallback: string,
) {
  if (
    value &&
    typeof value === "object" &&
    "message" in value &&
    typeof (
      value as {
        message?: unknown;
      }
    ).message === "string"
  ) {
    return (
      value as {
        message: string;
      }
    ).message;
  }

  return fallback;
}

function resultFailed(
  value: unknown,
) {
  return Boolean(
    value &&
      typeof value === "object" &&
      "ok" in value &&
      (
        value as {
          ok?: unknown;
        }
      ).ok === false,
  );
}

function errorMessage(
  error: unknown,
) {
  return error instanceof Error &&
    error.message
    ? error.message
    : "Unable to complete this action.";
}

function pendingText(
  label: string,
) {
  const value =
    label.toLowerCase();

  if (
    value.includes("remove") ||
    value.includes("delete")
  ) {
    return "Removing...";
  }

  if (
    value.includes("assign")
  ) {
    return "Assigning...";
  }

  if (
    value.includes("add")
  ) {
    return "Adding...";
  }

  return "Saving...";
}

export function InlineActionForm({
  action,
  children,
  successMessage = "Saved successfully.",
  onSubmit,
  ...props
}: Props) {
  const router = useRouter();

  const submitButtonRef =
    useRef<HTMLButtonElement | null>(
      null,
    );

  const originalLabelRef =
    useRef("");

  const scrollRef =
    useRef<{
      x: number;
      y: number;
    } | null>(null);

  const [
    showFeedback,
    setShowFeedback,
  ] = useState(false);

  const [
    state,
    dispatch,
    pending,
  ] = useActionState<
    InlineResult,
    FormData
  >(
    async (
      previous,
      formData,
    ) => {
      try {
        const result =
          await action(formData);

        if (resultFailed(result)) {
          return {
            kind: "error",
            message:
              resultMessage(
                result,
                "Unable to complete this action.",
              ),
            nonce:
              previous.nonce + 1,
          };
        }

        return {
          kind: "success",
          message:
            resultMessage(
              result,
              successMessage,
            ),
          nonce:
            previous.nonce + 1,
        };
      } catch (error) {
        return {
          kind: "error",
          message:
            errorMessage(error),
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

    if (!button) return;

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
        pendingText(
          originalLabelRef.current ||
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
      originalLabelRef.current
    ) {
      button.textContent =
        originalLabelRef.current;
    }
  }, [pending]);

  useEffect(() => {
    if (
      state.kind === "idle"
    ) {
      return;
    }

    setShowFeedback(true);

    const timer =
      window.setTimeout(
        () =>
          setShowFeedback(false),
        5000,
      );

    if (
      state.kind === "success"
    ) {
      router.refresh();
    }

    return () =>
      window.clearTimeout(timer);
  }, [
    router,
    state.kind,
    state.nonce,
  ]);

  useLayoutEffect(() => {
    const saved =
      scrollRef.current;

    if (!saved) return;

    window.scrollTo({
      left: saved.x,
      top: saved.y,
      behavior: "instant",
    });
  }, [
    pending,
    state.nonce,
  ]);

  return (
    <form
      {...props}
      action={dispatch}
      onSubmit={(event) => {
        scrollRef.current = {
          x: window.scrollX,
          y: window.scrollY,
        };

        const nativeEvent =
          event.nativeEvent as SubmitEvent;

        const submitter =
          nativeEvent.submitter;

        if (
          submitter instanceof
          HTMLButtonElement
        ) {
          const confirmMessage =
            submitter.dataset
              .confirmMessage;

          if (
            confirmMessage &&
            !window.confirm(
              confirmMessage,
            )
          ) {
            event.preventDefault();
            return;
          }

          submitButtonRef.current =
            submitter;

          originalLabelRef.current =
            (
              submitter.textContent ??
              "Save"
            ).trim();
        }

        onSubmit?.(event);
      }}
    >
      {children}

      {showFeedback &&
      state.kind !== "idle" ? (
        <p
          role={
            state.kind === "error"
              ? "alert"
              : "status"
          }
          className={[
            "mt-2 text-[10px] leading-5",
            state.kind ===
            "success"
              ? "text-[rgb(var(--sep-colour-9fd0a9))]"
              : "text-[rgb(var(--sep-colour-d8a49a))]",
          ].join(" ")}
        >
          {state.kind ===
          "success"
            ? "✓ "
            : "✕ "}
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
