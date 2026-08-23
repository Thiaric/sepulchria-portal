import Link from "next/link";
import { requireSupportIdentity } from "@/lib/support/current-support-user";
import { createAdminClient } from "@/lib/supabase/admin";

function fmt(v:string|null){return v?new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"No expiry";}
function label(v:string){return v.replaceAll("_"," ").replace(/\b\w/g,l=>l.toUpperCase());}

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
