import Link from "next/link";
import { notFound } from "next/navigation";

import { TicketLiveSync } from "@/components/support/ticket-live-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupportIdentity } from "@/lib/support/current-support-user";
import { replyToSupportTicket } from "../actions";

function fmt(v: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(v));
}

export default async function TicketPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const identity = await requireSupportIdentity();
  const { reference } = await params;
  const admin = createAdminClient();

  const { data: ticket, error } = await admin
    .from("tickets")
    .select("id,public_reference,category,status,subject,created_at,updated_at")
    .eq("public_reference", reference)
    .eq("opened_by_user_id", identity.userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!ticket) notFound();

  const { data: messages, error: messageError } = await admin
    .from("ticket_messages")
    .select("id,author_user_id,body,created_at")
    .eq("ticket_id", ticket.id)
    .eq("visibility", "player")
    .order("created_at", { ascending: true });

  if (messageError) throw new Error(messageError.message);

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <TicketLiveSync reference={ticket.public_reference} />
      <div className="mx-auto max-w-4xl">
        <Link
          href="/support"
          className="mt-3 inline-flex border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-5 py-3 text-[8px] uppercase text-[rgb(var(--sep-colour-d5b785))]"
        >
          ← Ticket Centre
        </Link>

        <div
          data-sep-interaction-fixed="true"
          className="mt-7 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-6"
        >
          <p className="text-[8px] uppercase text-[rgb(var(--sep-colour-8c704b))]">
            {ticket.public_reference} · {ticket.category.replaceAll("_", " ")}
          </p>
          <h1 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-ead5ac))]">
            {ticket.subject}
          </h1>
          <p className="mt-3 text-[9px] text-[rgb(var(--sep-colour-756957))]">
            Opened {fmt(ticket.created_at)} · {ticket.status.replaceAll("_", " ")}
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {(messages ?? []).map((message) => (
            <div
              key={message.id}
              data-sep-interaction-fixed="true"
              className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5"
            >
              <div className="text-[8px] uppercase text-[rgb(var(--sep-colour-8c704b))]">
                {message.author_user_id === identity.userId
                  ? identity.characterName ?? "You"
                  : "Sepulchria Staff"}{" "}
                · {fmt(message.created_at)}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[rgb(var(--sep-colour-c7b79e))]">
                {message.body}
              </p>
            </div>
          ))}
        </div>

        {ticket.status !== "closed" ? (
          <form
            action={replyToSupportTicket}
            data-sep-interaction-fixed="true"
            className="mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5"
          >
            <input type="hidden" name="ticketId" value={ticket.id} />
            <input type="hidden" name="reference" value={ticket.public_reference} />
            <textarea
              name="body"
              required
              maxLength={10000}
              rows={6}
              className="w-full bg-[rgb(var(--sep-colour-100c09))] p-3"
            />
            <button className="mt-3 border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-5 py-3 text-[8px] uppercase text-[rgb(var(--sep-colour-d5b785))]">
              Send Reply
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
