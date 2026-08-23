#!/usr/bin/env python3
from __future__ import annotations
import argparse, subprocess
from pathlib import Path

BASELINE="96f9b5e98716a3dd462af00e2c58e7f96c8b7642"

def git(*args): return subprocess.check_output(["git",*args],text=True).strip()
def once(s,a,b,label):
    n=s.count(a)
    if n!=1: raise SystemExit(f"ERROR: {label}: expected anchor once, found {n}. Nothing written.")
    return s.replace(a,b,1)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--dry-run",action="store_true")
    ap.add_argument("--allow-different-head",action="store_true")
    args=ap.parse_args()
    root=Path.cwd()
    if not (root/"package.json").exists(): raise SystemExit("ERROR: run from sepulchria-portal root.")
    head=git("rev-parse","HEAD")
    if head!=BASELINE and not args.allow_different_head:
        raise SystemExit(f"ERROR: HEAD is {head}; patch baseline is {BASELINE}.")

    layout=root/"app/(portal)/admin/layout.tsx"
    ticket=root/"app/(portal)/admin/tickets/[reference]/page.tsx"
    for p in (layout,ticket):
        if not p.exists(): raise SystemExit(f"ERROR: missing {p.relative_to(root)}. Nothing written.")

    actions=root/"app/(portal)/admin/sanctions/actions.ts"
    listing=root/"app/(portal)/admin/sanctions/page.tsx"
    detail=root/"app/(portal)/admin/sanctions/[id]/page.tsx"
    sql=root/"supabase/patches/20260823_phase3_2_sanctions_foundation.sql"
    for p in (actions,listing,detail,sql):
        if p.exists(): raise SystemExit(f"ERROR: {p.relative_to(root)} already exists. Nothing written.")

    changes={}

    changes[sql] = '''begin;

create table if not exists public.sanction_events (
  id uuid primary key default gen_random_uuid(),
  sanction_id uuid not null references public.sanctions(id) on delete cascade,
  actor_user_id uuid,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint sanction_events_event_type_check check (
    event_type in (
      'issued','revoked','expired','status_changed',
      'appeal_submitted','appeal_decided'
    )
  )
);

create index if not exists sanction_events_sanction_created_idx
  on public.sanction_events(sanction_id,created_at desc);

create index if not exists sanctions_target_status_idx
  on public.sanctions(target_user_id,status,issued_at desc);

create index if not exists sanctions_ticket_idx
  on public.sanctions(ticket_id,issued_at desc);

alter table public.sanction_events enable row level security;

commit;
'''

    changes[actions] = '''"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin, requireStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

const TYPES=[
  "warning","communication_restriction","forum_restriction",
  "game_chat_restriction","feature_restriction",
  "temporary_suspension","permanent_ban",
] as const;
type SanctionType=(typeof TYPES)[number];

function read(fd:FormData,key:string,max=10000){
  const v=fd.get(key);
  return typeof v==="string"?v.trim().slice(0,max):"";
}
function uuid(fd:FormData,key:string){
  const v=read(fd,key,80);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v))
    throw new Error(`Invalid ${key}.`);
  return v;
}
function sanctionType(fd:FormData):SanctionType{
  const v=read(fd,"sanctionType",80);
  if(!TYPES.includes(v as SanctionType)) throw new Error("Invalid sanction type.");
  return v as SanctionType;
}

export async function issueSanction(fd:FormData){
  const staff=await requireStaff();
  const type=sanctionType(fd);

  if(
    (type==="temporary_suspension"||type==="permanent_ban") &&
    staff.role!=="owner" && staff.role!=="admin"
  ) throw new Error("Only an administrator can issue a suspension or permanent ban.");

  const ticketId=uuid(fd,"ticketId");
  const targetUserId=uuid(fd,"targetUserId");
  const targetCharacterRaw=read(fd,"targetCharacterId",80);
  const targetCharacterId=targetCharacterRaw?uuid(fd,"targetCharacterId"):null;
  const targetName=read(fd,"targetName",200)||null;
  const reasonCode=read(fd,"reasonCode",120);
  const playerReason=read(fd,"playerReason",5000);
  const internalRationale=read(fd,"internalRationale",10000)||null;
  const expiresRaw=read(fd,"expiresAt",100);

  if(!reasonCode||!playerReason) throw new Error("Reason code and player-facing reason are required.");

  const temporary=[
    "communication_restriction","forum_restriction",
    "game_chat_restriction","feature_restriction",
    "temporary_suspension",
  ].includes(type);

  let expiresAt:string|null=null;
  if(temporary){
    if(!expiresRaw) throw new Error("An expiry date and time is required for this sanction.");
    const d=new Date(expiresRaw);
    if(Number.isNaN(d.getTime())||d<=new Date()) throw new Error("The sanction expiry must be in the future.");
    expiresAt=d.toISOString();
  }

  const admin=createAdminClient();
  const {data:ticket,error:ticketError}=await admin
    .from("tickets")
    .select("id,public_reference,category")
    .eq("id",ticketId)
    .maybeSingle();
  if(ticketError||!ticket) throw new Error(ticketError?.message??"Ticket not found.");

  const {data:targetStaff,error:staffError}=await admin
    .from("staff_members").select("role").eq("user_id",targetUserId).maybeSingle();
  if(staffError) throw new Error(staffError.message);
  if(targetStaff) throw new Error("Staff accounts cannot be sanctioned through the standard player sanction workflow.");

  if(targetCharacterId){
    const {data:character,error}=await admin
      .from("characters").select("id,user_id,is_system").eq("id",targetCharacterId).maybeSingle();
    if(error||!character) throw new Error(error?.message??"Target character not found.");
    if(character.user_id!==targetUserId) throw new Error("The selected character does not belong to the target account.");
    if(character.is_system===true) throw new Error("System characters cannot receive sanctions.");
  }

  const {data:dup,error:dupError}=await admin
    .from("sanctions").select("id")
    .eq("target_user_id",targetUserId)
    .eq("sanction_type",type)
    .in("status",["scheduled","active"]).limit(1);
  if(dupError) throw new Error(dupError.message);
  if((dup??[]).length) throw new Error("This account already has an active or scheduled sanction of this type.");

  const now=new Date().toISOString();
  const {data:sanction,error}=await admin.from("sanctions").insert({
    ticket_id:ticket.id,
    target_user_id:targetUserId,
    target_character_id:targetCharacterId,
    target_name_snapshot:targetName,
    sanction_type:type,
    status:"active",
    reason_code:reasonCode,
    player_reason:playerReason,
    internal_rationale:internalRationale,
    metadata:{ticket_reference:ticket.public_reference,ticket_category:ticket.category},
    issued_by_user_id:staff.userId,
    starts_at:now,
    expires_at:expiresAt,
    issued_at:now,
  }).select("id").single();

  if(error||!sanction) throw new Error(error?.message??"Unable to create sanction.");

  const [audit,ticketAudit]=await Promise.all([
    admin.from("sanction_events").insert({
      sanction_id:sanction.id,actor_user_id:staff.userId,event_type:"issued",
      details:{sanction_type:type,target_user_id:targetUserId,target_character_id:targetCharacterId,expires_at:expiresAt,ticket_reference:ticket.public_reference},
    }),
    admin.from("ticket_events").insert({
      ticket_id:ticket.id,actor_user_id:staff.userId,event_type:"sanction_issued",
      details:{sanction_id:sanction.id,sanction_type:type,target_name:targetName,expires_at:expiresAt},
    }),
  ]);

  if(audit.error||ticketAudit.error){
    await admin.from("sanctions").delete().eq("id",sanction.id);
    throw new Error(audit.error?.message??ticketAudit.error?.message??"Unable to record sanction audit history.");
  }

  revalidatePath("/admin/sanctions");
  revalidatePath(`/admin/tickets/${ticket.public_reference}`);
  redirect(`/admin/sanctions/${sanction.id}`);
}

export async function revokeSanction(fd:FormData){
  const staff=await requireAdmin();
  const sanctionId=uuid(fd,"sanctionId");
  const reason=read(fd,"revocationReason",5000);
  if(read(fd,"confirmation",30)!=="REVOKE") throw new Error('Type "REVOKE" to confirm revocation.');
  if(!reason) throw new Error("A revocation reason is required.");

  const admin=createAdminClient();
  const {data:s,error}=await admin.from("sanctions").select("id,ticket_id,status").eq("id",sanctionId).maybeSingle();
  if(error||!s) throw new Error(error?.message??"Sanction not found.");
  if(s.status==="revoked") throw new Error("This sanction is already revoked.");

  const now=new Date().toISOString();
  const {error:updateError}=await admin.from("sanctions").update({
    status:"revoked",revoked_by_user_id:staff.userId,revoked_at:now,revocation_reason:reason,
  }).eq("id",s.id);
  if(updateError) throw new Error(updateError.message);

  const {error:auditError}=await admin.from("sanction_events").insert({
    sanction_id:s.id,actor_user_id:staff.userId,event_type:"revoked",details:{reason},
  });
  if(auditError) throw new Error(auditError.message);

  if(s.ticket_id){
    await admin.from("ticket_events").insert({
      ticket_id:s.ticket_id,actor_user_id:staff.userId,event_type:"sanction_revoked",
      details:{sanction_id:s.id,reason},
    });
  }

  revalidatePath("/admin/sanctions");
  revalidatePath(`/admin/sanctions/${s.id}`);
}
'''

    changes[listing] = '''import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

function fmt(v:string|null){
  if(!v)return "No expiry";
  return new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v));
}
function label(v:string){return v.replaceAll("_"," ").replace(/\\b\\w/g,l=>l.toUpperCase());}

export default async function AdminSanctionsPage({searchParams}:{searchParams?:Promise<{status?:string;type?:string;q?:string}>}){
  await requireStaff();
  const p=(await searchParams)??{};
  const admin=createAdminClient();

  let q=admin.from("sanctions")
    .select("id,target_name_snapshot,sanction_type,status,reason_code,expires_at,issued_at")
    .order("issued_at",{ascending:false}).limit(300);

  if(p.status)q=q.eq("status",p.status);
  if(p.type)q=q.eq("sanction_type",p.type);
  if(p.q?.trim())q=q.ilike("target_name_snapshot",`%${p.q.trim()}%`);

  const {data,error}=await q;
  if(error)throw new Error(error.message);

  return <main className="p-5 sm:p-7 lg:p-9"><div className="mx-auto max-w-[1400px]">
    <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">Administration · Moderation</p>
    <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">Sanctions</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgb(var(--sep-colour-9c8d79))]">Permanent disciplinary history. Sanctions are never deleted; revocations remain in the audit trail.</p>

    <form method="get" className="mt-6 grid gap-2 border border-[rgb(var(--sep-colour-60482e))]/45 p-4 md:grid-cols-4">
      <input name="q" defaultValue={p.q??""} placeholder="Search target name..." className="h-10 bg-[rgb(var(--sep-colour-100c09))] px-3"/>
      <select name="status" defaultValue={p.status??""} className="h-10 bg-[rgb(var(--sep-colour-100c09))] px-3">
        <option value="">All statuses</option><option value="active">Active</option><option value="scheduled">Scheduled</option><option value="expired">Expired</option><option value="revoked">Revoked</option>
      </select>
      <select name="type" defaultValue={p.type??""} className="h-10 bg-[rgb(var(--sep-colour-100c09))] px-3">
        <option value="">All sanction types</option>
        <option value="warning">Warning</option><option value="communication_restriction">Communication restriction</option>
        <option value="forum_restriction">Forum restriction</option><option value="game_chat_restriction">Game chat restriction</option>
        <option value="feature_restriction">Feature restriction</option><option value="temporary_suspension">Temporary suspension</option>
        <option value="permanent_ban">Permanent ban</option>
      </select>
      <button className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] text-[8px] uppercase">Apply Filters</button>
    </form>

    <div className="mt-5 space-y-2">
      {(data??[]).length===0?<div className="border border-[rgb(var(--sep-colour-60482e))]/45 p-8 text-center text-sm text-[rgb(var(--sep-colour-8f806d))]">No sanctions match these filters.</div>:
      (data??[]).map(s=><Link key={s.id} href={`/admin/sanctions/${s.id}`} className="grid gap-3 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 hover:border-[rgb(var(--sep-colour-947047))] md:grid-cols-[1.3fr_1.1fr_100px_180px_180px]">
        <div><div className="font-serif text-base text-[rgb(var(--sep-colour-d9c4a2))]">{s.target_name_snapshot??"Unknown account"}</div><div className="mt-1 text-[8px] uppercase text-[rgb(var(--sep-colour-756957))]">{s.reason_code}</div></div>
        <div className="text-[9px] uppercase text-[rgb(var(--sep-colour-a58b68))]">{label(s.sanction_type)}</div>
        <div className="text-[8px] uppercase">{s.status}</div>
        <div className="text-[8px] text-[rgb(var(--sep-colour-8f806d))]">Issued {fmt(s.issued_at)}</div>
        <div className="text-[8px] text-[rgb(var(--sep-colour-8f806d))]">Expires {fmt(s.expires_at)}</div>
      </Link>)}
    </div>
  </div></main>;
}
'''

    changes[detail] = '''import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { revokeSanction } from "../actions";

function fmt(v:string|null){return v?new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"—";}
function label(v:string){return v.replaceAll("_"," ").replace(/\\b\\w/g,l=>l.toUpperCase());}

export default async function AdminSanctionPage({params}:{params:Promise<{id:string}>}){
  const staff=await requireStaff(); const {id}=await params; const admin=createAdminClient();
  const {data:s,error}=await admin.from("sanctions").select("id,ticket_id,target_name_snapshot,sanction_type,status,reason_code,player_reason,internal_rationale,starts_at,expires_at,issued_at,revoked_at,revocation_reason").eq("id",id).maybeSingle();
  if(error||!s)notFound();

  const [events,ticket]=await Promise.all([
    admin.from("sanction_events").select("id,event_type,details,created_at").eq("sanction_id",s.id).order("created_at",{ascending:true}),
    s.ticket_id?admin.from("tickets").select("public_reference").eq("id",s.ticket_id).maybeSingle():Promise.resolve({data:null,error:null}),
  ]);
  if(events.error)throw new Error(events.error.message);
  if(ticket.error)throw new Error(ticket.error.message);
  const canRevoke=(staff.role==="owner"||staff.role==="admin")&&s.status!=="revoked";

  return <main className="p-5 sm:p-7 lg:p-9"><div className="mx-auto max-w-5xl">
    <Link href="/admin/sanctions" className="text-[8px] uppercase text-[rgb(var(--sep-colour-a58b68))]">← Sanctions</Link>
    <section className="mt-7 border border-[rgb(var(--sep-colour-7d493f))]/65 bg-[rgb(var(--sep-colour-18100e))]">
      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/45 p-6"><p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c98f7f))]">Disciplinary Record</p><h1 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-ead5ac))]">{label(s.sanction_type)}</h1><p className="mt-2 text-sm text-[rgb(var(--sep-colour-b9a48b))]">{s.target_name_snapshot??"Unknown account"}</p></header>
      <dl className="grid gap-px bg-[rgb(var(--sep-colour-60482e))]/30 sm:grid-cols-2 lg:grid-cols-4">
        {[["Status",label(s.status)],["Reason code",s.reason_code],["Starts",fmt(s.starts_at)],["Expires",s.expires_at?fmt(s.expires_at):"No expiry"]].map(([k,v])=><div key={k} className="bg-[rgb(var(--sep-colour-120e0b))] p-4"><dt className="text-[7px] uppercase text-[rgb(var(--sep-colour-756957))]">{k}</dt><dd className="mt-1 text-xs text-[rgb(var(--sep-colour-cdbb9f))]">{v}</dd></div>)}
      </dl>
      <div className="grid gap-px bg-[rgb(var(--sep-colour-60482e))]/30 lg:grid-cols-2">
        <div className="bg-[rgb(var(--sep-colour-100c09))] p-5"><p className="text-[7px] uppercase text-[rgb(var(--sep-colour-756957))]">Player-facing reason</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--sep-colour-d2bea1))]">{s.player_reason}</p></div>
        <div className="bg-[rgb(var(--sep-colour-100c09))] p-5"><p className="text-[7px] uppercase text-[rgb(var(--sep-colour-756957))]">Internal rationale</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--sep-colour-b9a48b))]">{s.internal_rationale??"No internal rationale recorded."}</p></div>
      </div>
      {ticket.data?.public_reference?<div className="border-t border-[rgb(var(--sep-colour-60482e))]/40 p-5"><Link href={`/admin/tickets/${ticket.data.public_reference}`} className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-4 py-2.5 text-[8px] uppercase text-[rgb(var(--sep-colour-d5b785))]">Open Source Ticket · {ticket.data.public_reference}</Link></div>:null}
    </section>

    <section className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">
      <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-e2c99f))]">Audit History</h2>
      <div className="mt-4 space-y-2">{(events.data??[]).map(e=><div key={e.id} className="border border-[rgb(var(--sep-colour-4f3b28))]/45 bg-black/10 p-3"><p className="text-[8px] uppercase text-[rgb(var(--sep-colour-b58a69))]">{label(e.event_type)}</p><p className="mt-1 text-[8px] text-[rgb(var(--sep-colour-756957))]">{fmt(e.created_at)}</p></div>)}</div>
    </section>

    {s.status==="revoked"?<section className="mt-5 border border-[rgb(var(--sep-colour-75624a))]/55 bg-[rgb(var(--sep-colour-17130f))] p-5"><p className="text-[8px] uppercase">Revoked {fmt(s.revoked_at)}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{s.revocation_reason}</p></section>:null}

    {canRevoke?<section className="mt-5 border border-red-900/45 bg-red-950/10 p-5"><h2 className="font-serif text-xl text-red-200">Revoke Sanction</h2><p className="mt-2 text-xs leading-5 text-red-300/75">Revocation does not delete this record.</p>
      <form action={revokeSanction} className="mt-4 space-y-3"><input type="hidden" name="sanctionId" value={s.id}/><textarea name="revocationReason" required rows={4} maxLength={5000} placeholder="Reason for revocation..." className="w-full border border-red-900/45 bg-[rgb(var(--sep-colour-100c09))] p-3 text-sm"/><label className="block"><span className="text-[8px] uppercase text-red-300/75">Type REVOKE to confirm</span><input name="confirmation" required autoComplete="off" className="mt-2 h-10 w-full max-w-xs border border-red-900/45 bg-[rgb(var(--sep-colour-100c09))] px-3 text-sm"/></label><button className="border border-red-800 bg-red-950/30 px-4 py-2.5 text-[8px] uppercase text-red-200">Revoke Sanction</button></form>
    </section>:null}
  </div></main>;
}
'''

    s=layout.read_text(encoding="utf-8")
    s=once(s,
'''            <AdminNavigationLink href="/admin/tickets">
              <span className="flex items-center gap-2"><span>Tickets</span><TicketNotificationBadge audience="staff" variant="admin-nav" /></span>
            </AdminNavigationLink>

            {canManageUsers ? (''',
'''            <AdminNavigationLink href="/admin/tickets">
              <span className="flex items-center gap-2"><span>Tickets</span><TicketNotificationBadge audience="staff" variant="admin-nav" /></span>
            </AdminNavigationLink>

            <AdminNavigationLink href="/admin/sanctions">
              Sanctions
            </AdminNavigationLink>

            {canManageUsers ? (''',"admin sanctions nav")
    changes[layout]=s

    s=ticket.read_text(encoding="utf-8")
    s=once(s,
'''import {
  assignTicketToSelf,
  staffTicketMessage,
  updateTicketState,
} from "../actions";''',
'''import { issueSanction } from "@/app/(portal)/admin/sanctions/actions";

import {
  assignTicketToSelf,
  staffTicketMessage,
  updateTicketState,
} from "../actions";''',"ticket sanction import")
    s=once(s,
'''"id,reporter_name_snapshot,reported_name_snapshot,reason_code,explanation,source_type,source_id,source_context,created_at",''',
'''"id,reporter_name_snapshot,reported_name_snapshot,reported_user_id,reported_character_id,reason_code,explanation,source_type,source_id,source_context,created_at",''',"ticket report target ids")
    s=once(s,
'''  const sourceHref = report
    ? reportSourceHref({''',
'''  const { data: linkedSanctions, error: linkedSanctionsError } = await admin
    .from("sanctions")
    .select("id,sanction_type,status,target_name_snapshot,issued_at")
    .eq("ticket_id", ticket.id)
    .order("issued_at", { ascending: false });

  if (linkedSanctionsError) throw new Error(linkedSanctionsError.message);

  const sourceHref = report
    ? reportSourceHref({''',"ticket linked sanctions query")

    anchor='''        <div className="mt-5 space-y-3">
          {(messages ?? []).map((message) => ('''
    panel=r'''        {report?.reported_user_id ? (
          <section className="mt-5 border border-[rgb(var(--sep-colour-7d493f))]/65 bg-[rgb(var(--sep-colour-18100e))] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c98f7f))]">Disciplinary Action</p><h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-e2c99f))]">Sanctions</h2><p className="mt-2 text-xs text-[rgb(var(--sep-colour-9e8c75))]">Target: <strong>{report.reported_name_snapshot ?? "Reported account"}</strong></p></div>
              <Link href="/admin/sanctions" className="border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[8px] uppercase text-[rgb(var(--sep-colour-a58b68))]">All Sanctions</Link>
            </div>

            {(linkedSanctions ?? []).length>0?<div className="mt-4 space-y-2">{(linkedSanctions??[]).map(s=><Link key={s.id} href={`/admin/sanctions/${s.id}`} className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/10 p-3"><span className="text-[9px] uppercase text-[rgb(var(--sep-colour-cdbb9f))]">{sourceLabel(s.sanction_type)}</span><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-8f806d))]">{s.status}</span></Link>)}</div>:null}

            <details className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))]">
              <summary className="cursor-pointer px-4 py-3 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d5b785))]">Issue Sanction</summary>
              <form action={issueSanction} className="grid gap-4 border-t border-[rgb(var(--sep-colour-60482e))]/35 p-4 lg:grid-cols-2">
                <input type="hidden" name="ticketId" value={ticket.id}/>
                <input type="hidden" name="targetUserId" value={report.reported_user_id}/>
                <input type="hidden" name="targetCharacterId" value={report.reported_character_id ?? ""}/>
                <input type="hidden" name="targetName" value={report.reported_name_snapshot ?? ""}/>

                <label className="block"><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-8f806d))]">Sanction type</span>
                  <select name="sanctionType" required defaultValue="warning" className="mt-2 h-11 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] px-3 text-sm">
                    <option value="warning">Warning</option><option value="communication_restriction">Communication restriction</option><option value="forum_restriction">Forum restriction</option><option value="game_chat_restriction">Game chat restriction</option><option value="feature_restriction">Feature restriction</option><option value="temporary_suspension">Temporary suspension</option><option value="permanent_ban">Permanent ban</option>
                  </select>
                </label>

                <label className="block"><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-8f806d))]">Expiry · required for temporary sanctions</span><input type="datetime-local" name="expiresAt" className="mt-2 h-11 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] px-3 text-sm"/></label>

                <label className="block lg:col-span-2"><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-8f806d))]">Reason code</span><input name="reasonCode" required maxLength={120} defaultValue={report.reason_code ?? ""} className="mt-2 h-11 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] px-3 text-sm"/></label>

                <label className="block lg:col-span-2"><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-8f806d))]">Player-facing reason</span><textarea name="playerReason" required rows={5} maxLength={5000} placeholder="Explain the sanction clearly to the player. Do not include private staff notes." className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] p-3 text-sm leading-6"/></label>

                <label className="block lg:col-span-2"><span className="text-[8px] uppercase text-[rgb(var(--sep-colour-8f806d))]">Internal rationale · staff only</span><textarea name="internalRationale" rows={5} maxLength={10000} className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0c0907))] p-3 text-sm leading-6"/></label>

                <div className="lg:col-span-2"><button className="border border-[rgb(var(--sep-colour-9a5147))] bg-[rgb(var(--sep-colour-351815))] px-5 py-3 text-[8px] uppercase text-[rgb(var(--sep-colour-e0a69a))]">Issue Sanction</button></div>
              </form>
            </details>
          </section>
        ) : null}

'''+anchor
    s=once(s,anchor,panel,"ticket sanction panel")
    changes[ticket]=s

    print(f"Baseline: {BASELINE[:7]}")
    print(f"Prepared {len(changes)} local file change(s):")
    for p in changes: print(" ",p.relative_to(root))

    if args.dry_run:
        print("\nDRY RUN ONLY — no files written.")
        return

    for p,c in changes.items():
        p.parent.mkdir(parents=True,exist_ok=True)
        p.write_text(c,encoding="utf-8",newline="\n")
        print("patched:",p.relative_to(root))

    print("\nApplied LOCALLY only. No GitHub write was performed.")
    print("Next:")
    print("  1. Run supabase/patches/20260823_phase3_2_sanctions_foundation.sql in Supabase SQL Editor")
    print("  2. npm run build")

if __name__=="__main__":
    main()
