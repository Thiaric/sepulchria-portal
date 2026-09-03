"use client";

import { usePortalNotificationCounts } from "@/components/notifications/portal-notification-counts-provider";

type SubmittedCharacterBadgeProps = {
  variant: "floating" | "admin-nav";
};

export function SubmittedCharacterBadge({
  variant,
}: SubmittedCharacterBadgeProps) {
  const {
    isStaff,
    submittedCharacters: count,
  } = usePortalNotificationCounts();

  if (!isStaff || count <= 0) return null;

  const label = count > 9 ? "9+" : String(count);

  if (variant === "floating") {
    return (
      <span data-sep-counter-badge="true"
        title={`${count} submitted character sheet${count === 1 ? "" : "s"} awaiting review`}
        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-[#e1a14d] bg-[#7a291f] text-[8px] font-bold leading-none text-[#ffe1ac] shadow-[0_0_10px_rgba(225,161,77,0.35)]"
      >
        {label}
      </span>
    );
  }

  return (
    <span data-sep-counter-badge="true"
      title={`${count} submitted character sheet${count === 1 ? "" : "s"} awaiting review`}
      className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#d19a4c] bg-[#7a291f] text-[7px] font-bold leading-none text-[#ffe1ac]"
    >
      {label}
    </span>
  );
}
