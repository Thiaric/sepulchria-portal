"use client";

import Link from "next/link";

import { usePortalNotificationCounts } from "@/components/notifications/portal-notification-counts-provider";
import { SanctionNotificationBadge } from "./sanction-notification-badge";

export function PlayerSanctionsSidebarLink() {
  const { sanctions } =
    usePortalNotificationCounts();

  if (!sanctions.playerHasSanctions) {
    return null;
  }

  return (
    <Link
      href="/sanctions"
      className="flex items-center py-0.5 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8b70))] transition hover:text-[rgb(var(--sep-colour-d8bf91))]"
    >
      <span>Sanctions</span>
      <SanctionNotificationBadge audience="player" />
    </Link>
  );
}
