"use client";

import { usePortalNotificationCounts } from "@/components/notifications/portal-notification-counts-provider";

export function SanctionNotificationBadge({
  audience,
}: {
  audience: "player" | "staff";
}) {
  const { sanctions } =
    usePortalNotificationCounts();

  const count = sanctions[audience];

  if (!count) return null;

  return (
    <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-[rgb(var(--sep-colour-d19a4c))] bg-[rgb(var(--sep-colour-7a291f))] px-1 text-[7px] font-bold text-[rgb(var(--sep-colour-ffe1ac))]">
      {count > 99 ? "99+" : count}
    </span>
  );
}
