"use client";

import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = {
  idleText: string;
  pendingText?: string;
  className?: string;
};

export function PendingSubmitButton({
  idleText,
  pendingText = "Working...",
  className = "",
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? pendingText : idleText}
    </button>
  );
}
