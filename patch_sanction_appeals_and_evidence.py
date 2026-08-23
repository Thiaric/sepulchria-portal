#!/usr/bin/env python3
from pathlib import Path
import argparse
import subprocess

BASELINE = "be154e84a3ff924ff3ef8eb34c276c89a122111a"

def once(s, a, b, label):
    n = s.count(a)
    if n != 1:
        raise SystemExit(
            f"ERROR: {label}: expected anchor once, found {n}. Nothing written."
        )
    return s.replace(a, b, 1)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    root = Path.cwd()
    if not (root / "package.json").exists():
        raise SystemExit("ERROR: run from sepulchria-portal root.")

    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        text=True,
    ).strip()

    if head != BASELINE:
        raise SystemExit(
            f"ERROR: HEAD is {head}; expected {BASELINE}."
        )

    changes = {}

    p = root / "components/sanctions/sanction-evidence.tsx"
    s = r'''import { createAdminClient } from "@/lib/supabase/admin";

function fmt(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function label(value: string | null) {
  return (value ?? "content")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type ContextRow = {
  id?: string;
  body?: string;
  message?: string;
  created_at?: string;
  author_name?: string;
  sender_name?: string;
};

function contextRows(context: unknown): ContextRow[] {
  if (!context || typeof context !== "object") return [];
  const record = context as Record<string, unknown>;
  const candidate =
    record.surrounding_posts ??
    record.surrounding_messages;

  return Array.isArray(candidate)
    ? candidate.filter(
        (row): row is ContextRow =>
          Boolean(row) && typeof row === "object",
      )
    : [];
}

export async function SanctionEvidence({
  ticketId,
}: {
  ticketId: string | null;
}) {
  if (!ticketId) return null;

  const admin = createAdminClient();

  const { data: evidence, error } = await admin
    .from("report_evidence")
    .select(
      "id,evidence_type,source_type,source_id,author_name_snapshot,content_snapshot,original_created_at,context_snapshot,captured_at",
    )
    .eq("ticket_id", ticketId)
    .order("captured_at", { ascending: true });

  if (error) {
    throw new Error("Unable to load sanction evidence.");
  }

  if (!evidence?.length) return null;

  return (
    <section className="mt-4 border border-[rgb(var(--sep-colour-70483f))]/45 bg-[rgb(var(--sep-colour-120e0b))]">
      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/40 px-5 py-4">
        <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c98f7f))]">
          Preserved Evidence
        </p>
        <p className="mt-2 max-w-3xl text-[10px] leading-5 text-[rgb(var(--sep-colour-887a67))]">
          This contains only evidence preserved for the moderation case.
          The original ticket discussion and internal staff notes are not included.
        </p>
      </header>

      <div className="space-y-4 p-5">
        {evidence.map((item, index) => {
          const rows = contextRows(item.context_snapshot);

          return (
            <article
              key={item.id}
              className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/10"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/35 px-4 py-3">
                <p className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-b58a69))]">
                  Evidence #{index + 1} · {label(item.source_type)}
                </p>
                <p className="text-[8px] text-[rgb(var(--sep-colour-756957))]">
                  Preserved {fmt(item.captured_at)}
                </p>
              </div>

              <div className="p-4">
                <p className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-756957))]">
                  Original content
                  {item.author_name_snapshot
                    ? ` · ${item.author_name_snapshot}`
                    : ""}
                  {item.original_created_at
                    ? ` · ${fmt(item.original_created_at)}`
                    : ""}
                </p>

                <div className="mt-2 whitespace-pre-wrap break-words border-l-2 border-[rgb(var(--sep-colour-a65343))] bg-black/20 p-4 text-sm leading-6 text-[rgb(var(--sep-colour-d6c3aa))]">
                  {item.content_snapshot || "(No text snapshot)"}
                </div>

                {rows.length > 0 ? (
                  <div className="mt-5 space-y-2">
                    <p className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-756957))]">
                      Preserved context
                    </p>

                    {rows.map((row, rowIndex) => (
                      <div
                        key={row.id ?? `${item.id}-${rowIndex}`}
                        className="border border-[rgb(var(--sep-colour-60482e))]/30 bg-black/10 p-3"
                      >
                        <p className="text-[7px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-756957))]">
                          {row.author_name ?? row.sender_name ?? "Unknown"}
                          {row.created_at ? ` · ${fmt(row.created_at)}` : ""}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-[rgb(var(--sep-colour-bdac93))]">
                          {row.body ?? row.message ?? "(No text snapshot)"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
'''
    changes[p] = s

    p = root / "app/(portal)/sanctions/actions.ts"
    s = r'''"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSupportIdentity } from "@/lib/support/current-support-user";
import { createAdminClient } from "@/lib/supabase/admin";

function read(value: FormDataEntryValue | null, max: number) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function sanctionLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function createSanctionAppeal(formData: FormData) {
  const identity = await requireSupportIdentity();
  const sanctionId = read(formData.get("sanctionId"), 80);
  const body = read(formData.get("body"), 10000);

  if (!sanctionId) throw new Error("The sanction is missing.");
  if (!body) {
    throw new Error("Please explain why you are appealing this sanction.");
  }

  const admin = createAdminClient();

  const { data: sanction, error: sanctionError } = await admin
    .from("sanctions")
    .select("id,sanction_type,status,target_user_id,issued_at")
    .eq("id", sanctionId)
    .eq("target_user_id", identity.userId)
    .maybeSingle();

  if (sanctionError || !sanction) {
    throw new Error("This sanction is unavailable.");
  }

  const { data: existingEvents, error: existingError } = await admin
    .from("ticket_events")
    .select("ticket_id,details")
    .eq("event_type", "sanction_appeal_created")
    .contains("details", { sanction_id: sanction.id })
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) throw new Error(existingError.message);

  const existingTicketId = existingEvents?.[0]?.ticket_id ?? null;

  if (existingTicketId) {
    const { data: existingTicket } = await admin
      .from("tickets")
      .select("public_reference")
      .eq("id", existingTicketId)
      .maybeSingle();

    if (existingTicket?.public_reference) {
      redirect(`/support/${existingTicket.public_reference}`);
    }
  }

  const { data: ticket, error: ticketError } = await admin
    .from("tickets")
    .insert({
      category: "support",
      status: "open",
      priority: "normal",
      subject: `Appeal · ${sanctionLabel(sanction.sanction_type)}`,
      opened_by_user_id: identity.userId,
      opened_by_character_id: identity.characterId,
    })
    .select("id,public_reference")
    .single();

  if (ticketError || !ticket) {
    throw new Error(
      `Unable to create appeal ticket: ${ticketError?.message ?? "unknown error"}`,
    );
  }

  const { error: messageError } = await admin
    .from("ticket_messages")
    .insert({
      ticket_id: ticket.id,
      author_user_id: identity.userId,
      author_character_id: identity.characterId,
      visibility: "player",
      body,
    });

  if (messageError) {
    throw new Error(
      `Appeal ticket created but the appeal statement could not be saved: ${messageError.message}`,
    );
  }

  const { error: eventError } = await admin
    .from("ticket_events")
    .insert({
      ticket_id: ticket.id,
      actor_user_id: identity.userId,
      actor_character_id: identity.characterId,
      event_type: "sanction_appeal_created",
      details: {
        source: "sanction_appeal",
        sanction_id: sanction.id,
        sanction_type: sanction.sanction_type,
        sanction_status: sanction.status,
      },
    });

  if (eventError) {
    throw new Error(
      `Appeal ticket created but the sanction link could not be recorded: ${eventError.message}`,
    );
  }

  revalidatePath("/sanctions");
  revalidatePath("/support");

  redirect(`/support/${ticket.public_reference}`);
}
'''
    changes[p] = s

    p = root / "app/(portal)/sanctions/[id]/appeal/page.tsx"
    s = r'''import Link from "next/link";
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
'''
    changes[p] = s

    p = root / "app/(portal)/sanctions/page.tsx"
    s = p.read_text(encoding="utf-8")
    s = once(
        s,
        'import { SanctionLiveSync } from "@/components/sanctions/sanction-live-sync";',
        'import Link from "next/link";\nimport { SanctionLiveSync } from "@/components/sanctions/sanction-live-sync";\nimport { SanctionEvidence } from "@/components/sanctions/sanction-evidence";',
        "player sanction imports",
    )
    s = once(
        s,
        '''  const {data,error}=await admin.from("sanctions").select("id,ticket_id,sanction_type,status,reason_code,player_reason,expires_at,issued_at,revoked_at,revocation_reason").eq("target_user_id",identity.userId).order("issued_at",{ascending:false});
  if(error)throw new Error("Unable to load your sanction history.");
  const now=Date.now();''',
        '''  const {data,error}=await admin.from("sanctions").select("id,ticket_id,sanction_type,status,reason_code,player_reason,expires_at,issued_at,revoked_at,revocation_reason").eq("target_user_id",identity.userId).order("issued_at",{ascending:false});
  if(error)throw new Error("Unable to load your sanction history.");

  const {data:appealEvents,error:appealError}=await admin.from("ticket_events").select("ticket_id,details").eq("event_type","sanction_appeal_created");
  if(appealError)throw new Error(appealError.message);

  const appealTicketIds=[...new Set((appealEvents??[]).map(e=>e.ticket_id).filter(Boolean))] as string[];
  const {data:appealTickets,error:appealTicketError}=appealTicketIds.length
    ? await admin.from("tickets").select("id,public_reference,status").in("id",appealTicketIds)
    : {data:[],error:null};

  if(appealTicketError)throw new Error(appealTicketError.message);

  const ticketById=new Map((appealTickets??[]).map(t=>[t.id,t]));
  const appealBySanction=new Map<string,{public_reference:string;status:string}>();

  for(const event of appealEvents??[]){
    const details=event.details&&typeof event.details==="object"?event.details as Record<string,unknown>:null;
    const sanctionId=typeof details?.sanction_id==="string"?details.sanction_id:null;
    const ticket=ticketById.get(event.ticket_id);
    if(sanctionId&&ticket&&!appealBySanction.has(sanctionId)){
      appealBySanction.set(sanctionId,{public_reference:ticket.public_reference,status:ticket.status});
    }
  }

  const now=Date.now();''',
        "player appeal lookup",
    )
    s = once(
        s,
        '''        {status==="revoked"&&s.revocation_reason?<div className="mt-3 border-l-2 border-[rgb(var(--sep-colour-6e7547))]/55 bg-[rgb(var(--sep-colour-182016))]/70 p-4"><p className="text-[7px] uppercase text-[rgb(var(--sep-colour-8a9670))]">Revoked {s.revoked_at?`· ${fmt(s.revoked_at)}`:""}</p><p className="mt-2 text-sm">{s.revocation_reason}</p></div>:null}
      </article>})}''',
        '''        {status==="revoked"&&s.revocation_reason?<div className="mt-3 border-l-2 border-[rgb(var(--sep-colour-6e7547))]/55 bg-[rgb(var(--sep-colour-182016))]/70 p-4"><p className="text-[7px] uppercase text-[rgb(var(--sep-colour-8a9670))]">Revoked {s.revoked_at?`· ${fmt(s.revoked_at)}`:""}</p><p className="mt-2 text-sm">{s.revocation_reason}</p></div>:null}

        <SanctionEvidence ticketId={s.ticket_id}/>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {appealBySanction.get(s.id)?<Link href={`/support/${appealBySanction.get(s.id)!.public_reference}`} className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-4 py-2.5 text-[8px] uppercase text-[rgb(var(--sep-colour-d5b785))]">Open Appeal · {appealBySanction.get(s.id)!.status.replaceAll("_"," ")}</Link>:<Link href={`/sanctions/${s.id}/appeal`} className="border border-[rgb(var(--sep-colour-967342))] bg-[rgb(var(--sep-colour-3b2b1b))] px-4 py-2.5 text-[8px] uppercase text-[rgb(var(--sep-colour-f1d9a7))]">Appeal Sanction</Link>}
        </div>
      </article>})}''',
        "player evidence and appeal",
    )
    changes[p] = s

    p = root / "app/(portal)/admin/sanctions/[id]/page.tsx"
    s = p.read_text(encoding="utf-8")
    s = once(
        s,
        'import { SanctionLiveSync } from "@/components/sanctions/sanction-live-sync";',
        'import { SanctionLiveSync } from "@/components/sanctions/sanction-live-sync";\nimport { SanctionEvidence } from "@/components/sanctions/sanction-evidence";',
        "admin sanction import",
    )
    s = once(
        s,
        '''  const [events,ticket]=await Promise.all([
    admin.from("sanction_events").select("id,event_type,details,created_at").eq("sanction_id",s.id).order("created_at",{ascending:true}),
    s.ticket_id?admin.from("tickets").select("public_reference").eq("id",s.ticket_id).maybeSingle():Promise.resolve({data:null,error:null}),
  ]);
  if(events.error)throw new Error(events.error.message);
  if(ticket.error)throw new Error(ticket.error.message);''',
        '''  const [events,ticket,appealEvent]=await Promise.all([
    admin.from("sanction_events").select("id,event_type,details,created_at").eq("sanction_id",s.id).order("created_at",{ascending:true}),
    s.ticket_id?admin.from("tickets").select("public_reference").eq("id",s.ticket_id).maybeSingle():Promise.resolve({data:null,error:null}),
    admin.from("ticket_events").select("ticket_id,details,created_at").eq("event_type","sanction_appeal_created").contains("details",{sanction_id:s.id}).order("created_at",{ascending:false}).limit(1),
  ]);
  if(events.error)throw new Error(events.error.message);
  if(ticket.error)throw new Error(ticket.error.message);
  if(appealEvent.error)throw new Error(appealEvent.error.message);

  const appealTicketId=appealEvent.data?.[0]?.ticket_id??null;
  const appealTicket=appealTicketId
    ? await admin.from("tickets").select("public_reference,status").eq("id",appealTicketId).maybeSingle()
    : {data:null,error:null};

  if(appealTicket.error)throw new Error(appealTicket.error.message);''',
        "admin appeal lookup",
    )
    s = once(
        s,
        '''      {ticket.data?.public_reference?<div className="border-t border-[rgb(var(--sep-colour-60482e))]/40 p-5"><Link href={`/admin/tickets/${ticket.data.public_reference}`} className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-4 py-2.5 text-[8px] uppercase text-[rgb(var(--sep-colour-d5b785))]">Open Source Ticket · {ticket.data.public_reference}</Link></div>:null}
    </section>''',
        '''      {(ticket.data?.public_reference||appealTicket.data?.public_reference)?<div className="flex flex-wrap gap-3 border-t border-[rgb(var(--sep-colour-60482e))]/40 p-5">{ticket.data?.public_reference?<Link href={`/admin/tickets/${ticket.data.public_reference}`} className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-4 py-2.5 text-[8px] uppercase text-[rgb(var(--sep-colour-d5b785))]">Open Source Ticket · {ticket.data.public_reference}</Link>:null}{appealTicket.data?.public_reference?<Link href={`/admin/tickets/${appealTicket.data.public_reference}`} className="border border-[rgb(var(--sep-colour-967342))] bg-[rgb(var(--sep-colour-3b2b1b))] px-4 py-2.5 text-[8px] uppercase text-[rgb(var(--sep-colour-f1d9a7))]">Open Appeal · {appealTicket.data.status.replaceAll("_"," ")}</Link>:null}</div>:null}
    </section>

    <SanctionEvidence ticketId={s.ticket_id}/>''',
        "admin evidence and appeal",
    )
    changes[p] = s

    print("Baseline:", head[:7])
    print(f"Prepared {len(changes)} local file change(s):")
    for path in changes:
        print(" ", str(path.relative_to(root)).replace("/", "\\"))

    if args.dry_run:
        print("\nDRY RUN ONLY — no files written.")
        return

    for path, content in changes.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8", newline="\n")

    print("\nApplied LOCALLY only.")
    print("No SQL changes required for this workflow patch.")
    print("Next: npm run build")

if __name__ == "__main__":
    main()
