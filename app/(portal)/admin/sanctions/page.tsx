import Link from "next/link";
import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { SanctionLiveSync } from "@/components/sanctions/sanction-live-sync";

function fmt(v:string|null){
  if(!v)return "No expiry";
  return new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v));
}
function label(v:string){return v.replaceAll("_"," ").replace(/\b\w/g,l=>l.toUpperCase());}

export default async function AdminSanctionsPage({searchParams}:{searchParams?:Promise<{status?:string;type?:string;q?:string}>}){
  await requireAdminSection("sanctions");
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

  return <main className="p-5 sm:p-7 lg:p-9 admin_sanctions_page_main_main"><SanctionLiveSync audience="staff" markRead /><div className="mx-auto max-w-[1400px] admin_sanctions_page_div_sanctions">
    <p className="text-[9px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-8c704b))] admin_sanctions_page_p_sanctions">Administration · Moderation</p>
    <h1 className="mt-2 font-serif text-4xl text-[rgb(var(--sep-colour-ead5ac))] admin_sanctions_page_h1_sanctions">Sanctions</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgb(var(--sep-colour-9c8d79))] admin_sanctions_page_p_sanctions_2">Permanent disciplinary history. Sanctions are never deleted; revocations remain in the audit trail.</p>

    <form method="get" className="mt-6 grid gap-2 border border-[rgb(var(--sep-colour-60482e))]/45 p-4 md:grid-cols-4 admin_sanctions_page_form_sanctions">
      <input name="q" defaultValue={p.q??""} placeholder="Search target name..." className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-sm text-[rgb(var(--sep-colour-d5c2a4))] outline-none transition placeholder:text-[rgb(var(--sep-colour-5f5447))] focus:border-[rgb(var(--sep-colour-a47a44))] focus:ring-1 focus:ring-[rgb(var(--sep-colour-a47a44))]/40 admin_sanctions_page_input_q"/>
      <select name="status" defaultValue={p.status??""} className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-sm text-[rgb(var(--sep-colour-d5c2a4))] outline-none transition placeholder:text-[rgb(var(--sep-colour-5f5447))] focus:border-[rgb(var(--sep-colour-a47a44))] focus:ring-1 focus:ring-[rgb(var(--sep-colour-a47a44))]/40 admin_sanctions_page_select_status">
        <option className="admin_sanctions_page_option_status" value="">All statuses</option><option className="admin_sanctions_page_option_active" value="active">Active</option><option className="admin_sanctions_page_option_scheduled" value="scheduled">Scheduled</option><option className="admin_sanctions_page_option_expired" value="expired">Expired</option><option className="admin_sanctions_page_option_revoked" value="revoked">Revoked</option>
      </select>
      <select name="type" defaultValue={p.type??""} className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 text-sm text-[rgb(var(--sep-colour-d5c2a4))] outline-none transition placeholder:text-[rgb(var(--sep-colour-5f5447))] focus:border-[rgb(var(--sep-colour-a47a44))] focus:ring-1 focus:ring-[rgb(var(--sep-colour-a47a44))]/40 admin_sanctions_page_select_type">
        <option className="admin_sanctions_page_option_type" value="">All sanction types</option>
        <option className="admin_sanctions_page_option_warning" value="warning">Warning</option><option className="admin_sanctions_page_option_communication_restriction" value="communication_restriction">Communication restriction</option>
        <option className="admin_sanctions_page_option_forum_restriction" value="forum_restriction">Forum restriction</option><option className="admin_sanctions_page_option_game_chat_restriction" value="game_chat_restriction">Game chat restriction</option>
        <option className="admin_sanctions_page_option_feature_restriction" value="feature_restriction">Feature restriction</option><option className="admin_sanctions_page_option_temporary_suspension" value="temporary_suspension">Temporary suspension</option>
        <option className="admin_sanctions_page_option_permanent_ban" value="permanent_ban">Permanent ban</option>
      </select>
      <button className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-261b12))] text-[8px] uppercase admin_sanctions_page_button_apply_filters">Apply Filters</button>
    </form>

    <div className="mt-5 space-y-2 admin_sanctions_page_div_sanctions_2">
      {(data??[]).length===0?<div className="border border-[rgb(var(--sep-colour-60482e))]/45 p-8 text-center text-sm text-[rgb(var(--sep-colour-8f806d))] admin_sanctions_page_div_sanctions_3">No sanctions match these filters.</div>:
      (data??[]).map(s=><Link key={s.id} href={`/admin/sanctions/${s.id}`} className="grid gap-3 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 hover:border-[rgb(var(--sep-colour-947047))] md:grid-cols-[1.3fr_1.1fr_100px_180px_180px]">
        <div className="admin_sanctions_page_div_container"><div className="font-serif text-base text-[rgb(var(--sep-colour-d9c4a2))] admin_sanctions_page_div_container_2">{s.target_name_snapshot??"Unknown account"}</div><div className="mt-1 text-[8px] uppercase text-[rgb(var(--sep-colour-756957))] admin_sanctions_page_div_container_3">{s.reason_code}</div></div>
        <div className="text-[9px] uppercase text-[rgb(var(--sep-colour-a58b68))] admin_sanctions_page_div_container_4">{label(s.sanction_type)}</div>
        <div className="text-[8px] uppercase admin_sanctions_page_div_container_5">{s.status}</div>
        <div className="text-[8px] text-[rgb(var(--sep-colour-8f806d))] admin_sanctions_page_div_container_6">Issued {fmt(s.issued_at)}</div>
        <div className="text-[8px] text-[rgb(var(--sep-colour-8f806d))] admin_sanctions_page_div_container_7">Expires {fmt(s.expires_at)}</div>
      </Link>)}
    </div>
  </div></main>;
}
