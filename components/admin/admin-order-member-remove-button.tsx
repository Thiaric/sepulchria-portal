"use client";

import { useState, useTransition } from "react";

import {
  removeOrderMember,
} from "@/app/(portal)/admin/orders/membership-actions";

export function AdminOrderMemberRemoveButton({
  characterName,
  orderId,
  membershipId,
}: {
  characterName: string;
  orderId: string;
  membershipId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  function remove() {
    if (
      !window.confirm(
        `Remove ${characterName} from this Order?\n\nThis will remove their current Order membership.`,
      )
    ) {
      return;
    }

    setMessage(null);
    setError(false);

    const formData = new FormData();
    formData.set("orderId", orderId);
    formData.set("membershipId", membershipId);

    startTransition(async () => {
      try {
        await removeOrderMember(formData);
        setMessage("Removed successfully.");
        window.dispatchEvent(
          new CustomEvent("sepulchria:admin-data-changed"),
        );
      } catch (cause) {
        setError(true);
        setMessage(
          cause instanceof Error
            ? cause.message
            : "Unable to remove member.",
        );
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {message ? (
        <span
          role={error ? "alert" : "status"}
          className={
            error
              ? "text-[10px] text-[#d8a49a]"
              : "text-[10px] text-[#9fd0a9]"
          }
        >
          {error ? "✕ " : "✓ "}
          {message}
        </span>
      ) : null}

      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-red-300 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Removing..." : "Remove"}
      </button>
    </div>
  );
}
