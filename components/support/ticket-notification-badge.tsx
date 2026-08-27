"use client";

import { usePortalNotificationCounts } from "@/components/notifications/portal-notification-counts-provider";

export function TicketNotificationBadge({
  audience,
  variant,
}: {
  audience: "player" | "staff";
  variant: "sidebar" | "admin-nav" | "floating";
}) {
  const { tickets } =
    usePortalNotificationCounts();

  const count = tickets[audience];

  if (count <= 0) return null;

  const label = count > 99 ? "99+" : String(count);
  const badgeClass =
    "inline-flex items-center justify-center rounded-full border border-[rgb(var(--sep-colour-d19a4c))] bg-[rgb(var(--sep-colour-7a291f))] font-bold leading-none text-[rgb(var(--sep-colour-ffe1ac))]";

  if (variant === "floating") {
    return (
      <span
        className={`absolute -right-2 -top-2 h-5 min-w-5 px-1 text-[8px] ${badgeClass}`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={`ml-auto h-4 min-w-4 px-1 text-[7px] ${badgeClass}`}
    >
      {label}
    </span>
  );
}
