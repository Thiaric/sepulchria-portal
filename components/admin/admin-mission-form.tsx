"use client";

import {
  useActionState,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";

export type AdminMissionActionState = {
  ok: boolean | null;
  message: string;
};

const INITIAL_STATE: AdminMissionActionState = {
  ok: null,
  message: "",
};

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-w-[88px] border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-21170f))] px-4 py-2 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d9c092))] transition-colors enabled:hover:border-[rgb(var(--sep-colour-a07945))] enabled:hover:bg-[rgb(var(--sep-colour-302116))] disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

export function AdminMissionForm({
  action,
  children,
  id,
  className,
}: {
  action: (
    previousState: AdminMissionActionState,
    formData: FormData,
  ) => Promise<AdminMissionActionState>;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  const [state, formAction] =
    useActionState(action, INITIAL_STATE);

  const [visible, setVisible] =
    useState(false);

  useEffect(() => {
    if (state.ok === null) return;

    setVisible(true);

    window.dispatchEvent(
      new CustomEvent(
        "sepulchria:admin-data-changed",
      ),
    );

    const timer = window.setTimeout(
      () => setVisible(false),
      5000,
    );

    return () =>
      window.clearTimeout(timer);
  }, [state]);

  return (
    <form
      id={id}
      action={formAction}
      className={`${className ?? ""} relative pb-16`}
    >
      {children}

      <div className="absolute bottom-4 right-4 flex min-w-[180px] flex-col items-end gap-1.5">
        <SaveButton />

        <div
          aria-live="polite"
          className={[
            "min-h-[18px] max-w-[280px] text-right text-[10px] leading-4 transition-opacity",
            visible
              ? "opacity-100"
              : "pointer-events-none opacity-0",
            state.ok === false
              ? "text-[rgb(var(--sep-colour-d26d60))]"
              : "text-[rgb(var(--sep-colour-bfa471))]",
          ].join(" ")}
        >
          {visible ? state.message : ""}
        </div>
      </div>
    </form>
  );
}
