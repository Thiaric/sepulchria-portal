import Link from "next/link";

import { TicketLiveSync } from "@/components/support/ticket-live-sync";
import { requireSupportIdentity } from "@/lib/support/current-support-user";
import { getTicketUnreadCounts } from "@/lib/support/ticket-unread";
import { createAdminClient } from "@/lib/supabase/admin";

function fmt(v: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(v));
}

function Badge({ count }: { count: number }) {
  return count > 0 ? (
    <span data-sep-counter-badge="true" className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-[#d19a4c] bg-[#7a291f] px-1 text-[8px] font-bold leading-none text-[#ffe1ac]">
      {count > 99 ? "99+" : count}
    </span>
  ) : null;
}

export default async function SupportPage() {
  const identity = await requireSupportIdentity();
  const admin = createAdminClient();

  const { data: tickets, error } = await admin
    .from("tickets")
    .select("id,public_reference,category,status,subject,created_at,updated_at")
    .eq("opened_by_user_id", identity.userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  const unread = await getTicketUnreadCounts({
    admin,
    userId: identity.userId,
    ticketIds: (tickets ?? []).map((ticket) => ticket.id),
    audience: "player",
  });

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <TicketLiveSync />
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
              Help · Support
            </p>
            <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">
              Ticket Centre
            </h1>
            <p className="mt-3 text-sm text-[rgb(var(--sep-colour-9c8d79))]">
              Ask for help or follow an existing request.
            </p>
          </div>
          <Link
            href="/support/new"
            className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-4 py-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d5b785))]"
          >
            Open New Ticket
          </Link>
        </div>

        <div className="mt-8 space-y-3">
          {(tickets ?? []).length === 0 ? (
            <div
              data-sep-interaction-fixed="true"
              className="border border-[rgb(var(--sep-colour-60482e))]/45 p-8 text-center text-sm text-[rgb(var(--sep-colour-8f806d))]"
            >
              You have no support tickets.
            </div>
          ) : (
            (tickets ?? []).map((ticket) => {
              const n = unread.get(ticket.id) ?? 0;
              return (
                <Link
                  key={ticket.id}
                  href={`/support/${ticket.public_reference}`}
                  data-sep-interaction-ignore="true"
                  className={`relative block border p-5 transition ${
                    n > 0
                      ? "border-[rgb(var(--sep-colour-a87532))] bg-[rgb(var(--sep-colour-24190f))] shadow-[inset_3px_0_0_rgb(var(--sep-colour-c18a42))]"
                      : "border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] hover:border-[rgb(var(--sep-colour-947047))]"
                  }`}
                >
                  <Badge count={n} />
                  <div className="flex justify-between gap-3">
                    <div>
                      <div className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8c704b))]">
                        {ticket.public_reference} · {ticket.category.replaceAll("_", " ")}
                      </div>
                      <h2 className="mt-2 font-serif text-xl text-[rgb(var(--sep-colour-e2c99f))]">
                        {ticket.subject}
                      </h2>
                    </div>
                    <span className="h-fit border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-b7a083))]">
                      {ticket.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-3 text-[9px] text-[rgb(var(--sep-colour-756957))]">
                    Opened {fmt(ticket.created_at)} · Updated {fmt(ticket.updated_at)}
                  </p>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
