"use client";

import { usePathname } from "next/navigation";

import {
  CompactCityActivity,
} from "@/components/portal/compact-city-activity";

export function DashboardCityActivitySlot() {
  const pathname =
    usePathname();

  if (pathname !== "/") {
    return null;
  }

  return (
    <div className="shrink-0 components_portal_dashboard_city_activity_slot_div_container">
      <CompactCityActivity />
    </div>
  );
}
