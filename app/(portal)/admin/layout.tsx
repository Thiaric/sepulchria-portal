import Link from "next/link";
import type { ReactNode } from "react";

import { AdminInteractionKeeper } from "@/components/admin/admin-interaction-keeper";
import { SubmittedCharacterBadge } from "@/components/admin/submitted-character-badge";
import { requireStaff } from "@/lib/auth/require-staff";

import "./admin-compact.css";

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
      <AdminInteractionKeeper />
      <div className="border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-5 py-4 sm:px-7 lg:px-9">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8b704e))]">
              Sepulchria staff
            </p>

            <h1 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-e2cda4))]">
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

            <AdminNavigationLink href="/admin/races">
              Ancestries
            </AdminNavigationLink>            

            <AdminNavigationLink href="/admin/areas">
              Areas
            </AdminNavigationLink>

            <AdminNavigationLink href="/admin/associations">
              Associations
            </AdminNavigationLink>           

            <AdminNavigationLink href="/admin/characters">
              <span className="flex items-center gap-2">
                <span>Characters</span>
                <SubmittedCharacterBadge variant="admin-nav" />
              </span>
            </AdminNavigationLink>

            <AdminNavigationLink href="/admin/events">
              Events
            </AdminNavigationLink>

            <AdminNavigationLink href="/admin/expertise">
              Expertise
            </AdminNavigationLink>

            <AdminNavigationLink href="/admin/gifts">
              Feats
            </AdminNavigationLink>

            <AdminNavigationLink href="/admin/items">
              Items
            </AdminNavigationLink>

            <AdminNavigationLink href="/admin/jobs">
              Jobs
            </AdminNavigationLink>

            <AdminNavigationLink href="/admin/market">
              Market
            </AdminNavigationLink>

            <AdminNavigationLink href="/admin/items/vault">
              Item Vault
            </AdminNavigationLink>

            <AdminNavigationLink href="/admin/forum">
              Forum
            </AdminNavigationLink>            

            <AdminNavigationLink href="/admin/communication-logs">
              Logs
            </AdminNavigationLink>

            <AdminNavigationLink href="/admin/rooms">
              Locations
            </AdminNavigationLink>

            <AdminNavigationLink href="/admin/orders">
              Orders
            </AdminNavigationLink>

            <AdminNavigationLink href="/admin/rules">
              Rules
            </AdminNavigationLink>

            <AdminNavigationLink href="/admin/shapes">
              Shapes
            </AdminNavigationLink>
          
            <AdminNavigationLink href="/admin/tidings">
              Tidings
            </AdminNavigationLink>            

            {canManageUsers ? (
              <>
                <AdminNavigationLink href="/admin/media">
                  Media
                </AdminNavigationLink>

                <AdminNavigationLink href="/admin/users">
                  Users
                </AdminNavigationLink>
              </>
            ) : null}

            <AdminNavigationLink href="/admin/world">
              World
            </AdminNavigationLink>
          </nav>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3">
          <span className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-21170f))] px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c1a477))]">
            {staff.role}
          </span>

          <span className="text-[10px] text-[rgb(var(--sep-colour-8f806c))]">
            {staff.email ??
              "Authenticated staff member"}
          </span>
        </div>
      </div>

      <div className="admin-compact">
        {children}
      </div>
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
      className="border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-18110d))] px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-bca27b))] transition hover:border-[rgb(var(--sep-colour-9b7446))] hover:bg-[rgb(var(--sep-colour-2b1d12))] hover:text-[rgb(var(--sep-colour-ecd2a3))]"
    >
      {children}
    </Link>
  );
}
