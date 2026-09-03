"use client";

import { usePortalNotificationCounts } from "@/components/notifications/portal-notification-counts-provider";

type Props = {
  variant: "floating" | "admin-nav";
};

export function OrderSubmissionBadge({
  variant,
}: Props) {
  const { orderSubmissions: count } =
    usePortalNotificationCounts();

  if (count <= 0) return null;

  const label = count > 99 ? "99+" : String(count);
  const title = `${count} pending Order submission${count === 1 ? "" : "s"}`;
  const baseClass =
    "inline-flex items-center justify-center rounded-full border border-[#d19a4c] bg-[#7a291f] font-bold leading-none text-[#ffe1ac]";

  if (variant === "floating") {
    return (
      <span
        title={title}
        className={`absolute -right-2 -top-2 h-5 min-w-5 px-1 text-[8px] ${baseClass}`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      title={title}
      className={`ml-auto h-4 min-w-4 px-1 text-[7px] ${baseClass}`}
    >
      {label}
    </span>
  );
}
