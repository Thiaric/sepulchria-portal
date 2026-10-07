"use client";

import {
  usePortalNotificationCounts,
} from "@/components/notifications/portal-notification-counts-provider";

export function AdminAggregateBadge() {
  const {
    isStaff,
    registrationApplications,
    orderSubmissions,
    submittedCharacters,
    tickets,
  } =
    usePortalNotificationCounts();

  if (!isStaff) {
    return null;
  }

  const count =
    registrationApplications +
    orderSubmissions +
    submittedCharacters +
    tickets.staff;

  if (count <= 0) {
    return null;
  }

  const label =
    count > 99
      ? "99+"
      : String(count);

  return (
    <span
      data-sep-counter-badge="true"
      data-admin-aggregate-badge="true"
      title={`${count} pending administration item${count === 1 ? "" : "s"}`}
      className="absolute -right-2 -top-2 z-[200] inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-[#d19a4c] bg-[#7a291f] px-1 text-[8px] font-bold leading-none text-[#ffe1ac] shadow-[0_0_10px_rgba(225,161,77,0.45)]"
    >
      {label}
    </span>
  );
}
