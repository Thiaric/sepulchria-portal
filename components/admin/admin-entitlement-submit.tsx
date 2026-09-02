"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

export type AdminSaveFeedback = {
  tone: "success" | "error";
  message: string;
};

type ServerFormAction = (
  formData: FormData,
) => Promise<unknown>;

export function useAdminEntitlementSubmit(
  initialEnabled: Record<string, boolean>,
) {
  const [enabledByKey, setEnabledByKey] =
    useState<Record<string, boolean>>(
      initialEnabled,
    );

  const [pendingKey, setPendingKey] =
    useState<string | null>(null);

  const [feedbackByKey, setFeedbackByKey] =
    useState<
      Record<
        string,
        AdminSaveFeedback | undefined
      >
    >({});

  const timers = useRef<
    Record<string, number>
  >({});

  useEffect(() => {
    return () => {
      for (const timer of Object.values(
        timers.current,
      )) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  function clearFeedbackLater(
    key: string,
  ) {
    const existing = timers.current[key];

    if (existing) {
      window.clearTimeout(existing);
    }

    timers.current[key] =
      window.setTimeout(() => {
        setFeedbackByKey((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });

        delete timers.current[key];
      }, 5000);
  }

  async function submit(
    key: string,
    formData: FormData,
    action: ServerFormAction,
    successMessage = "Saved.",
  ) {
    const existing = timers.current[key];

    if (existing) {
      window.clearTimeout(existing);
      delete timers.current[key];
    }

    setPendingKey(key);
    setFeedbackByKey((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });

    try {
      await action(formData);

      const enabled =
        String(
          formData.get("enabled") ??
            "false",
        ) === "true";

      setEnabledByKey((current) => ({
        ...current,
        [key]: enabled,
      }));

      setFeedbackByKey((current) => ({
        ...current,
        [key]: {
          tone: "success",
          message: successMessage,
        },
      }));

      window.dispatchEvent(
        new CustomEvent(
          "sepulchria:admin-data-changed",
        ),
      );

      clearFeedbackLater(key);
    } catch (error) {
      setFeedbackByKey((current) => ({
        ...current,
        [key]: {
          tone: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to save changes.",
        },
      }));

      clearFeedbackLater(key);
    } finally {
      setPendingKey((current) =>
        current === key ? null : current,
      );
    }
  }

  return {
    enabledByKey,
    pendingKey,
    feedbackByKey,
    submit,
  };
}

export function AdminSaveFeedbackMessage({
  feedback,
}: {
  feedback:
    | AdminSaveFeedback
    | undefined;
}) {
  if (!feedback) return null;

  return (
    <span
      role={
        feedback.tone === "error"
          ? "alert"
          : "status"
      }
      className={
        feedback.tone === "success"
          ? "text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a8cf92))]"
          : "text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d89486))]"
      }
    >
      {feedback.message}
    </span>
  );
}
