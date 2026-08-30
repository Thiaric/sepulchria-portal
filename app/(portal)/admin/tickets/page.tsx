import Link from "next/link";

import { TicketLiveSync } from "@/components/support/ticket-live-sync";
import { requireAdminSection } from "@/lib/auth/require-staff";
import { getTicketUnreadCounts } from "@/lib/support/ticket-unread";
import { createAdminClient } from "@/lib/supabase/admin";

function Badge({ count }: { count: number }) {
  return count > 0 ? (
    <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-[rgb(var(--sep-colour-d19a4c))] bg-[rgb(var(--sep-colour-7a291f))] px-1 text-[8px] font-bold leading-none text-[rgb(var(--sep-colour-ffe1ac))]">
      {count > 99 ? "99+" : count}
    </span>
  ) : null;
}

function characterName(
  row:
    | {
        display_name: string | null;
        first_name: string | null;
        surname: string | null;
      }
    | null
    | undefined,
) {
  return (
    row?.display_name?.trim() ||
    `${row?.first_name ?? ""} ${row?.surname ?? ""}`.trim() ||
    null
  );
}

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    status?: string;
    priority?: string;
    q?: string;
  }>;
}) {
  const staff = await requireAdminSection("tickets");
  const p = (await searchParams) ?? {};
  const admin = createAdminClient();

  let q = admin
    .from("tickets")
    .select(
      "id,public_reference,category,status,priority,subject,opened_by_user_id,opened_by_character_id,assigned_staff_user_id,updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(250);

  if (staff.role === "master") q = q.neq("category", "report");
  if (p.status) q = q.eq("status", p.status);
  if (p.priority) q = q.eq("priority", p.priority);
  if (p.q?.trim()) q = q.ilike("subject", `%${p.q.trim()}%`);

  const { data: tickets, error } = await q;
  if (error) throw new Error(error.message);

  const ticketRows = tickets ?? [];
  const characterIds = [
    ...new Set(
      ticketRows
        .map((ticket) => ticket.opened_by_character_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const userIds = [
    ...new Set(
      ticketRows
        .map((ticket) => ticket.opened_by_user_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const [characterResult, userCharacterResult, unread] = await Promise.all([
    characterIds.length
      ? admin
          .from("characters")
          .select("id,user_id,display_name,first_name,surname")
          .in("id", characterIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? admin
          .from("characters")
          .select("id,user_id,display_name,first_name,surname")
          .in("user_id", userIds)
          .eq("is_system", false)
      : Promise.resolve({ data: [], error: null }),
    getTicketUnreadCounts({
      admin,
      userId: staff.userId,
      ticketIds: ticketRows.map((ticket) => ticket.id),
      audience: "staff",
    }),
  ]);

  if (characterResult.error) throw new Error(characterResult.error.message);
  if (userCharacterResult.error) throw new Error(userCharacterResult.error.message);

  const byId = new Map(
    (characterResult.data ?? []).map((row) => [row.id, row]),
  );
  const byUser = new Map(
    (userCharacterResult.data ?? []).map((row) => [row.user_id, row]),
  );

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <TicketLiveSync admin />
      <div className="mx-auto max-w-[1400px]">
        <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">
          Administration · Support
        </p>
        <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">
          Tickets
        </h1>

        <form
          method="get"
          data-sep-interaction-fixed="true"
          className="mt-6 grid gap-2 border border-[rgb(var(--sep-colour-60482e))]/45 p-4 md:grid-cols-4"
        >
          <input
            name="q"
            defaultValue={p.q ?? ""}
            placeholder="Search subject..."
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-sm text-[rgb(var(--sep-colour-d5c2a4))] outline-none transition placeholder:text-[rgb(var(--sep-colour-5f5447))] focus:border-[rgb(var(--sep-colour-a47a44))]"
          />
          <select
            name="status"
            defaultValue={p.status ?? ""}
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-sm text-[rgb(var(--sep-colour-d5c2a4))] outline-none"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_on_player">Waiting on Player</option>
            <option value="waiting_on_staff">Waiting on Staff</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            name="priority"
            defaultValue={p.priority ?? ""}
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-sm text-[rgb(var(--sep-colour-d5c2a4))] outline-none"
          >
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <button className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] text-[8px] uppercase">
            Apply Filters
          </button>
        </form>

        <div className="mt-5 space-y-2">
          {ticketRows.map((ticket) => {
            const n = unread.get(ticket.id) ?? 0;
            const opener =
              (ticket.opened_by_character_id
                ? byId.get(ticket.opened_by_character_id)
                : null) ??
              (ticket.opened_by_user_id
                ? byUser.get(ticket.opened_by_user_id)
                : null);

            const openerLabel = characterName(opener) ?? "Unknown player";

            return (
              <Link
                key={ticket.id}
                href={`/admin/tickets/${ticket.public_reference}`}
                data-sep-interactive-surface="row"
                className={`relative grid gap-3 border p-4 transition md:grid-cols-[150px_1fr_130px_130px_160px] ${
                  n > 0
                    ? "border-[rgb(var(--sep-colour-a87532))] bg-[rgb(var(--sep-colour-24190f))] shadow-[inset_3px_0_0_rgb(var(--sep-colour-c18a42))]"
                    : "border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] hover:border-[rgb(var(--sep-colour-947047))]"
                }`}
              >
                <Badge count={n} />
                <div className="text-[9px] uppercase text-[rgb(var(--sep-colour-a58b68))]">
                  {ticket.public_reference}
                </div>
                <div>
                  <div className="text-sm text-[rgb(var(--sep-colour-d9c4a2))]">
                    {ticket.subject}
                  </div>
                  <div className="mt-1 text-[8px] uppercase text-[rgb(var(--sep-colour-756957))]">
                    Opened by{" "}
                    <span className="text-[rgb(var(--sep-colour-c2aa83))]">
                      {openerLabel}
                    </span>
                    {" · "}
                    {ticket.category}
                  </div>
                </div>
                <div className="text-[8px] uppercase">
                  {ticket.status.replaceAll("_", " ")}
                </div>
                <div className="text-[8px] uppercase">{ticket.priority}</div>
                <div className="text-[8px]">
                  {ticket.assigned_staff_user_id === staff.userId
                    ? "Assigned to you"
                    : ticket.assigned_staff_user_id
                      ? "Assigned"
                      : "Unassigned"}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
