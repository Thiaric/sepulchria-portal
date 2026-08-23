import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SanctionEvidence } from "@/components/sanctions/sanction-evidence";
import { requireSupportIdentity } from "@/lib/support/current-support-user";
import { createAdminClient } from "@/lib/supabase/admin";

import { createSanctionAppeal } from "../../actions";

function fmt(value: string | null) {
  if (!value) return "No expiry";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function SanctionAppealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const identity = await requireSupportIdentity();
  const { id } = await params;
  const admin = createAdminClient();

  const { data: sanction, error } = await admin
    .from("sanctions")
    .select(
      "id,ticket_id,sanction_type,status,reason_code,player_reason,issued_at,expires_at",
    )
    .eq("id", id)
    .eq("target_user_id", identity.userId)
    .maybeSingle();

  if (error || !sanction) notFound();

  const { data: appealEvents, error: appealError } = await admin
    .from("ticket_events")
    .select("ticket_id")
    .eq("event_type", "sanction_appeal_created")
    .contains("details", { sanction_id: sanction.id })
    .order("created_at", { ascending: false })
    .limit(1);

  if (appealError) throw new Error(appealError.message);

  const existingTicketId = appealEvents?.[0]?.ticket_id ?? null;

  if (existingTicketId) {
    const { data: ticket } = await admin
      .from("tickets")
      .select("public_reference")
      .eq("id", existingTicketId)
      .maybeSingle();

    if (ticket?.public_reference) {
      redirect(`/support/${ticket.public_reference}`);
    }
  }

  return (
    <main className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/sanctions"
          className="text-[8px] uppercase text-[rgb(var(--sep-colour-a58b68))]"
        >
          ← Sanctions
        </Link>

        <section className="mt-7 border border-[rgb(var(--sep-colour-7d493f))]/45 bg-[rgb(var(--sep-colour-18100e))] p-6">
          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c98f7f))]">
            Sanction Appeal
          </p>
          <h1 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-ead5ac))]">
            {label(sanction.sanction_type)}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[rgb(var(--sep-colour-b9a48b))]">
            Filing an appeal does not automatically suspend or revoke the sanction.
            Staff will review your appeal through the Support Centre.
          </p>

          <dl className="mt-5 grid gap-px bg-[rgb(var(--sep-colour-60482e))]/30 sm:grid-cols-2">
            <div className="bg-[rgb(var(--sep-colour-120e0b))] p-4">
              <dt className="text-[7px] uppercase text-[rgb(var(--sep-colour-756957))]">
                Issued
              </dt>
              <dd className="mt-1 text-xs">{fmt(sanction.issued_at)}</dd>
            </div>
            <div className="bg-[rgb(var(--sep-colour-120e0b))] p-4">
              <dt className="text-[7px] uppercase text-[rgb(var(--sep-colour-756957))]">
                Expires
              </dt>
              <dd className="mt-1 text-xs">{fmt(sanction.expires_at)}</dd>
            </div>
          </dl>

          <div className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/40 bg-black/10 p-4">
            <p className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-756957))]">
              Reason · {sanction.reason_code}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--sep-colour-d2bea1))]">
              {sanction.player_reason}
            </p>
          </div>
        </section>

        <SanctionEvidence ticketId={sanction.ticket_id} />

        <form
          action={createSanctionAppeal}
          className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5"
        >
          <input type="hidden" name="sanctionId" value={sanction.id} />

          <label className="block">
            <span className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-a58b68))]">
              Appeal statement
            </span>
            <textarea
              name="body"
              required
              maxLength={10000}
              rows={9}
              placeholder="Explain why you believe this sanction should be reviewed..."
              className="mt-3 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] p-3 text-sm leading-6"
            />
          </label>

          <p className="mt-3 text-[9px] leading-5 text-[rgb(var(--sep-colour-756957))]">
            Your appeal statement becomes the first message in a Support Centre
            ticket. Staff can reply there and you can continue the conversation
            through /support.
          </p>

          <button className="mt-4 border border-[rgb(var(--sep-colour-967342))] bg-[rgb(var(--sep-colour-3b2b1b))] px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-f1d9a7))]">
            Submit Appeal
          </button>
        </form>
      </div>
    </main>
  );
}
