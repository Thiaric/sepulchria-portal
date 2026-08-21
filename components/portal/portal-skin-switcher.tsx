"use client";

import Link from "next/link";
import { usePortalSkin } from "@/components/portal/portal-skin-provider";

export function PortalSkinSwitcher() {
  const { selectedSkin } = usePortalSkin();

  return (
    <Link
      href="/appearance"
      aria-label="Portal appearance"
      title={`Portal appearance - ${selectedSkin}`}
      className="hidden h-8 items-center gap-1.5 border border-[rgb(var(--sep-colour-614b31))] bg-[rgb(var(--sep-colour-17120f))] px-2 text-[8px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-d8bf91))] transition hover:border-[rgb(var(--sep-colour-987344))] sm:flex sm:h-9 2xl:h-10"
    >
      <span aria-hidden="true" className="text-[12px]">◐</span>
      <span className="hidden xl:inline">Appearance</span>
    </Link>
  );
}
