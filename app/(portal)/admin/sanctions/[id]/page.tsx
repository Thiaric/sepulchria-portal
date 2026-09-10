

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { revokeSanction } from "../actions";
import { SanctionLiveSync } from "@/components/sanctions/sanction-live-sync";
import { SanctionEvidence } from "@/components/sanctions/sanction-evidence";

function fmt(v:string|null){return v?new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"—";}
function label(v:string){return v.replaceAll("_"," ").replace(/\b\w/g,l=>l.toUpperCase());}

export default async function AdminSanctionPage({params,searchParams}:{params:Promise<{id:string}>;searchParams?:Promise<{sanctionError?:string;sanctionSuccess?:string}>}){
  const staff=await requireAdminSection("sanctions"); const {id}=await params; const query=(await searchParams)??{}; const admin=createAdminClient();
  const {data:s,error}=await admin.from("sanctions").select("id,ticket_id,target_name_snapshot,sanction_type,status,reason_code,player_reason,internal_rationale,starts_at,expires_at,issued_at,revoked_at,revocation_reason").eq("id",id).maybeSingle();
  if(error||!s)notFound();

  const [events,ticket,appealEvent]=await Promise.all([
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

  if(appealTicket.error)throw new Error(appealTicket.error.message);
  const canRevoke=(staff.role==="owner"||staff.role==="admin")&&s.status!=="revoked";

  return <main className="p-5 sm:p-7 lg:p-9 admin_sanctions_id_page_main_main"><SanctionLiveSync audience="staff" markRead /><div className="mx-auto max-w-5xl admin_sanctions_id_page_div_container">
    <Link href="/admin/sanctions" className="text-[8px] uppercase text-[rgb(var(--sep-colour-a58b68))]">← Sanctions</Link>
    <section className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-1d1110))] admin_sanctions_id_page_section_section">
      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/45 p-6 admin_sanctions_id_page_header_header"><p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c98f7f))] admin_sanctions_id_page_p_text">Disciplinary Record</p><h1 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-ead5ac))] admin_sanctions_id_page_h1_title">{label(s.sanction_type)}</h1><p className="mt-2 text-sm text-[rgb(var(--sep-colour-b9a48b))] admin_sanctions_id_page_p_text_2">{s.target_name_snapshot??"Unknown account"}</p></header>
      <dl className="grid gap-px bg-[rgb(var(--sep-colour-60482e))]/30 sm:grid-cols-2 lg:grid-cols-4">
        {[["Status",label(s.status)],["Reason code",s.reason_code],["Starts",fmt(s.starts_at)],["Expires",s.expires_at?fmt(s.expires_at):"No expiry"]].map(([k,v])=><div key={k} className="bg-[rgb(var(--sep-colour-120e0b))] p-4 admin_sanctions_id_page_div_container_2"><dt className="text-[7px] uppercase text-[rgb(var(--sep-colour-756957))]">{k}</dt><dd className="mt-1 text-xs text-[rgb(var(--sep-colour-cdbb9f))]">{v}</dd></div>)}
      </dl>
      <div className="grid gap-px bg-[rgb(var(--sep-colour-60482e))]/30 lg:grid-cols-2 admin_sanctions_id_page_div_container_3">
        <div className="bg-[rgb(var(--sep-colour-100c09))] p-5 admin_sanctions_id_page_div_container_4"><p className="text-[7px] uppercase text-[rgb(var(--sep-colour-756957))] admin_sanctions_id_page_p_text_3">Player-facing reason</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--sep-colour-d2bea1))] admin_sanctions_id_page_p_text_4">{s.player_reason}</p></div>
        <div className="bg-[rgb(var(--sep-colour-100c09))] p-5 admin_sanctions_id_page_div_container_5"><p className="text-[7px] uppercase text-[rgb(var(--sep-colour-756957))] admin_sanctions_id_page_p_text_5">Internal rationale</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--sep-colour-b9a48b))] admin_sanctions_id_page_p_text_6">{s.internal_rationale??"No internal rationale recorded."}</p></div>
      </div>
      {(ticket.data?.public_reference||appealTicket.data?.public_reference)?<div className="flex flex-wrap gap-3 border-t border-[rgb(var(--sep-colour-60482e))]/40 p-5 admin_sanctions_id_page_div_container_6">{ticket.data?.public_reference?<Link href={`/admin/tickets/${ticket.data.public_reference}`} className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-4 py-2.5 text-[8px] uppercase text-[rgb(var(--sep-colour-d5b785))]">Open Source Ticket · {ticket.data.public_reference}</Link>:null}{appealTicket.data?.public_reference?<Link href={`/admin/tickets/${appealTicket.data.public_reference}`} className="border border-[rgb(var(--sep-colour-967342))] bg-[rgb(var(--sep-colour-3b2b1b))] px-4 py-2.5 text-[8px] uppercase text-[rgb(var(--sep-colour-f1d9a7))]">Open Appeal · {appealTicket.data.status.replaceAll("_"," ")}</Link>:null}</div>:null}
    </section>

    <SanctionEvidence ticketId={s.ticket_id}/>

    <section data-sep-interaction-fixed="true" className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 admin_sanctions_id_page_section_audit_history">
      <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-e2c99f))] admin_sanctions_id_page_h2_audit_history">Audit History</h2>
      <div className="mt-4 space-y-2 admin_sanctions_id_page_div_audit_history">{(events.data??[]).map(e=><div key={e.id} data-sep-interactive-surface="row" className="border border-[rgb(var(--sep-colour-4f3b28))]/45 bg-black/10 p-3 transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))] admin_sanctions_id_page_div_container_7"><p className="text-[8px] uppercase text-[rgb(var(--sep-colour-b58a69))] admin_sanctions_id_page_p_text_7">{label(e.event_type)}</p><p className="mt-1 text-[8px] text-[rgb(var(--sep-colour-756957))] admin_sanctions_id_page_p_text_8">{fmt(e.created_at)}</p></div>)}</div>
    </section>

    {s.status==="revoked"?<section className="mt-5 border-l-2 border-[rgb(var(--sep-colour-75624a))]/55 bg-[rgb(var(--sep-colour-17130f))]/75 p-5 admin_sanctions_id_page_section_section_2"><p className="text-[8px] uppercase admin_sanctions_id_page_p_text_9">Revoked {fmt(s.revoked_at)}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 admin_sanctions_id_page_p_text_10">{s.revocation_reason}</p></section>:null}

    {canRevoke?<section className="mt-5 border border-red-900/45 bg-red-950/10 p-5 admin_sanctions_id_page_section_revoke_sanction"><h2 className="font-serif text-xl text-red-200 admin_sanctions_id_page_h2_revoke_sanction">Revoke Sanction</h2><p className="mt-2 text-xs leading-5 text-red-300/75 admin_sanctions_id_page_p_revoke_sanction">Revocation does not delete this record.</p>
      <form action={revokeSanction} className="mt-4 space-y-3 admin_sanctions_id_page_form_revoke_sanction"><input className="admin_sanctions_id_page_input_return" type="hidden" name="returnTo" value={`/admin/sanctions/${s.id}`}/><input className="admin_sanctions_id_page_input_sanction_id" type="hidden" name="sanctionId" value={s.id}/><textarea name="revocationReason" required rows={4} maxLength={5000} placeholder="Reason for revocation..." className="w-full border border-red-900/45 bg-[rgb(var(--sep-colour-100c09))] p-3 text-sm admin_sanctions_id_page_textarea_revocation_reason"/><label className="block admin_sanctions_id_page_label_revoke_sanction"><span className="text-[8px] uppercase text-red-300/75 admin_sanctions_id_page_span_revoke_sanction">Type REVOKE to confirm</span><input name="confirmation" required autoComplete="off" className="mt-2 h-10 w-full max-w-xs border border-red-900/45 bg-[rgb(var(--sep-colour-100c09))] px-3 text-sm admin_sanctions_id_page_input_confirmation"/></label>{query.sanctionError?<div role="alert" className="border border-red-800/60 bg-red-950/30 p-3 text-xs leading-5 text-red-200 admin_sanctions_id_page_div_alert">{query.sanctionError}</div>:null}{query.sanctionSuccess?<div role="status" className="border border-[rgb(var(--sep-colour-6e7547))]/60 bg-[rgb(var(--sep-colour-182016))] p-3 text-xs leading-5 text-[rgb(var(--sep-colour-c9c99d))] admin_sanctions_id_page_div_status">{query.sanctionSuccess}</div>:null}<button className="border border-red-800 bg-red-950/30 px-4 py-2.5 text-[8px] uppercase text-red-200 admin_sanctions_id_page_button_revoke_sanction">Revoke Sanction</button></form>
    </section>:null}
  </div></main>;
}
