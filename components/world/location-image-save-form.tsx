"use client";

import {
  type ComponentProps,
  type ReactNode,
  useActionState,
  useEffect,
} from "react";

type ServerAction = (
  formData: FormData,
) => Promise<unknown>;

type State = {
  kind: "idle" | "success" | "error";
  message: string;
  nonce: number;
};

type Props = Omit<
  ComponentProps<"form">,
  "action"
> & {
  action: ServerAction;
  children: ReactNode;
};

function isRedirectError(error: unknown) {
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

  return false;
}

export function LocationImageSaveForm({
  action,
  children,
  ...props
}: Props) {
  const [
    state,
    dispatch,
    pending,
  ] = useActionState<State, FormData>(
    async (previous, formData) => {
      try {
        await action(formData);

        return {
          kind: "success",
          message:
            "Location images saved.",
          nonce:
            previous.nonce + 1,
        };
      } catch (error) {
        if (isRedirectError(error)) {
          throw error;
        }

        return {
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to save location images.",
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
    if (
      state.kind === "idle"
    ) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        /*
         * useActionState cannot be directly reset,
         * so hide the rendered feedback element.
         */
        const feedback =
          document.querySelector(
            `[data-location-image-feedback="${state.nonce}"]`,
          );

        feedback?.remove();
      }, 5000);

    return () =>
      window.clearTimeout(timer);
  }, [
    state.kind,
    state.nonce,
  ]);

  return (
    <form
      {...props}
      action={dispatch}
    >
      <fieldset
        disabled={pending}
        className="contents"
      >
        {children}
      </fieldset>

      {state.kind !== "idle" ? (
        <p
          data-location-image-feedback={
            state.nonce
          }
          role={
            state.kind === "error"
              ? "alert"
              : "status"
          }
          className={
            state.kind ===
            "success"
              ? "mt-2 text-[9px] leading-4 text-[rgb(var(--sep-colour-9fd0a9))]"
              : "mt-2 text-[9px] leading-4 text-[rgb(var(--sep-colour-d8a49a))]"
          }
        >
          {state.kind === "success"
            ? "✓ "
            : "✕ "}
          {state.message}
        </p>
      ) : null}

      {pending ? (
        <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-8f8271))]">
          Saving...
        </p>
      ) : null}
    </form>
  );
}