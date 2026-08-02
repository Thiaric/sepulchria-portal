import Link from "next/link";
import type { ReactNode } from "react";

import { SubmittedCharacterBadge } from "@/components/admin/submitted-character-badge";
import { requireStaff } from "@/lib/auth/require-staff";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  const staff = await requireStaff();

  const canManageUsers =
    staff.role === "owner" ||
    staff.role === "admin";

  return (
    <div className="min-h-[calc(100vh-5rem)]">
      <div className="border-b border-[#60482e]/45 bg-[#100c09] px-5 py-4 sm:px-7 lg:px-9">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-[#8b704e]">
              Sepulchria staff
            </p>

            <h1 className="mt-1 font-serif text-2xl text-[#e2cda4]">
              Administration
            </h1>
          </div>

          <nav
            aria-label="Administration"
            className="flex flex-wrap items-center gap-2"
          >
            <AdminNavigationLink href="/admin">
              Overview
            </AdminNavigationLink>

            {canManageUsers ? (
              <AdminNavigationLink href="/admin/users">
                Users
              </AdminNavigationLink>
            ) : null}

            <AdminNavigationLink href="/admin/characters">
              <span className="flex items-center gap-2">
                <span>Characters</span>
                <SubmittedCharacterBadge variant="admin-nav" />
              </span>
            </AdminNavigationLink>

            <AdminNavigationLink href="/admin/areas">
              Areas
            </AdminNavigationLink>

            <AdminNavigationLink href="/admin/rooms">
              Rooms
            </AdminNavigationLink>

            <AdminNavigationLink href="/admin/races">
              Races
            </AdminNavigationLink>

            <AdminNavigationLink href="/admin/associations">
              Associations
            </AdminNavigationLink>

            <AdminNavigationLink href="/admin/forum">
              Forum
            </AdminNavigationLink>
          </nav>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#60482e]/30 pt-3">
          <span className="border border-[#765937]/55 bg-[#21170f] px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-[#c1a477]">
            {staff.role}
          </span>

          <span className="text-[10px] text-[#8f806c]">
            {staff.email ??
              "Authenticated staff member"}
          </span>
        </div>
      </div>

      {children}
    </div>
  );
}

function AdminNavigationLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="border border-[#60482e]/50 bg-[#18110d] px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-[#bca27b] transition hover:border-[#9b7446] hover:bg-[#2b1d12] hover:text-[#ecd2a3]"
    >
      {children}
    </Link>
  );
}
