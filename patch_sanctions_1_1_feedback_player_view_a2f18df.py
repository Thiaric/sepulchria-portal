#!/usr/bin/env python3
from pathlib import Path
import argparse, subprocess

BASELINE="a2f18df9120b2060fdede0ff00c4810db1ce99a4"

def once(s,a,b,label):
    n=s.count(a)
    if n!=1:
        raise SystemExit(f"ERROR: {label}: expected anchor once, found {n}. Nothing written.")
    return s.replace(a,b,1)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--dry-run",action="store_true")
    ap.add_argument("--allow-different-head",action="store_true")
    args=ap.parse_args()
    root=Path.cwd()
    if not (root/"package.json").exists():
        raise SystemExit("ERROR: run from sepulchria-portal root.")
    head=subprocess.check_output(["git","rev-parse","HEAD"],text=True).strip()
    if head!=BASELINE and not args.allow_different_head:
        raise SystemExit(f"ERROR: HEAD is {head}; patch baseline is {BASELINE}.")

    actions=root/"app/(portal)/admin/sanctions/actions.ts"
    ticket=root/"app/(portal)/admin/tickets/[reference]/page.tsx"
    detail=root/"app/(portal)/admin/sanctions/[id]/page.tsx"
    sidebar=root/"components/portal/portal-sidebar.tsx"
    player=root/"app/(portal)/sanctions/page.tsx"

    for p in (actions,ticket,detail,sidebar):
        if not p.exists(): raise SystemExit(f"ERROR: missing {p.relative_to(root)}. Nothing written.")
    if player.exists(): raise SystemExit("ERROR: app/(portal)/sanctions/page.tsx already exists. Nothing written.")

    changes={}

    s=actions.read_text(encoding="utf-8")
    s=once(s,
'''function sanctionType(fd:FormData):SanctionType{
  const v=read(fd,"sanctionType",80);
  if(!TYPES.includes(v as SanctionType)) throw new Error("Invalid sanction type.");
  return v as SanctionType;
}
''',
'''function sanctionType(fd:FormData):SanctionType{
  const v=read(fd,"sanctionType",80);
  if(!TYPES.includes(v as SanctionType)) throw new Error("Invalid sanction type.");
  return v as SanctionType;
}

function returnPath(fd:FormData,fallback:string){
  const raw=read(fd,"returnTo",1000);
  return raw.startsWith("/admin/")?raw:fallback;
}

function failTo(path:string,message:string):never{
  const separator=path.includes("?")?"&":"?";
  redirect(`${path}${separator}sanctionError=${encodeURIComponent(message)}`);
}
''',"feedback helpers")

    s=once(s,
'''export async function issueSanction(fd:FormData){
  const staff=await requireStaff();
  const type=sanctionType(fd);
''',
'''export async function issueSanction(fd:FormData){
  const staff=await requireStaff();
  const returnTo=returnPath(fd,"/admin/tickets");
  let type:SanctionType;
  try{ type=sanctionType(fd); }
  catch{ failTo(returnTo,"Select a valid sanction type."); }
''',"issue feedback start")

    pairs=[
('''  ) throw new Error("Only an administrator can issue a suspension or permanent ban.");''','''  ) failTo(returnTo,"Only an administrator can issue a suspension or permanent ban.");'''),
('''  if(!reasonCode||!playerReason) throw new Error("Reason code and player-facing reason are required.");''','''  if(!reasonCode||!playerReason) failTo(returnTo,"Reason code and player-facing reason are required.");'''),
('''    if(!expiresRaw) throw new Error("An expiry date and time is required for this sanction.");''','''    if(!expiresRaw) failTo(returnTo,"An expiry date and time is required for this sanction.");'''),
('''    if(Number.isNaN(d.getTime())||d<=new Date()) throw new Error("The sanction expiry must be in the future.");''','''    if(Number.isNaN(d.getTime())||d<=new Date()) failTo(returnTo,"The sanction expiry must be in the future.");'''),
('''  if(ticketError||!ticket) throw new Error(ticketError?.message??"Ticket not found.");''','''  if(ticketError||!ticket) failTo(returnTo,"The source ticket could not be loaded. Reload and try again.");'''),
('''  if(staffError) throw new Error(staffError.message);''','''  if(staffError) failTo(returnTo,"The target account could not be checked. Please try again.");'''),
('''  if(targetStaff) throw new Error("Staff accounts cannot be sanctioned through the standard player sanction workflow.");''','''  if(targetStaff) failTo(returnTo,"Staff accounts cannot be sanctioned through the standard player sanction workflow.");'''),
('''    if(error||!character) throw new Error(error?.message??"Target character not found.");''','''    if(error||!character) failTo(returnTo,"The target character could not be loaded. Reload and try again.");'''),
('''    if(character.user_id!==targetUserId) throw new Error("The selected character does not belong to the target account.");''','''    if(character.user_id!==targetUserId) failTo(returnTo,"The selected character does not belong to the target account.");'''),
('''    if(character.is_system===true) throw new Error("System characters cannot receive sanctions.");''','''    if(character.is_system===true) failTo(returnTo,"System characters cannot receive sanctions.");'''),
('''  if(dupError) throw new Error(dupError.message);''','''  if(dupError) failTo(returnTo,"Existing sanctions could not be checked. Please try again.");'''),
('''  if((dup??[]).length) throw new Error("This account already has an active or scheduled sanction of this type.");''','''  if((dup??[]).length) failTo(returnTo,"This account already has an active or scheduled sanction of this type.");'''),
('''  if(error||!sanction) throw new Error(error?.message??"Unable to create sanction.");''','''  if(error||!sanction) failTo(returnTo,"The sanction could not be created. Please try again.");'''),
('''    throw new Error(audit.error?.message??ticketAudit.error?.message??"Unable to record sanction audit history.");''','''    failTo(returnTo,"The sanction audit record could not be completed. No sanction was kept.");'''),
]
    for i,(a,b) in enumerate(pairs): s=once(s,a,b,f"issue feedback {i+1}")

    s=once(s,
'''export async function revokeSanction(fd:FormData){
  const staff=await requireAdmin();
  const sanctionId=uuid(fd,"sanctionId");
  const reason=read(fd,"revocationReason",5000);
  if(read(fd,"confirmation",30)!=="REVOKE") throw new Error('Type "REVOKE" to confirm revocation.');
  if(!reason) throw new Error("A revocation reason is required.");
''',
'''export async function revokeSanction(fd:FormData){
  const staff=await requireAdmin();
  const returnTo=returnPath(fd,"/admin/sanctions");
  const sanctionId=uuid(fd,"sanctionId");
  const reason=read(fd,"revocationReason",5000);
  if(read(fd,"confirmation",30)!=="REVOKE") failTo(returnTo,'Type "REVOKE" to confirm revocation.');
  if(!reason) failTo(returnTo,"A revocation reason is required.");
''',"revoke feedback start")

    rev=[
('''  if(error||!s) throw new Error(error?.message??"Sanction not found.");''','''  if(error||!s) failTo(returnTo,"The sanction could not be loaded. Reload and try again.");'''),
('''  if(s.status==="revoked") throw new Error("This sanction is already revoked.");''','''  if(s.status==="revoked") failTo(returnTo,"This sanction is already revoked.");'''),
('''  if(updateError) throw new Error(updateError.message);''','''  if(updateError) failTo(returnTo,"The sanction could not be revoked. Please try again.");'''),
('''  if(auditError) throw new Error(auditError.message);''','''  if(auditError) failTo(returnTo,"The revocation was saved but its audit event could not be recorded. Contact an administrator.");'''),
]
    for i,(a,b) in enumerate(rev): s=once(s,a,b,f"revoke feedback {i+1}")

    s=once(s,
'''  revalidatePath("/admin/sanctions");
  revalidatePath(`/admin/sanctions/${s.id}`);
}''',
'''  revalidatePath("/admin/sanctions");
  revalidatePath(`/admin/sanctions/${s.id}`);
  revalidatePath("/sanctions");
  redirect(`${returnTo}?sanctionSuccess=${encodeURIComponent("Sanction revoked successfully.")}`);
}''',"revoke success")
    changes[actions]=s

    s=ticket.read_text(encoding="utf-8")
    s=once(s,
'''export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {''',
'''export default async function AdminTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams?: Promise<{ sanctionError?: string }>;
}) {''',"ticket params")
    s=once(s,
'''  const staff = await requireStaff();
  const { reference } = await params;
  const admin = createAdminClient();''',
'''  const staff = await requireStaff();
  const { reference } = await params;
  const query = (await searchParams) ?? {};
  const sanctionError = query.sanctionError ?? null;
  const admin = createAdminClient();''',"ticket error read")
    s=once(s,
'''              <form action={issueSanction} className="grid gap-4 border-t border-[rgb(var(--sep-colour-60482e))]/35 p-4 lg:grid-cols-2">
                <input type="hidden" name="ticketId" value={ticket.id}/>''',
'''              <form action={issueSanction} className="grid gap-4 border-t border-[rgb(var(--sep-colour-60482e))]/35 p-4 lg:grid-cols-2">
                <input type="hidden" name="returnTo" value={`/admin/tickets/${ticket.public_reference}`}/>
                <input type="hidden" name="ticketId" value={ticket.id}/>''',"ticket returnTo")
    s=once(s,
'''                <div className="lg:col-span-2"><button className="border border-[rgb(var(--sep-colour-9a5147))] bg-[rgb(var(--sep-colour-351815))] px-5 py-3 text-[8px] uppercase text-[rgb(var(--sep-colour-e0a69a))]">Issue Sanction</button></div>''',
'''                {sanctionError ? <div role="alert" className="lg:col-span-2 border border-red-900/60 bg-red-950/25 p-3 text-xs leading-5 text-red-300">{sanctionError}</div> : null}
                <div className="lg:col-span-2"><button className="border border-[rgb(var(--sep-colour-9a5147))] bg-[rgb(var(--sep-colour-351815))] px-5 py-3 text-[8px] uppercase text-[rgb(var(--sep-colour-e0a69a))]">Issue Sanction</button></div>''',"ticket error banner")
    changes[ticket]=s

    s=detail.read_text(encoding="utf-8")
    s=once(s,
'''export default async function AdminSanctionPage({params}:{params:Promise<{id:string}>}){''',
'''export default async function AdminSanctionPage({params,searchParams}:{params:Promise<{id:string}>;searchParams?:Promise<{sanctionError?:string;sanctionSuccess?:string}>}){''',"detail params")
    s=once(s,
'''  const staff=await requireStaff(); const {id}=await params; const admin=createAdminClient();''',
'''  const staff=await requireStaff(); const {id}=await params; const query=(await searchParams)??{}; const admin=createAdminClient();''',"detail query")
    s=once(s,
'''<form action={revokeSanction} className="mt-4 space-y-3"><input type="hidden" name="sanctionId" value={s.id}/>''',
'''<form action={revokeSanction} className="mt-4 space-y-3"><input type="hidden" name="returnTo" value={`/admin/sanctions/${s.id}`}/><input type="hidden" name="sanctionId" value={s.id}/>''',"detail returnTo")
    s=once(s,
'''<button className="border border-red-800 bg-red-950/30 px-4 py-2.5 text-[8px] uppercase text-red-200">Revoke Sanction</button></form>''',
'''{query.sanctionError?<div role="alert" className="border border-red-800/60 bg-red-950/30 p-3 text-xs leading-5 text-red-200">{query.sanctionError}</div>:null}{query.sanctionSuccess?<div role="status" className="border border-[rgb(var(--sep-colour-6e7547))]/60 bg-[rgb(var(--sep-colour-182016))] p-3 text-xs leading-5 text-[rgb(var(--sep-colour-c9c99d))]">{query.sanctionSuccess}</div>:null}<button className="border border-red-800 bg-red-950/30 px-4 py-2.5 text-[8px] uppercase text-red-200">Revoke Sanction</button></form>''',"detail feedback")
    changes[detail]=s

    s=sidebar.read_text(encoding="utf-8")
    s=once(s,
'''            <Link href="/support" className="flex items-center py-0.5 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8b70))] transition hover:text-[rgb(var(--sep-colour-d8bf91))]">
              <span>Support</span><TicketNotificationBadge audience="player" variant="sidebar" />
            </Link>

            <span className="block py-0.1 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-5f5549))]">''',
'''            <Link href="/support" className="flex items-center py-0.5 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8b70))] transition hover:text-[rgb(var(--sep-colour-d8bf91))]">
              <span>Support</span><TicketNotificationBadge audience="player" variant="sidebar" />
            </Link>
            <Link href="/sanctions" className="flex items-center py-0.5 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8b70))] transition hover:text-[rgb(var(--sep-colour-d8bf91))]">
              <span>Sanctions</span>
            </Link>

            <span className="block py-0.1 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-5f5549))]">''',"sidebar link")
    changes[sidebar]=s

    changes[player]='''import Link from "next/link";
import { requireSupportIdentity } from "@/lib/support/current-support-user";
import { createAdminClient } from "@/lib/supabase/admin";

function fmt(v:string|null){return v?new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"No expiry";}
function label(v:string){return v.replaceAll("_"," ").replace(/\\b\\w/g,l=>l.toUpperCase());}

export default async function PlayerSanctionsPage(){
  const identity=await requireSupportIdentity();
  const admin=createAdminClient();
  const {data,error}=await admin.from("sanctions").select("id,ticket_id,sanction_type,status,reason_code,player_reason,expires_at,issued_at,revoked_at,revocation_reason").eq("target_user_id",identity.userId).order("issued_at",{ascending:false});
  if(error)throw new Error("Unable to load your sanction history.");
  const ids=[...new Set((data??[]).map(s=>s.ticket_id).filter((v):v is string=>Boolean(v)))];
  const tr=ids.length?await admin.from("tickets").select("id,public_reference").in("id",ids):{data:[] as Array<{id:string;public_reference:string}>,error:null};
  if(tr.error)throw new Error("Unable to load related ticket references.");
  const refs=new Map((tr.data??[]).map(t=>[t.id,t.public_reference]));
  const now=Date.now();

  return <main className="p-5 sm:p-7 lg:p-9"><div className="mx-auto max-w-5xl">
    <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))]">Account · Moderation</p>
    <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))]">Sanctions</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgb(var(--sep-colour-9c8d79))]">Disciplinary actions issued to your account are recorded here. Internal staff rationale is never shown.</p>
    <div className="mt-8 space-y-4">
      {(data??[]).length===0?<div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-8 text-center text-sm text-[rgb(var(--sep-colour-8f806d))]">There are no sanctions on your account.</div>:
      (data??[]).map(s=>{const expired=s.status==="active"&&!!s.expires_at&&new Date(s.expires_at).getTime()<=now;const status=expired?"expired":s.status;const ref=s.ticket_id?refs.get(s.ticket_id)??null:null;return <article key={s.id} className={`border p-5 ${status==="active"?"border-[rgb(var(--sep-colour-a65343))]/70 bg-[rgb(var(--sep-colour-211210))] shadow-[inset_3px_0_0_rgb(var(--sep-colour-a65343))]":"border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]"}`}>
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8c704b))]">{label(s.sanction_type)}</p><h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-e2c99f))]">{label(status)}</h2></div><div className="text-right text-[8px] leading-5 text-[rgb(var(--sep-colour-756957))]"><div>Issued {fmt(s.issued_at)}</div><div>Expires {fmt(s.expires_at)}</div></div></div>
        <div className="mt-4 border border-[rgb(var(--sep-colour-60482e))]/40 bg-black/10 p-4"><p className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-756957))]">Reason · {s.reason_code}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--sep-colour-d2bea1))]">{s.player_reason}</p></div>
        {status==="revoked"&&s.revocation_reason?<div className="mt-3 border border-[rgb(var(--sep-colour-6e7547))]/45 bg-[rgb(var(--sep-colour-182016))] p-4"><p className="text-[7px] uppercase text-[rgb(var(--sep-colour-8a9670))]">Revoked {s.revoked_at?`· ${fmt(s.revoked_at)}`:""}</p><p className="mt-2 text-sm">{s.revocation_reason}</p></div>:null}
        {ref?<div className="mt-4"><Link href={`/support/${ref}`} className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] px-4 py-2.5 text-[8px] uppercase text-[rgb(var(--sep-colour-d5b785))]">Open Related Ticket · {ref}</Link></div>:null}
      </article>})}
    </div>
  </div></main>;
}
'''

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
    print("No Supabase SQL is required.")
    print("Next: npm run build")

if __name__=="__main__":
    main()
