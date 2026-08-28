import Link from "next/link";
import type { ReactNode } from "react";

import { AdminInteractionKeeper } from "@/components/admin/admin-interaction-keeper";
import { SubmittedCharacterBadge } from "@/components/admin/submitted-character-badge";
import { RegistrationApplicationBadge } from "@/components/admin/registration-application-badge";
import { OrderSubmissionBadge } from "@/components/admin/order-submission-badge";
import { TicketNotificationBadge } from "@/components/support/ticket-notification-badge";
import { SanctionNotificationBadge } from "@/components/sanctions/sanction-notification-badge";
import {
  canAccessAdminSection,
  requireStaff,
  type AdminSection,
} from "@/lib/auth/require-staff";

import "./admin-compact.css";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  const staff = await requireStaff();

  const can = (
    section: AdminSection,
  ) =>
    canAccessAdminSection(
      staff.role,
      section,
    );

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

            {can("overview") ? (
              <AdminNavigationLink href="/admin">
                Overview
              </AdminNavigationLink>
            ) : null}
            
            {can("races") ? (
              <AdminNavigationLink href="/admin/races">
                Ancestries
              </AdminNavigationLink>
            ) : null}

            {can("areas") ? (
              <AdminNavigationLink href="/admin/areas">
                Areas
              </AdminNavigationLink>
            ) : null}

            {can("associations") ? (
              <AdminNavigationLink href="/admin/associations">
                Associations
              </AdminNavigationLink>
            ) : null}

            {can("character_logs") ? (
              <AdminNavigationLink href="/admin/character-audit">
                Character Log
              </AdminNavigationLink>
            ) : null}

            {can("characters") ? (
              <AdminNavigationLink href="/admin/characters">
                <span className="flex items-center gap-2">
                  <span>Characters</span>
                  <SubmittedCharacterBadge variant="admin-nav" />
                </span>
              </AdminNavigationLink>
            ) : null}

            {can("codex") ? (
              <AdminNavigationLink href="/admin/codex">
                Codex
              </AdminNavigationLink>
            ) : null}

            {can("items") ? (
              <AdminNavigationLink href="/admin/crafting-recipes">
                Crafting Recipes
              </AdminNavigationLink>
            ) : null}

            {can("events") ? (
              <AdminNavigationLink href="/admin/events">
                Events
              </AdminNavigationLink>
            ) : null}

            {can("expertise") ? (
              <AdminNavigationLink href="/admin/expertise">
                Expertise
              </AdminNavigationLink>
            ) : null}

            {can("gifts") ? (
              <AdminNavigationLink href="/admin/gifts">
                Feats
              </AdminNavigationLink>
            ) : null}

            {can("forum") ? (
              <AdminNavigationLink href="/admin/forum">
                Forum
              </AdminNavigationLink>
            ) : null}

            {can("items") ? (
              <AdminNavigationLink href="/admin/items">
                Items
              </AdminNavigationLink>
            ) : null}

            {can("items") ? (
              <AdminNavigationLink href="/admin/items/vault">
                Item Vault
              </AdminNavigationLink>
            ) : null}

            {can("jobs") ? (
              <AdminNavigationLink href="/admin/jobs">
                Jobs
              </AdminNavigationLink>
            ) : null}

            {can("rooms") ? (
              <AdminNavigationLink href="/admin/rooms">
                Locations
              </AdminNavigationLink>
            ) : null}

            {can("communication_logs") ? (
              <AdminNavigationLink href="/admin/communication-logs">
                Logs
              </AdminNavigationLink>
            ) : null}

            {can("market") ? (
              <AdminNavigationLink href="/admin/market">
                Market
              </AdminNavigationLink>
            ) : null}

            {can("media") ? (
              <AdminNavigationLink href="/admin/media">
                Media
              </AdminNavigationLink>
            ) : null}

            {can("orders") ? (
              <AdminNavigationLink href="/admin/orders">
                Orders
              </AdminNavigationLink>
            ) : null}

            {can("orders") ? (
              <AdminNavigationLink href="/admin/order-submissions">
                <span className="flex items-center gap-2">
                  <span>Order Submissions</span>
                  <OrderSubmissionBadge variant="admin-nav" />
                </span>
              </AdminNavigationLink>
            ) : null}

            {can("new_register") ? (
              <AdminNavigationLink href="/admin/registrations">
                <span className="flex items-center gap-2">
                  <span>Registrations</span>
                  <RegistrationApplicationBadge variant="admin-nav" />
                </span>
              </AdminNavigationLink>
            ) : null}

            {can("rules") ? (
              <AdminNavigationLink href="/admin/rules">
                Rules
              </AdminNavigationLink>
            ) : null}

            {can("safety") ? (
              <AdminNavigationLink href="/admin/safety">
                Safety
              </AdminNavigationLink>
            ) : null}

            {can("sanctions") ? (
              <AdminNavigationLink href="/admin/sanctions">
                <span className="flex items-center gap-2">
                  <span>Sanctions</span>
                  <SanctionNotificationBadge audience="staff" />
                </span>
              </AdminNavigationLink>
            ) : null}

            {can("shapes") ? (
              <AdminNavigationLink href="/admin/shapes">
                Shapes
              </AdminNavigationLink>
            ) : null}

            {can("tickets") ? (
              <AdminNavigationLink href="/admin/tickets">
                <span className="flex items-center gap-2">
                  <span>Tickets</span>
                  <TicketNotificationBadge
                    audience="staff"
                    variant="admin-nav"
                  />
                </span>
              </AdminNavigationLink>
            ) : null}

            {can("tidings") ? (
              <AdminNavigationLink href="/admin/tidings">
                Tidings
              </AdminNavigationLink>
            ) : null}

            {can("users") ? (
              <AdminNavigationLink href="/admin/users">
                Users
              </AdminNavigationLink>
            ) : null}

            {can("world") ? (
              <AdminNavigationLink href="/admin/world">
                World
              </AdminNavigationLink>
            ) : null}
          </nav>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3">
          <span className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-21170f))] px-2.5 py-1 text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c1a477))]">
            {staff.role}
          </span>

          <span className="text-[10px] text-[rgb(var(--sep-colour-8f806c))]">
            {staff.email ?? "Authenticated staff member"}
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
