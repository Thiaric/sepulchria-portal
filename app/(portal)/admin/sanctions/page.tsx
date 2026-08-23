import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

function fmt(v:string|null){
  if(!v)return "No expiry";
  return new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v));
}
function label(v:string){return v.replaceAll("_"," ").replace(/\b\w/g,l=>l.toUpperCase());}

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
