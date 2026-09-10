"use client";

import { usePortalNotificationCounts } from "@/components/notifications/portal-notification-counts-provider";

type RegistrationApplicationBadgeProps = {
  variant: "floating" | "admin-nav";
};

export function RegistrationApplicationBadge({
  variant,
}: RegistrationApplicationBadgeProps) {
  const { registrationApplications: count } =
    usePortalNotificationCounts();

  if (count <= 0) return null;

  const label = count > 99 ? "99+" : String(count);
  const title = `${count} pending registration application${count === 1 ? "" : "s"}`;
  const baseClass =
    "inline-flex items-center justify-center rounded-full border border-[#d19a4c] bg-[#7a291f] font-bold leading-none text-[#ffe1ac]";

  if (variant === "floating") {
    return (
      <span
        data-sep-counter-badge="true"
        data-registration-application-badge="floating"
        title={title}
        className={[((`absolute -right-2 -top-2 z-[200] h-5 min-w-5 px-1 text-[8px] shadow-[0_0_10px_rgba(225,161,77,0.45)] ${baseClass}`)), "components_admin_registration_application_badge_span_text"].filter(Boolean).join(" ")}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      data-sep-counter-badge="true"
      data-registration-application-badge="admin-nav"
      title={title}
      className={[((`ml-auto h-4 min-w-4 px-1 text-[7px] ${baseClass}`)), "components_admin_registration_application_badge_span_text_2"].filter(Boolean).join(" ")}
    >
      {label}
    </span>
  );
}
